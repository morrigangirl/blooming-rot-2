#!/usr/bin/env python3
"""Blooming Rot 2 — GM Prep PDF generator.

Reads the journal pages and actor biographies from `packs/_source/`, the
illustrations and portraits from `assets/`, and builds:

  docs/blooming-rot-2-gm-prep.pdf       (full 9-phase + sandbox doc)
  docs/phase-1.pdf  …  docs/phase-9.pdf (per-phase split for session prep)
  docs/sandbox.pdf

These docs are GM-facing, intentionally heavy — they contain spoilers,
flow diagrams, and the entire narrative text. They are NOT part of the
shipped Foundry module; they live in `docs/` so the GM can keep them
elsewhere (Drive, paper printout, tablet, etc.).

Run with:
    .venv-docs/bin/python scripts/build-gm-prep-pdf.py

Requires reportlab + beautifulsoup4 + lxml + Pillow.
"""

import json
import os
import re
import sys
from pathlib import Path
from html import unescape

from bs4 import BeautifulSoup, NavigableString
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.graphics.shapes import Drawing, Polygon, Rect, String, Line
from reportlab.graphics import renderPDF

# ---------------------------------------------------------------------------
# Paths & globals
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "packs" / "_source"
ASSETS = ROOT / "assets"
DOCS = ROOT / "docs"
DOCS.mkdir(exist_ok=True)
THUMBS = ROOT / ".build" / "pdf-thumbs"
THUMBS.mkdir(parents=True, exist_ok=True)

# Image compression caps (pixels wide, JPEG quality)
THUMB_SIZES = {
    "portrait": (480, 80),     # NPC card portraits
    "illustration": (1400, 82), # inline scene illustrations
    "cover": (1800, 85),        # cover page
}

PHASES = [
    {"n": 1, "title": "Loftwick's Return", "color": "#7c5a3d"},
    {"n": 2, "title": "The Dead Man's Receipts", "color": "#5a3d3d"},
    {"n": 3, "title": "The Hardby Investigation", "color": "#3d5a4d"},
    {"n": 4, "title": "The Rel Astra Confrontation", "color": "#3d3d5a"},
    {"n": 5, "title": "The Small Matter", "color": "#5a3d5a"},
    {"n": 6, "title": "The Brass Crow", "color": "#3d3d3d"},
    {"n": 7, "title": "The Seventh Question", "color": "#4a3d2a"},
    {"n": 8, "title": "The Stair Beneath Tarnsmere", "color": "#2a2a3d"},
    {"n": 9, "title": "Below the Clean Paper", "color": "#1a1a2a"},
]

PALETTE = {
    "ink": HexColor("#2a2218"),
    "rule": HexColor("#8a7a5e"),
    "accent": HexColor("#7c5a3d"),
    "callout_bg": HexColor("#f3ead9"),
    "callout_border": HexColor("#bda472"),
    "blockquote_bg": HexColor("#f7f1e3"),
    "blockquote_border": HexColor("#c9b88a"),
    "scene_box_fill": HexColor("#f9f3e2"),
    "scene_box_border": HexColor("#7c5a3d"),
    "scene_box_text": HexColor("#2a2218"),
    "decision_fill": HexColor("#f1d4b0"),
    "decision_border": HexColor("#7c5a3d"),
}

# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------

def make_styles():
    base = getSampleStyleSheet()
    s = {}
    s["doc_title"] = ParagraphStyle(
        "DocTitle", parent=base["Title"],
        fontName="Times-Bold", fontSize=36, leading=42,
        textColor=PALETTE["ink"], alignment=TA_CENTER, spaceAfter=24,
    )
    s["doc_subtitle"] = ParagraphStyle(
        "DocSubtitle", parent=base["Title"],
        fontName="Times-Italic", fontSize=16, leading=20,
        textColor=PALETTE["accent"], alignment=TA_CENTER, spaceAfter=12,
    )
    s["chapter_title"] = ParagraphStyle(
        "ChapterTitle", parent=base["Title"],
        fontName="Times-Bold", fontSize=28, leading=34,
        textColor=PALETTE["ink"], alignment=TA_LEFT, spaceBefore=8, spaceAfter=18,
    )
    s["chapter_eyebrow"] = ParagraphStyle(
        "ChapterEyebrow", parent=base["Normal"],
        fontName="Helvetica-Bold", fontSize=10, leading=12,
        textColor=PALETTE["accent"], alignment=TA_LEFT, spaceBefore=0, spaceAfter=2,
    )
    s["section_h"] = ParagraphStyle(
        "SectionH", parent=base["Heading1"],
        fontName="Times-Bold", fontSize=18, leading=22,
        textColor=PALETTE["ink"], spaceBefore=18, spaceAfter=8,
    )
    s["sub_h"] = ParagraphStyle(
        "SubH", parent=base["Heading2"],
        fontName="Times-Bold", fontSize=13, leading=16,
        textColor=PALETTE["accent"], spaceBefore=10, spaceAfter=4,
    )
    s["body"] = ParagraphStyle(
        "Body", parent=base["Normal"],
        fontName="Times-Roman", fontSize=10.5, leading=14,
        textColor=PALETTE["ink"], alignment=TA_JUSTIFY, spaceAfter=6,
    )
    s["body_cap"] = ParagraphStyle(
        "BodyCap", parent=s["body"],
        fontName="Times-Italic", fontSize=9.5, leading=12,
        textColor=PALETTE["accent"], alignment=TA_CENTER, spaceAfter=10,
    )
    s["read_aloud_intro"] = ParagraphStyle(
        "ReadAloudIntro", parent=s["body"],
        fontName="Times-Italic", textColor=PALETTE["accent"], spaceAfter=2,
    )
    s["blockquote"] = ParagraphStyle(
        "Blockquote", parent=s["body"],
        fontName="Times-Italic", fontSize=10.5, leading=14,
        leftIndent=18, rightIndent=18, spaceBefore=4, spaceAfter=8,
        backColor=PALETTE["blockquote_bg"], borderColor=PALETTE["blockquote_border"],
        borderWidth=0, borderPadding=8,
    )
    s["callout_h"] = ParagraphStyle(
        "CalloutH", parent=base["Normal"],
        fontName="Helvetica-Bold", fontSize=10, leading=12,
        textColor=PALETTE["accent"], spaceAfter=2,
    )
    s["callout_body"] = ParagraphStyle(
        "CalloutBody", parent=s["body"],
        fontName="Times-Roman", fontSize=9.5, leading=12.5,
        leftIndent=8, rightIndent=8, spaceBefore=2, spaceAfter=2,
    )
    s["npc_name"] = ParagraphStyle(
        "NPCName", parent=base["Heading2"],
        fontName="Times-Bold", fontSize=13, leading=16,
        textColor=PALETTE["ink"], spaceBefore=4, spaceAfter=2,
    )
    s["npc_role"] = ParagraphStyle(
        "NPCRole", parent=base["Normal"],
        fontName="Helvetica-Oblique", fontSize=9, leading=11,
        textColor=PALETTE["accent"], spaceAfter=4,
    )
    s["npc_bio"] = ParagraphStyle(
        "NPCBio", parent=s["body"],
        fontSize=9.5, leading=12.5, alignment=TA_LEFT, spaceAfter=4,
    )
    s["meta"] = ParagraphStyle(
        "Meta", parent=base["Normal"],
        fontName="Helvetica", fontSize=9, leading=11,
        textColor=HexColor("#6b5b3c"), alignment=TA_CENTER, spaceAfter=2,
    )
    s["toc_h1"] = ParagraphStyle(
        "TOC1", parent=base["Normal"],
        fontName="Times-Bold", fontSize=12, leftIndent=0, leading=18,
    )
    s["toc_h2"] = ParagraphStyle(
        "TOC2", parent=base["Normal"],
        fontName="Times-Roman", fontSize=10.5, leftIndent=18, leading=14,
    )
    return s

