"""Tests for build_vectordb.py — Điều-based chunking, sub-chunking, embedding, and ChromaDB storage."""

import csv
import os

import numpy as np
import pytest
from unittest.mock import MagicMock, patch

from build_vectordb import (
    DIEU_SPLIT_THRESHOLD,
    SUB_CHUNK_SIZE,
    SUB_CHUNK_OVERLAP,
    TextChunk,
    _extract_dieu_header,
    build_all_vectordbs,
    build_vectordb,
    chunk_by_dieu,
    chunk_documents,
    chunk_single_document,
    collection_name_from_filename,
    list_collections,
    embed_chunks,
    log_chunks_to_csv,
    sub_chunk_dieu,
)
from extract_docs import ExtractedDocument
from tests.conftest import EMBEDDING_DIM, SAMPLE_VIETNAMESE_TEXT


class TestCollectionNameFromFilename:
    """Tests for deriving ChromaDB collection names from filenames."""

    def test_simple_doc_name(self):
        assert collection_name_from_filename("cutru.doc") == "cutru"

    def test_strips_extension(self):
        assert collection_name_from_filename("haiquan.doc") == "haiquan"

    def test_replaces_special_chars(self):
        assert collection_name_from_filename("my file (1).doc") == "my_file__1"

    def test_pads_short_names(self):
        result = collection_name_from_filename("ab.doc")
        assert len(result) >= 3

    def test_truncates_long_names(self):
        long_name = "a" * 100 + ".doc"
        assert len(collection_name_from_filename(long_name)) <= 63

    def test_all_doc_files(self):
        filenames = ["cutru.doc", "disanvanhoa.doc", "drone.doc",
                      "gt.doc", "haiquan.doc", "matuy.doc"]
        names = [collection_name_from_filename(f) for f in filenames]
        assert len(set(names)) == 6


class TestChunkByDieu:
    """Tests for the Điều-based splitting logic."""

    def test_splits_by_dieu(self):
        text = (
            "Preamble text here.\n"
            "Điều 1. Phạm vi điều chỉnh\n"
            "Nội dung điều 1.\n"
            "Điều 2. Đối tượng áp dụng\n"
            "Nội dung điều 2."
        )
        chunks = chunk_by_dieu(text)
        assert len(chunks) == 3  # preamble + 2 Điều

    def test_preamble_has_no_dieu_number(self):
        text = (
            "QUỐC HỘI\nLUẬT\n"
            "Điều 1. Test\nNội dung."
        )
        chunks = chunk_by_dieu(text)
        assert chunks[0][1] is None  # preamble dieu_number is None

    def test_dieu_number_extracted(self):
        text = (
            "Preamble\n"
            "Điều 1. Test\nNội dung 1.\n"
            "Điều 25. Test 25\nNội dung 25."
        )
        chunks = chunk_by_dieu(text)
        assert chunks[1][1] == "1"
        assert chunks[2][1] == "25"

    def test_each_dieu_is_complete(self):
        text = (
            "Điều 1. Phạm vi điều chỉnh\n"
            "Luật này quy định nguyên tắc, điều kiện.\n"
            "Điều 2. Đối tượng áp dụng\n"
            "Luật này áp dụng đối với mọi người."
        )
        chunks = chunk_by_dieu(text)
        dieu_chunks = [(t, n) for t, n in chunks if n is not None]
        assert len(dieu_chunks) == 2
        assert "nguyên tắc" in dieu_chunks[0][0]
        assert "nguyên tắc" not in dieu_chunks[1][0]
        assert "mọi người" in dieu_chunks[1][0]
        assert "mọi người" not in dieu_chunks[0][0]

    def test_no_dieu_returns_whole_text(self):
        text = "Văn bản không có điều luật nào cả."
        chunks = chunk_by_dieu(text)
        assert len(chunks) == 1
        assert chunks[0][1] is None

    def test_empty_text(self):
        assert chunk_by_dieu("") == []

    def test_long_article_stays_in_one_chunk(self):
        long_content = "Nội dung rất dài. " * 500
        text = f"Điều 1. Tiêu đề\n{long_content}"
        chunks = chunk_by_dieu(text)
        dieu_chunks = [(t, n) for t, n in chunks if n is not None]
        assert len(dieu_chunks) == 1
        assert len(dieu_chunks[0][0]) > 5000

    def test_consecutive_dieu(self):
        text = (
            "Điều 1. A\n"
            "Điều 2. B\n"
            "Điều 3. C"
        )
        chunks = chunk_by_dieu(text)
        dieu_chunks = [(t, n) for t, n in chunks if n is not None]
        assert len(dieu_chunks) == 3
        assert all(c[0].startswith("Điều") for c in dieu_chunks)

    def test_dieu_with_subsections(self):
        text = (
            "Điều 5. Quy định chi tiết\n"
            "1. Khoản 1 nội dung.\n"
            "a) Điểm a nội dung.\n"
            "b) Điểm b nội dung.\n"
            "2. Khoản 2 nội dung.\n"
            "Điều 6. Tiếp theo\n"
            "Nội dung điều 6."
        )
        chunks = chunk_by_dieu(text)
        dieu_chunks = [(t, n) for t, n in chunks if n is not None]
        assert len(dieu_chunks) == 2
        assert "Khoản 1" in dieu_chunks[0][0]
        assert "Điểm a" in dieu_chunks[0][0]
        assert "Khoản 2" in dieu_chunks[0][0]

    def test_dieu_inline_not_split(self):
        """'Điều' appearing mid-sentence should not cause a split."""
        text = (
            "Điều 1. Tiêu đề\n"
            "Theo quy định tại Điều 5 của Luật này thì phải tuân thủ.\n"
            "Điều 2. Tiêu đề 2\n"
            "Nội dung."
        )
        chunks = chunk_by_dieu(text)
        dieu_chunks = [(t, n) for t, n in chunks if n is not None]
        assert len(dieu_chunks) == 2
        assert "Điều 5 của Luật" in dieu_chunks[0][0]


