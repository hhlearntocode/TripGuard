"""Tests for metrics.py — quality metrics per collection."""

import numpy as np
import pytest
from unittest.mock import MagicMock, patch

from build_vectordb import TextChunk, build_vectordb
from metrics import (
    GROUND_TRUTH_QUERIES,
    CollectionMetrics,
    compute_collection_stats,
    evaluate_queries,
    format_metrics_report,
    run_metrics,
)
from tests.conftest import EMBEDDING_DIM


class TestComputeCollectionStats:
    """Tests for basic collection statistics."""

    def test_stats_chunk_count(self, tmp_chroma_dir):
        chunks = [
            TextChunk(f"Điều {i}. Nội dung", {"source_file": "a.doc", "title": "A", "chunk_index": i})
            for i in range(5)
        ]
        embeddings = np.random.rand(5, EMBEDDING_DIM).tolist()
        collection = build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="stats_test")

        stats = compute_collection_stats(collection)
        assert stats["chunk_count"] == 5

    def test_stats_avg_chunk_length(self, tmp_chroma_dir):
        chunks = [
            TextChunk("short", {"source_file": "a.doc", "title": "A", "chunk_index": 0}),
            TextChunk("a much longer text than short", {"source_file": "a.doc", "title": "A", "chunk_index": 1}),
        ]
        embeddings = np.random.rand(2, EMBEDDING_DIM).tolist()
        collection = build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="avg_test")

        stats = compute_collection_stats(collection)
        assert stats["avg_chunk_length"] > 0
        assert stats["min_chunk_length"] == 5  # "short"
        assert stats["max_chunk_length"] == len("a much longer text than short")

    def test_stats_empty_collection(self, tmp_chroma_dir):
        import chromadb
        client = chromadb.PersistentClient(path=tmp_chroma_dir)
        collection = client.get_or_create_collection("empty_col")

        stats = compute_collection_stats(collection)
        assert stats["chunk_count"] == 0
        assert stats["avg_chunk_length"] == 0