# ---------------------------------------------------------------------------
# HTML → ReportLab flowables
# ---------------------------------------------------------------------------

# Foundry images point to module paths like
# "modules/blooming-rot-2/assets/illustrations/foo.png".
# Rewrite to local FS path (ROOT / assets / illustrations / foo.png).
def _local_image_path(src):
    s = src or ""
    s = re.sub(r"^modules/blooming-rot-2/", "", s)
    p = ROOT / s
    if p.exists():
        return str(p)
    # Fallback: maybe it's already a local path
    p2 = ROOT / "assets" / Path(s).name
    if p2.exists():
        return str(p2)
    return None


def _thumb(src_path, kind="illustration"):
    """Return a path to a compressed JPEG thumbnail of src_path.

    Caches in THUMBS/ keyed by (relpath, kind, mtime). Skips if the file
    is already a small JPEG (< 200 KB).
    """
    if not src_path:
        return None
    src = Path(src_path)
    if not src.exists():
        return None
    max_w, quality = THUMB_SIZES.get(kind, THUMB_SIZES["illustration"])
    # Cache key
    try:
        mtime = int(src.stat().st_mtime)
    except OSError:
        mtime = 0
    rel = src.resolve().relative_to(ROOT) if str(src).startswith(str(ROOT)) else src.name
    safe_rel = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(rel))
    cache_path = THUMBS / f"{safe_rel}__{kind}_{max_w}_{quality}_{mtime}.jpg"
    if cache_path.exists():
        return str(cache_path)
    try:
        from PIL import Image as PILImage
        im = PILImage.open(src)
        # Convert RGBA → RGB on white (JPEG can't carry alpha)
        if im.mode in ("RGBA", "LA"):
            bg = PILImage.new("RGB", im.size, (255, 255, 255))
            mask = im.split()[-1]
            bg.paste(im.convert("RGB"), mask=mask)
            im = bg
        elif im.mode != "RGB":
            im = im.convert("RGB")
        # Resize down to max width
        w, h = im.size
        if w > max_w:
            new_h = int(h * max_w / w)
            im = im.resize((max_w, new_h), PILImage.LANCZOS)
        im.save(cache_path, "JPEG", quality=quality, optimize=True, progressive=True)
        return str(cache_path)
    except Exception as e:
        print(f"  thumb fail: {src} ({e})")
        return str(src)  # fall back to raw

def _inline_to_rl(node):
    """Convert inline HTML to ReportLab markup-friendly text."""
    if isinstance(node, NavigableString):
        return _escape(str(node))
    name = (node.name or "").lower()
    inner = "".join(_inline_to_rl(c) for c in node.children)
    if name in ("strong", "b"):
        return f"<b>{inner}</b>"
    if name in ("em", "i"):
        return f"<i>{inner}</i>"
    if name == "u":
        return f"<u>{inner}</u>"
    if name == "br":
        return "<br/>"
    if name == "a":
        href = node.get("href", "")
        if href:
            return f'<link href="{_escape_attr(href)}" color="#7c5a3d">{inner}</link>'
        return inner
    if name == "code":
        return f'<font face="Courier">{inner}</font>'
    if name == "small":
        return f'<font size="8">{inner}</font>'
    return inner

