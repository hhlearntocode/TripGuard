"""Query the TripGuard Vietnamese law vector database."""

import os
import sys

import chromadb
from sentence_transformers import SentenceTransformer

from build_vectordb import DEFAULT_DB_PATH, MODEL_NAME, list_collections


def load_collection(
    collection_name: str,
    db_path: str = DEFAULT_DB_PATH,
) -> chromadb.Collection:
    """Open a persisted ChromaDB collection by name."""
    client = chromadb.PersistentClient(path=db_path)
    return client.get_collection(name=collection_name)


def query_vectordb(
    query_text: str,
    model: SentenceTransformer,
    collection: chromadb.Collection,
    top_k: int = 5,
) -> dict:
    """Embed *query_text* and return the top-k most similar chunks."""
    if not query_text or not query_text.strip():
        raise ValueError("Query text must not be empty")

    query_embedding = model.encode(
        [query_text], normalize_embeddings=True
    ).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )
    return results


def query_all_collections(
    query_text: str,
    model: SentenceTransformer,
    db_path: str = DEFAULT_DB_PATH,
    top_k: int = 5,
) -> dict[str, dict]:
    """Query every collection and return {collection_name: results}."""
    all_results: dict[str, dict] = {}
    for col_name in list_collections(db_path):
        collection = load_collection(col_name, db_path)
        results = query_vectordb(query_text, model, collection, top_k)
        all_results[col_name] = results
    return all_results


def format_results(results: dict, collection_name: str | None = None) -> str:
    """Pretty-print query results from a single collection."""
    lines: list[str] = []
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    if not documents:
        return "Không tìm thấy kết quả nào."

    if collection_name:
        lines.append(f"=== Collection: {collection_name} ===")

    for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances), 1):
        similarity = 1 - dist
        lines.append(f"--- Kết quả {i} (similarity: {similarity:.4f}) ---")
        lines.append(f"Nguồn: {meta.get('source_file', '?')} — {meta.get('title', '?')}")
        lines.append(f"Đoạn #{meta.get('chunk_index', '?')}")
        lines.append(doc)
        lines.append("")

    return "\n".join(lines)


def format_all_results(all_results: dict[str, dict]) -> str:
    """Pretty-print results from multiple collections."""
    sections: list[str] = []
    for col_name, results in sorted(all_results.items()):
        section = format_results(results, collection_name=col_name)
        if "Không tìm thấy" not in section:
            sections.append(section)

    if not sections:
        return "Không tìm thấy kết quả nào trong bất kỳ collection nào."

    return "\n\n".join(sections)


def main() -> None:
    if len(sys.argv) < 2:
        print("Cách dùng: python query_db.py <câu hỏi> [--collection NAME] [--top-k N]")
        sys.exit(1)

    query_text = sys.argv[1]
    top_k = int(sys.argv[2]) if len(sys.argv) > 2 else 5

    print(f"Đang tải model {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)

    print(f"Đang tìm kiếm: \"{query_text}\"  (top {top_k})\n")
    all_results = query_all_collections(query_text, model, top_k=top_k)
    print(format_all_results(all_results))


if __name__ == "__main__":
    main()