class TestExtractDieuHeader:
    """Tests for extracting the Điều header line."""

    def test_simple_header(self):
        text = "Điều 1. Phạm vi điều chỉnh\nNội dung chi tiết."
        assert _extract_dieu_header(text) == "Điều 1. Phạm vi điều chỉnh"

    def test_single_line(self):
        text = "Điều 5. Tiêu đề ngắn"
        assert _extract_dieu_header(text) == "Điều 5. Tiêu đề ngắn"

    def test_preamble_header(self):
        text = "QUỐC HỘI\nLUẬT\nCăn cứ..."
        assert _extract_dieu_header(text) == "QUỐC HỘI"


class TestSubChunkDieu:
    """Tests for sub-chunking long articles."""

    def test_short_article_not_split(self):
        text = "Điều 1. Tiêu đề\nNội dung ngắn."
        result = sub_chunk_dieu(text, "1")
        assert len(result) == 1
        assert result[0] == (text, 0, False)

    def test_exactly_at_threshold_not_split(self):
        text = "Điều 1. X\n" + "a" * (DIEU_SPLIT_THRESHOLD - len("Điều 1. X\n"))
        assert len(text) == DIEU_SPLIT_THRESHOLD
        result = sub_chunk_dieu(text, "1")
        assert len(result) == 1
        assert result[0][2] is False  # is_sub_chunk

    def test_long_article_is_split(self):
        body = "Nội dung rất dài theo quy định pháp luật. " * 100
        text = f"Điều 10. Tiêu đề dài\n{body}"
        assert len(text) > DIEU_SPLIT_THRESHOLD
        result = sub_chunk_dieu(text, "10")
        assert len(result) > 1
        assert all(r[2] is True for r in result)  # all are sub-chunks

    def test_first_sub_chunk_no_prefix(self):
        body = "Nội dung rất dài theo quy định pháp luật. " * 100
        text = f"Điều 5. Quá cảnh đường hàng không\n{body}"
        result = sub_chunk_dieu(text, "5")
        assert not result[0][0].startswith("[")

    def test_subsequent_sub_chunks_have_context_prefix(self):
        body = "Nội dung rất dài theo quy định pháp luật. " * 100
        text = f"Điều 5. Quá cảnh đường hàng không\n{body}"
        result = sub_chunk_dieu(text, "5")
        for _, sub_idx, _ in result[1:]:
            pass
        for sub_text, sub_idx, _ in result[1:]:
            assert sub_text.startswith("[Điều 5. Quá cảnh đường hàng không]\n")

    def test_sub_chunk_indices_sequential(self):
        body = "Nội dung rất dài theo quy định pháp luật. " * 100
        text = f"Điều 3. Tiêu đề\n{body}"
        result = sub_chunk_dieu(text, "3")
        indices = [r[1] for r in result]
        assert indices == list(range(len(result)))

    def test_sub_chunks_within_size_limit(self):
        body = "Nội dung rất dài theo quy định pháp luật. " * 100
        text = f"Điều 7. Tiêu đề\n{body}"
        result = sub_chunk_dieu(text, "7")
        header = _extract_dieu_header(text)
        prefix_len = len(f"[{header}]\n")
        for sub_text, sub_idx, _ in result:
            raw_len = len(sub_text) - (prefix_len if sub_idx > 0 else 0)
            assert raw_len <= SUB_CHUNK_SIZE + SUB_CHUNK_OVERLAP + 50

    def test_custom_threshold(self):
        text = "Điều 1. Test\n" + "word " * 100
        result_low = sub_chunk_dieu(text, "1", threshold=50)
        result_high = sub_chunk_dieu(text, "1", threshold=99999)
        assert len(result_low) > 1
        assert len(result_high) == 1

    def test_preamble_sub_chunk(self):
        """Preamble (dieu_number=None) can also be sub-chunked if long."""
        body = "Căn cứ Hiến pháp nước Cộng hòa xã hội chủ nghĩa Việt Nam. " * 80
        text = f"QUỐC HỘI - LUẬT\n{body}"
        result = sub_chunk_dieu(text, None)
        assert len(result) > 1
        for sub_text, sub_idx, _ in result[1:]:
            assert sub_text.startswith("[QUỐC HỘI - LUẬT]\n")


