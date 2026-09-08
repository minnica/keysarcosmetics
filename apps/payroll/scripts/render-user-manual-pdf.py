from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.table import Table as DocxTable
from docx.text.paragraph import Paragraph as DocxParagraph
from docx.oxml.ns import qn
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "docs" / "Manual_de_uso_sistema_de_nomina_Keysar_Cosmetics.docx"
OUTPUT = ROOT / "docs" / "Manual_de_uso_sistema_de_nomina_Keysar_Cosmetics.pdf"

INK = colors.HexColor("#1F1B18")
BROWN = colors.HexColor("#3B2B22")
COPPER = colors.HexColor("#9B6A43")
PALE = colors.HexColor("#FAF7F3")
GRID = colors.HexColor("#D9D9D9")
MUTED = colors.HexColor("#6B625C")


def iter_block_items(document):
    body = document.element.body
    for child in body.iterchildren():
        if child.tag == qn("w:p"):
            yield DocxParagraph(child, document)
        elif child.tag == qn("w:tbl"):
            yield DocxTable(child, document)


def has_page_break(paragraph: DocxParagraph) -> bool:
    return bool(paragraph._p.xpath('.//w:br[@w:type="page"]'))


def clean_text(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )


def paragraph_html(paragraph: DocxParagraph) -> str:
    parts = []
    for run in paragraph.runs:
        content = clean_text(run.text)
        if not content:
            continue
        if run.italic:
            content = f"<i>{content}</i>"
        if run.bold:
            content = f"<b>{content}</b>"
        parts.append(content)
    return "".join(parts) or clean_text(paragraph.text.strip())


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(
        LETTER[0] / 2,
        0.37 * inch,
        f"Keysar Cosmetics   |   Manual de uso   |   Página {doc.page}",
    )
    canvas.restoreState()


def build_pdf():
    source = Document(INPUT)
    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "BodyManual",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.6,
        leading=12.2,
        textColor=INK,
        spaceAfter=6,
    )
    centered = ParagraphStyle(
        "Centered",
        parent=body,
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    brand = ParagraphStyle(
        "Brand",
        parent=centered,
        fontName="Times-Bold",
        fontSize=24,
        leading=29,
        textColor=BROWN,
        spaceBefore=52,
        spaceAfter=2,
    )
    brand_sub = ParagraphStyle(
        "BrandSub",
        parent=centered,
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=COPPER,
        spaceAfter=34,
    )
    title = ParagraphStyle(
        "TitleManual",
        parent=centered,
        fontName="Helvetica-Bold",
        fontSize=25,
        leading=30,
        textColor=colors.black,
        spaceAfter=14,
    )
    subtitle = ParagraphStyle(
        "SubtitleManual",
        parent=centered,
        fontName="Helvetica",
        fontSize=13,
        leading=17,
        textColor=MUTED,
        spaceAfter=28,
    )
    heading1 = ParagraphStyle(
        "Heading1Manual",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=colors.black,
        spaceBefore=12,
        spaceAfter=7,
        keepWithNext=False,
    )
    heading2 = ParagraphStyle(
        "Heading2Manual",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=16,
        textColor=colors.black,
        spaceBefore=8,
        spaceAfter=5,
        keepWithNext=False,
    )
    heading3 = ParagraphStyle(
        "Heading3Manual",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=colors.black,
        spaceBefore=6,
        spaceAfter=4,
        keepWithNext=False,
    )
    bullet = ParagraphStyle(
        "BulletManual",
        parent=body,
        leftIndent=14,
        firstLineIndent=-8,
        spaceAfter=3,
    )
    numbered = ParagraphStyle(
        "NumberedManual",
        parent=body,
        leftIndent=18,
        firstLineIndent=-14,
        spaceAfter=4,
    )
    small = ParagraphStyle(
        "TableManual",
        parent=body,
        fontSize=8.1,
        leading=10,
        spaceAfter=0,
    )
    small_header = ParagraphStyle(
        "TableHeaderManual",
        parent=small,
        fontName="Helvetica-Bold",
        textColor=colors.white,
    )

    output = BaseDocTemplate(
        str(OUTPUT),
        pagesize=LETTER,
        rightMargin=0.68 * inch,
        leftMargin=0.68 * inch,
        topMargin=0.62 * inch,
        bottomMargin=0.68 * inch,
        title="Manual de uso del sistema de nómina",
        author="Keysar Cosmetics",
    )
    frame = Frame(
        output.leftMargin,
        output.bottomMargin,
        output.width,
        output.height,
        id="normal",
    )
    output.addPageTemplates(PageTemplate(id="manual", frames=[frame], onPage=footer))

    story = []
    list_number = 0
    cover_index = 0
    for block in iter_block_items(source):
        if isinstance(block, DocxParagraph):
            if has_page_break(block):
                story.append(PageBreak())
                list_number = 0
                continue
            text = block.text.strip()
            if not text:
                story.append(Spacer(1, 3))
                continue
            style_name = block.style.name if block.style else "Normal"
            formatted_text = paragraph_html(block)
            if style_name == "Title":
                chosen = title
            elif style_name == "Heading 1":
                chosen = heading1
            elif style_name == "Heading 2":
                chosen = heading2
            elif style_name == "Heading 3":
                chosen = heading3
            elif style_name.startswith("List Bullet"):
                story.append(Paragraph("• " + formatted_text, bullet))
                list_number = 0
                continue
            elif style_name.startswith("List Number"):
                list_number += 1
                story.append(Paragraph(f"{list_number}. {formatted_text}", numbered))
                continue
            elif cover_index == 0 and text == "KEYSAR":
                chosen = brand
                cover_index += 1
            elif text == "COSMETICS  ·  PAYROLL":
                chosen = brand_sub
            elif text == "Operación administrativa y portal del personal":
                chosen = subtitle
            elif text in ("Uso interno y confidencial",):
                chosen = centered
            else:
                chosen = body
            if not style_name.startswith("List Number"):
                list_number = 0
            story.append(Paragraph(formatted_text, chosen))
        else:
            data = []
            for ridx, row in enumerate(block.rows):
                cells = []
                for cell in row.cells:
                    cell_text = clean_text(cell.text.strip())
                    cells.append(Paragraph(cell_text, small_header if ridx == 0 else small))
                data.append(cells)
            if not data:
                continue
            available = output.width
            raw_widths = [block.columns[i].width or 1 for i in range(len(block.columns))]
            total = sum(raw_widths)
            col_widths = [available * (width / total) for width in raw_widths]
            table = Table(data, colWidths=col_widths, repeatRows=1, hAlign="CENTER")
            commands = [
                ("BACKGROUND", (0, 0), (-1, 0), BROWN),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, GRID),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
            for ridx in range(1, len(data)):
                commands.append(("BACKGROUND", (0, ridx), (-1, ridx), colors.white if ridx % 2 else PALE))
            table.setStyle(TableStyle(commands))
            story.extend([table, Spacer(1, 8)])

    output.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
