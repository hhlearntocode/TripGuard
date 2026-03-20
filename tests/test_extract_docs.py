"""Tests for extract_docs.py — Vietnamese .doc text extraction."""

import os
import struct
from unittest.mock import MagicMock, patch

import pytest

from extract_docs import (
    DOC_TOPICS,
    ExtractedDocument,
    extract_all_docs,
    extract_text_from_doc,
)


def _build_fake_doc_streams(text: str, text_offset: int = 0x0200) -> tuple[bytes, bytes]:
    """Build fake WordDocument + Table stream bytes with a valid piece table.

    Returns (word_doc_bytes, table_stream_bytes).
    """
    encoded = text.encode("utf-16-le")
    ccp_text = len(text)

    # PlcPcd: 2 CPs (0, ccp_text) + 1 PCD (8 bytes)
    plc_pcd = bytearray()
    plc_pcd += struct.pack("<I", 0)           # CP start
    plc_pcd += struct.pack("<I", ccp_text)    # CP end
    plc_pcd += struct.pack("<H", 0)           # ABCDfR2
    plc_pcd += struct.pack("<I", text_offset) # fc (uncompressed, no flag)
    plc_pcd += struct.pack("<H", 0)           # prm

    # CLX = Pcdt header + PlcPcd
    clx = bytearray()
    clx.append(0x02)                              # Pcdt type
    clx += struct.pack("<I", len(plc_pcd))        # lcb
    clx += plc_pcd

    fc_clx = 0
    lcb_clx = len(clx)

    # Table stream
    table_stream = bytes(clx)

    # WordDocument stream
    wd_size = max(0x01AA, text_offset + len(encoded))
    word_doc = bytearray(wd_size)
    struct.pack_into("<H", word_doc, 0x000A, 0x0200)  # fWhichTblStm = 1 -> "1Table"
    struct.pack_into("<I", word_doc, 0x0018, text_offset)  # fcMin (for reference)
    struct.pack_into("<i", word_doc, 0x004C, ccp_text)
    struct.pack_into("<I", word_doc, 0x01A2, fc_clx)
    struct.pack_into("<I", word_doc, 0x01A6, lcb_clx)
    word_doc[text_offset:text_offset + len(encoded)] = encoded

    return bytes(word_doc), table_stream


def _mock_ole_for_streams(mock_olefile, word_doc_bytes: bytes, table_bytes: bytes):
    """Configure mock olefile to return the right stream for each name."""
    mock_ole = MagicMock()
    mock_olefile.OleFileIO.return_value = mock_ole

    def open_stream(name):
        stream = MagicMock()
        if name == "WordDocument":
            stream.read.return_value = word_doc_bytes
        elif name in ("0Table", "1Table"):
            stream.read.return_value = table_bytes
        else:
            stream.read.return_value = b""
        return stream

    mock_ole.openstream.side_effect = open_stream
    return mock_ole