class TestChunkSingleDocument:
    """Tests for single-document chunking via Điều + sub-chunking."""

    def test_chunks_produced(self):
        doc = ExtractedDocument("t.doc", "/t.doc", "T", SAMPLE_VIETNAMESE_TEXT)
        chunks = chunk_single_document(doc)
        assert len(chunks) > 0
        for c in chunks:
            assert c.metadata["source_file"] == "t.doc"

    def test_empty_doc_returns_empty(self):
        doc = ExtractedDocument("e.doc", "/e.doc", "E", "")
        assert chunk_single_document(doc) == []

    def test_metadata_has_dieu_field(self):
        text = "Preamble\nĐiều 1. Test\nNội dung."
        doc = ExtractedDocument("t.doc", "/t.doc", "T", text)
        chunks = chunk_single_document(doc)
        assert chunks[0].metadata["dieu"] == ""  # preamble
        assert chunks[1].metadata["dieu"] == "1"

    def test_metadata_has_sub_chunk_fields(self):
        text = "Preamble\nĐiều 1. Test\nNội dung."
        doc = ExtractedDocument("t.doc", "/t.doc", "T", text)
        chunks = chunk_single_document(doc)
        for c in chunks:
            assert "sub_chunk_index" in c.metadata
            assert "is_sub_chunk" in c.metadata

    def test_short_articles_not_sub_chunked(self):
        text = "Preamble\nĐiều 1. Test\nNội dung ngắn."
        doc = ExtractedDocument("t.doc", "/t.doc", "T", text)
        chunks = chunk_single_document(doc)
        for c in chunks:
            assert c.metadata["is_sub_chunk"] is False

    def test_long_article_sub_chunked(self):
        body = "Nội dung rất dài theo quy định. " * 200
        text = f"Preamble ngắn\nĐiều 1. Tiêu đề\n{body}"
        doc = ExtractedDocument("t.doc", "/t.doc", "T", text)
        chunks = chunk_single_document(doc)
        dieu_chunks = [c for c in chunks if c.metadata["dieu"] == "1"]
        assert len(dieu_chunks) > 1
        assert all(c.metadata["is_sub_chunk"] is True for c in dieu_chunks)

    def test_chunk_indices_sequential(self):
        doc = ExtractedDocument("t.doc", "/t.doc", "T", SAMPLE_VIETNAMESE_TEXT)
        chunks = chunk_single_document(doc)
        indices = [c.metadata["chunk_index"] for c in chunks]
        assert indices == list(range(len(indices)))