def _escape(s):
    return (s.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;"))

def _escape_attr(s):
    return s.replace('"', "&quot;")

def html_to_flowables(html, styles, max_image_width=5.5*inch):
    """Parse Foundry HTML and emit a list of ReportLab flowables.

    Handles: p, h1-h6, ul, ol, li, blockquote, img, hr, table (lightly),
    and the inline tags above.
    """
    if not html:
        return []
    # Foundry stores HTML inside JSON strings — make sure we got real HTML
    soup = BeautifulSoup(html, "lxml")
    flow = []

    def add_para(text, style):
        text = text.strip()
        if not text:
            return
        try:
            flow.append(Paragraph(text, style))
        except Exception:
            # If RL chokes on something, fall back to plain
            cleaned = re.sub(r"<[^>]+>", "", text)
            if cleaned.strip():
                flow.append(Paragraph(_escape(cleaned), style))

    def walk(node):
        for child in node.children:
            if isinstance(child, NavigableString):
                txt = str(child).strip()
                if txt:
                    add_para(_escape(txt), styles["body"])
                continue
            tag = (child.name or "").lower()
            if tag == "p":
                # Captions: italic + small inside <p style="font-style: italic">
                style_attr = (child.get("style") or "").lower()
                # Detect img-only paragraphs
                imgs = child.find_all("img")
                if imgs and not child.get_text(strip=True):
                    for img in imgs:
                        flow.extend(image_flowable(img, styles, max_image_width))
                    continue
                inner = "".join(_inline_to_rl(c) for c in child.children)
                style = styles["body"]
                if "italic" in style_attr or "text-align: center" in style_attr and "0.9em" in style_attr:
                    style = styles["body_cap"]
                # If contains an image inline with text
                if imgs:
                    # Emit image first then the text (rough ordering)
                    for img in imgs:
                        flow.extend(image_flowable(img, styles, max_image_width))
                    text_only = inner
                    # Strip <img> placeholders from inner if any survived
                    text_only = re.sub(r"<img[^>]*>", "", text_only)
                    add_para(text_only, style)
                else:
                    add_para(inner, style)
            elif tag in ("h1", "h2", "h3"):
                inner = "".join(_inline_to_rl(c) for c in child.children)
                add_para(inner, styles["section_h"])
            elif tag in ("h4", "h5", "h6"):
                inner = "".join(_inline_to_rl(c) for c in child.children)
                add_para(inner, styles["sub_h"])
            elif tag == "ul":
                for li in child.find_all("li", recursive=False):
                    li_inner = "".join(_inline_to_rl(c) for c in li.children)
                    add_para(f"• {li_inner}", styles["body"])
            elif tag == "ol":
                for i, li in enumerate(child.find_all("li", recursive=False), 1):
                    li_inner = "".join(_inline_to_rl(c) for c in li.children)
                    add_para(f"{i}. {li_inner}", styles["body"])
            elif tag == "blockquote":
                # Treat blockquote as the read-aloud / pull-quote block
                bq_inner = ""
                for c in child.find_all("p", recursive=False):
                    bq_inner += "".join(_inline_to_rl(cc) for cc in c.children) + "<br/><br/>"
                if not bq_inner:
                    bq_inner = "".join(_inline_to_rl(c) for c in child.children)
                bq_inner = bq_inner.rstrip("<br/>").strip()
                if bq_inner:
                    add_para(bq_inner, styles["blockquote"])
            elif tag == "img":
                flow.extend(image_flowable(child, styles, max_image_width))
            elif tag == "hr":
                flow.append(Spacer(1, 6))
            elif tag == "div" or tag == "section":
                walk(child)
            elif tag == "table":
                flow.extend(table_flowable(child, styles))
            else:
                # Unknown wrapper — recurse
                walk(child)

    # Body root: html → body, but Foundry HTML is fragments
    body = soup.body or soup
    walk(body)
    return flow

def image_flowable(img_node, styles, max_w):
    src = img_node.get("src", "")
    alt = img_node.get("alt", "") or ""
    path = _local_image_path(src)
    out = []
    if not path:
        return out
    thumb = _thumb(path, kind="illustration")
    if not thumb:
        return out
    try:
        from PIL import Image as PILImage
        pim = PILImage.open(thumb)
        w, h = pim.size
        ratio = w / h
        max_height = 5*inch
        target_w = min(max_w, 5.5*inch)
        target_h = target_w / ratio
        if target_h > max_height:
            target_h = max_height
            target_w = target_h * ratio
        out.append(Image(thumb, width=target_w, height=target_h))
    except Exception:
        pass
    if alt:
        out.append(Paragraph(_escape(alt), styles["body_cap"]))
    out.append(Spacer(1, 4))
    return out

def table_flowable(tbl, styles):
    rows = []
    for tr in tbl.find_all("tr"):
        cells = []
        for cell in tr.find_all(["td", "th"]):
            inner = "".join(_inline_to_rl(c) for c in cell.children)
            cells.append(Paragraph(inner, styles["body"]))
        if cells:
            rows.append(cells)
    if not rows:
        return []
    t = Table(rows, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BOX", (0,0), (-1,-1), 0.5, PALETTE["rule"]),
        ("INNERGRID", (0,0), (-1,-1), 0.25, PALETTE["rule"]),
        ("BACKGROUND", (0,0), (-1,0), PALETTE["callout_bg"]),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("PADDING", (0,0), (-1,-1), 4),
    ]))
    return [t, Spacer(1, 6)]

# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def load_jsons(directory):
    out = []
    if not directory.exists():
        return out
    for f in sorted(directory.iterdir()):
        if f.suffix != ".json":
            continue
        with open(f) as fh:
            out.append(json.load(fh))
    return out

def find_actor_portrait(actor):
    """Find a portrait file for an actor by name slug or actor.img path."""
    name = actor.get("name", "")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    # Look for slug-portrait.png in assets/portraits
    candidates = [
        ASSETS / "portraits" / f"{slug}-portrait.png",
        ASSETS / "portraits" / f"{slug}-portrait.webp",
        ASSETS / "portraits" / f"{slug}.png",
        ASSETS / "portraits" / f"{slug}.webp",
        # Some files use Title-Case
        ASSETS / "portraits" / f"{name.replace(' ', '-')}-Portrait.png",
        ASSETS / "portraits" / f"{name.replace(' ', '-')}-Portrait.webp",
    ]
    for c in candidates:
        if c.exists():
            return str(c)
    # Fall through to the actor's stored img if it's in our assets/
    img = actor.get("img", "") or ""
    img = re.sub(r"^modules/blooming-rot-2/", "", img)
    p = ROOT / img
    if p.exists() and p.suffix.lower() in (".png", ".jpg", ".webp"):
        return str(p)
    return None

