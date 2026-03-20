"""Tests for query_db.py — querying the vector database."""

import numpy as np
import pytest
from unittest.mock import MagicMock

from build_vectordb import TextChunk, build_vectordb
from query_db import (
    format_all_results,
    format_results,
    query_all_collections,
    query_vectordb,
)
from tests.conftest import EMBEDDING_DIM


class TestQueryVectorDB:
    """Tests for querying a single collection."""

    def _build_test_collection(self, tmp_chroma_dir, name="test_col"):
        chunks = [
            TextChunk(
                "Điều 1. Người nước ngoài nhập cảnh Việt Nam phải có hộ chiếu.",
                {"source_file": "cutru.doc", "title": "Luật cư trú", "chunk_index": 0},
            ),
            TextChunk(
                "Điều 5. Hàng hóa xuất nhập khẩu phải khai báo hải quan.",
                {"source_file": "cutru.doc", "title": "Luật cư trú", "chunk_index": 1},
            ),
            TextChunk(
                "Điều 10. Cấm mua bán, tàng trữ, vận chuyển chất ma túy.",
                {"source_file": "cutru.doc", "title": "Luật cư trú", "chunk_index": 2},
            ),
        ]
        embeddings = np.random.rand(3, EMBEDDING_DIM).tolist()
        return build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name=name)

    def test_query_returns_results(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_test_collection(tmp_chroma_dir)
        results = query_vectordb("nhập cảnh", mock_embedding_model, collection, top_k=3)
        assert "documents" in results
        assert "metadatas" in results
        assert "distances" in results
        assert len(results["documents"][0]) > 0

    def test_query_top_k(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_test_collection(tmp_chroma_dir)
        results = query_vectordb("test", mock_embedding_model, collection, top_k=2)
        assert len(results["documents"][0]) == 2

    def test_query_top_k_larger_than_collection(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_test_collection(tmp_chroma_dir)
        results = query_vectordb("test", mock_embedding_model, collection, top_k=100)
        assert len(results["documents"][0]) == 3

    def test_query_empty_string_raises(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_test_collection(tmp_chroma_dir)
        with pytest.raises(ValueError, match="Query text must not be empty"):
            query_vectordb("", mock_embedding_model, collection)

    def test_query_whitespace_only_raises(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_test_collection(tmp_chroma_dir)
        with pytest.raises(ValueError, match="Query text must not be empty"):
            query_vectordb("   ", mock_embedding_model, collection)

    def test_query_result_contains_source(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_test_collection(tmp_chroma_dir)
        results = query_vectordb("hải quan", mock_embedding_model, collection, top_k=3)
        for meta in results["metadatas"][0]:
            assert "source_file" in meta
            assert meta["source_file"].endswith(".doc")

    def test_query_vietnamese_diacritics(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_test_collection(tmp_chroma_dir)
        results = query_vectordb("luật ma túy", mock_embedding_model, collection, top_k=3)
        assert len(results["documents"][0]) > 0


class TestQueryAllCollections:
    """Tests for querying across all collections."""

    def test_queries_multiple_collections(self, tmp_chroma_dir, mock_embedding_model):
        for name in ["cutru", "haiquan"]:
            chunks = [TextChunk(f"Điều {name}", {"source_file": f"{name}.doc", "title": name, "chunk_index": 0})]
            embeddings = np.random.rand(1, EMBEDDING_DIM).tolist()
            build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name=name)

        all_results = query_all_collections("test", mock_embedding_model, db_path=tmp_chroma_dir, top_k=1)
        assert "cutru" in all_results
        assert "haiquan" in all_results

    def test_empty_db_returns_empty(self, tmp_chroma_dir, mock_embedding_model):
        all_results = query_all_collections("test", mock_embedding_model, db_path=tmp_chroma_dir)
        assert all_results == {}


class TestFormatResults:
    """Tests for the result formatting function."""

    def test_format_empty_results(self):
        results = {"documents": [[]], "metadatas": [[]], "distances": [[]]}
        output = format_results(results)
        assert "Không tìm thấy" in output

    def test_format_includes_similarity_score(self):
        results = {
            "documents": [["Điều 1. Test document"]],
            "metadatas": [[{"source_file": "test.doc", "title": "Test", "chunk_index": 0}]],
            "distances": [[0.1]],
        }
        output = format_results(results)
        assert "similarity: 0.9000" in output

    def test_format_includes_source_info(self):
        results = {
            "documents": [["Doc text"]],
            "metadatas": [[{"source_file": "haiquan.doc", "title": "Luật Hải quan", "chunk_index": 5}]],
            "distances": [[0.2]],
        }
        output = format_results(results)
        assert "haiquan.doc" in output
        assert "Luật Hải quan" in output

    def test_format_includes_collection_name(self):
        results = {
            "documents": [["Doc text"]],
            "metadatas": [[{"source_file": "a.doc", "title": "A", "chunk_index": 0}]],
            "distances": [[0.1]],
        }
        output = format_results(results, collection_name="haiquan")
        assert "haiquan" in output

    def test_format_multiple_results_numbered(self):
        results = {
            "documents": [["Doc1", "Doc2", "Doc3"]],
            "metadatas": [[
                {"source_file": "a.doc", "title": "A", "chunk_index": 0},
                {"source_file": "b.doc", "title": "B", "chunk_index": 1},
                {"source_file": "c.doc", "title": "C", "chunk_index": 2},
            ]],
            "distances": [[0.1, 0.2, 0.3]],
        }
        output = format_results(results)
        assert "Kết quả 1" in output
        assert "Kết quả 2" in output
        assert "Kết quả 3" in output

    def test_format_preserves_vietnamese_content(self):
        results = {
            "documents": [["Điều 1. Quốc hội ban hành luật phạt tù"]],
            "metadatas": [[{"source_file": "t.doc", "title": "T", "chunk_index": 0}]],
            "distances": [[0.05]],
        }
        output = format_results(results)
        assert "Quốc hội" in output
        assert "phạt tù" in output


class TestFormatAllResults:
    """Tests for multi-collection formatting."""

    def test_format_all_with_results(self):
        all_results = {
            "cutru": {
                "documents": [["Doc A"]],
                "metadatas": [[{"source_file": "cutru.doc", "title": "Cư trú", "chunk_index": 0}]],
                "distances": [[0.1]],
            },
            "haiquan": {
                "documents": [["Doc B"]],
                "metadatas": [[{"source_file": "haiquan.doc", "title": "Hải quan", "chunk_index": 0}]],
                "distances": [[0.2]],
            },
        }
        output = format_all_results(all_results)
        assert "cutru" in output
        assert "haiquan" in output

    def test_format_all_empty(self):
        all_results = {
            "empty": {"documents": [[]], "metadatas": [[]], "distances": [[]]},
        }
        output = format_all_results(all_results)
        assert "Không tìm thấy" in output