class TestChunkDocuments:
    """Tests for multi-document chunking."""

    def test_chunk_multiple_docs(self):
        docs = [
            ExtractedDocument("a.doc", "/a.doc", "A", "Điều 1. Test A\nNội dung A."),
            ExtractedDocument("b.doc", "/b.doc", "B", "Điều 1. Test B\nNội dung B."),
        ]
        chunks = chunk_documents(docs)
        sources = {c.metadata["source_file"] for c in chunks}
        assert "a.doc" in sources
        assert "b.doc" in sources

    def test_empty_doc_skipped(self):
        docs = [
            ExtractedDocument("e.doc", "/e.doc", "E", ""),
            ExtractedDocument("ok.doc", "/ok.doc", "OK", "Điều 1. Có nội dung."),
        ]
        chunks = chunk_documents(docs)
        assert all(c.metadata["source_file"] == "ok.doc" for c in chunks)


class TestEmbedChunks:
    """Tests for embedding generation."""

    def test_embed_chunks_produces_correct_dimensions(self, mock_embedding_model):
        chunks = [
            TextChunk("Điều 1. Test", {"source_file": "a.doc", "title": "A", "chunk_index": 0, "dieu": "1", "sub_chunk_index": 0, "is_sub_chunk": False}),
            TextChunk("Điều 2. Test", {"source_file": "a.doc", "title": "A", "chunk_index": 1, "dieu": "2", "sub_chunk_index": 0, "is_sub_chunk": False}),
        ]
        embeddings = embed_chunks(mock_embedding_model, chunks)
        assert len(embeddings) == 2
        assert len(embeddings[0]) == EMBEDDING_DIM

    def test_embed_chunks_calls_model_with_texts(self, mock_embedding_model):
        chunks = [
            TextChunk("text one", {"source_file": "a.doc", "title": "A", "chunk_index": 0, "dieu": "", "sub_chunk_index": 0, "is_sub_chunk": False}),
            TextChunk("text two", {"source_file": "a.doc", "title": "A", "chunk_index": 1, "dieu": "1", "sub_chunk_index": 0, "is_sub_chunk": False}),
        ]
        embed_chunks(mock_embedding_model, chunks)
        call_args = mock_embedding_model.encode.call_args
        assert call_args[0][0] == ["text one", "text two"]

    def test_embed_chunks_returns_list_of_lists(self, mock_embedding_model):
        chunks = [TextChunk("test", {"source_file": "a.doc", "title": "A", "chunk_index": 0, "dieu": "", "sub_chunk_index": 0, "is_sub_chunk": False})]
        result = embed_chunks(mock_embedding_model, chunks)
        assert isinstance(result, list)
        assert isinstance(result[0], list)
        assert all(isinstance(v, float) for v in result[0])


