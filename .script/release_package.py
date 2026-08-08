#!/usr/bin/env python3
"""Validate, aggregate, lock, and advance Essentia lifecycle packages."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Callable, Iterable

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from mse_content import (  # noqa: E402
    MAX_CARD_BYTES,
    MSESourceError,
    contained_path,
    field_values,
    load_manifest,
    one_field,
    read_limited,
    sha256_file,
)

CARDS_ROOT = REPO_ROOT / "cards_mse"
IDENTITIES_PATH = REPO_ROOT / "website" / "content" / "identities.json"
PUBLIC_STAGES = {"01_alpha", "02_beta", "03_release"}
DRAFT_STAGE = "00_drafts"
STATUSES = {"open", "locked"}
FILE_FIELDS = (
    "image",
    "image_2",
    "mainframe_image",
    "mainframe_image_2",
    "symbol",
    "masterpiece_symbol",
)
SET_ID_RE = re.compile(r"^[A-Z]{2,8}-\d{4}$")
VERSION_RE = re.compile(r"^(Alpha|Beta|Release)_([0-9]+\.[0-9]+(?:\.[0-9]+)?)$")
GROUP_RE = re.compile(r"^[0-9]{2}_[a-z0-9_]+$")
PROJECT_RE = re.compile(r"^[0-9]{2}_YGO_[A-Za-z0-9_]+\.mse-set$")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
RELEASE_METADATA_KEYS = {
    "schemaVersion",
    "setId",
    "setName",
    "version",
    "stage",
    "status",
    "releasedOn",
    "components",
    "decks",
    "contentPosts",
}
SCHEMA_VERSION = 2
IDENTITY_SCHEMA_VERSIONS = frozenset({2, 3})


@dataclass(frozen=True)
class Stage:
    directory: str
    metadata_name: str
    version_prefix: str
    public_name: str
    rank: int


STAGES = {
    "00_drafts": Stage("00_drafts", "draft", "", "Draft", 0),
    "01_alpha": Stage("01_alpha", "alpha", "Alpha", "Alpha", 1),
    "02_beta": Stage("02_beta", "beta", "Beta", "Beta", 2),
    "03_release": Stage("03_release", "release", "Release", "Release", 3),
}
STAGE_BY_METADATA = {stage.metadata_name: stage for stage in STAGES.values()}
NEXT_STAGE = {
    "01_alpha": "02_beta",
    "02_beta": "03_release",
}


class LifecycleError(ValueError):
    """Lifecycle source or package violates contract."""


def package_folder(set_id: str, version: str) -> str:
    return f"{set_id}-{version}"


def package_stem(set_id: str, version: str) -> str:
    """Artifact stem matches package folder name."""
    return package_folder(set_id, version)


def json_read(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise LifecycleError(f"invalid JSON: {path}") from exc
    if not isinstance(value, dict):
        raise LifecycleError(f"JSON root must be object: {path}")
    return value


def json_write(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _safe_child(root: Path, value: str, *, directory: bool = False) -> Path:
    if not value or Path(value).is_absolute() or ".." in Path(value).parts or "\\" in value:
        raise LifecycleError(f"unsafe relative path {value!r} under {root}")
    candidate = root / value
    resolved_root = Path(os.path.realpath(root))
    resolved = Path(os.path.realpath(candidate))
    try:
        resolved.relative_to(resolved_root)
    except ValueError as exc:
        raise LifecycleError(f"path escapes root: {value}") from exc
    if candidate.is_symlink() or (hasattr(os.path, "isjunction") and os.path.isjunction(candidate)):
        raise LifecycleError(f"linked path forbidden: {candidate}")
    if directory and not candidate.is_dir():
        raise LifecycleError(f"directory missing: {candidate}")
    return candidate


def _field(text: str, name: str) -> str | None:
    match = re.search(rf"(?m)^\s*{re.escape(name)}:\s*(.*?)\s*$", text)
    return match.group(1) if match else None


def _replace_field(text: str, name: str, value: str) -> str:
    updated, count = re.subn(
        rf"(?m)^(\s*{re.escape(name)}:)\s*.*$", rf"\1 {value}", text, count=1
    )
    if count != 1:
        raise LifecycleError(f"missing {name} field")
    return updated


def expected_marker(stage: Stage, set_name: str | None = None) -> str:
    if stage.directory == DRAFT_STAGE:
        return "DRAFT"
    if not set_name:
        raise LifecycleError(f"setName required for {stage.directory}")
    return f"{set_name} {stage.public_name}"


def write_marker(project: Path, marker: str) -> None:
    set_path = project / "set"
    raw = set_path.read_bytes()
    bom = raw.startswith(b"\xef\xbb\xbf")
    text = raw.decode("utf-8-sig")
    updated = _replace_field(text, "artist", marker)
    set_path.write_bytes((b"\xef\xbb\xbf" if bom else b"") + updated.encode("utf-8"))


def _project_paths(root: Path) -> list[Path]:
    projects = []
    for project in root.rglob("*.mse-set"):
        if not project.is_dir():
            continue
        if any(parent.name.endswith(".mse-set") for parent in project.parents):
            raise LifecycleError(f"nested MSE project forbidden: {project}")
        projects.append(project)
    return sorted(projects)


def _validate_local_refs(project: Path, *, allow_empty: bool = False) -> None:
    for card in load_manifest(project, allow_empty=allow_empty):
        fields = field_values(read_limited(card.source_path, MAX_CARD_BYTES))
        for field in FILE_FIELDS:
            raw = one_field(fields, field)
            if raw:
                contained_path(project, raw)


def validate_project(project: Path, marker: str, *, allow_empty: bool = False) -> None:
    if not PROJECT_RE.fullmatch(project.name) and not project.name.endswith("_all_cards.mse-set"):
        raise LifecycleError(f"invalid project folder name: {project}")
    set_path = project / "set"
    if not set_path.is_file():
        raise LifecycleError(f"missing MSE manifest: {project}")
    set_text = set_path.read_text(encoding="utf-8-sig")
    actual = _field(set_text, "artist")
    if actual != marker:
        raise LifecycleError(
            f"stage marker mismatch: {project} expected artist={marker!r}, got {actual!r}"
        )
    try:
        _validate_local_refs(project, allow_empty=allow_empty)
    except MSESourceError as exc:
        raise LifecycleError(f"invalid MSE project {project}: {exc}") from exc


def _validate_public_metadata_lists(metadata: dict, path: Path) -> None:
    decks = metadata.get("decks")
    posts = metadata.get("contentPosts")
    if not isinstance(decks, list) or not isinstance(posts, list):
        raise LifecycleError(f"decks/contentPosts must be arrays: {path}")
    deck_ids: set[str] = set()
    for deck in decks:
        cards = deck.get("cards") if isinstance(deck, dict) else None
        deck_id = str(deck.get("id", "")) if isinstance(deck, dict) else ""
        if (
            not isinstance(deck, dict)
            or set(deck) != {"id", "cards"}
            or not SLUG_RE.fullmatch(deck_id)
            or deck_id in deck_ids
            or not isinstance(cards, list)
            or any(
                not isinstance(card, str) or not SLUG_RE.fullmatch(card)
                for card in cards
            )
            or len(cards) != len(set(cards))
        ):
            raise LifecycleError(f"invalid deck metadata: {path}")
        deck_ids.add(deck_id)
    if any(not isinstance(post, str) or not post.startswith("https://") for post in posts):
        raise LifecycleError(f"invalid content post URL: {path}")


def _parse_version(version: str, stage: Stage) -> re.Match[str]:
    match = VERSION_RE.fullmatch(version)
    if not match:
        raise LifecycleError(
            f"invalid version {version!r}; expected "
            f"{stage.version_prefix}_X.Y"
        )
    if match.group(1) != stage.version_prefix:
        raise LifecycleError(
            f"version prefix {match.group(1)!r} does not match stage "
            f"{stage.metadata_name}"
        )
    return match


def release_metadata(package: Path, expected_stage: Stage | None = None) -> dict:
    path = package / "release.json"
    metadata = json_read(path)
    stage = STAGE_BY_METADATA.get(str(metadata.get("stage")))
    status = metadata.get("status")
    if (
        set(metadata) != RELEASE_METADATA_KEYS
        or metadata.get("schemaVersion") != SCHEMA_VERSION
        or stage is None
        or stage.directory == DRAFT_STAGE
        or (expected_stage and stage != expected_stage)
        or status not in STATUSES
        or not isinstance(metadata.get("setName"), str)
        or not metadata["setName"].strip()
        or not SET_ID_RE.fullmatch(str(metadata.get("setId", "")))
        or not isinstance(metadata.get("components"), list)
        or not metadata["components"]
        or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(metadata.get("releasedOn", "")))
    ):
        raise LifecycleError(f"invalid release metadata: {path}")
    try:
        date.fromisoformat(metadata["releasedOn"])
    except ValueError as exc:
        raise LifecycleError(f"invalid releasedOn date: {path}") from exc
    _parse_version(str(metadata.get("version", "")), stage)
    _validate_public_metadata_lists(metadata, path)
    expected_folder = package_folder(metadata["setId"], metadata["version"])
    if package.name not in {expected_folder, f".{expected_folder}.staging"}:
        raise LifecycleError(f"package folder mismatch: {package}; expected {expected_folder}")
    seen: set[str] = set()
    for component in metadata["components"]:
        if (
            not isinstance(component, dict)
            or not GROUP_RE.fullmatch(str(component.get("group", "")))
            or not PROJECT_RE.fullmatch(str(component.get("project", "")))
            or component["project"] in seen
        ):
            raise LifecycleError(f"invalid component entry in {path}: {component!r}")
        seen.add(component["project"])
    return metadata


def load_identity_registry(path: Path = IDENTITIES_PATH) -> dict[str, str]:
    data = json_read(path)
    # v3 adds archetype/role/routeAliases/retired/withdrawn; the fields read below are unchanged.
    if data.get("schemaVersion") not in IDENTITY_SCHEMA_VERSIONS or not isinstance(
        data.get("cards"), list
    ):
        expected = " or ".join(str(value) for value in sorted(IDENTITY_SCHEMA_VERSIONS))
        raise LifecycleError(f"identity registry must use schemaVersion {expected}: {path}")
    by_source: dict[str, str] = {}
    ids: set[str] = set()
    for item in data["cards"]:
        stable_id = item.get("stableId") if isinstance(item, dict) else None
        sources = item.get("sources") if isinstance(item, dict) else None
        if (
            not isinstance(stable_id, str)
            or not SLUG_RE.fullmatch(stable_id)
            or stable_id in ids
            or not isinstance(sources, list)
            or not sources
        ):
            raise LifecycleError(f"invalid identity entry: {item!r}")
        ids.add(stable_id)
        for source in sources:
            if not isinstance(source, str) or source in by_source or ".." in Path(source).parts:
                raise LifecycleError(f"invalid or duplicate identity source: {source!r}")
            by_source[source] = stable_id
    return by_source


def source_ref(project: Path, source_name: str) -> str:
    return f"{project.name}/{source_name}"


def _normalized_content_hash(text: str) -> str:
    fields = field_values(text)
    excluded = {*FILE_FIELDS, "stylesheet", "stylesheet_version"}
    lines: list[str] = []
    for key in sorted(fields):
        if key in excluded:
            continue
        for value in fields[key]:
            normalized = "\n".join(line.rstrip() for line in value.splitlines()).strip()
            lines.append(f"{key}:{normalized}")
    return hashlib.sha256(("\n".join(lines) + "\n").encode()).hexdigest()


def _ensure_effective_style(card_text: str, set_text: str) -> str:
    fields = field_values(card_text)
    if one_field(fields, "stylesheet"):
        return card_text
    style = _field(set_text, "stylesheet")
    if not style:
        raise LifecycleError("component set missing stylesheet")
    version = _field(set_text, "stylesheet_version")
    insertion = f"\tstylesheet: {style}\n"
    if version:
        insertion += f"\tstylesheet_version: {version}\n"
    marker = re.search(r"(?m)^card:\s*$", card_text)
    if not marker:
        raise LifecycleError("card source missing card: header")
    return card_text[: marker.end()] + "\n" + insertion.rstrip("\n") + card_text[marker.end() :]


def _rewrite_local_files(
    card_text: str, component: Path, aggregate: Path, stable_id: str
) -> tuple[str, dict[str, str]]:
    hashes: dict[str, str] = {}
    fields = field_values(card_text)
    updated = card_text
    images = aggregate / "images"
    for field in FILE_FIELDS:
        raw = one_field(fields, field)
        if not raw:
            continue
        source = contained_path(component, raw)
        suffix = source.suffix.casefold() or ".bin"
        target_name = f"{stable_id}-{field.replace('_', '-')}{suffix}"
        target = images / target_name
        images.mkdir(exist_ok=True)
        shutil.copyfile(source, target)
        replacement = f"images/{target_name}"
        updated, count = re.subn(
            rf"(?m)^(\t{re.escape(field)}:)\s*.*$", rf"\1 {replacement}", updated, count=1
        )
        if count != 1:
            raise LifecycleError(f"unable to rewrite {field} for {stable_id}")
        hashes[field] = sha256_file(target)
    return updated, hashes


def _copy_set_files(text: str, component: Path, aggregate: Path) -> str:
    """Copy set-level local files (the set symbol) into the aggregate package."""
    fields = field_values(text)
    for field in FILE_FIELDS:
        raw = one_field(fields, field)
        if not raw:
            continue
        source = contained_path(component, raw)
        shutil.copyfile(source, aggregate / source.name)
    return text


def _aggregate_set_text(
    base_text: str,
    title: str,
    marker: str,
    includes: Iterable[str],
    component: Path,
    aggregate: Path,
) -> str:
    lines = [line for line in base_text.splitlines() if not line.startswith("include_file:")]
    text = "\n".join(lines).rstrip() + "\n"
    text = _replace_field(text, "title", title)
    text = _replace_field(text, "artist", marker)
    text = _replace_field(text, "stylesheet", "sevenhalf")
    text = _copy_set_files(text, component, aggregate)
    return text + "\n".join(f"include_file: {value}" for value in includes) + "\n"


def generate_aggregate(
    package: Path, identities_path: Path = IDENTITIES_PATH
) -> Path:
    metadata = release_metadata(package)
    stage = STAGE_BY_METADATA[metadata["stage"]]
    marker = expected_marker(stage, metadata["setName"])
    identities = load_identity_registry(identities_path)
    stem = package_stem(metadata["setId"], metadata["version"])
    aggregate_name = f"{stem}_all_cards.mse-set"
    aggregate = package / aggregate_name
    if aggregate.exists():
        shutil.rmtree(aggregate)
    aggregate.mkdir()

    cards: list[dict] = []
    seen_ids: set[str] = set()
    seen_names: set[str] = set()
    base_set_text: str | None = None
    base_component: Path | None = None
    for component_entry in metadata["components"]:
        component = _safe_child(package, component_entry["project"], directory=True)
        validate_project(component, marker)
        set_text = (component / "set").read_text(encoding="utf-8-sig")
        base_set_text = base_set_text or set_text
        base_component = base_component or component
        for card in load_manifest(component):
            ref = source_ref(component, card.source_name)
            stable_id = identities.get(ref)
            if not stable_id:
                raise LifecycleError(f"missing stable identity for {ref}")
            folded_name = card.name.casefold()
            if stable_id in seen_ids or folded_name in seen_names:
                raise LifecycleError(f"duplicate/conflicting aggregate card: {ref} ({stable_id})")
            seen_ids.add(stable_id)
            seen_names.add(folded_name)
            source_text = card.source_path.read_text(encoding="utf-8-sig")
            output_text = _ensure_effective_style(source_text, set_text)
            output_text, file_hashes = _rewrite_local_files(
                output_text, component, aggregate, stable_id
            )
            if _normalized_content_hash(source_text) != _normalized_content_hash(output_text):
                raise LifecycleError(f"aggregate card content drift: {ref}")
            cards.append(
                {
                    "stableId": stable_id,
                    "name": card.name,
                    "source": ref,
                    "sourceHash": sha256_file(card.source_path),
                    "contentHash": _normalized_content_hash(source_text),
                    "files": file_hashes,
                    "output": f"card {stable_id}",
                    "text": output_text,
                }
            )
    if not cards or base_set_text is None or base_component is None:
        raise LifecycleError(f"package has no component cards: {package}")
    cards.sort(key=lambda item: (item["name"].casefold(), item["stableId"]))
    for card in cards:
        (aggregate / card["output"]).write_text(card.pop("text"), encoding="utf-8")
    set_text = _aggregate_set_text(
        base_set_text,
        f"Essentia -- {metadata['setName']} {stage.public_name}",
        marker,
        (card["output"] for card in cards),
        base_component,
        aggregate,
    )
    (aggregate / "set").write_text(set_text, encoding="utf-8")
    manifest = {
        "schemaVersion": 1,
        "aggregate": aggregate.name,
        "cards": cards,
        "unionHash": hashlib.sha256(
            "\n".join(f"{card['stableId']}:{card['contentHash']}" for card in cards).encode()
        ).hexdigest(),
    }
    json_write(package / "aggregate-manifest.json", manifest)
    validate_aggregate(package)
    return aggregate


def validate_aggregate(package: Path) -> None:
    metadata = release_metadata(package)
    manifest_path = package / "aggregate-manifest.json"
    manifest = json_read(manifest_path)
    expected_name = f"{package_stem(metadata['setId'], metadata['version'])}_all_cards.mse-set"
    aggregate = package / expected_name
    if manifest.get("schemaVersion") != 1 or manifest.get("aggregate") != expected_name:
        raise LifecycleError(f"invalid aggregate manifest: {manifest_path}")
    cards = manifest.get("cards")
    if not isinstance(cards, list) or not cards:
        raise LifecycleError(f"aggregate manifest has no cards: {manifest_path}")
    loaded = load_manifest(aggregate)
    if len(loaded) != len(cards):
        raise LifecycleError(f"aggregate count mismatch: {aggregate}")
    by_output = {item.get("output"): item for item in cards if isinstance(item, dict)}
    for card in loaded:
        item = by_output.get(card.source_name)
        if not item:
            raise LifecycleError(f"aggregate card absent from manifest: {card.source_name}")
        text = card.source_path.read_text(encoding="utf-8-sig")
        if _normalized_content_hash(text) != item.get("contentHash"):
            raise LifecycleError(f"aggregate content hash mismatch: {card.source_path}")
        for field, expected_hash in item.get("files", {}).items():
            raw = one_field(field_values(text), field)
            if not raw or sha256_file(contained_path(aggregate, raw)) != expected_hash:
                raise LifecycleError(f"aggregate file hash mismatch: {card.source_path}:{field}")
    union_hash = hashlib.sha256(
        "\n".join(f"{item['stableId']}:{item['contentHash']}" for item in cards).encode()
    ).hexdigest()
    if union_hash != manifest.get("unionHash"):
        raise LifecycleError(f"aggregate union hash mismatch: {manifest_path}")


def package_hashes(package: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in sorted(package.rglob("*")):
        if path.is_symlink() or (hasattr(os.path, "isjunction") and os.path.isjunction(path)):
            raise LifecycleError(f"linked package path forbidden: {path}")
        if path.is_file() and path.name != "package-sha256.json":
            result[path.relative_to(package).as_posix()] = sha256_file(path)
    return result


def write_package_hashes(package: Path) -> None:
    json_write(
        package / "package-sha256.json",
        {"schemaVersion": 1, "algorithm": "sha256", "files": package_hashes(package)},
    )


def validate_package_hashes(package: Path) -> None:
    manifest_path = package / "package-sha256.json"
    manifest = json_read(manifest_path)
    if (
        manifest.get("schemaVersion") != 1
        or manifest.get("algorithm") != "sha256"
        or manifest.get("files") != package_hashes(package)
    ):
        raise LifecycleError(f"package hash mismatch: {manifest_path}")


def package_is_locked(package: Path) -> bool:
    path = package / "release.json"
    if not path.is_file():
        return False
    try:
        return json_read(path).get("status") == "locked"
    except LifecycleError:
        return False


def validate_package(package: Path, require_artifacts: bool | None = None) -> None:
    stage_key = package.parent.name
    stage = STAGES.get(stage_key)
    if not stage or stage.directory == DRAFT_STAGE:
        raise LifecycleError(f"package outside public stage: {package}")
    metadata = release_metadata(package, stage)
    status = metadata["status"]
    if require_artifacts is None:
        require_artifacts = status == "locked"
    marker = expected_marker(stage, metadata["setName"])
    component_names = {entry["project"] for entry in metadata["components"]}
    actual_components = {
        project.name
        for project in _project_paths(package)
        if not project.name.endswith("_all_cards.mse-set")
    }
    if actual_components != component_names:
        raise LifecycleError(
            f"component set mismatch: {package} expected={sorted(component_names)} actual={sorted(actual_components)}"
        )
    for name in sorted(component_names):
        validate_project(_safe_child(package, name, directory=True), marker)
    if require_artifacts or (package / "aggregate-manifest.json").exists():
        validate_aggregate(package)
    if require_artifacts:
        required = (
            package / "renders",
            package / "render-provenance.json",
            package / "package-sha256.json",
        )
        missing = [str(path) for path in required if not path.exists()]
        if missing:
            raise LifecycleError(f"missing package artifacts: {', '.join(missing)}")
        validate_package_hashes(package)


def _open_package_display_names(cards_root: Path) -> dict[str, list[str]]:
    """Map casefolded display name -> owning mutable project paths."""
    owned: dict[str, list[str]] = {}
    draft_root = cards_root / DRAFT_STAGE
    if draft_root.is_dir():
        for project in _project_paths(draft_root):
            for card in load_manifest(project, allow_empty=True):
                owned.setdefault(card.name.casefold(), []).append(
                    f"{project.relative_to(cards_root).as_posix()}/{card.source_name}"
                )
    for stage_key in sorted(PUBLIC_STAGES):
        root = cards_root / stage_key
        if not root.is_dir():
            continue
        for package in sorted(path for path in root.iterdir() if path.is_dir()):
            if package.name == ".gitkeep" or package.name.startswith("."):
                continue
            release_path = package / "release.json"
            if not release_path.is_file():
                continue
            metadata = json_read(release_path)
            if metadata.get("status") != "open":
                continue
            for project in _project_paths(package):
                if project.name.endswith("_all_cards.mse-set"):
                    continue
                for card in load_manifest(project, allow_empty=True):
                    owned.setdefault(card.name.casefold(), []).append(
                        f"{project.relative_to(cards_root).as_posix()}/{card.source_name}"
                    )
    return owned


def validate_cards_root(cards_root: Path = CARDS_ROOT) -> None:
    unknown = [path for path in cards_root.iterdir() if path.is_dir() and path.name not in STAGES]
    if unknown:
        raise LifecycleError(f"unknown lifecycle directories: {', '.join(map(str, unknown))}")
    for stage_key, stage in STAGES.items():
        root = cards_root / stage_key
        if not root.is_dir():
            raise LifecycleError(f"missing lifecycle directory: {root}")
        if stage_key == DRAFT_STAGE:
            for project in _project_paths(root):
                relative = project.relative_to(root)
                if len(relative.parts) != 2 or not GROUP_RE.fullmatch(relative.parts[0]):
                    raise LifecycleError(f"misplaced draft project: {project}")
                validate_project(project, "DRAFT", allow_empty=True)
        else:
            for child in sorted(root.iterdir()):
                if child.name == ".gitkeep":
                    continue
                if not child.is_dir() or child.name.startswith("."):
                    raise LifecycleError(f"unexpected stage entry: {child}")
                validate_package(child)
    for name, owners in sorted(_open_package_display_names(cards_root).items()):
        if len(owners) > 1:
            raise LifecycleError(
                "duplicate mutable card display name "
                f"{name!r}: {', '.join(owners)}"
            )


def build_artifacts(package: Path, aggregate: Path, *, print_masters: bool = False) -> None:
    """
    Export renders and provenance.

    With print_masters=True the exporter additionally writes renders_print/
    beside renders/ via the Essentia print export template. Masters are optional:
    the website upscales the 1x render and flags draft resolution when absent.
    """
    renders = package / "renders"
    command = [
        sys.executable,
        str(SCRIPT_DIR / "export_mse_renders.py"),
        str(aggregate),
        "--output",
        str(renders),
    ]
    if print_masters:
        command.append("--print-masters")
    subprocess.run(command, cwd=REPO_ROOT, check=True)
    generated_provenance = renders / "render-provenance.json"
    if not generated_provenance.is_file():
        raise LifecycleError(f"render exporter omitted provenance: {generated_provenance}")
    generated_provenance.replace(package / "render-provenance.json")


def rebuild(
    package: Path,
    *,
    identities_path: Path = IDENTITIES_PATH,
    artifact_builder: Callable[[Path, Path], None] = build_artifacts,
) -> Path:
    """Regenerate aggregate/artifacts/hashes for an open package."""
    package = package.resolve()
    metadata = release_metadata(package)
    if metadata["status"] != "open":
        raise LifecycleError(f"rebuild requires open package: {package}")
    aggregate = generate_aggregate(package, identities_path)
    artifact_builder(package, aggregate)
    write_package_hashes(package)
    validate_package(package, require_artifacts=True)
    return package


def lock(
    package: Path,
    released_on: str | None = None,
    *,
    identities_path: Path = IDENTITIES_PATH,
    artifact_builder: Callable[[Path, Path], None] = build_artifacts,
) -> Path:
    """Rebuild artifacts and mark package locked."""
    package = package.resolve()
    metadata = release_metadata(package)
    if metadata["status"] != "open":
        raise LifecycleError(f"lock requires open package: {package}")
    if released_on is not None:
        try:
            date.fromisoformat(released_on)
        except ValueError as exc:
            raise LifecycleError(f"invalid releasedOn date: {released_on}") from exc
        metadata["releasedOn"] = released_on
    rebuild(package, identities_path=identities_path, artifact_builder=artifact_builder)
    metadata = release_metadata(package)
    metadata["status"] = "locked"
    json_write(package / "release.json", metadata)
    write_package_hashes(package)
    validate_package(package, require_artifacts=True)
    return package


def advance(
    source_package: Path,
    to_stage: str,
    version: str,
    *,
    cards_root: Path = CARDS_ROOT,
) -> Path:
    """Copy locked package into next stage as a new open package."""
    source_package = source_package.resolve()
    source_stage_key = source_package.parent.name
    if NEXT_STAGE.get(source_stage_key) != to_stage:
        raise LifecycleError(f"invalid advance: {source_stage_key} -> {to_stage}")
    validate_package(source_package, require_artifacts=True)
    release = release_metadata(source_package)
    if release["status"] != "locked":
        raise LifecycleError(f"advance requires locked source package: {source_package}")
    target_stage = STAGES[to_stage]
    _parse_version(version, target_stage)
    target = cards_root / to_stage / package_folder(release["setId"], version)
    if target.exists():
        raise LifecycleError(f"target package already exists: {target}")
    staging = target.parent / f".{target.name}.staging"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)
    try:
        marker = expected_marker(target_stage, release["setName"])
        for entry in release["components"]:
            shutil.copytree(source_package / entry["project"], staging / entry["project"])
            write_marker(staging / entry["project"], marker)
        json_write(
            staging / "release.json",
            {
                "schemaVersion": SCHEMA_VERSION,
                "setId": release["setId"],
                "setName": release["setName"],
                "version": version,
                "stage": target_stage.metadata_name,
                "status": "open",
                "releasedOn": release["releasedOn"],
                "components": release["components"],
                "decks": release.get("decks", []),
                "contentPosts": release.get("contentPosts", []),
            },
        )
        validate_package(staging, require_artifacts=False)
        staging.replace(target)
    except BaseException:
        if staging.exists():
            shutil.rmtree(staging)
        raise
    return target


def locked_packages(cards_root: Path = CARDS_ROOT) -> list[Path]:
    found: list[Path] = []
    for stage_key in sorted(PUBLIC_STAGES):
        root = cards_root / stage_key
        if not root.is_dir():
            continue
        for child in sorted(root.iterdir()):
            if child.is_dir() and not child.name.startswith(".") and package_is_locked(child):
                found.append(child)
    return found


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate = subparsers.add_parser("validate")
    validate.add_argument("path", nargs="?", type=Path, default=CARDS_ROOT)

    aggregate = subparsers.add_parser("aggregate")
    aggregate.add_argument("package", type=Path)
    aggregate.add_argument("--identities", type=Path, default=IDENTITIES_PATH)

    hashes = subparsers.add_parser("hash")
    hashes.add_argument("package", type=Path)

    rebuild_cmd = subparsers.add_parser("rebuild")
    rebuild_cmd.add_argument("package", type=Path)
    rebuild_cmd.add_argument("--identities", type=Path, default=IDENTITIES_PATH)

    lock_cmd = subparsers.add_parser("lock")
    lock_cmd.add_argument("package", type=Path)
    lock_cmd.add_argument("--released-on")
    lock_cmd.add_argument("--identities", type=Path, default=IDENTITIES_PATH)

    advance_cmd = subparsers.add_parser("advance")
    advance_cmd.add_argument("source_package", type=Path)
    advance_cmd.add_argument("--to-stage", choices=sorted(NEXT_STAGE.values()), required=True)
    advance_cmd.add_argument("--version", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "validate":
        path = args.path.resolve()
        if path == CARDS_ROOT.resolve():
            validate_cards_root(path)
        else:
            validate_package(path)
        print(f"lifecycle valid: {path}")
    elif args.command == "aggregate":
        print(generate_aggregate(args.package.resolve(), args.identities.resolve()))
    elif args.command == "hash":
        package = args.package.resolve()
        write_package_hashes(package)
        validate_package_hashes(package)
        print(f"package hashes written: {package}")
    elif args.command == "rebuild":
        print(rebuild(args.package.resolve(), identities_path=args.identities.resolve()))
    elif args.command == "lock":
        print(
            lock(
                args.package.resolve(),
                args.released_on,
                identities_path=args.identities.resolve(),
            )
        )
    elif args.command == "advance":
        print(advance(args.source_package.resolve(), args.to_stage, args.version))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (LifecycleError, MSESourceError, OSError, subprocess.CalledProcessError) as exc:
        print(f"release-package error: {exc}", file=sys.stderr)
        raise SystemExit(1)
