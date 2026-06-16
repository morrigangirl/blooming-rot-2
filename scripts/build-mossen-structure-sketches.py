#!/usr/bin/env python3
"""Build clean architectural floor-plan sketches for Mossen Place floors 2 and 3.

The output PNGs are used as referenceImages for the gpt-image-2 /images/edits
endpoint, which paints them in Dyson-Logos battle-map style while preserving
wall and door positions.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "_reference"
OUT_DIR.mkdir(parents=True, exist_ok=True)

W, H = 1024, 1536
BG = (245, 240, 225)      # warm parchment
WALL = (20, 20, 25)        # near-black
DOOR_ARC = (180, 60, 40)   # rust-red for visibility
STAIR = (60, 70, 90)       # slate
LABEL = (40, 40, 50)

OUTER = 6                   # outer-wall thickness
INNER = 4                   # interior-wall thickness
PX_PER_FT = 40              # building 24x36 ft scales to 960x1440 px

MARGIN_X = (W - 24 * PX_PER_FT) // 2     # 32
MARGIN_Y_TOP = 48
MARGIN_Y_BOT = H - (MARGIN_Y_TOP + 36 * PX_PER_FT)  # remainder at bottom

def ft_to_px(x_ft, y_ft):
    return MARGIN_X + x_ft * PX_PER_FT, MARGIN_Y_TOP + y_ft * PX_PER_FT


def load_font(size):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf",
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def draw_wall(draw, x0_ft, y0_ft, x1_ft, y1_ft, thickness=INNER):
    p0 = ft_to_px(x0_ft, y0_ft)
    p1 = ft_to_px(x1_ft, y1_ft)
    draw.line([p0, p1], fill=WALL, width=thickness)


def draw_outer_box(draw):
    tl = ft_to_px(0, 0)
    br = ft_to_px(24, 36)
    draw.rectangle([tl, br], outline=WALL, width=OUTER)


def draw_door_on_wall(draw, hinge_ft, swing_to_ft, width_ft=3):
    """Draw a standard floor-plan door symbol.

    hinge_ft = (x, y) hinge point in feet.
    swing_to_ft = (x, y) point the door swings to (its open-end tip).
    Width is the door leaf length (defaults 3 ft).
    """
    hx, hy = hinge_ft
    sx, sy = swing_to_ft
    # door leaf (straight line)
    p_hinge = ft_to_px(hx, hy)
    p_swing = ft_to_px(sx, sy)
    draw.line([p_hinge, p_swing], fill=DOOR_ARC, width=3)
    # arc showing swing — bounding box centered on hinge
    r = width_ft * PX_PER_FT
    bbox = [p_hinge[0] - r, p_hinge[1] - r, p_hinge[0] + r, p_hinge[1] + r]
    # compute start/end angles from hinge to swing
    import math
    dx = p_swing[0] - p_hinge[0]
    dy = p_swing[1] - p_hinge[1]
    # PIL angles: 0 = east, clockwise
    end_angle = math.degrees(math.atan2(dy, dx))
    # swing 90 degrees back toward the wall surface
    # determine wall direction: if hinge->swing is horizontal, wall is vertical, arc 90 ccw
    if abs(dx) > abs(dy):
        start_angle = end_angle - 90
    else:
        start_angle = end_angle - 90
    draw.arc(bbox, start=start_angle, end=end_angle, fill=DOOR_ARC, width=2)


def door_gap_horizontal(draw, x_ft, y_ft, width_ft=3, swing="down"):
    """Mark a door on a horizontal wall (wall runs E-W).
    Erases wall in the gap and draws door symbol.
    swing: 'down' (south) or 'up' (north).
    """
    p_left = ft_to_px(x_ft, y_ft)
    p_right = ft_to_px(x_ft + width_ft, y_ft)
    # erase wall in gap by painting BG over it
    draw.rectangle([p_left[0], p_left[1] - 5, p_right[0], p_right[1] + 5], fill=BG)
    # door leaf and arc
    if swing == "down":
        hinge = (x_ft, y_ft)
        swing_to = (x_ft, y_ft + width_ft)
    else:
        hinge = (x_ft + width_ft, y_ft)
        swing_to = (x_ft + width_ft, y_ft - width_ft)
    draw_door_on_wall(draw, hinge, swing_to, width_ft)


def door_gap_vertical(draw, x_ft, y_ft, height_ft=3, swing="right"):
    """Mark a door on a vertical wall (wall runs N-S).
    swing: 'right' (east) or 'left' (west).
    """
    p_top = ft_to_px(x_ft, y_ft)
    p_bot = ft_to_px(x_ft, y_ft + height_ft)
    draw.rectangle([p_top[0] - 5, p_top[1], p_bot[0] + 5, p_bot[1]], fill=BG)
    if swing == "right":
        hinge = (x_ft, y_ft)
        swing_to = (x_ft + height_ft, y_ft)
    else:
        hinge = (x_ft, y_ft + height_ft)
        swing_to = (x_ft - height_ft, y_ft + height_ft)
    draw_door_on_wall(draw, hinge, swing_to, height_ft)


def label(draw, text, x_ft, y_ft, size=34, anchor="mm"):
    font = load_font(size)
    px = ft_to_px(x_ft, y_ft)
    draw.text(px, text, fill=LABEL, font=font, anchor=anchor)


def draw_stair_lines(draw, x0_ft, y0_ft, x1_ft, y1_ft, n_steps=10,
                     direction="up", travel="ns"):
    """Draw parallel hash marks for a staircase between two corners.

    travel: 'ns' (north-south, steps drawn as horizontal lines) or
            'ew' (east-west, steps drawn as vertical lines).
    direction: 'up' = arrow ↑ at center; 'down' = arrow ↓.
    """
    p0 = ft_to_px(x0_ft, y0_ft)
    p1 = ft_to_px(x1_ft, y1_ft)
    x0p, y0p = p0
    x1p, y1p = p1
    if travel == "ns":
        step = (y1p - y0p) / n_steps
        for i in range(n_steps + 1):
            y = y0p + i * step
            draw.line([(x0p, y), (x1p, y)], fill=STAIR, width=2)
    else:
        step = (x1p - x0p) / n_steps
        for i in range(n_steps + 1):
            x = x0p + i * step
            draw.line([(x, y0p), (x, y1p)], fill=STAIR, width=2)
    cx = (x0p + x1p) / 2
    cy = (y0p + y1p) / 2
    arrow_font = load_font(48)
    draw.text((cx, cy), "↑" if direction == "up" else "↓", fill=STAIR,
              font=arrow_font, anchor="mm")


def build_floor_2():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw_outer_box(draw)

    # Compass marker
    label(draw, "N ↑", 12, -0.6, size=28)
    label(draw, "MOSSEN PLACE — SECOND FLOOR (24 × 36 ft)",
          12, 36.7, size=26)

    # ---- Interior walls ----
    # Master bedroom south wall (y=10), full width
    draw_wall(draw, 0, 10, 24, 10)
    # Bath south wall (y=16), east half x 12-24
    draw_wall(draw, 12, 16, 24, 16)
    # Bath west wall = stair-well west wall (x=12), runs y 10-28
    draw_wall(draw, 12, 10, 12, 28)
    # Stair-well south wall (y=28), east half
    draw_wall(draw, 12, 28, 24, 28)
    # Library/Dining east wall (x=9), runs y 10-36 (corridor west boundary)
    draw_wall(draw, 9, 10, 9, 36)
    # Library/Dining divider (y=22), x 0-9
    draw_wall(draw, 0, 22, 9, 22)
    # Corridor east wall = same as stair-well west wall already drawn (x=12)
    # SE alcove north wall = stair-well south wall (y=28)
    # SE alcove west wall = stair-well west wall extended south
    # Actually corridor extends south of stair well to y=36, so the east boundary
    # of the corridor between y=28 and y=36 is the west wall of the SE alcove.
    draw_wall(draw, 12, 28, 12, 36)

    # ---- Doors ----
    # Master → corridor: gap on master south wall at x 10.5-13.5 (centered above corridor)
    door_gap_horizontal(draw, 10, 10, width_ft=3, swing="down")
    # Library → corridor: gap on library east wall at y 14-17
    door_gap_vertical(draw, 9, 14, height_ft=3, swing="right")
    # Dining → corridor: gap on dining east wall at y 26-29
    door_gap_vertical(draw, 9, 26, height_ft=3, swing="right")
    # Stair-well → corridor: gap on stair-well west wall at y 18-21 (south of bath)
    door_gap_vertical(draw, 12, 18, height_ft=3, swing="left")
    # Bath → stair-well landing: gap on bath south wall at x 17-20
    door_gap_horizontal(draw, 17, 16, width_ft=3, swing="down")
    # SE alcove → corridor: gap on alcove west wall at y 31-34
    door_gap_vertical(draw, 12, 31, height_ft=3, swing="left")

    # ---- Stairs inside stair well ----
    # Down stair: north half of well (y 16-22) — top step arriving from floor 1
    #             at north, fading south as it descends. Arrow ↓ = travel down.
    draw_stair_lines(draw, 13, 16, 23, 22, n_steps=10,
                     direction="down", travel="ns")
    # Up stair: south half of well (y 22-28) — bottom step at south, rising
    #          north toward floor 3. Arrow ↑ = travel up.
    draw_stair_lines(draw, 13, 22, 23, 28, n_steps=10,
                     direction="up", travel="ns")

    # ---- Room labels ----
    label(draw, "M3 MASTER BEDROOM", 12, 5, size=32)
    label(draw, "M2 LIBRARY / STUDY", 4.5, 16, size=24)
    label(draw, "M1 DINING", 4.5, 29, size=26)
    label(draw, "M4 BATH", 18, 13, size=22)
    label(draw, "DOWN to 1st", 18, 17, size=18)
    label(draw, "UP to 3rd", 18, 27, size=18)
    label(draw, "(M5 stair well)", 18, 23.5, size=16)
    label(draw, "(small balcony alcove)", 18, 32, size=18)
    label(draw, "HALL", 10.5, 33, size=16)

    out_path = OUT_DIR / "mossen-2-structure.png"
    img.save(out_path)
    return out_path


def build_floor_3():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw_outer_box(draw)

    label(draw, "N ↑", 12, -0.6, size=28)
    label(draw, "MOSSEN PLACE — THIRD FLOOR (24 × 36 ft)",
          12, 36.7, size=26)

    # ---- Interior walls ----
    # Main N-S corridor east wall (x=9), runs y 0-36
    draw_wall(draw, 9, 0, 9, 36)
    # Stair well west wall (x=12), runs y 12-24
    draw_wall(draw, 12, 12, 12, 24)
    # Stair well north wall (y=12), x 12-24
    draw_wall(draw, 12, 12, 24, 12)
    # Stair well south wall (y=24), x 12-24
    draw_wall(draw, 12, 24, 24, 24)
    # T3 (NW) south wall (y=12), x 0-9
    draw_wall(draw, 0, 12, 9, 12)
    # T5 (Bath) south wall (y=18), x 0-9
    draw_wall(draw, 0, 18, 9, 18)
    # T6 (Linen) south wall (y=21), x 0-9
    draw_wall(draw, 0, 21, 9, 21)
    # T1 (SW) north wall is T6 south wall already drawn.

    # Seal corridor east side above and below stair well so T4/T2 don't bleed in:
    # corridor east wall (x=12) for y 0-12 (T4's west wall)
    draw_wall(draw, 12, 0, 12, 12)
    # corridor east wall (x=12) for y 24-36 (T2's west wall)
    draw_wall(draw, 12, 24, 12, 36)

    # ---- Doors ----
    # T3 → corridor: east wall at y 5-8
    door_gap_vertical(draw, 9, 5, height_ft=3, swing="right")
    # T5 → corridor: east wall at y 14.5-17.5
    door_gap_vertical(draw, 9, 14.5, height_ft=3, swing="right")
    # T6 → corridor: east wall at y 19-22 (small door, swings out)
    door_gap_vertical(draw, 9, 19, height_ft=2, swing="right")
    # T1 → corridor: east wall at y 28-31
    door_gap_vertical(draw, 9, 28, height_ft=3, swing="right")
    # T4 → stair-well landing: south wall at x 14-17 (into NE landing area of well)
    door_gap_horizontal(draw, 14, 12, width_ft=3, swing="down")
    # T2 → stair-well landing: north wall at x 14-17 (into SE landing area)
    door_gap_horizontal(draw, 14, 24, width_ft=3, swing="up")
    # Stair-well → corridor: west wall at y 17-20
    door_gap_vertical(draw, 12, 17, height_ft=3, swing="left")

    # ---- Stair inside well ----
    # Single stair arriving at SOUTH end of well (from floor 2's up-stair).
    # Landing fills the north half. Steps in y 19-24 region.
    draw_stair_lines(draw, 13, 19, 23, 24, n_steps=8,
                     direction="down", travel="ns")

    # Loose floorboard hint inside T6 linen closet
    p0 = ft_to_px(3, 19)
    p1 = ft_to_px(5, 20.5)
    draw.rectangle([p0, p1], outline=STAIR, width=2)
    label(draw, "loose board", 4, 20, size=14)

    # ---- Room labels ----
    label(draw, "T3 BEDROOM", 4.5, 6, size=24)
    label(draw, "T5 BATH", 4.5, 15, size=22)
    label(draw, "T6 LINEN", 4.5, 19.5, size=18)
    label(draw, "T1 BEDROOM", 4.5, 29, size=24)
    label(draw, "T4 BEDROOM", 18, 6, size=24)
    label(draw, "T2 BEDROOM", 18, 30, size=24)
    label(draw, "T7 STAIR LANDING", 18, 15, size=20)
    label(draw, "↑ from 2nd", 18, 22, size=16)
    label(draw, "HALL", 10.5, 1, size=18)

    out_path = OUT_DIR / "mossen-3-structure.png"
    img.save(out_path)
    return out_path


if __name__ == "__main__":
    p2 = build_floor_2()
    p3 = build_floor_3()
    print(f"wrote {p2}")
    print(f"wrote {p3}")