# ---------------------------------------------------------------------------
# Per-phase flow diagrams
# ---------------------------------------------------------------------------
#
# Each phase has a concise "flow" description: scene boxes, branches,
# decision points. Hand-curated below to reflect the actual journal
# structure. The Drawing renders as a tree on the page.

FLOW = {
    1: {
        "title": "Phase 1 Flow — Loftwick's Return",
        "nodes": [
            ("arrival", "Northern approach\n→ Little Palace", "scene"),
            ("welcome", "Public welcome\n(Lambert + Caelith)", "scene"),
            ("evening", "First evening:\nbrief & rest", "scene"),
            ("strongroom", "Strong-Room reveal\n(Caelith's evidence)", "scene"),
            ("decide", "Players accept the\ncommission?", "decision"),
            ("forward", "Forward hook:\nthe eastern thread", "scene"),
            ("optional", "Optional First-Night\ncomplications", "side"),
        ],
        "edges": [
            ("arrival","welcome"), ("welcome","evening"),
            ("evening","strongroom"), ("strongroom","decide"),
            ("decide","forward"), ("evening","optional"),
        ],
    },
    2: {
        "title": "Phase 2 Flow — The Dead Man's Receipts",
        "nodes": [
            ("dep", "Departure\n+ Three Approaches", "scene"),
            ("inv", "Investigation:\nDoman's receipts", "scene"),
            ("ev", "Evidence dossier\n(C&V trail)", "scene"),
            ("int", "Interruptions:\nSarth + sergeants", "scene"),
            ("trina", "Encounter:\nTrina Alvere", "scene"),
            ("decide", "Confront or\nshadow Trina?", "decision"),
            ("hardby", "Forward:\non to Hardby", "scene"),
        ],
        "edges": [
            ("dep","inv"), ("inv","ev"), ("inv","int"), ("ev","trina"),
            ("int","trina"), ("trina","decide"), ("decide","hardby"),
        ],
    },
    3: {
        "title": "Phase 3 Flow — Hardby Investigation",
        "nodes": [
            ("arr", "Arrival in Hardby\n(approach scene)", "scene"),
            ("npcs", "Hardby NPCs:\nVeska, Castrian, Mira", "scene"),
            ("inv", "Investigation:\nC&V Hardby branch", "scene"),
            ("tarsh", "Coopered Wreck\n(Tarsh confrontation)", "scene"),
            ("rescue", "Tamsin Moraven\nrecovery", "scene"),
            ("decide", "Take to imperial court\nor private leverage?", "decision"),
            ("dep", "Departure:\non to Rel Astra", "scene"),
        ],
        "edges": [
            ("arr","npcs"), ("npcs","inv"), ("inv","tarsh"),
            ("tarsh","rescue"), ("rescue","decide"), ("decide","dep"),
        ],
    },
    4: {
        "title": "Phase 4 Flow — Rel Astra Confrontation",
        "nodes": [
            ("arr", "Arrival in Rel Astra\n(per chosen route)", "scene"),
            ("seats", "Three Seats\nstrategy", "scene"),
            ("npcs", "Rel Astra NPCs:\nadvocates + house staff", "scene"),
            ("conf", "Sereth confrontation\n(C&V office)", "scene"),
            ("decide", "Public exposure\nor private surrender?", "decision"),
            ("fin", "Phase finale:\nthe firm yields", "scene"),
        ],
        "edges": [
            ("arr","seats"), ("seats","npcs"), ("npcs","conf"),
            ("conf","decide"), ("decide","fin"),
        ],
    },
    5: {
        "title": "Phase 5 Flow — The Small Matter (Loftwick aftermath)",
        "nodes": [
            ("arr", "Arrival back\nin Loftwick", "scene"),
            ("brief", "Debrief:\nthe Council's case", "scene"),
            ("npcs", "Loftwick NPCs:\nThale, Voss, Brane, Pell", "scene"),
            ("leak", "Leak operation\n(Pell + courier chain)", "scene"),
            ("decide", "Quill: capture\nor watch?", "decision"),
            ("leads", "Leads & Finale:\nGreyhawk loose ends", "scene"),
        ],
        "edges": [
            ("arr","brief"), ("brief","npcs"), ("npcs","leak"),
            ("leak","decide"), ("decide","leads"),
        ],
    },
    7: {
        "title": "Phase 7 Flow — The Seventh Question (Cairn Hills)",
        "nodes": [
            ("aftermath", "Phase 6 aftermath:\nsort evidence + prisoners", "scene"),
            ("interp", "Consult interpretive\nsources (Iren, Aldea, Vone, Vetch)", "scene"),
            ("triang", "Build the triangulation:\n5 evidence categories", "scene"),
            ("counter", "Enemy countermeasures:\nroute-cleansing, false maps", "scene"),
            ("recon", "Field reconnaissance\ntoward Cairn Hills", "scene"),
            ("decide", "Did the party reach\nthe site in time?", "decision"),
            ("cairn", "Seven-Cut Cairn:\nsurface threshold found", "scene"),
            ("false", "False Stair (optional):\nenemy misdirection", "side"),
        ],
        "edges": [
            ("aftermath","interp"), ("interp","triang"), ("triang","counter"),
            ("counter","recon"), ("recon","decide"), ("decide","cairn"),
            ("counter","false"),
        ],
    },
    6: {
        "title": "Phase 6 Flow — The Brass Crow (Greyhawk City)",
        "nodes": [
            ("arr", "Arrival in\nGreyhawk City", "scene"),
            ("verth", "Tellan Verth\n(witness)", "scene"),
            ("nodes", "Three primary nodes:\nBrass Crow, Iren, Vone", "scene"),
            ("kr", "Kestrel & Reed\n+ Korre's address", "scene"),
            ("decide", "Subtle approach\nor force?", "decision"),
            ("cistern", "Old Stonecistern:\neleventh bell", "scene"),
            ("vec", "Branching opening\nfrom Phase 5", "side"),
        ],
        "edges": [
            ("arr","verth"), ("verth","nodes"), ("nodes","kr"),
            ("kr","decide"), ("decide","cistern"), ("arr","vec"),
        ],
    },
    8: {
        "title": "Phase 8 Flow — The Stair Beneath Tarnsmere",
        "nodes": [
            ("open", "Arrival at Tarnsmere\n(one of 6 openings A-F)", "scene"),
            ("surf", "Surface investigation:\ncairn, spur, tollhouse ruin", "scene"),
            ("yard", "Tollhouse Yard\nencounter (or avoidance)", "scene"),
            ("entry", "Hidden Stairhouse Entry\n(hearth plate / dry well)", "scene"),
            ("vault", "Toll Vault + Registry:\ngather tokens & phrases", "scene"),
            ("door", "Permission Door:\n6 methods + Elle's key", "decision"),
            ("eft", "Eft's body & journal\n(side discovery)", "side"),
            ("final", "Final Threshold Landing:\nthe lintel inscription", "scene"),
        ],
        "edges": [
            ("open","surf"), ("surf","yard"), ("yard","entry"),
            ("entry","vault"), ("vault","door"), ("door","final"),
            ("entry","eft"),
        ],
    },
    9: {
        "title": "Phase 9 Flow — Below the Clean Paper",
        "nodes": [
            ("open", "Descent from Tarnsmere\n(6 openings A-F)", "scene"),
            ("hall", "Account Hall + Registry:\nread the tally walls", "scene"),
            ("recover", "Recover evidence:\nFurnace Scrap, Crate Tag", "scene"),
            ("cell", "Sealed Witness Cell:\nmeet Merrit Osk (optional)", "side"),
            ("savax", "Encounter Route Warden Savax:\nclassify or fight", "scene"),
            ("gate", "Black Ledger Gate:\n7 methods + Sentinel", "decision"),
            ("fork", "Lower Route Fork:\nchoose Recovery, Escort, Supply,\nor retreat", "scene"),
        ],
        "edges": [
            ("open","hall"), ("hall","recover"), ("hall","cell"),
            ("recover","savax"), ("savax","gate"), ("gate","fork"),
            ("cell","gate"),
        ],
    },
}

