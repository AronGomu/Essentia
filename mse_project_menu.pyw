#!/mnt/data/Softwares/Full-Magic-Pack-main/python-tk/bin/python3
"""Native no-terminal launcher for the Yu-Gi-Oh x Magic Cube MSE projects.

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
import tkinter as tk
from tkinter import messagebox, ttk

from mse_config import MSEConfig

ROOT = Path(__file__).resolve().parent
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
PROJECTS_ROOT = MSE_CONFIG.projects_dir if MSE_CONFIG else ROOT / "MSE_projects"

BG = "#181922"
PANEL = "#20222e"
TEXT = "#f5f1e8"
MUTED = "#b9b0a1"
ACCENT = "#d7a85a"
ACCENT_DARK = "#1b1408"
BLUE = "#8fd6ff"

DOCS_BY_PROJECT = {
    "03_YGO_Non_Archetype_Creatures.mse-set": (3, "03", "Non-archetype Creature"),
    "09_YGO_Non_Archetype_Non_Creatures.mse-set": (9, "09", "Non-archetype Non-creature"),
    "05_YGO_Staples_Fusion.mse-set": (5, "05", "Fusion"),
    "06_YGO_Staples_Synchro.mse-set": (6, "06", "Synchro"),
    "07_YGO_Staples_Xyz.mse-set": (7, "07", "Xyz"),
    "08_YGO_Staples_Link.mse-set": (8, "08", "Link"),
    "10_YGO_Burning_Abyss.mse-set": (10, "10", "Archétype : Burning Abyss"),
    "11_YGO_Shaddoll.mse-set": (11, "11", "Archétype : Shaddoll"),
    "11_YGO_Shaddoll_Fusion.mse-set": (11, "11", "Archétype : Shaddoll"),
    "12_YGO_Necroz.mse-set": (12, "12", "Archétype : Nekroz"),
    "12_YGO_Necroz_Synchro.mse-set": (12, "12", "Archétype : Nekroz"),
    "13_YGO_Spellbook.mse-set": (13, "13", "Archétype : Spellbook"),
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


def project_sort_key(project: Path) -> tuple[int, str]:
    doc_info = DOCS_BY_PROJECT.get(project.name)
    if doc_info:
        return doc_info[0], project.name.lower()
    return 999, project.name.lower()


def discover_projects() -> list[dict[str, object]]:
    projects = []
    if not PROJECTS_ROOT.exists():
        return projects
    for project in sorted(PROJECTS_ROOT.glob("*.mse-set"), key=project_sort_key):
        set_file = project / "set"
        if not set_file.exists():
            continue
        _sort, doc_number, doc_title = DOCS_BY_PROJECT.get(project.name, (999, "?", "Document non lié"))
        projects.append(
            {
                "name": project.name,
                "title": read_title(set_file) or project.stem,
                "count": count_cards(set_file),
                "path": project,
                "doc_number": doc_number,
                "doc_title": doc_title,
            }
        )
    return projects


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
        messagebox.showerror("MSE non configuré", CONFIG_ERROR or "Run `python setup_mse.py` first.")
        return
    if not MSE_CONFIG.executable.is_file():
        LOGGER.error("event=spawn.mse.rejected reason=missing_executable project=%s", project_path)
        messagebox.showerror(
            "MSE introuvable",
            f"Impossible de trouver MSE :\n{MSE_CONFIG.executable}\n\nRelancez `python setup_mse.py`.",
        )
        return
    if not project_path.is_dir() or not (project_path / "set").is_file():
        LOGGER.error("event=spawn.mse.rejected reason=invalid_project project=%s", project_path)
        messagebox.showerror("Projet introuvable", f"Projet MSE invalide :\n{project_path}")
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
        messagebox.showerror("Erreur MSE", f"Impossible d'ouvrir :\n{project_path}\n\n{exc}")


def copy_path(root: tk.Tk, value: str) -> None:
    root.clipboard_clear()
    root.clipboard_append(value)
    root.update()


def build_gui(projects: list[dict[str, object]]) -> None:
    root = tk.Tk()
    root.title("Yu-Gi-Oh x Magic Cube - MSE Menu")
    root.geometry("900x760")
    root.minsize(760, 520)
    root.configure(bg=BG)
    if LOGGING_ERROR is not None:
        root.after_idle(
            lambda: messagebox.showwarning(
                "Journal MSE indisponible",
                f"Impossible d'écrire .mse_launcher.log :\n{LOGGING_ERROR}",
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
        text="Double-clique ce fichier .pyw, puis clique sur un projet pour l'ouvrir directement dans MSE. Aucun terminal ne reste ouvert.",
        font=("Segoe UI", 10),
        fg=MUTED,
        bg=BG,
        wraplength=820,
        justify="left",
    ).pack(anchor="w", pady=(6, 0))

    if not projects:
        tk.Label(
            root,
            text=f"Aucun projet trouvé dans :\n{PROJECTS_ROOT}",
            font=("Segoe UI", 12),
            fg=TEXT,
            bg=BG,
        ).pack(padx=24, pady=30)
        root.mainloop()
        return

    search_frame = tk.Frame(root, bg=BG)
    search_frame.pack(fill="x", padx=24, pady=(6, 4))
    tk.Label(
        search_frame,
        text="Rechercher un projet",
        font=("Segoe UI", 10, "bold"),
        fg=TEXT,
        bg=BG,
    ).pack(anchor="w", pady=(0, 5))
    search_var = tk.StringVar()
    search_entry = ttk.Entry(search_frame, textvariable=search_var, font=("Segoe UI", 11))
    search_entry.pack(fill="x", ipady=6)

    container = tk.Frame(root, bg=BG)
    container.pack(fill="both", expand=True, padx=24, pady=10)

    canvas = tk.Canvas(container, bg=BG, highlightthickness=0)
    scrollbar = ttk.Scrollbar(container, orient="vertical", command=canvas.yview)
    scroll_frame = tk.Frame(canvas, bg=BG)

    scroll_frame.bind("<Configure>", lambda _event: canvas.configure(scrollregion=canvas.bbox("all")))
    canvas.create_window((0, 0), window=scroll_frame, anchor="nw")
    canvas.configure(yscrollcommand=scrollbar.set)

    canvas.pack(side="left", fill="both", expand=True)
    scrollbar.pack(side="right", fill="y")

    def on_mousewheel(event: tk.Event) -> str | None:
        # Windows/macOS: <MouseWheel> + delta. Linux/X11: <Button-4>/<Button-5>.
        num = getattr(event, "num", None)
        delta = getattr(event, "delta", 0)
        if num == 4:
            canvas.yview_scroll(-1, "units")
        elif num == 5:
            canvas.yview_scroll(1, "units")
        elif delta:
            if sys.platform == "darwin":
                canvas.yview_scroll(int(-1 * delta), "units")
            else:
                canvas.yview_scroll(int(-1 * (delta / 120)), "units")
        return "break"

    # bind_all so wheel works over nested card widgets, not only bare canvas.
    canvas.bind_all("<MouseWheel>", on_mousewheel)
    canvas.bind_all("<Button-4>", on_mousewheel)
    canvas.bind_all("<Button-5>", on_mousewheel)

    def _unbind_mousewheel(event: tk.Event) -> None:
        if event.widget is not root:
            return
        canvas.unbind_all("<MouseWheel>")
        canvas.unbind_all("<Button-4>")
        canvas.unbind_all("<Button-5>")

    root.bind("<Destroy>", _unbind_mousewheel)

    visible_projects: list[dict[str, object]] = []

    def render_projects(*_args: object) -> None:
        nonlocal visible_projects
        for child in scroll_frame.winfo_children():
            child.destroy()

        query = search_var.get().strip().casefold()
        visible_projects = [
            project
            for project in projects
            if not query
            or query
            in " ".join(
                str(project[field])
                for field in ("doc_number", "doc_title", "title", "name", "path")
            ).casefold()
        ]

        if not visible_projects:
            tk.Label(
                scroll_frame,
                text="Aucun projet ne correspond à cette recherche.",
                font=("Segoe UI", 11),
                fg=MUTED,
                bg=BG,
            ).pack(anchor="w", pady=18)
            return

        for project in visible_projects:
            project_path = project["path"]
            card = tk.Frame(scroll_frame, bg=PANEL, padx=16, pady=13, highlightbackground="#343747", highlightthickness=1)
            card.pack(fill="x", pady=(0, 12))
            card.columnconfigure(0, weight=1)

            tk.Label(
                card,
                text=f"{project['doc_number']} — {project['title']}",
                font=("Segoe UI", 12, "bold"),
                fg=TEXT,
                bg=PANEL,
            ).grid(row=0, column=0, sticky="w")
            tk.Label(
                card,
                text=f"Document {project['doc_number']} : {project['doc_title']} · {project['name']} · {project['count']} cartes",
                font=("Segoe UI", 9),
                fg=MUTED,
                bg=PANEL,
            ).grid(row=1, column=0, sticky="w", pady=(4, 0))
            tk.Label(
                card,
                text=str(project_path),
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
        if visible_projects:
            open_project(visible_projects[0]["path"])

    def clear_search(_event: tk.Event | None = None) -> None:
        search_var.set("")
        search_entry.focus_set()

    search_var.trace_add("write", render_projects)
    search_entry.bind("<Return>", open_first_result)
    search_entry.bind("<Escape>", clear_search)
    root.bind("<Control-f>", lambda _event: search_entry.focus_set())
    render_projects()
    search_entry.focus_set()

    executable_label = str(MSE_CONFIG.executable) if MSE_CONFIG else "not configured — run python setup_mse.py"
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
            print(f"{project['doc_number']} | {project['doc_title']} | {project['title']} | {project['count']} | {project['path']}")
        return
    build_gui(projects)


if __name__ == "__main__":
    main()
