"""Extract Vietnamese text from legacy .doc (OLE2) files using olefile.

Parses the Word Binary File Format piece table from the CLX structure in the
Table stream, correctly handling mixed compressed (CP1252) and uncompressed
(UTF-16LE) text pieces.
"""

import os
import re
import struct
from dataclasses import dataclass

import olefile


DOC_TOPICS = {
    "cutru.doc": "Luật Nhập cảnh, xuất cảnh, quá cảnh, cư trú của người nước ngoài tại Việt Nam",
    "disanvanhoa.doc": "Luật Di sản văn hóa",
    "drone.doc": "Nghị định về quản lý tàu bay không người lái (drone)",
    "gt.doc": "Luật Trật tự, an toàn giao thông đường bộ",
    "haiquan.doc": "Luật Hải quan",
    "matuy.doc": "Luật Phòng, chống ma túy",
}


@dataclass
class ExtractedDocument:
    filename: str
    filepath: str
    title: str
    text: str


def _parse_piece_table(word_doc: bytes, table_stream: bytes) -> list[tuple[int, int, int, bool]]:
    """Parse the CLX piece table from the Table stream.

    Returns list of (cp_start, char_count, byte_offset, is_compressed) tuples.
    """
    fc_clx = struct.unpack_from("<I", word_doc, 0x01A2)[0]
    lcb_clx = struct.unpack_from("<I", word_doc, 0x01A6)[0]

    clx = table_stream[fc_clx : fc_clx + lcb_clx]

    pos = 0
    while pos < len(clx) and clx[pos] == 0x01:
        cb_grpprl = struct.unpack_from("<H", clx, pos + 1)[0]
        pos += 3 + cb_grpprl

    if pos >= len(clx) or clx[pos] != 0x02:
        raise ValueError("Piece table (Pcdt) not found in CLX")

    lcb = struct.unpack_from("<I", clx, pos + 1)[0]
    plc_pcd = clx[pos + 5 : pos + 5 + lcb]

    n_pieces = (lcb - 4) // 12
    cps = [struct.unpack_from("<I", plc_pcd, i * 4)[0] for i in range(n_pieces + 1)]

    pieces: list[tuple[int, int, int, bool]] = []
    for i in range(n_pieces):
        pcd_offset = (n_pieces + 1) * 4 + i * 8
        fc_raw = struct.unpack_from("<I", plc_pcd, pcd_offset + 2)[0]
        is_compressed = bool((fc_raw >> 30) & 1)

        if is_compressed:
            byte_offset = (fc_raw & 0x3FFFFFFF) // 2
        else:
            byte_offset = fc_raw & 0x3FFFFFFF

        pieces.append((cps[i], cps[i + 1] - cps[i], byte_offset, is_compressed))

    return pieces


def extract_text_from_doc(filepath: str) -> str:
    """Extract text from a legacy .doc (Compound Document) file.

    Reads the piece table from the CLX in the Table stream to correctly
    decode text stored across multiple pieces with mixed encodings.
    """
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")

    ole = olefile.OleFileIO(filepath)
    try:
        word_doc = ole.openstream("WordDocument").read()

        ccp_text = struct.unpack_from("<i", word_doc, 0x004C)[0]

        flags_a = struct.unpack_from("<H", word_doc, 0x000A)[0]
        table_name = "1Table" if (flags_a >> 9) & 1 else "0Table"
        table_stream = ole.openstream(table_name).read()

        pieces = _parse_piece_table(word_doc, table_stream)

        result: list[str] = []
        chars_read = 0
        for cp_start, char_count, byte_offset, is_compressed in pieces:
            if chars_read >= ccp_text:
                break

            remaining = ccp_text - cp_start
            if remaining <= 0:
                break
            chars_to_read = min(char_count, remaining)

            if is_compressed:
                raw = word_doc[byte_offset : byte_offset + chars_to_read]
                result.append(raw.decode("cp1252", errors="replace"))
            else:
                raw = word_doc[byte_offset : byte_offset + chars_to_read * 2]
                result.append(raw.decode("utf-16-le", errors="replace"))

            chars_read += chars_to_read

        text = "".join(result)
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
        text = text.replace("\r", "\n")
        return text.strip()
    finally:
        ole.close()


def extract_all_docs(doc_dir: str) -> list[ExtractedDocument]:
    """Discover and extract text from every .doc file in *doc_dir*."""
    docs: list[ExtractedDocument] = []
    for filename in sorted(os.listdir(doc_dir)):
        if not filename.lower().endswith(".doc"):
            continue
        filepath = os.path.join(doc_dir, filename)
        text = extract_text_from_doc(filepath)
        if not text:
            continue
        title = DOC_TOPICS.get(filename, filename)
        docs.append(ExtractedDocument(
            filename=filename,
            filepath=filepath,
            title=title,
            text=text,
        ))
    return docs


if __name__ == "__main__":
    import sys

    target = sys.argv[1] if len(sys.argv) > 1 else "."
    for doc in extract_all_docs(target):
        print(f"{doc.filename}: {len(doc.text)} chars — {doc.title}")