def make_flow_diagram(phase_n):
    """Render the phase flow as a vertical-with-side-branch diagram.

    Layout:
      - "scene" / "decision" nodes stack in a single left column
      - "side" nodes hang off to the right at their declared row
      - Edges connect box EDGES (not centers), so lines never cross labels
    """
    spec = FLOW[phase_n]
    nodes = spec["nodes"]
    edges = spec["edges"]

    box_w, box_h = 170, 56
    h_gap, v_gap = 50, 32

    # Layout: main column at x=0, side column to the right
    main_idx = 0
    positions = {}
    for nid, label, kind in nodes:
        if kind == "side":
            # Place at the row of the LATEST main node (so it visually
            # branches off from there)
            x = box_w + h_gap
            y = -(max(main_idx - 1, 0)) * (box_h + v_gap)
        else:
            x = 0
            y = -main_idx * (box_h + v_gap)
            main_idx += 1
        positions[nid] = (x, y, label, kind)

    rows = main_idx
    width = box_w * 2 + h_gap + 20
    height = rows * (box_h + v_gap) + 40
    d = Drawing(width, height)

    # Convert (x, y) declared top-down to canvas bottom-up coordinates
    def to_canvas(x, y):
        return x, height - 20 + y - box_h

    def box_edges(nid):
        x, y, label, kind = positions[nid]
        cx, cy = to_canvas(x, y)
        return {
            "left":   (cx,             cy + box_h / 2),
            "right":  (cx + box_w,     cy + box_h / 2),
            "top":    (cx + box_w / 2, cy + box_h),
            "bottom": (cx + box_w / 2, cy),
            "center": (cx + box_w / 2, cy + box_h / 2),
            "kind":   kind,
        }

    # Draw edges first (so boxes paint on top)
    for src, dst in edges:
        if src not in positions or dst not in positions:
            continue
        se = box_edges(src)
        de = box_edges(dst)
        # Pick edge anchors: vertical for same-column, horizontal for side branches
        if abs(se["bottom"][0] - de["top"][0]) < 1:
            x1, y1 = se["bottom"]
            x2, y2 = de["top"]
        elif se["right"][0] < de["left"][0]:
            # arrow points right (main → side)
            x1, y1 = se["right"]
            x2, y2 = de["left"]
        elif se["left"][0] > de["right"][0]:
            # arrow points left (side → main)
            x1, y1 = se["left"]
            x2, y2 = de["right"]
        else:
            x1, y1 = se["bottom"]
            x2, y2 = de["top"]
        d.add(Line(x1, y1, x2, y2, strokeColor=PALETTE["rule"], strokeWidth=1.2))
        # Arrowhead at destination
        ah = 5
        # Determine direction from delta
        dx = x2 - x1
        dy = y2 - y1
        import math
        L = math.hypot(dx, dy) or 1
        ux, uy = dx / L, dy / L
        # Two perpendicular wing points
        px, py = -uy, ux
        wing1 = (x2 - ah * ux + ah * 0.6 * px, y2 - ah * uy + ah * 0.6 * py)
        wing2 = (x2 - ah * ux - ah * 0.6 * px, y2 - ah * uy - ah * 0.6 * py)
        d.add(Polygon(
            points=[x2, y2, wing1[0], wing1[1], wing2[0], wing2[1]],
            fillColor=PALETTE["rule"], strokeColor=PALETTE["rule"], strokeWidth=0.5,
        ))

    # Draw boxes
    for nid, (x, y, label, kind) in positions.items():
        bx, by = to_canvas(x, y)
        if kind == "decision":
            cx = bx + box_w / 2
            cy2 = by + box_h / 2
            d.add(Polygon(
                points=[cx, by, bx + box_w, cy2, cx, by + box_h, bx, cy2],
                fillColor=PALETTE["decision_fill"],
                strokeColor=PALETTE["decision_border"],
                strokeWidth=1.2,
            ))
        else:
            d.add(Rect(bx, by, box_w, box_h,
                       fillColor=PALETTE["scene_box_fill"],
                       strokeColor=PALETTE["scene_box_border"],
                       strokeWidth=1.0,
                       rx=4, ry=4))
        # Label: vertically center, multi-line
        lines = label.split("\n")
        line_h = 11
        block_h = line_h * len(lines)
        first_y = by + box_h / 2 + block_h / 2 - line_h * 0.7
        for i, line in enumerate(lines):
            d.add(String(
                bx + box_w / 2,
                first_y - i * line_h,
                line,
                fontName="Helvetica-Bold" if kind == "decision" else "Helvetica",
                fontSize=8.5,
                fillColor=PALETTE["scene_box_text"],
                textAnchor="middle",
            ))
    return d