class TestBuildVectorDB:
    """Tests for ChromaDB collection creation and insertion."""

    def _make_chunks_and_embeddings(self, n=5):
        chunks = [
            TextChunk(
                f"Điều {i}. Nội dung thử nghiệm số {i}.",
                {"source_file": f"doc{i % 2}.doc", "title": f"Luật {i % 2}", "chunk_index": i, "dieu": str(i), "sub_chunk_index": 0, "is_sub_chunk": False},
            )
            for i in range(n)
        ]
        embeddings = np.random.rand(n, EMBEDDING_DIM).tolist()
        return chunks, embeddings

    def test_chromadb_collection_created_with_given_name(self, tmp_chroma_dir):
        chunks, embeddings = self._make_chunks_and_embeddings(3)
        collection = build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="cutru")
        assert collection.name == "cutru"

    def test_chromadb_documents_inserted(self, tmp_chroma_dir):
        chunks, embeddings = self._make_chunks_and_embeddings(5)
        collection = build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="test_col")
        assert collection.count() == 5

    def test_chromadb_no_duplicate_ids(self, tmp_chroma_dir):
        chunks = [
            TextChunk(f"Text {i}", {"source_file": f"file{i}.doc", "title": "T", "chunk_index": 0, "dieu": str(i), "sub_chunk_index": 0, "is_sub_chunk": False})
            for i in range(10)
        ]
        embeddings = np.random.rand(10, EMBEDDING_DIM).tolist()
        collection = build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="dedup")
        assert collection.count() == 10

    def test_build_idempotent(self, tmp_chroma_dir):
        chunks, embeddings = self._make_chunks_and_embeddings(3)
        build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="idem")
        collection = build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="idem")
        assert collection.count() == 3

    def test_chromadb_metadata_stored(self, tmp_chroma_dir):
        chunks = [
            TextChunk(
                "Điều 1. Luật Hải quan",
                {"source_file": "haiquan.doc", "title": "Luật Hải quan", "chunk_index": 0, "dieu": "1", "sub_chunk_index": 0, "is_sub_chunk": False},
            ),
        ]
        embeddings = np.random.rand(1, EMBEDDING_DIM).tolist()
        collection = build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="haiquan")
        result = collection.get(ids=["haiquan.doc_0"], include=["metadatas"])
        assert result["metadatas"][0]["source_file"] == "haiquan.doc"
        assert result["metadatas"][0]["title"] == "Luật Hải quan"
        assert result["metadatas"][0]["dieu"] == "1"
        assert result["metadatas"][0]["sub_chunk_index"] == 0
        assert result["metadatas"][0]["is_sub_chunk"] is False

    def test_chromadb_cosine_space(self, tmp_chroma_dir):
        chunks, embeddings = self._make_chunks_and_embeddings(2)
        collection = build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="cosine")
        assert collection.metadata.get("hnsw:space") == "cosine"


class TestLogChunksToCsv:
    """Tests for CSV chunk logging."""

    def _sample_chunks(self):
        return [
            TextChunk("Preamble text", {"source_file": "test.doc", "title": "Luật test", "chunk_index": 0, "dieu": "", "sub_chunk_index": 0, "is_sub_chunk": False}),
            TextChunk("Điều 1. Tiêu đề\nNội dung.", {"source_file": "test.doc", "title": "Luật test", "chunk_index": 1, "dieu": "1", "sub_chunk_index": 0, "is_sub_chunk": False}),
            TextChunk("[Điều 2. Dài]\nPhần 2.", {"source_file": "test.doc", "title": "Luật test", "chunk_index": 2, "dieu": "2", "sub_chunk_index": 1, "is_sub_chunk": True}),
        ]

    def test_creates_csv_file(self, tmp_path):
        chunks = self._sample_chunks()
        path = log_chunks_to_csv(chunks, "test_col", log_dir=str(tmp_path))
        assert os.path.isfile(path)
        assert path.endswith("test_col.csv")

    def test_csv_has_correct_row_count(self, tmp_path):
        chunks = self._sample_chunks()
        path = log_chunks_to_csv(chunks, "test_col", log_dir=str(tmp_path))
        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        assert len(rows) == 3

    def test_csv_has_expected_columns(self, tmp_path):
        chunks = self._sample_chunks()
        path = log_chunks_to_csv(chunks, "test_col", log_dir=str(tmp_path))
        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            row = next(reader)
        expected = {"chunk_index", "dieu", "sub_chunk_index", "is_sub_chunk",
                    "char_length", "source_file", "title", "text"}
        assert set(row.keys()) == expected

    def test_csv_char_length_correct(self, tmp_path):
        chunks = self._sample_chunks()
        path = log_chunks_to_csv(chunks, "test_col", log_dir=str(tmp_path))
        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        for row, chunk in zip(rows, chunks):
            assert int(row["char_length"]) == len(chunk.text)

    def test_csv_preserves_vietnamese(self, tmp_path):
        chunks = [TextChunk("Điều 1. Phạm vi điều chỉnh", {"source_file": "vn.doc", "title": "Luật", "chunk_index": 0, "dieu": "1", "sub_chunk_index": 0, "is_sub_chunk": False})]
        path = log_chunks_to_csv(chunks, "vn_col", log_dir=str(tmp_path))
        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            row = next(reader)
        assert "Phạm vi điều chỉnh" in row["text"]

    def test_creates_log_dir_if_missing(self, tmp_path):
        log_dir = str(tmp_path / "nested" / "logs")
        chunks = self._sample_chunks()[:1]
        path = log_chunks_to_csv(chunks, "auto", log_dir=log_dir)
        assert os.path.isfile(path)


