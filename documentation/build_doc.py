"""
Baut aus full_documentation_de.md ein modern gestaltetes, eigenstaendiges
HTML-Dokument (Deckblatt + Inhaltsverzeichnis + Inhalt) und rendert es
per Headless Chrome/Edge zu einem PDF.

Aufruf:
    python build_doc.py
"""
import shutil
import subprocess
import sys
from pathlib import Path

import markdown
from pygments.formatters import HtmlFormatter

DOC_DIR = Path(__file__).parent
SRC_MD = DOC_DIR / "full_documentation_de.md"
OUT_HTML = DOC_DIR / "StudyMate_Projektdokumentation.html"
OUT_PDF = DOC_DIR / "StudyMate_Projektdokumentation.pdf"

COVER = {
    "hochschule": "DHBW Mannheim",
    "studiengang": "TINF24CS2",
    "modul": "Software Engineering",
    "titel": "StudyMate v2",
    "untertitel": "Projektdokumentation",
    "namen": ["Selina Ickstadt", "Devi Müller", "Michelle Schneider", "Jennifer Hirt"],
    "dozent": "Jürgen Schultheis",
    "abgabe": "26.06.2026",
}


def strip_title_block(text: str) -> str:
    """Entfernt H1-Titel + handgeschriebenes Inhaltsverzeichnis (wird durch
    automatisch generiertes TOC + Deckblatt ersetzt)."""
    marker = "## 1. Projektziel und Überblick"
    idx = text.index(marker)
    return text[idx:]


def build_html(body_html: str, toc_html: str) -> str:
    pygments_css = HtmlFormatter(style="friendly").get_style_defs(".codehilite")
    names_html = "".join(f"<li>{n}</li>" for n in COVER["namen"])

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>{COVER['titel']} — {COVER['untertitel']}</title>
<style>
{CSS_BASE}
{pygments_css}
</style>
</head>
<body>

<section class="cover">
  <div class="cover-accent"></div>
  <div class="cover-content">
    <div class="cover-logo">
      <span class="logo-mark">S</span>
      <span class="logo-word">StudyMate</span>
    </div>
    <p class="cover-hochschule">{COVER['hochschule']}</p>
    <p class="cover-studiengang">{COVER['studiengang']} &middot; Modul {COVER['modul']}</p>

    <h1 class="cover-title">{COVER['titel']}</h1>
    <p class="cover-subtitle">{COVER['untertitel']}</p>

    <div class="cover-meta">
      <div class="cover-meta-block">
        <span class="cover-meta-label">Gruppe</span>
        <ul class="cover-names">{names_html}</ul>
      </div>
      <div class="cover-meta-block">
        <span class="cover-meta-label">Dozent</span>
        <p>{COVER['dozent']}</p>
      </div>
      <div class="cover-meta-block">
        <span class="cover-meta-label">Abgabedatum</span>
        <p>{COVER['abgabe']}</p>
      </div>
    </div>
  </div>
</section>

<section class="toc-page">
  <h2 class="toc-heading">Inhaltsverzeichnis</h2>
  <div class="toc-list">
  {toc_html}
  </div>
</section>

<article class="content">
{body_html}
</article>

</body>
</html>
"""


CSS_BASE = """
:root {
  --accent: #00b894;
  --accent-dark: #00997a;
  --ink: #1a2332;
  --muted: #5b6b7d;
  --line: #e3e8ee;
  --panel: #f6f8fa;
}

* { box-sizing: border-box; }

@page { size: A4; margin: 2.2cm 1.9cm 2cm 1.9cm; }

body {
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: var(--ink);
  font-size: 10.6pt;
  line-height: 1.55;
  margin: 0;
}