# ---------------------------------------------------------------------------
# NPC profile cards
# ---------------------------------------------------------------------------

def npc_card(actor, styles, include_portrait=True):
    """Build a card-with-bio flowables for one NPC.

    Returns a list: [compact-header-table, bio-paragraphs..., spacer].
    The header (portrait + name + role) is small enough to keep together
    with at least one bio paragraph; the rest flows naturally.
    """
    name = actor.get("name", "")
    archetype = actor.get("flags", {}).get("blooming-rot-2", {}).get("archetype", "")
    cr = actor.get("system", {}).get("details", {}).get("cr", "")
    bio_html = actor.get("system", {}).get("details", {}).get("biography", {}).get("value", "")

    role_str = f"{archetype.title()} • CR {cr}" if archetype else ""
    role_str = role_str.strip(" •")

    # Header table: portrait | name + role
    portrait = find_actor_portrait(actor) if include_portrait else None
    img = ""
    if portrait:
        thumb = _thumb(portrait, kind="portrait")
        if thumb:
            try:
                from PIL import Image as PILImage
                pim = PILImage.open(thumb)
                w, h = pim.size
                ratio = w / h
                target_w = 1.0 * inch
                target_h = target_w / ratio
                # Cap height so very tall portraits don't blow out the row
                if target_h > 1.4 * inch:
                    target_h = 1.4 * inch
                    target_w = target_h * ratio
                img = Image(thumb, width=target_w, height=target_h)
            except Exception:
                img = ""

    title_col = [
        Paragraph(_escape(name), styles["npc_name"]),
    ]
    if role_str:
        title_col.append(Paragraph(_escape(role_str), styles["npc_role"]))

    header = Table(
        [[img, title_col]],
        colWidths=[1.2 * inch, 5.0 * inch],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 2),
    ]))

    # Bio: flow paragraphs below header at full width
    bio_blocks = html_to_flowables(bio_html, styles, max_image_width=5.5 * inch)
    for b in bio_blocks:
        if isinstance(b, Paragraph):
            b.style = styles["npc_bio"]

    out = [header, Spacer(1, 2)] + bio_blocks + [Spacer(1, 8)]
    return out

# ---------------------------------------------------------------------------
# Document construction
# ---------------------------------------------------------------------------

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(HexColor("#8a7a5e"))
    page = canvas.getPageNumber()
    title = getattr(doc, "title_short", "Blooming Rot, Part 2 — GM Prep")
    canvas.drawString(0.75*inch, 0.5*inch, title)
    canvas.drawRightString(letter[0] - 0.75*inch, 0.5*inch, f"{page}")
    canvas.restoreState()

def build_document(out_path, story, title="Blooming Rot, Part 2 — GM Prep"):
    doc = BaseDocTemplate(
        str(out_path),
        pagesize=letter,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch,
        topMargin=0.7*inch,
        bottomMargin=0.7*inch,
        title=title,
        author="Aoibh Wood",
        subject="GM prep document for Blooming Rot, Part 2",
    )
    doc.title_short = title
    frame = Frame(doc.leftMargin, doc.bottomMargin,
                  doc.width, doc.height, id="normal")
    template = PageTemplate(id="normal", frames=[frame], onPage=header_footer)
    doc.addPageTemplates([template])
    doc.build(story)

# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------

def cover_page(styles, version):
    story = []
    story.append(Spacer(1, 1.5*inch))
    cover_image = ASSETS / "illustrations" / "loftwick-northern-approach.png"
    if cover_image.exists():
        thumb = _thumb(str(cover_image), kind="cover")
        if thumb:
            try:
                from PIL import Image as PILImage
                pim = PILImage.open(thumb)
                w, h = pim.size
                target_w = 5.5*inch
                target_h = target_w * h / w
                story.append(Image(thumb, width=target_w, height=target_h))
            except Exception:
                pass
    story.append(Spacer(1, 0.4*inch))
    story.append(Paragraph("Blooming Rot, Part 2", styles["doc_title"]))
    story.append(Paragraph("GM's Prep Guide", styles["doc_subtitle"]))
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph(
        "A nine-phase Greyhawk adventure for D&amp;D 2024 — pre-Wars Yeomanry through the first under-road",
        styles["meta"],
    ))
    story.append(Paragraph(
        f"Module v{version} • Aoibh Wood",
        styles["meta"],
    ))
    story.append(PageBreak())
    return story