class TestExtractTextFromDoc:
    """Tests for the single-file extraction function."""

    def test_extract_handles_missing_file(self):
        with pytest.raises(FileNotFoundError, match="File not found"):
            extract_text_from_doc("/nonexistent/path/missing.doc")

    def test_extract_handles_non_ole_file(self, tmp_path):
        bad_file = tmp_path / "notadoc.doc"
        bad_file.write_text("This is plain text, not an OLE file.")
        with pytest.raises(Exception):
            extract_text_from_doc(str(bad_file))

    def test_extract_utf8_vietnamese_characters(self, tmp_path):
        """Verify diacritical marks survive extraction intact."""
        text = "Điều 1. Quốc hội ban hành luật phạt tù"
        wd, tbl = _build_fake_doc_streams(text)

        with patch("extract_docs.olefile") as mock_olefile:
            _mock_ole_for_streams(mock_olefile, wd, tbl)

            filepath = str(tmp_path / "viet.doc")
            (tmp_path / "viet.doc").write_text("placeholder")

            result = extract_text_from_doc(filepath)

            assert "Điều" in result
            assert "Quốc hội" in result
            assert "phạt tù" in result

    def test_extract_strips_control_characters(self, tmp_path):
        """Control chars (except newline/tab) should be removed."""
        text = "Điều\x01 1.\x03 Test\x07"
        wd, tbl = _build_fake_doc_streams(text)

        with patch("extract_docs.olefile") as mock_olefile:
            _mock_ole_for_streams(mock_olefile, wd, tbl)

            filepath = str(tmp_path / "ctrl.doc")
            (tmp_path / "ctrl.doc").write_text("x")

            result = extract_text_from_doc(filepath)
            assert "Điều" in result
            assert "\x01" not in result
            assert "\x03" not in result

    def test_extract_replaces_cr_with_newline(self, tmp_path):
        text = "Line1\rLine2"
        wd, tbl = _build_fake_doc_streams(text)

        with patch("extract_docs.olefile") as mock_olefile:
            _mock_ole_for_streams(mock_olefile, wd, tbl)

            filepath = str(tmp_path / "cr.doc")
            (tmp_path / "cr.doc").write_text("x")

            result = extract_text_from_doc(filepath)
            assert "\r" not in result
            assert "Line1\nLine2" in result

    def test_extract_handles_empty_text(self, tmp_path):
        """A doc with ccpText=0 should return empty string."""
        wd, tbl = _build_fake_doc_streams("")

        with patch("extract_docs.olefile") as mock_olefile:
            _mock_ole_for_streams(mock_olefile, wd, tbl)

            filepath = str(tmp_path / "empty.doc")
            (tmp_path / "empty.doc").write_text("x")

            result = extract_text_from_doc(filepath)
            assert result == ""

    def test_extract_metadata_in_topics(self):
        """All expected doc files should have a topic mapping."""
        expected_files = {"cutru.doc", "disanvanhoa.doc", "drone.doc",
                          "gt.doc", "haiquan.doc", "matuy.doc"}
        assert set(DOC_TOPICS.keys()) == expected_files


class TestExtractAllDocs:
    """Tests for batch extraction."""

    def test_extract_all_discovers_doc_files(self, tmp_path):
        for name in ["a.doc", "b.doc", "c.txt", "d.pdf"]:
            (tmp_path / name).write_text("placeholder")

        wd, tbl = _build_fake_doc_streams("Điều 1. Test")

        with patch("extract_docs.olefile") as mock_olefile:
            _mock_ole_for_streams(mock_olefile, wd, tbl)
            docs = extract_all_docs(str(tmp_path))

        assert len(docs) == 2
        filenames = {d.filename for d in docs}
        assert filenames == {"a.doc", "b.doc"}

    def test_extract_all_returns_extracted_documents(self, tmp_path):
        (tmp_path / "law.doc").write_text("placeholder")

        wd, tbl = _build_fake_doc_streams("Luật Hải quan")

        with patch("extract_docs.olefile") as mock_olefile:
            _mock_ole_for_streams(mock_olefile, wd, tbl)
            docs = extract_all_docs(str(tmp_path))

        assert len(docs) == 1
        doc = docs[0]
        assert isinstance(doc, ExtractedDocument)
        assert doc.filename == "law.doc"
        assert "Luật Hải quan" in doc.text

    def test_extract_all_skips_empty_docs(self, tmp_path):
        (tmp_path / "empty.doc").write_text("placeholder")

        wd, tbl = _build_fake_doc_streams("")

        with patch("extract_docs.olefile") as mock_olefile:
            _mock_ole_for_streams(mock_olefile, wd, tbl)
            docs = extract_all_docs(str(tmp_path))

        assert len(docs) == 0

    def test_extract_all_empty_directory(self, tmp_path):
        docs = extract_all_docs(str(tmp_path))
        assert docs == []
