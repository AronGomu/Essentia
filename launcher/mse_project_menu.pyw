#!/mnt/data/Softwares/Full-Magic-Pack-main/python-tk/bin/python3
"""Native no-terminal launcher for Essentia MSE projects.

Double-click this .pyw file on Windows to open a small GUI. Buttons launch each
folder-form .mse-set directly with Magic Set Editor.
"""

from __future__ import annotations

import logging
import re
import subprocess
import sys
import threading
import time
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import messagebox, ttk
except ModuleNotFoundError:  # Allows --list on Python builds without Tk.
    tk = None  # type: ignore[assignment]
    messagebox = None  # type: ignore[assignment]
    ttk = None  # type: ignore[assignment]

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from launcher.mse_config import MSEConfig
LOGGER = logging.getLogger("mse_project_menu")
LOGGER.setLevel(logging.INFO)
LOGGING_ERROR: OSError | None = None
try:
    log_handler = logging.FileHandler(ROOT / ".mse_launcher.log", encoding="utf-8")
    log_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    LOGGER.addHandler(log_handler)
except OSError as exc:
    LOGGING_ERROR = exc
    LOGGER.addHandler(logging.NullHandler())

try:
    MSE_CONFIG = MSEConfig.load()
    CONFIG_ERROR = None
    LOGGER.info("event=config.mse.loaded env_path=%s", ROOT / ".env")
except (OSError, UnicodeError, RuntimeError) as exc:
    LOGGER.exception("event=config.mse.failed env_path=%s", ROOT / ".env")
    MSE_CONFIG = None
    CONFIG_ERROR = str(exc)
PROJECTS_ROOT = MSE_CONFIG.projects_dir if MSE_CONFIG else REPO_ROOT / "cards_mse"

BG = "#181922"
PANEL = "#20222e"
TEXT = "#f5f1e8"
MUTED = "#b9b0a1"
ACCENT = "#d7a85a"
ACCENT_DARK = "#1b1408"
BLUE = "#8fd6ff"

DOCS_BY_PROJECT = {
    "00_YGO_Non_Archetype.mse-set": (0, "00", "Non-archetype"),
    "01_YGO_Burning_Abyss.mse-set": (1, "01", "Archetype: Burning Abyss"),
    "02_YGO_Shaddoll.mse-set": (2, "02", "Archetype: Shaddoll"),
    "03_YGO_Nekroz.mse-set": (3, "03", "Archetype: Nekroz"),
    "04_YGO_Spellbook.mse-set": (4, "04", "Archetype: Spellbook"),
}

TAB_NAMES = (
    "Draft",
    "Pre-Alpha",
    "Alpha",
    "Pre-Beta",
    "Beta",
    "Pre-Release",
    "Release",
)
LIFECYCLE = {
    "00_drafts": (0, "Draft"),
    "01_pre_alpha": (1, "Pre-Alpha"),
    "02_alpha": (2, "Alpha"),
    "03_pre_beta": (3, "Pre-Beta"),
    "04_beta": (4, "Beta"),
    "05_pre_release": (5, "Pre-Release"),
    "06_released": (6, "Release"),
}


def read_title(set_file: Path) -> str | None:
    if not set_file.exists():
        return None
    text = set_file.read_text(encoding="utf-8-sig", errors="replace")
    match = re.search(r"^\s*title:\s*(.+)$", text, re.MULTILINE)
    return match.group(1).strip() if match else None


def count_cards(set_file: Path) -> int:
    if not set_file.exists():
        return 0
    return sum(
        1
        for line in set_file.read_text(encoding="utf-8-sig", errors="replace").splitlines()
        if line.startswith("include_file:")
    )


def _project_sort_key(project: Path, projects_root: Path) -> tuple[int, str]:
    relative = project.relative_to(projects_root)
    stage_order = LIFECYCLE.get(relative.parts[0], (999, "Unknown"))[0]
    return stage_order, relative.as_posix().casefold()


