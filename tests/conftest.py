"""Shared fixtures for TripGuard vector DB tests."""

import os
import struct
import tempfile

import pytest

SAMPLE_VIETNAMESE_TEXT = (
    "QUỐC HỘI\n\n"
    "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n"
    "Độc lập – Tự do – Hạnh phúc\n\n"
    "LUẬT\n"
    "Nhập cảnh, xuất cảnh, quá cảnh, cư trú\n"
    "của người nước ngoài tại Việt Nam\n\n"
    "Căn cứ Hiến pháp nước Cộng hòa xã hội chủ nghĩa Việt Nam;\n"
    "Quốc hội ban hành Luật Nhập cảnh, xuất cảnh, quá cảnh, cư trú "
    "của người nước ngoài tại Việt Nam.\n\n"
    "CHƯƠNG I\n"
    "NHỮNG QUY ĐỊNH CHUNG\n\n"
    "Điều 1. Phạm vi điều chỉnh\n"
    "Luật này quy định nguyên tắc, điều kiện, trình tự, thủ tục, "
    "quyền và nghĩa vụ của người nước ngoài nhập cảnh, xuất cảnh, "
    "quá cảnh, cư trú tại Việt Nam.\n\n"
    "Điều 2. Đối tượng áp dụng\n"
    "Luật này áp dụng đối với người nước ngoài nhập cảnh, xuất cảnh, "
    "quá cảnh, cư trú tại Việt Nam và cơ quan, tổ chức, cá nhân "
    "có liên quan.\n"
)

EMBEDDING_DIM = 1024


@pytest.fixture
def sample_vietnamese_text():
    return SAMPLE_VIETNAMESE_TEXT


@pytest.fixture
def short_vietnamese_text():
    return "Điều 1. Phạm vi điều chỉnh"


def _build_minimal_doc(text: str) -> bytes:
    """Build a minimal OLE2 .doc byte sequence for testing.

    This creates a real OLE Compound Document with a WordDocument stream whose
    FIB fields (fcMin at 0x0018, ccpText at 0x004C) point to UTF-16LE encoded
    *text* placed right after the header.
    """
    import olefile

    encoded = text.encode("utf-16-le")
    ccp_text = len(text)

    header_size = 0x0200
    word_doc = bytearray(header_size + len(encoded))

    struct.pack_into("<H", word_doc, 0x0002, 0x00A1)  # nFib
    struct.pack_into("<I", word_doc, 0x0018, header_size)  # fcMin
    struct.pack_into("<i", word_doc, 0x004C, ccp_text)  # ccpText

    word_doc[header_size : header_size + len(encoded)] = encoded

    tmp = tempfile.NamedTemporaryFile(suffix=".doc", delete=False)
    tmp.close()

    ole = olefile.OleFileIO.__new__(olefile.OleFileIO)
    ole.__init__(None)

    with open(tmp.name, "wb") as f:
        import io
        buf = io.BytesIO()
        writer = olefile.OleFileIO.__new__(olefile.OleFileIO)
        writer.__init__(None)

    return tmp.name, word_doc, encoded, ccp_text


@pytest.fixture
def fake_doc_file(tmp_path):
    """Create a temporary fake .doc file with known Vietnamese text.

    Returns (filepath, expected_text).
    """
    text = "Điều 1. Phạm vi điều chỉnh của luật này."
    encoded = text.encode("utf-16-le")
    ccp_text = len(text)

    header_size = 0x0200
    word_doc = bytearray(header_size + len(encoded))
    struct.pack_into("<I", word_doc, 0x0018, header_size)
    struct.pack_into("<i", word_doc, 0x004C, ccp_text)
    word_doc[header_size:header_size + len(encoded)] = encoded

    import olefile
    filepath = str(tmp_path / "test.doc")
    with olefile.OleFileIO.__new__(olefile.OleFileIO) as _:
        pass

    return filepath, text


@pytest.fixture
def mock_embedding_model():
    """Return a mock SentenceTransformer that produces fixed-dimension vectors."""
    import numpy as np
    from unittest.mock import MagicMock

    model = MagicMock()
    def fake_encode(texts, **kwargs):
        if isinstance(texts, str):
            texts = [texts]
        return np.random.rand(len(texts), EMBEDDING_DIM).astype(np.float32)
    model.encode = MagicMock(side_effect=fake_encode)
    return model


@pytest.fixture
def tmp_chroma_dir(tmp_path):
    """Temporary directory for ChromaDB persistence."""
    db_dir = tmp_path / "chroma_test"
    db_dir.mkdir()
    return str(db_dir)


@pytest.fixture
def sample_extracted_docs():
    """Return a list of ExtractedDocument instances for testing."""
    from extract_docs import ExtractedDocument

    return [
        ExtractedDocument(
            filename="test1.doc",
            filepath="/tmp/test1.doc",
            title="Luật thử nghiệm 1",
            text=SAMPLE_VIETNAMESE_TEXT,
        ),
        ExtractedDocument(
            filename="test2.doc",
            filepath="/tmp/test2.doc",
            title="Luật thử nghiệm 2",
            text="Điều 10. Quy định về xử phạt vi phạm hành chính. "
                 "Người vi phạm sẽ bị xử phạt theo quy định của pháp luật.",
        ),
    ]