def overview_page(styles):
    story = []
    story.append(Paragraph("Adventure Overview", styles["chapter_eyebrow"]))
    story.append(Paragraph("Nine Phases, Five Cities, One Descent", styles["chapter_title"]))
    story.append(Paragraph(
        "Blooming Rot, Part 2 is a nine-phase investigation set in the pre-Wars Yeomanry, "
        "Hardby, Rel Astra, Greyhawk, the Cairn Hills above Tarnsmere, and finally the "
        "first under-road waystation beneath the world. It is built for a party of 4–6 PCs "
        "at levels 7–11 and is designed to run in roughly 28–40 sessions if every sandbox "
        "downtime branch and per-PC thread is engaged, or 20–26 sessions if the party "
        "drives straight along the main thread.",
        styles["body"]
    ))
    story.append(Paragraph(
        "Each phase has its own chapter in this prep guide. Each chapter contains a flow "
        "diagram of the phase's scenes and decision points, profile cards for the named NPCs "
        "the party will meet, and the full narrative text of every journal page (read-aloud "
        "blocks marked off in tinted boxes). Scene-by-scene notes are inline.",
        styles["body"]
    ))
    story.append(Paragraph(
        "GM-facing content includes spoilers — the antagonists, the Quiet Patroness, the "
        "true identity of \"E.\" — that should not reach players except by play.",
        styles["body"]
    ))
    story.append(PageBreak())

    story.append(Paragraph("How to use this guide", styles["section_h"]))
    rows = [
        ["Before the campaign", "Read Phases 1 and 2 plus Sandbox Reference. The first three "
         "sessions are tightly scripted; everything after grows from how players handle them."],
        ["Before each session", "Re-read the phase chapter for that session's expected scene. "
         "The flow diagram tells you which scene branches off where."],
        ["Decision callouts", "Bordered grey boxes inline with narrative — every important "
         "branch the GM needs to be ready to handle is flagged this way."],
        ["Read-aloud blocks", "Tan-tinted blocks are designed to be read at the table verbatim "
         "(or paraphrased)."],
        ["NPC profiles", "Per-phase NPC cards include portraits where available, archetype, CR, "
         "and a paragraph on role and motivation."],
    ]
    t = Table(rows, colWidths=[1.7*inch, 4.6*inch])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BOX", (0,0), (-1,-1), 0.5, PALETTE["rule"]),
        ("INNERGRID", (0,0), (-1,-1), 0.25, PALETTE["rule"]),
        ("BACKGROUND", (0,0), (0,-1), PALETTE["callout_bg"]),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (1,0), (1,-1), "Times-Roman"),
        ("FONTSIZE", (0,0), (-1,-1), 9.5),
        ("PADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(PageBreak())
    return story

def phase_chapter(phase_n, styles):
    spec = next(p for p in PHASES if p["n"] == phase_n)
    journals = load_jsons(SOURCE / f"phase-{phase_n}-journals")
    actors = load_jsons(SOURCE / f"phase-{phase_n}-actors")

    story = []
    # Chapter title
    story.append(Paragraph(f"Phase {phase_n}", styles["chapter_eyebrow"]))
    story.append(Paragraph(spec["title"], styles["chapter_title"]))

    # Flow diagram
    story.append(Paragraph(FLOW[phase_n]["title"], styles["section_h"]))
    diagram = make_flow_diagram(phase_n)
    story.append(diagram)
    story.append(Spacer(1, 0.2*inch))

    # NPC profiles (only "named" actors that have biographies)
    if actors:
        story.append(Paragraph("Key NPCs at this Phase", styles["section_h"]))
        for actor in actors:
            bio = actor.get("system", {}).get("details", {}).get("biography", {}).get("value", "")
            if bio:
                story.extend(npc_card(actor, styles))
        story.append(PageBreak())

    # Narrative — each journal in turn
    for journal in journals:
        story.append(Paragraph(_escape(journal.get("name", "")), styles["section_h"]))
        for page in journal.get("pages", []):
            page_name = page.get("name", "")
            story.append(Paragraph(_escape(page_name), styles["sub_h"]))
            html = page.get("text", {}).get("content", "")
            flowables = html_to_flowables(html, styles)
            story.extend(flowables)
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 0.15*inch))

    story.append(PageBreak())
    return story

def narrative_chapter(styles):
    """Combine the four narrative-deepening packs (v0.9.0) into one chapter."""
    story = []
    story.append(Paragraph("Narrative Deepening", styles["chapter_eyebrow"]))
    story.append(Paragraph("PC Threads, Counterpart Faction, World Stakes, Relief", styles["chapter_title"]))
    story.append(Paragraph(
        "Four parallel additions that make the campaign about <em>these six people</em> "
        "investigating <em>this</em> specific conspiracy. The investigation as designed in "
        "the phase chapters is a complete campaign; the material below is what makes it the "
        "kind of campaign people remember in ten years.",
        styles["body"]
    ))
    story.append(PageBreak())

    # Per-PC plot threads
    threads = load_jsons(SOURCE / "pc-threads")
    if threads:
        story.append(Paragraph("Per-PC Plot Threads", styles["section_h"]))
        for journal in threads:
            for page in journal.get("pages", []):
                story.append(Paragraph(_escape(page.get("name", "")), styles["sub_h"]))
                story.extend(html_to_flowables(page.get("text", {}).get("content", ""), styles))
                story.append(Spacer(1, 6))
        story.append(PageBreak())

    # Aerdy Commercial-Court Network (journal + actor cards)
    aerdy_journals = load_jsons(SOURCE / "aerdy-network")
    aerdy_actors = load_jsons(SOURCE / "aerdy-network-actors")
    if aerdy_journals or aerdy_actors:
        story.append(Paragraph("The Aerdy Commercial-Court Network", styles["section_h"]))
        for journal in aerdy_journals:
            for page in journal.get("pages", []):
                story.append(Paragraph(_escape(page.get("name", "")), styles["sub_h"]))
                story.extend(html_to_flowables(page.get("text", {}).get("content", ""), styles))
                story.append(Spacer(1, 6))
        if aerdy_actors:
            story.append(Paragraph("Network NPCs", styles["sub_h"]))
            for actor in aerdy_actors:
                if actor.get("system", {}).get("details", {}).get("biography", {}).get("value", ""):
                    story.extend(npc_card(actor, styles))
        story.append(PageBreak())

    # World stakes
    stakes = load_jsons(SOURCE / "world-stakes")
    if stakes:
        story.append(Paragraph("World Stakes — Emotional-Cost Vignettes", styles["section_h"]))
        for journal in stakes:
            for page in journal.get("pages", []):
                story.append(Paragraph(_escape(page.get("name", "")), styles["sub_h"]))
                story.extend(html_to_flowables(page.get("text", {}).get("content", ""), styles))
                story.append(Spacer(1, 6))
        story.append(PageBreak())

    # Relief scenes
    relief = load_jsons(SOURCE / "relief-scenes")
    if relief:
        story.append(Paragraph("Relief Scenes — Tonal Counterweight", styles["section_h"]))
        for journal in relief:
            for page in journal.get("pages", []):
                story.append(Paragraph(_escape(page.get("name", "")), styles["sub_h"]))
                story.extend(html_to_flowables(page.get("text", {}).get("content", ""), styles))
                story.append(Spacer(1, 6))
        story.append(PageBreak())

    return story