def discover_projects(projects_root: Path = PROJECTS_ROOT) -> list[dict[str, object]]:
    projects: list[dict[str, object]] = []
    if not projects_root.exists():
        return projects
    candidates = [
        project
        for project in projects_root.rglob("*.mse-set")
        if project.is_dir()
        and not any(parent.name.endswith(".mse-set") for parent in project.parents)
    ]
    for project in sorted(candidates, key=lambda item: _project_sort_key(item, projects_root)):
        set_file = project / "set"
        if not set_file.exists():
            continue
        relative = project.relative_to(projects_root)
        stage_key = relative.parts[0] if relative.parts else ""
        lifecycle_entry = LIFECYCLE.get(stage_key)
        if lifecycle_entry is None:
            continue
        _stage_order, lifecycle = lifecycle_entry
        group = relative.parts[1] if len(relative.parts) > 2 else project.parent.name
        set_name = (
            relative.parts[1]
            if stage_key in {"02_alpha", "04_beta", "06_released"} and len(relative.parts) > 2
            else None
        )
        _sort, doc_number, doc_title = DOCS_BY_PROJECT.get(
            project.name, (999, "?", "Unlinked document")
        )
        projects.append(
            {
                "name": project.name,
                "title": read_title(set_file) or project.stem,
                "count": count_cards(set_file),
                "path": project,
                "relative": relative.as_posix(),
                "lifecycle": lifecycle,
                "group": group,
                "set_name": set_name,
                "doc_number": doc_number,
                "doc_title": doc_title,
            }
        )
    return projects


def group_projects_by_tab(
    projects: list[dict[str, object]],
) -> dict[str, list[dict[str, object]]]:
    grouped = {tab: [] for tab in TAB_NAMES}
    for project in projects:
        lifecycle = str(project["lifecycle"])
        if lifecycle in grouped:
            grouped[lifecycle].append(project)
    return grouped


def _observe_process(process: subprocess.Popen[bytes], project_path: Path, started_at: float) -> None:
    return_code = process.wait()
    duration = round(time.monotonic() - started_at, 2)
    log = LOGGER.info if return_code == 0 else LOGGER.error
    log(
        "event=spawn.mse.exited pid=%s project=%s return_code=%s duration_seconds=%s",
        process.pid,
        project_path,
        return_code,
        duration,
    )


def open_project(project_path: Path) -> None:
    if MSE_CONFIG is None:
        LOGGER.error("event=spawn.mse.rejected reason=not_configured project=%s", project_path)
        messagebox.showerror("MSE not configured", CONFIG_ERROR or "Run `python launcher/setup_mse.py` first.")
        return
    if not MSE_CONFIG.executable.is_file():
        LOGGER.error("event=spawn.mse.rejected reason=missing_executable project=%s", project_path)
        messagebox.showerror(
            "MSE not found",
            f"Unable to find MSE:\n{MSE_CONFIG.executable}\n\nRun `python launcher/setup_mse.py` again.",
        )
        return
    if not project_path.is_dir() or not (project_path / "set").is_file():
        LOGGER.error("event=spawn.mse.rejected reason=invalid_project project=%s", project_path)
        messagebox.showerror("Project not found", f"Invalid MSE project:\n{project_path}")
        return
    try:
        LOGGER.info(
            "event=spawn.mse.starting cmd=%s args=%s cwd=%s",
            MSE_CONFIG.executable,
            [str(project_path)],
            ROOT,
        )
        started_at = time.monotonic()
        process = subprocess.Popen(
            [str(MSE_CONFIG.executable), str(project_path)],
            close_fds=True,
        )
        LOGGER.info("event=spawn.mse.started pid=%s project=%s", process.pid, project_path)
        threading.Thread(
            target=_observe_process,
            args=(process, project_path, started_at),
            daemon=True,
        ).start()
    except OSError as exc:  # pragma: no cover - GUI safety net
        LOGGER.exception("event=spawn.mse.failed project=%s", project_path)
        messagebox.showerror("MSE error", f"Unable to open:\n{project_path}\n\n{exc}")


def copy_path(root: tk.Tk, value: str) -> None:
    root.clipboard_clear()
    root.clipboard_append(value)
    root.update()


