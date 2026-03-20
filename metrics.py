"""Quality metrics for each TripGuard vector DB collection.

Runs after build to validate retrieval quality per collection using
known Vietnamese test queries with expected ground-truth matches.
"""

import time
from dataclasses import dataclass, field

import chromadb
import numpy as np
from sentence_transformers import SentenceTransformer

from build_vectordb import DEFAULT_DB_PATH, list_collections
from query_db import load_collection, query_vectordb

GROUND_TRUTH_QUERIES: dict[str, list[dict]] = {
    "cutru": [
        {"query": "điều kiện nhập cảnh Việt Nam", "must_contain": ["nhập cảnh", "Việt Nam"]},
        {"query": "thị thực visa cho người nước ngoài", "must_contain": ["thị thực"]},
        {"query": "cư trú tạm thời", "must_contain": ["cư trú"]},
    ],
    "disanvanhoa": [
        {"query": "bảo tồn di sản văn hóa", "must_contain": ["di sản"]},
        {"query": "di tích lịch sử", "must_contain": ["di tích"]},
        {"query": "bảo vệ di sản văn hóa phi vật thể", "must_contain": ["văn hóa"]},
    ],
    "drone": [
        {"query": "quy định tàu bay không người lái", "must_contain": ["không người lái"]},
        {"query": "đăng ký phương tiện bay", "must_contain": ["bay"]},
        {"query": "cấm bay drone khu vực quân sự", "must_contain": ["bay"]},
    ],
    "gt_db": [
        {"query": "xử phạt vi phạm giao thông", "must_contain": ["giao thông"]},
        {"query": "giấy phép lái xe", "must_contain": ["lái xe"]},
        {"query": "tốc độ tối đa đường bộ", "must_contain": ["tốc độ"]},
    ],
    "haiquan": [
        {"query": "thủ tục hải quan xuất nhập khẩu", "must_contain": ["hải quan"]},
        {"query": "thuế xuất nhập khẩu hàng hóa", "must_contain": ["hàng hóa"]},
        {"query": "kiểm tra giám sát hải quan", "must_contain": ["hải quan"]},
    ],
    "matuy": [
        {"query": "xử phạt tàng trữ ma túy", "must_contain": ["ma túy"]},
        {"query": "phòng chống ma túy", "must_contain": ["ma túy"]},
        {"query": "cai nghiện chất gây nghiện", "must_contain": ["nghiện"]},
    ],
}


@dataclass
class CollectionMetrics:
    collection_name: str
    chunk_count: int = 0
    avg_chunk_length: float = 0.0
    min_chunk_length: int = 0
    max_chunk_length: int = 0
    query_results: list[dict] = field(default_factory=list)
    avg_top1_similarity: float = 0.0
    avg_top5_similarity: float = 0.0
    hit_rate: float = 0.0
    avg_query_time_ms: float = 0.0


def compute_collection_stats(collection: chromadb.Collection) -> dict:
    """Basic stats: chunk count, avg/min/max chunk length."""
    all_docs = collection.get(include=["documents"])
    documents = all_docs.get("documents", [])
    if not documents:
        return {"chunk_count": 0, "avg_chunk_length": 0, "min_chunk_length": 0, "max_chunk_length": 0}

    lengths = [len(d) for d in documents]
    return {
        "chunk_count": len(documents),
        "avg_chunk_length": round(np.mean(lengths), 1),
        "min_chunk_length": min(lengths),
        "max_chunk_length": max(lengths),
    }


def evaluate_queries(
    collection: chromadb.Collection,
    model: SentenceTransformer,
    queries: list[dict],
    top_k: int = 5,
) -> list[dict]:
    """Run test queries and check if results contain expected keywords."""
    results_log: list[dict] = []

    for q in queries:
        query_text = q["query"]
        must_contain = q["must_contain"]

        t0 = time.perf_counter()
        results = query_vectordb(query_text, model, collection, top_k=top_k)
        elapsed_ms = (time.perf_counter() - t0) * 1000

        docs = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]

        top1_sim = (1 - distances[0]) if distances else 0.0
        top5_sim = float(np.mean([1 - d for d in distances])) if distances else 0.0

        combined_text = " ".join(docs).lower()
        hits = [kw for kw in must_contain if kw.lower() in combined_text]
        hit = len(hits) == len(must_contain)

        results_log.append({
            "query": query_text,
            "must_contain": must_contain,
            "hit": hit,
            "hits_found": hits,
            "top1_similarity": round(top1_sim, 4),
            "top5_avg_similarity": round(top5_sim, 4),
            "query_time_ms": round(elapsed_ms, 2),
            "num_results": len(docs),
        })

    return results_log