class TestEvaluateQueries:
    """Tests for query evaluation with ground-truth checks."""

    def _build_collection(self, tmp_chroma_dir, texts, name="eval_test"):
        chunks = [
            TextChunk(text, {"source_file": f"{name}.doc", "title": name, "chunk_index": i})
            for i, text in enumerate(texts)
        ]
        embeddings = np.random.rand(len(chunks), EMBEDDING_DIM).tolist()
        return build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name=name)

    def test_evaluate_returns_results_for_each_query(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_collection(tmp_chroma_dir, [
            "Điều 1. Nhập cảnh Việt Nam cần hộ chiếu.",
            "Điều 2. Thị thực được cấp tại cửa khẩu.",
        ])
        queries = [
            {"query": "nhập cảnh", "must_contain": ["nhập cảnh"]},
            {"query": "thị thực", "must_contain": ["thị thực"]},
        ]
        results = evaluate_queries(collection, mock_embedding_model, queries)
        assert len(results) == 2

    def test_evaluate_records_hit_status(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_collection(tmp_chroma_dir, [
            "Luật hải quan quy định thủ tục hải quan.",
        ])
        queries = [
            {"query": "hải quan", "must_contain": ["hải quan"]},
            {"query": "test", "must_contain": ["không có từ này"]},
        ]
        results = evaluate_queries(collection, mock_embedding_model, queries)
        assert results[0]["hit"] is True
        assert results[1]["hit"] is False

    def test_evaluate_records_similarity(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_collection(tmp_chroma_dir, [
            "Ma túy bị cấm theo pháp luật Việt Nam.",
        ])
        queries = [{"query": "ma túy", "must_contain": ["ma túy"]}]
        results = evaluate_queries(collection, mock_embedding_model, queries)
        assert "top1_similarity" in results[0]
        assert "top5_avg_similarity" in results[0]
        assert isinstance(results[0]["top1_similarity"], float)

    def test_evaluate_records_query_time(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_collection(tmp_chroma_dir, [
            "Điều 1. Nội dung thử nghiệm.",
        ])
        queries = [{"query": "test", "must_contain": ["nội dung"]}]
        results = evaluate_queries(collection, mock_embedding_model, queries)
        assert results[0]["query_time_ms"] >= 0

    def test_evaluate_empty_queries(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_collection(tmp_chroma_dir, ["text"])
        results = evaluate_queries(collection, mock_embedding_model, [])
        assert results == []

    def test_evaluate_num_results_reported(self, tmp_chroma_dir, mock_embedding_model):
        collection = self._build_collection(tmp_chroma_dir, [
            "Doc 1 về giao thông đường bộ",
            "Doc 2 về tốc độ tối đa",
            "Doc 3 về giấy phép lái xe",
        ])
        queries = [{"query": "giao thông", "must_contain": ["giao thông"]}]
        results = evaluate_queries(collection, mock_embedding_model, queries, top_k=2)
        assert results[0]["num_results"] == 2


class TestRunMetrics:
    """Tests for the full metrics pipeline."""

    def test_returns_metrics_for_each_collection(self, tmp_chroma_dir, mock_embedding_model):
        for name in ["alpha", "beta"]:
            chunks = [TextChunk(f"Text {name}", {"source_file": f"{name}.doc", "title": name, "chunk_index": 0})]
            embeddings = np.random.rand(1, EMBEDDING_DIM).tolist()
            build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name=name)

        all_metrics = run_metrics(mock_embedding_model, db_path=tmp_chroma_dir)
        assert len(all_metrics) == 2
        names = {m.collection_name for m in all_metrics}
        assert names == {"alpha", "beta"}

    def test_metrics_have_correct_fields(self, tmp_chroma_dir, mock_embedding_model):
        chunks = [TextChunk("Hải quan text", {"source_file": "haiquan.doc", "title": "HQ", "chunk_index": 0})]
        embeddings = np.random.rand(1, EMBEDDING_DIM).tolist()
        build_vectordb(chunks, embeddings, db_path=tmp_chroma_dir, collection_name="haiquan")

        all_metrics = run_metrics(mock_embedding_model, db_path=tmp_chroma_dir)
        m = all_metrics[0]
        assert isinstance(m, CollectionMetrics)
        assert m.chunk_count == 1
        assert m.avg_chunk_length > 0
        assert 0 <= m.hit_rate <= 1
        assert len(m.query_results) == len(GROUND_TRUTH_QUERIES.get("haiquan", []))

    def test_empty_db_returns_empty(self, tmp_chroma_dir, mock_embedding_model):
        all_metrics = run_metrics(mock_embedding_model, db_path=tmp_chroma_dir)
        assert all_metrics == []


class TestFormatMetricsReport:
    """Tests for the metrics report formatter."""

    def test_report_contains_collection_names(self):
        metrics = [
            CollectionMetrics(collection_name="cutru", chunk_count=50, avg_chunk_length=400,
                              min_chunk_length=100, max_chunk_length=512,
                              hit_rate=1.0, avg_top1_similarity=0.85, avg_top5_similarity=0.75,
                              avg_query_time_ms=5.0, query_results=[]),
            CollectionMetrics(collection_name="haiquan", chunk_count=30, avg_chunk_length=350,
                              min_chunk_length=80, max_chunk_length=500,
                              hit_rate=0.67, avg_top1_similarity=0.80, avg_top5_similarity=0.70,
                              avg_query_time_ms=4.0, query_results=[]),
        ]
        report = format_metrics_report(metrics)
        assert "cutru" in report
        assert "haiquan" in report

    def test_report_contains_stats(self):
        metrics = [
            CollectionMetrics(collection_name="test", chunk_count=42, avg_chunk_length=300.5,
                              min_chunk_length=50, max_chunk_length=512,
                              hit_rate=1.0, avg_top1_similarity=0.9, avg_top5_similarity=0.8,
                              avg_query_time_ms=3.5, query_results=[]),
        ]
        report = format_metrics_report(metrics)
        assert "42" in report
        assert "300.5" in report

    def test_report_shows_pass_fail(self):
        metrics = [
            CollectionMetrics(
                collection_name="test", chunk_count=10, avg_chunk_length=200,
                min_chunk_length=50, max_chunk_length=400,
                hit_rate=0.5, avg_top1_similarity=0.8, avg_top5_similarity=0.7,
                avg_query_time_ms=2.0,
                query_results=[
                    {"query": "q1", "hit": True, "top1_similarity": 0.9, "query_time_ms": 1.5,
                     "must_contain": ["x"], "hits_found": ["x"], "top5_avg_similarity": 0.8, "num_results": 5},
                    {"query": "q2", "hit": False, "top1_similarity": 0.5, "query_time_ms": 2.5,
                     "must_contain": ["y"], "hits_found": [], "top5_avg_similarity": 0.4, "num_results": 5},
                ],
            ),
        ]
        report = format_metrics_report(metrics)
        assert "[PASS]" in report
        assert "[FAIL]" in report

    def test_report_shows_overall_summary(self):
        metrics = [
            CollectionMetrics(
                collection_name="test", chunk_count=10, avg_chunk_length=200,
                min_chunk_length=50, max_chunk_length=400,
                hit_rate=1.0, avg_top1_similarity=0.85, avg_top5_similarity=0.75,
                avg_query_time_ms=3.0,
                query_results=[
                    {"query": "q1", "hit": True, "top1_similarity": 0.85, "query_time_ms": 3.0,
                     "must_contain": ["x"], "hits_found": ["x"], "top5_avg_similarity": 0.75, "num_results": 5},
                ],
            ),
        ]
        report = format_metrics_report(metrics)
        assert "OVERALL" in report

    def test_report_handles_no_query_results(self):
        metrics = [
            CollectionMetrics(collection_name="unknown", chunk_count=5, avg_chunk_length=100,
                              min_chunk_length=50, max_chunk_length=200,
                              hit_rate=0.0, avg_top1_similarity=0.0, avg_top5_similarity=0.0,
                              avg_query_time_ms=0.0, query_results=[]),
        ]
        report = format_metrics_report(metrics)
        assert "unknown" in report


class TestGroundTruthQueries:
    """Tests for ground-truth query coverage."""

    def test_all_collections_have_queries(self):
        expected = {"cutru", "disanvanhoa", "drone", "gt_db", "haiquan", "matuy"}
        assert set(GROUND_TRUTH_QUERIES.keys()) == expected

    def test_each_collection_has_at_least_3_queries(self):
        for col, queries in GROUND_TRUTH_QUERIES.items():
            assert len(queries) >= 3, f"{col} has fewer than 3 test queries"

    def test_queries_have_required_fields(self):
        for col, queries in GROUND_TRUTH_QUERIES.items():
            for q in queries:
                assert "query" in q, f"{col}: missing 'query'"
                assert "must_contain" in q, f"{col}: missing 'must_contain'"
                assert len(q["must_contain"]) > 0, f"{col}: empty must_contain"