def build_gui(projects: list[dict[str, object]]) -> None:
    root = tk.Tk()
    root.title("Essentia - MSE Menu")
    root.geometry("900x760")
    root.minsize(760, 520)
    root.configure(bg=BG)
    if LOGGING_ERROR is not None:
        root.after_idle(
            lambda: messagebox.showwarning(
                "MSE log unavailable",
                f"Unable to write .mse_launcher.log:\n{LOGGING_ERROR}",
            )
        )

    style = ttk.Style(root)
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass
    style.configure("Accent.TButton", font=("Segoe UI", 10, "bold"), padding=(14, 9), background=ACCENT, foreground=ACCENT_DARK)
    style.map("Accent.TButton", background=[("active", "#efc878")])
    style.configure("Secondary.TButton", font=("Segoe UI", 9), padding=(10, 7), background="#2b3040", foreground=TEXT)
    style.map("Secondary.TButton", background=[("active", "#394056")])

    header = tk.Frame(root, bg=BG)
    header.pack(fill="x", padx=24, pady=(22, 10))

    tk.Label(
        header,
        text="Magic Set Editor projects",
        font=("Segoe UI", 22, "bold"),
        fg=TEXT,
        bg=BG,
    ).pack(anchor="w")
    tk.Label(
        header,
        text="Browse Draft through Release, including pre-stages. Open any folder-form project directly in MSE.",
        font=("Segoe UI", 10),
        fg=MUTED,
        bg=BG,
        wraplength=820,
        justify="left",
    ).pack(anchor="w", pady=(6, 0))

    search_frame = tk.Frame(root, bg=BG)
    search_frame.pack(fill="x", padx=24, pady=(6, 4))
    tk.Label(
        search_frame,
        text="Search projects",
        font=("Segoe UI", 10, "bold"),
        fg=TEXT,
        bg=BG,
    ).pack(anchor="w", pady=(0, 5))
    search_var = tk.StringVar()
    search_entry = ttk.Entry(search_frame, textvariable=search_var, font=("Segoe UI", 11))
    search_entry.pack(fill="x", ipady=6)

    grouped_projects = group_projects_by_tab(projects)
    notebook = ttk.Notebook(root)
    notebook.pack(fill="both", expand=True, padx=24, pady=10)

    tab_views: dict[str, tuple[tk.Frame, tk.Canvas]] = {}
    visible_by_tab: dict[str, list[dict[str, object]]] = {
        tab: [] for tab in TAB_NAMES
    }
    for tab in TAB_NAMES:
        pane = tk.Frame(notebook, bg=BG)
        notebook.add(pane, text=tab)

        container = tk.Frame(pane, bg=BG)
        container.pack(fill="both", expand=True, padx=8, pady=10)
        canvas = tk.Canvas(container, bg=BG, highlightthickness=0)
        scrollbar = ttk.Scrollbar(container, orient="vertical", command=canvas.yview)
        scroll_frame = tk.Frame(canvas, bg=BG)
        window = canvas.create_window((0, 0), window=scroll_frame, anchor="nw")
        scroll_frame.bind(
            "<Configure>",
            lambda _event, value=canvas: value.configure(scrollregion=value.bbox("all")),
        )
        canvas.bind(
            "<Configure>",
            lambda event, value=canvas, item=window: value.itemconfigure(
                item, width=event.width
            ),
        )
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        tab_views[tab] = (scroll_frame, canvas)

    def active_tab() -> str:
        return TAB_NAMES[notebook.index(notebook.select())]

    def on_mousewheel(event: tk.Event) -> str | None:
        canvas = tab_views[active_tab()][1]
        num = getattr(event, "num", None)
        delta = getattr(event, "delta", 0)
        if num == 4:
            canvas.yview_scroll(-1, "units")
        elif num == 5:
            canvas.yview_scroll(1, "units")
        elif delta:
            units = -delta if sys.platform == "darwin" else -(delta / 120)
            canvas.yview_scroll(int(units), "units")
        return "break"

    root.bind_all("<MouseWheel>", on_mousewheel)
    root.bind_all("<Button-4>", on_mousewheel)
    root.bind_all("<Button-5>", on_mousewheel)

    def _unbind_mousewheel(event: tk.Event) -> None:
        if event.widget is not root:
            return
        root.unbind_all("<MouseWheel>")
        root.unbind_all("<Button-4>")
        root.unbind_all("<Button-5>")

    root.bind("<Destroy>", _unbind_mousewheel)

    def render_projects(*_args: object) -> None:
        query = search_var.get().strip().casefold()
        for tab in TAB_NAMES:
            scroll_frame, canvas = tab_views[tab]
            for child in scroll_frame.winfo_children():
                child.destroy()

            visible = [
                project
                for project in grouped_projects[tab]
                if not query
                or query
                in " ".join(
                    str(project[field])
                    for field in (
                        "lifecycle",
                        "group",
                        "set_name",
                        "doc_number",
                        "doc_title",
                        "title",
                        "name",
                        "path",
                    )
                ).casefold()
            ]
            visible_by_tab[tab] = visible
            if not visible:
                message = (
                    "No projects match this search."
                    if query
                    else f"No {tab} projects found."
                )
                tk.Label(
                    scroll_frame,
                    text=message,
                    font=("Segoe UI", 11),
                    fg=MUTED,
                    bg=BG,
                ).pack(anchor="w", pady=18)
                canvas.yview_moveto(0)
                continue

            prior_group: tuple[str, object] | None = None
            for project in visible:
                group_key = (str(project["group"]), project["set_name"])
                if group_key != prior_group:
                    set_suffix = f" / {group_key[1]}" if group_key[1] else ""
                    tk.Label(
                        scroll_frame,
                        text=f"{group_key[0]}{set_suffix}",
                        font=("Segoe UI", 11, "bold"),
                        fg=ACCENT,
                        bg=BG,
                    ).pack(anchor="w", pady=(12 if prior_group else 0, 8))
                    prior_group = group_key

                project_path = project["path"]
                card = tk.Frame(
                    scroll_frame,
                    bg=PANEL,
                    padx=16,
                    pady=13,
                    highlightbackground="#343747",
                    highlightthickness=1,
                )
                card.pack(fill="x", pady=(0, 12))
                card.columnconfigure(0, weight=1)

                tk.Label(
                    card,
                    text=str(project["title"]),
                    font=("Segoe UI", 12, "bold"),
                    fg=TEXT,
                    bg=PANEL,
                ).grid(row=0, column=0, sticky="w")
                tk.Label(
                    card,
                    text=f"{project['doc_title']} · {project['name']} · {project['count']} cards",
                    font=("Segoe UI", 9),
                    fg=MUTED,
                    bg=PANEL,
                ).grid(row=1, column=0, sticky="w", pady=(4, 0))
                tk.Label(
                    card,
                    text=str(project["relative"]),
                    font=("Consolas", 8),
                    fg=BLUE,
                    bg=PANEL,
                    wraplength=560,
                    justify="left",
                ).grid(row=2, column=0, sticky="w", pady=(5, 0))

                button_frame = tk.Frame(card, bg=PANEL)
                button_frame.grid(row=0, column=1, rowspan=3, padx=(18, 0), sticky="e")
                ttk.Button(
                    button_frame,
                    text="Open in MSE",
                    style="Accent.TButton",
                    command=lambda path=project_path: open_project(path),
                ).pack(fill="x")
                ttk.Button(
                    button_frame,
                    text="Copy path",
                    style="Secondary.TButton",
                    command=lambda path=project_path: copy_path(root, str(path)),
                ).pack(fill="x", pady=(8, 0))

            canvas.yview_moveto(0)

    def open_first_result(_event: tk.Event | None = None) -> None:
        visible = visible_by_tab[active_tab()]
        if visible:
            open_project(visible[0]["path"])

    def clear_search(_event: tk.Event | None = None) -> None:
        search_var.set("")
        search_entry.focus_set()

    search_var.trace_add("write", render_projects)
    search_entry.bind("<Return>", open_first_result)
    search_entry.bind("<Escape>", clear_search)
    root.bind("<Control-f>", lambda _event: search_entry.focus_set())
    render_projects()
    search_entry.focus_set()

    executable_label = str(MSE_CONFIG.executable) if MSE_CONFIG else "not configured — run python launcher/setup_mse.py"
    footer = tk.Label(
        root,
        text=f"MSE executable: {executable_label}",
        font=("Segoe UI", 9),
        fg=MUTED,
        bg=BG,
    )
    footer.pack(anchor="w", padx=24, pady=(0, 12))

    root.mainloop()


def main() -> None:
    projects = discover_projects()
    if "--list" in sys.argv:
        for project in projects:
            print(
                f"{project['lifecycle']} | {project['group']} | "
                f"{project['title']} | {project['count']} | {project['relative']}"
            )
        return
    if tk is None or messagebox is None or ttk is None:
        raise RuntimeError("Tk is unavailable; use a Python build with tkinter or pass --list")
    build_gui(projects)


if __name__ == "__main__":
    main()