def run_metrics(
    model: SentenceTransformer,
    db_path: str = DEFAULT_DB_PATH,
    top_k: int = 5,
) -> list[CollectionMetrics]:
    """Run full metrics suite on every collection in the DB."""
    all_metrics: list[CollectionMetrics] = []

    for col_name in sorted(list_collections(db_path)):
        collection = load_collection(col_name, db_path)
        stats = compute_collection_stats(collection)

        queries = GROUND_TRUTH_QUERIES.get(col_name, [])
        query_log = evaluate_queries(collection, model, queries, top_k=top_k) if queries else []

        hit_count = sum(1 for r in query_log if r["hit"])
        hit_rate = hit_count / len(query_log) if query_log else 0.0
        avg_top1 = float(np.mean([r["top1_similarity"] for r in query_log])) if query_log else 0.0
        avg_top5 = float(np.mean([r["top5_avg_similarity"] for r in query_log])) if query_log else 0.0
        avg_time = float(np.mean([r["query_time_ms"] for r in query_log])) if query_log else 0.0

        m = CollectionMetrics(
            collection_name=col_name,
            chunk_count=stats["chunk_count"],
            avg_chunk_length=stats["avg_chunk_length"],
            min_chunk_length=stats["min_chunk_length"],
            max_chunk_length=stats["max_chunk_length"],
            query_results=query_log,
            avg_top1_similarity=round(avg_top1, 4),
            avg_top5_similarity=round(avg_top5, 4),
            hit_rate=round(hit_rate, 4),
            avg_query_time_ms=round(avg_time, 2),
        )
        all_metrics.append(m)

    return all_metrics


def format_metrics_report(all_metrics: list[CollectionMetrics]) -> str:
    """Format a human-readable metrics report."""
    lines: list[str] = []
    lines.append("=" * 80)
    lines.append("TRIPGUARD VECTOR DB — METRICS REPORT")
    lines.append("=" * 80)

    for m in all_metrics:
        lines.append("")
        lines.append(f"Collection: {m.collection_name}")
        lines.append("-" * 40)
        lines.append(f"  Chunks:           {m.chunk_count}")
        lines.append(f"  Avg chunk length: {m.avg_chunk_length} chars")
        lines.append(f"  Min/Max length:   {m.min_chunk_length} / {m.max_chunk_length}")
        lines.append(f"  Hit rate:         {m.hit_rate:.0%}")
        lines.append(f"  Avg top-1 sim:    {m.avg_top1_similarity:.4f}")
        lines.append(f"  Avg top-5 sim:    {m.avg_top5_similarity:.4f}")
        lines.append(f"  Avg query time:   {m.avg_query_time_ms:.1f} ms")

        if m.query_results:
            lines.append(f"  Queries:")
            for r in m.query_results:
                status = "PASS" if r["hit"] else "FAIL"
                lines.append(
                    f"    [{status}] \"{r['query']}\"  "
                    f"top1={r['top1_similarity']:.4f}  "
                    f"time={r['query_time_ms']:.1f}ms"
                )

    lines.append("")
    lines.append("=" * 80)

    total_hit = sum(m.hit_rate * len(m.query_results) for m in all_metrics if m.query_results)
    total_queries = sum(len(m.query_results) for m in all_metrics if m.query_results)
    overall_hit = total_hit / total_queries if total_queries else 0
    sims = [m.avg_top1_similarity for m in all_metrics if m.query_results]
    overall_sim = float(np.mean(sims)) if sims else 0.0

    lines.append(f"OVERALL  hit_rate={overall_hit:.0%}  avg_top1_sim={overall_sim:.4f}  "
                 f"total_queries={total_queries}")
    lines.append("=" * 80)

    return "\n".join(lines)