def sandbox_chapter(styles):
    journals = load_jsons(SOURCE / "sandbox-journals")
    sandbox_actors = load_jsons(SOURCE / "sandbox-actors")
    story = []
    story.append(Paragraph("Reference", styles["chapter_eyebrow"]))
    story.append(Paragraph("Sandbox & Downtime", styles["chapter_title"]))
    story.append(Paragraph(
        "Between phases (and during longer phases), the party may engage with each city's "
        "sandbox layer: per-PC anchor NPCs, crafting and training masters, downtime mini-quests, "
        "and carousing tables. Each of the four cities below has its own journal entry "
        "containing those references; this section reproduces them.",
        styles["body"]
    ))
    story.append(PageBreak())

    # Sandbox NPCs by folder/city
    if sandbox_actors:
        story.append(Paragraph("Sandbox NPCs", styles["section_h"]))
        # Group by folder (city)
        cities = {}
        for a in sandbox_actors:
            folder = a.get("flags", {}).get("blooming-rot-2", {}).get("folder", "Other")
            cities.setdefault(folder, []).append(a)
        # Generator script writes folder into the actor's flag — fall back to None
        # If no folder distinction, just list alphabetically
        if not any(cities.keys()) or list(cities.keys()) == ["Other"]:
            for a in sorted(sandbox_actors, key=lambda x: x["name"]):
                bio = a.get("system", {}).get("details", {}).get("biography", {}).get("value", "")
                if bio:
                    story.extend(npc_card(a, styles))
        else:
            for city, lst in sorted(cities.items()):
                story.append(Paragraph(city, styles["sub_h"]))
                for a in sorted(lst, key=lambda x: x["name"]):
                    bio = a.get("system", {}).get("details", {}).get("biography", {}).get("value", "")
                    if bio:
                        story.extend(npc_card(a, styles))
        story.append(PageBreak())

    # Sandbox journal entries
    for journal in journals:
        story.append(Paragraph(_escape(journal.get("name", "")), styles["section_h"]))
        for page in journal.get("pages", []):
            page_name = page.get("name", "")
            story.append(Paragraph(_escape(page_name), styles["sub_h"]))
            html = page.get("text", {}).get("content", "")
            flowables = html_to_flowables(html, styles)
            story.extend(flowables)
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 0.15*inch))
    return story

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    styles = make_styles()

    # Read module version
    with open(ROOT / "module.json") as fh:
        module = json.load(fh)
    version = module.get("version", "unknown")

    print(f"Building GM Prep PDF (module v{version})...")

    # ---- Full doc ----
    full_story = []
    full_story.extend(cover_page(styles, version))
    full_story.extend(overview_page(styles))
    for phase in PHASES:
        print(f"  Phase {phase['n']}: {phase['title']}...")
        full_story.extend(phase_chapter(phase["n"], styles))
    print("  Narrative Deepening (PC threads + faction + stakes + relief)...")
    full_story.extend(narrative_chapter(styles))
    print("  Sandbox & Downtime...")
    full_story.extend(sandbox_chapter(styles))
    full_pdf = DOCS / "blooming-rot-2-gm-prep.pdf"
    build_document(full_pdf, full_story,
                   title=f"Blooming Rot 2 — GM Prep (v{version})")
    size_mb = full_pdf.stat().st_size / 1024 / 1024
    print(f"\n✓ {full_pdf} ({size_mb:.1f} MB)")

    # ---- Per-phase PDFs ----
    for phase in PHASES:
        n = phase["n"]
        story = []
        story.extend(cover_page(styles, version))
        story.extend(phase_chapter(n, styles))
        out = DOCS / f"phase-{n}-gm-prep.pdf"
        build_document(out, story,
                       title=f"BR2 Phase {n}: {phase['title']} (v{version})")
        size_mb = out.stat().st_size / 1024 / 1024
        print(f"✓ {out} ({size_mb:.1f} MB)")

    # ---- Sandbox-only PDF ----
    story = []
    story.extend(cover_page(styles, version))
    story.extend(sandbox_chapter(styles))
    out = DOCS / "sandbox-gm-prep.pdf"
    build_document(out, story, title=f"BR2 Sandbox & Downtime (v{version})")
    size_mb = out.stat().st_size / 1024 / 1024
    print(f"✓ {out} ({size_mb:.1f} MB)")

    # ---- Narrative deepening standalone PDF ----
    story = []
    story.extend(cover_page(styles, version))
    story.extend(narrative_chapter(styles))
    out = DOCS / "narrative-deepening-gm-prep.pdf"
    build_document(out, story, title=f"BR2 Narrative Deepening (v{version})")
    size_mb = out.stat().st_size / 1024 / 1024
    print(f"✓ {out} ({size_mb:.1f} MB)")

    print("\nDone.")

if __name__ == "__main__":
    main()
