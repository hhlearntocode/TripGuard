"""TripGuard Vietnamese Law Vector Database — main entry point.

Usage:
    python main.py build    [--doc-dir DIR] [--db-path DIR]
    python main.py query    "câu hỏi" [--collection NAME] [--top-k N] [--db-path DIR]
    python main.py list     [--db-path DIR]
    python main.py metrics  [--db-path DIR] [--top-k N]
"""

import argparse
import sys

from build_vectordb import (
    DEFAULT_DB_PATH,
    DEFAULT_LOG_DIR,
    MODEL_NAME,
    build_all_vectordbs,
    collection_name_from_filename,
    list_collections,
    load_embedding_model,
)
from extract_docs import extract_all_docs
from metrics import format_metrics_report, run_metrics
from query_db import (
    format_all_results,
    format_results,
    load_collection,
    query_all_collections,
    query_vectordb,
)


def cmd_build(args: argparse.Namespace) -> None:
    print(f"[1/3] Extracting .doc files from {args.doc_dir} ...")
    docs = extract_all_docs(args.doc_dir)
    if not docs:
        print("Không tìm thấy file .doc nào.", file=sys.stderr)
        sys.exit(1)
    for d in docs:
        col = collection_name_from_filename(d.filename)
        print(f"  {d.filename} -> collection '{col}' ({len(d.text)} chars)")

    print(f"\n[2/3] Loading {MODEL_NAME} ...")
    model = load_embedding_model()

    print(f"\n[3/3] Chunking, embedding & storing per-document collections at {args.db_path} ...")
    collections = build_all_vectordbs(docs, model, db_path=args.db_path, log_dir=args.log_dir)

    print(f"\nDone — {len(collections)} collections created:")
    for name, col in collections.items():
        print(f"  {name}: {col.count()} chunks")

    print(f"\nChunk logs saved to {args.log_dir}/")
    for name in collections:
        print(f"  {name}.csv")

    print("\n[Metrics] Running quality metrics on all collections ...")
    all_metrics = run_metrics(model, db_path=args.db_path)
    print(format_metrics_report(all_metrics))


def cmd_query(args: argparse.Namespace) -> None:
    model = load_embedding_model()

    if args.collection:
        collection = load_collection(args.collection, db_path=args.db_path)
        results = query_vectordb(args.query_text, model, collection, top_k=args.top_k)
        print(format_results(results, collection_name=args.collection))
    else:
        all_results = query_all_collections(
            args.query_text, model, db_path=args.db_path, top_k=args.top_k,
        )
        print(format_all_results(all_results))


def cmd_metrics(args: argparse.Namespace) -> None:
    model = load_embedding_model()
    all_metrics = run_metrics(model, db_path=args.db_path, top_k=args.top_k)
    print(format_metrics_report(all_metrics))


def cmd_list(args: argparse.Namespace) -> None:
    names = list_collections(db_path=args.db_path)
    if not names:
        print("Chưa có collection nào.")
        return
    print(f"{len(names)} collections:")
    for name in sorted(names):
        print(f"  {name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="TripGuard Vietnamese Law Vector DB")
    sub = parser.add_subparsers(dest="command")

    build_p = sub.add_parser("build", help="Extract, chunk, embed, and store (one collection per doc)")
    build_p.add_argument("--doc-dir", default=".", help="Directory containing .doc files")
    build_p.add_argument("--db-path", default=DEFAULT_DB_PATH, help="ChromaDB persistence path")
    build_p.add_argument("--log-dir", default=DEFAULT_LOG_DIR, help="Directory for chunk CSV logs")

    query_p = sub.add_parser("query", help="Search the vector database")
    query_p.add_argument("query_text", help="Vietnamese query string")
    query_p.add_argument("--collection", default=None, help="Query a specific collection (omit to search all)")
    query_p.add_argument("--top-k", type=int, default=5, help="Number of results per collection")
    query_p.add_argument("--db-path", default=DEFAULT_DB_PATH, help="ChromaDB persistence path")

    metrics_p = sub.add_parser("metrics", help="Run quality metrics on all collections")
    metrics_p.add_argument("--db-path", default=DEFAULT_DB_PATH, help="ChromaDB persistence path")
    metrics_p.add_argument("--top-k", type=int, default=5, help="Top-k for metric queries")

    list_p = sub.add_parser("list", help="List all collections")
    list_p.add_argument("--db-path", default=DEFAULT_DB_PATH, help="ChromaDB persistence path")

    args = parser.parse_args()

    if args.command == "build":
        cmd_build(args)
    elif args.command == "query":
        cmd_query(args)
    elif args.command == "metrics":
        cmd_metrics(args)
    elif args.command == "list":
        cmd_list(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