class TestBuildAllVectorDBs:
    """Tests for per-document collection building."""

    def test_creates_one_collection_per_doc(self, tmp_chroma_dir, mock_embedding_model, tmp_path):
        docs = [
            ExtractedDocument("cutru.doc", "/cutru.doc", "Luật cư trú",
                              "Preamble\nĐiều 1. A\nNội dung.\nĐiều 2. B\nNội dung."),
            ExtractedDocument("haiquan.doc", "/haiquan.doc", "Luật Hải quan",
                              "Preamble\nĐiều 1. X\nNội dung."),
        ]
        collections = build_all_vectordbs(docs, mock_embedding_model, db_path=tmp_chroma_dir, log_dir=str(tmp_path))
        assert len(collections) == 2
        assert "cutru" in collections
        assert "haiquan" in collections

    def test_each_collection_has_correct_chunks(self, tmp_chroma_dir, mock_embedding_model, tmp_path):
        docs = [
            ExtractedDocument("drone.doc", "/drone.doc", "Drone",
                              "Preamble\nĐiều 1. A\n\nĐiều 2. B\n\nĐiều 3. C"),
        ]
        collections = build_all_vectordbs(docs, mock_embedding_model, db_path=tmp_chroma_dir, log_dir=str(tmp_path))
        assert collections["drone"].count() == 4  # preamble + 3 Điều

    def test_skips_empty_docs(self, tmp_chroma_dir, mock_embedding_model, tmp_path):
        docs = [
            ExtractedDocument("empty.doc", "/empty.doc", "Empty", ""),
            ExtractedDocument("ok.doc", "/ok.doc", "OK", "Điều 1. Có nội dung"),
        ]
        collections = build_all_vectordbs(docs, mock_embedding_model, db_path=tmp_chroma_dir, log_dir=str(tmp_path))
        assert len(collections) == 1

    def test_csv_logs_created_per_collection(self, tmp_chroma_dir, mock_embedding_model, tmp_path):
        docs = [
            ExtractedDocument("cutru.doc", "/cutru.doc", "Luật cư trú",
                              "Preamble\nĐiều 1. A\nNội dung."),
            ExtractedDocument("drone.doc", "/drone.doc", "Drone",
                              "Điều 1. B\nNội dung."),
        ]
        build_all_vectordbs(docs, mock_embedding_model, db_path=tmp_chroma_dir, log_dir=str(tmp_path))
        assert os.path.isfile(str(tmp_path / "cutru.csv"))
        assert os.path.isfile(str(tmp_path / "drone.csv"))


class TestListCollections:
    """Tests for listing collections."""

    def test_list_empty_db(self, tmp_chroma_dir):
        names = list_collections(db_path=tmp_chroma_dir)
        assert names == []

    def test_list_after_build(self, tmp_chroma_dir):
        chunks = [TextChunk("text", {"source_file": "a.doc", "title": "A", "chunk_index": 0, "dieu": "", "sub_chunk_index": 0, "is_sub_chunk": False})]
        embeddings = np.random.rand(1, EMBEDDING_DIM).tolist()
        build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="alpha")
        build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="beta")
        names = list_collections(db_path=tmp_chroma_dir)
        assert set(names) == {"alpha", "beta"}