/* ---------- Cover page ---------- */
.cover {
  position: relative;
  height: 100vh;
  page-break-after: always;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.cover-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 14px;
  background: linear-gradient(90deg, var(--accent), #00d4aa 60%, #6ee7d8);
}
.cover-content { text-align: center; max-width: 640px; padding: 0 24px; }
.cover-logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 38px; }
.logo-mark {
  width: 44px; height: 44px; border-radius: 12px;
  background: linear-gradient(135deg, #00d4aa, #00997a);
  color: #fff; font-weight: 700; font-size: 22px;
  display: flex; align-items: center; justify-content: center;
}
.logo-word { font-size: 22px; font-weight: 700; letter-spacing: .2px; }
.cover-hochschule { font-size: 15pt; font-weight: 600; margin: 0; color: var(--ink); }
.cover-studiengang { color: var(--muted); margin: 4px 0 60px; font-size: 11pt; }
.cover-title { font-size: 34pt; font-weight: 800; margin: 0 0 6px; letter-spacing: -.5px; }
.cover-subtitle { font-size: 14pt; color: var(--accent-dark); font-weight: 600; margin: 0 0 70px; }
.cover-meta { display: flex; justify-content: center; gap: 56px; text-align: left; border-top: 1px solid var(--line); padding-top: 28px; }
.cover-meta-label { display: block; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 6px; font-weight: 600; }
.cover-meta-block p { margin: 0; font-size: 10.5pt; }
.cover-names { list-style: none; margin: 0; padding: 0; font-size: 10.5pt; }
.cover-names li { line-height: 1.5; }

/* ---------- TOC page ---------- */
.toc-page { page-break-after: always; padding-top: 10px; }
.toc-heading { font-size: 20pt; margin: 0 0 22px; color: var(--ink); }
.toc-list ul { list-style: none; margin: 0; padding-left: 0; }
.toc-list ul ul { padding-left: 22px; margin-top: 4px; margin-bottom: 8px; }
.toc-list > ul > li { margin-bottom: 10px; }
.toc-list a { color: var(--ink); text-decoration: none; font-weight: 600; font-size: 11pt; }
.toc-list ul ul a { font-weight: 400; color: var(--muted); font-size: 10pt; }
.toc-list a::after { content: ""; }
.toc-list li { padding: 2px 0; }

/* ---------- Content ---------- */
.content h2 {
  font-size: 17pt;
  color: var(--ink);
  margin: 38px 0 16px;
  padding-bottom: 8px;
  border-bottom: 2.5px solid var(--accent);
  page-break-after: avoid;
}
.content h2:first-of-type { margin-top: 0; }
.content h3 {
  font-size: 13pt;
  color: var(--accent-dark);
  margin: 26px 0 10px;
  page-break-after: avoid;
}
.content h4 {
  font-size: 11pt;
  color: var(--ink);
  margin: 18px 0 8px;
  page-break-after: avoid;
}
.content p { margin: 0 0 10px; }
.content ul, .content ol { margin: 0 0 12px; padding-left: 22px; }
.content li { margin-bottom: 3px; }
.content a { color: var(--accent-dark); text-decoration: none; border-bottom: 1px solid #b9e6da; }

.content code {
  font-family: Consolas, "Courier New", monospace;
  background: var(--panel);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 9.3pt;
  color: #0a5c4a;
}
.content pre {
  background: var(--panel);
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  padding: 12px 14px;
  overflow-x: auto;
  page-break-inside: avoid;
  margin: 0 0 14px;
}
.content pre code { background: none; padding: 0; color: inherit; font-size: 9pt; line-height: 1.45; }

.content table {
  border-collapse: collapse;
  width: 100%;
  margin: 0 0 16px;
  font-size: 9.6pt;
  page-break-inside: avoid;
}
.content th, .content td {
  border: 1px solid var(--line);
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
}
.content th { background: var(--accent); color: #fff; font-weight: 600; }
.content tr:nth-child(even) td { background: #fafbfc; }

.content blockquote {
  margin: 0 0 14px;
  padding: 10px 16px;
  background: #f0faf7;
  border-left: 3px solid var(--accent);
  border-radius: 0 6px 6px 0;
  color: #334;
}
.content blockquote p { margin: 0; }

.content hr { border: none; border-top: 1px solid var(--line); margin: 26px 0; }
.content strong { color: var(--ink); }
"""


def main():
    md_text = SRC_MD.read_text(encoding="utf-8")
    md_text = strip_title_block(md_text)

    md = markdown.Markdown(
        extensions=["extra", "toc", "codehilite", "sane_lists"],
        extension_configs={
            "toc": {"toc_depth": "2-3", "anchorlink": False, "permalink": False},
            "codehilite": {"guess_lang": False, "css_class": "codehilite"},
        },
    )
    body_html = md.convert(md_text)
    toc_html = md.toc

    full_html = build_html(body_html, toc_html)
    OUT_HTML.write_text(full_html, encoding="utf-8")
    print(f"HTML geschrieben: {OUT_HTML}")

    browser = find_browser()
    if not browser:
        print("Kein Chrome/Edge gefunden — PDF-Export uebersprungen.")
        return

    tmp_pdf = OUT_PDF.with_suffix(".tmp.pdf")
    tmp_pdf.unlink(missing_ok=True)
    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={tmp_pdf}",
        OUT_HTML.resolve().as_uri(),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0 or "ERROR" in result.stderr or not tmp_pdf.exists():
        print("PDF-Export fehlgeschlagen:")
        print(result.stdout)
        print(result.stderr)
        sys.exit(1)

    try:
        tmp_pdf.replace(OUT_PDF)
    except PermissionError:
        print(
            f"Konnte {OUT_PDF} nicht schreiben — Datei ist geoeffnet (z.B. im Editor/PDF-Viewer). "
            f"Bitte schliessen und erneut versuchen. Neuer Inhalt liegt vorerst in {tmp_pdf}."
        )
        sys.exit(1)
    print(f"PDF geschrieben: {OUT_PDF}")


def find_browser():
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    return shutil.which("chrome") or shutil.which("msedge")


if __name__ == "__main__":
    main()
