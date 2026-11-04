"""Extract text from a rulebook PDF, page by page.

Usage:
    uv run --python /usr/bin/python3.12 --with pymupdf python pdf_text.py IN.pdf OUT.txt

Writes '===== PAGE n =====' markers so quotes can be cited by page, then
read_file the OUT.txt. Prefer this over read_file on the PDF directly:
graphics-heavy manuals trip NeedsOcrError in the document reader.
"""

import sys

import fitz  # pymupdf


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    src, dst = sys.argv[1], sys.argv[2]
    doc = fitz.open(src)
    parts = []
    for i, page in enumerate(doc, start=1):
        parts.append(f"\n===== PAGE {i} =====\n{page.get_text('text')}")
    text = "".join(parts)
    with open(dst, "w", encoding="utf-8") as fh:
        fh.write(text)
    print(f"pages={len(doc)} chars={len(text)} -> {dst}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
