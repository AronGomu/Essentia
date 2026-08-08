#!/usr/bin/env python3
"""Convert a raster logo into a Magic Set Editor ``.mse-symbol`` file.

MSE only stores set symbols as vector ``.mse-symbol`` packages; the GUI's
"load image" path greyscales, hard-thresholds and edge-traces the bitmap.
This script reproduces that pipeline headlessly so a symbol can be wired into
a set without opening the symbol editor.

The contour walk is a direct port of ``read_symbol_shape`` from MSE's
``src/data/format/image_to_symbol.cpp``; the staircase it produces is then
reduced with Ramer-Douglas-Peucker instead of MSE's bezier fitter.

Requires ImageMagick (``magick``) on PATH. No Python dependencies.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

EMPTY = 0
FULL = 1
MARKED = 2

MSE_SYMBOL_VERSION = "0.3.5"


def rasterise(path: Path, size: int, trim: bool, margin: float) -> tuple[list[int], int, int]:
    """Return a FULL/EMPTY grid, with FULL meaning 'ink'.

    The source is flattened onto white, greyscaled and hard-thresholded, which
    is exactly what MSE does to any imported bitmap.
    """
    args = ["magick", str(path), "-background", "white", "-alpha", "remove", "-alpha", "off"]
    args += ["-colorspace", "Gray", "-threshold", "50%"]
    if trim:
        # Crop to the ink, then re-pad evenly so the mark fills the symbol box.
        pad = int(round(size * margin))
        inner = max(1, size - 2 * pad)
        args += [
            "-trim", "+repage",
            "-resize", f"{inner}x{inner}",
            "-gravity", "center",
            "-background", "white",
            "-extent", f"{size}x{size}",
        ]
    else:
        args += ["-resize", f"{size}x{size}!"]
    args += ["-threshold", "50%", "-compress", "none", "pgm:-"]

    out = subprocess.run(args, check=True, capture_output=True).stdout.decode("ascii")

    tokens: list[str] = []
    for line in out.splitlines():
        line = line.split("#", 1)[0]
        tokens.extend(line.split())
    if not tokens or tokens[0] != "P2":
        raise SystemExit("magick did not return an ASCII PGM")
    width, height = int(tokens[1]), int(tokens[2])
    values = [int(v) for v in tokens[4 : 4 + width * height]]
    # Dark pixels are the ink. MSE arrives at the same polarity via its
    # border-majority inversion check.
    return [FULL if v < 128 else EMPTY for v in values], width, height


class Grid:
    def __init__(self, data: list[int], width: int, height: int) -> None:
        self.data = data
        self.width = width
        self.height = height

    def get(self, x: int, y: int) -> int:
        if x < 0 or x >= self.width or y < 0 or y >= self.height:
            return EMPTY
        return self.data[x + y * self.width]

    def mark(self, x: int, y: int) -> None:
        if 0 <= x < self.width and 0 <= y < self.height:
            self.data[x + y * self.width] |= MARKED


def find_start(grid: Grid) -> tuple[int, int] | None:
    for x in range(grid.width):
        for y in range(grid.height):
            if grid.get(x, y) == FULL and grid.get(x, y - 1) == EMPTY:
                return x, y
    return None


def read_shape(grid: Grid) -> tuple[list[tuple[float, float]], str] | None:
    start = find_start(grid)
    if start is None:
        return None
    xs, ys = start
    grid.mark(xs, ys)

    points: list[tuple[float, float]] = []
    xs += 1  # start right of the found point, so last_move is well defined
    x, y = xs, ys
    old_x, old_y = x, y
    last_move = 1

    while True:
        a = grid.get(x - 1, y - 1) & FULL
        b = grid.get(x, y - 1) & FULL
        c = grid.get(x - 1, y) & FULL
        d = grid.get(x, y) & FULL
        pack = (a << 12) | (b << 8) | (c << 4) | d
        if pack == 0x0001:
            x += 1
        elif pack == 0x0010:
            y += 1
        elif pack == 0x0011:
            x += 1
        elif pack == 0x0100:
            y -= 1
        elif pack == 0x0101:
            y -= 1
        elif pack == 0x0110:
            y -= last_move
        elif pack == 0x0111:
            y -= 1
        elif pack == 0x1000:
            x -= 1
        elif pack == 0x1001:
            x += last_move
        elif pack == 0x1010:
            y += 1
        elif pack == 0x1011:
            x += 1
        elif pack == 0x1100:
            x -= 1
        elif pack == 0x1101:
            x -= 1
        elif pack == 0x1110:
            y += 1
        else:
            raise SystemExit("contour walk ended up in the ground/air")

        points.append((x / grid.width, y / grid.height))
        if x > old_x:
            grid.mark(old_x, y)  # only mark the top edge, as MSE does
        last_move = (x + y) - (old_x + old_y)
        old_x, old_y = x, y
        if x == xs and y == ys:
            break

    combine = "subtract" if grid.get(x - 2, y - 1) & FULL else "merge"
    return points, combine


def perpendicular_distance(
    p: tuple[float, float], a: tuple[float, float], b: tuple[float, float]
) -> float:
    dx, dy = b[0] - a[0], b[1] - a[1]
    if dx == 0.0 and dy == 0.0:
        return ((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2) ** 0.5
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    px, py = a[0] + t * dx, a[1] + t * dy
    return ((p[0] - px) ** 2 + (p[1] - py) ** 2) ** 0.5


def simplify(points: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    """Ramer-Douglas-Peucker over a closed ring."""
    if len(points) < 4:
        return points

    def rdp(pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
        if len(pts) < 3:
            return pts
        worst, index = 0.0, 0
        for i in range(1, len(pts) - 1):
            d = perpendicular_distance(pts[i], pts[0], pts[-1])
            if d > worst:
                worst, index = d, i
        if worst <= tolerance:
            return [pts[0], pts[-1]]
        return rdp(pts[: index + 1])[:-1] + rdp(pts[index:])

    # Split the ring at its two most distant-ish anchors so RDP has endpoints.
    half = len(points) // 2
    kept = rdp(points[: half + 1])[:-1] + rdp(points[half:])[:-1]
    return kept


def render_symbol(shapes: list[tuple[list[tuple[float, float]], str]]) -> str:
    lines = [f"mse_version: {MSE_SYMBOL_VERSION}"]
    for points, combine in shapes:
        lines.append("part:")
        lines.append("\ttype: shape")
        lines.append("\tname: ")
        lines.append(f"\tcombine: {combine}")
        for px, py in points:
            lines.append("\tpoint:")
            lines.append(f"\t\tposition: ({px:.10f},{py:.10f})")
            lines.append("\t\tlock: free")
            lines.append("\t\tline_after: line")
    return "\n".join(lines) + "\n"


def convert(
    source: Path, size: int, tolerance: float, trim: bool, margin: float
) -> tuple[str, list[tuple[list[tuple[float, float]], str]]]:
    data, width, height = rasterise(source, size, trim, margin)
    grid = Grid(data, width, height)
    shapes: list[tuple[list[tuple[float, float]], str]] = []
    while True:
        shape = read_shape(grid)
        if shape is None:
            break
        points, combine = shape
        points = simplify(points, tolerance)
        if len(points) >= 3:
            shapes.append((points, combine))
    shapes.reverse()  # MSE stores the first-found shape last
    if not shapes:
        raise SystemExit("no shapes traced -- is the image blank after thresholding?")
    return render_symbol(shapes), shapes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="input raster image")
    parser.add_argument("output", type=Path, help="output .mse-symbol file")
    parser.add_argument("--size", type=int, default=300, help="trace resolution (default 300)")
    parser.add_argument(
        "--tolerance",
        type=float,
        default=0.004,
        help="RDP simplification tolerance in symbol units (default 0.004)",
    )
    parser.add_argument("--no-trim", action="store_true", help="keep the source margins as-is")
    parser.add_argument(
        "--margin", type=float, default=0.04, help="margin fraction when trimming (default 0.04)"
    )
    args = parser.parse_args()

    text, shapes = convert(args.source, args.size, args.tolerance, not args.no_trim, args.margin)
    args.output.write_bytes(b"\xef\xbb\xbf" + text.encode("utf-8"))
    total = sum(len(p) for p, _ in shapes)
    print(f"{args.output}: {len(shapes)} shape(s), {total} point(s)")
    for i, (points, combine) in enumerate(shapes):
        print(f"  part {i}: {combine}, {len(points)} points")
    return 0


if __name__ == "__main__":
    sys.exit(main())
