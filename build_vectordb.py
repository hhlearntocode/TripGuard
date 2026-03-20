"""Chunk Vietnamese text, embed with BAAI/bge-m3, and store in ChromaDB."""

import csv
import os
import re
from dataclasses import dataclass
from pathlib import Path

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

from extract_docs import ExtractedDocument

_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())

MODEL_NAME = "BAAI/bge-m3"
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")
DEFAULT_LOG_DIR = os.path.join(os.path.dirname(__file__), "chunk_logs")

DIEU_PATTERN = re.compile(r"(?=\nĐiều\s+\d+)")
DIEU_SPLIT_THRESHOLD = 4096
SUB_CHUNK_SIZE = 512
SUB_CHUNK_OVERLAP = 50

VIETNAMESE_SEPARATORS = ["\n\n", "\n", ". ", ", ", " ", ""]


@dataclass
class TextChunk:
    text: str
    metadata: dict


def collection_name_from_filename(filename: str) -> str:
    """Derive a ChromaDB-safe collection name from a .doc filename.

    ChromaDB requires names to be 3-63 chars, alphanumeric + underscore/hyphen,
    starting and ending with an alphanumeric character.
    """
    name = os.path.splitext(filename)[0]
    name = re.sub(r"[^a-zA-Z0-9_-]", "_", name)
    name = name.strip("_-") or "doc"
    if len(name) < 3:
        name = name + "_db"
    return name[:63]


def _extract_dieu_number(text: str) -> str | None:
    """Extract the article number from text starting with 'Điều N'."""
    m = re.match(r"Điều\s+(\d+[a-zA-Z]*)", text)
    return m.group(1) if m else None


def _extract_dieu_header(text: str) -> str:
    """Extract the first line of a Điều block as its header.

    E.g. 'Điều 25. Quá cảnh đường hàng không' from a multi-line article.
    """
    first_line = text.split("\n", 1)[0].strip()
    return first_line


def chunk_by_dieu(text: str) -> list[tuple[str, str | None]]:
    """Split Vietnamese legal text by 'Điều' (article) boundaries.

    Returns list of (chunk_text, dieu_number) tuples.
    The preamble before the first Điều is returned with dieu_number=None.
    Each Điều becomes exactly one chunk.
    """
    if not text:
        return []

    prefixed = "\n" + text
    parts = DIEU_PATTERN.split(prefixed)
    parts = [p.strip() for p in parts if p.strip()]

    result: list[tuple[str, str | None]] = []
    for part in parts:
        dieu = _extract_dieu_number(part)
        result.append((part, dieu))

    return result


def sub_chunk_dieu(
    text: str,
    dieu_number: str | None,
    threshold: int = DIEU_SPLIT_THRESHOLD,
    chunk_size: int = SUB_CHUNK_SIZE,
    chunk_overlap: int = SUB_CHUNK_OVERLAP,
) -> list[tuple[str, int, bool]]:
    """Split a single Điều into sub-chunks if it exceeds *threshold* chars.

    Returns list of (sub_chunk_text, sub_chunk_index, is_sub_chunk) tuples.
    - Articles <= threshold: returned as a single chunk with is_sub_chunk=False.
    - Articles > threshold: split into overlapping sub-chunks. The first keeps
      its natural header; subsequent sub-chunks get '[header]\\n' prepended.
    """
    if len(text) <= threshold:
        return [(text, 0, False)]

    header = _extract_dieu_header(text)
    context_prefix = f"[{header}]\n"

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=VIETNAMESE_SEPARATORS,
        length_function=len,
    )
    splits = splitter.split_text(text)

    result: list[tuple[str, int, bool]] = []
    for i, part in enumerate(splits):
        if i == 0:
            result.append((part, 0, True))
        else:
            result.append((context_prefix + part, i, True))

    return result


def chunk_single_document(doc: ExtractedDocument) -> list[TextChunk]:
    """Split a document by Điều, then sub-chunk long articles with context prefix."""
    if not doc.text:
        return []

    raw_chunks = chunk_by_dieu(doc.text)
    chunks: list[TextChunk] = []
    idx = 0
    for text, dieu_number in raw_chunks:
        sub_chunks = sub_chunk_dieu(text, dieu_number)
        for sub_text, sub_idx, is_sub in sub_chunks:
            chunks.append(TextChunk(
                text=sub_text,
                metadata={
                    "source_file": doc.filename,
                    "title": doc.title,
                    "chunk_index": idx,
                    "dieu": dieu_number or "",
                    "sub_chunk_index": sub_idx,
                    "is_sub_chunk": is_sub,
                },
            ))
            idx += 1
    return chunks


def chunk_documents(docs: list[ExtractedDocument]) -> list[TextChunk]:
    """Split multiple extracted documents into chunks (Điều + sub-chunks)."""
    chunks: list[TextChunk] = []
    for doc in docs:
        chunks.extend(chunk_single_document(doc))
    return chunks


def load_embedding_model(model_name: str = MODEL_NAME) -> SentenceTransformer:
    """Load the embedding model (downloads on first run)."""
    token = os.environ.get("HF_TOKEN")
    return SentenceTransformer(model_name, token=token)


def embed_chunks(model: SentenceTransformer, chunks: list[TextChunk]) -> list[list[float]]:
    """Generate embeddings for a list of text chunks."""
    texts = [c.text for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
    return embeddings.tolist()


def build_vectordb(
    chunks: list[TextChunk],
    embeddings: list[list[float]],
    db_path: str = DEFAULT_DB_PATH,
    collection_name: str = "default",
) -> chromadb.Collection:
    """Create or replace a ChromaDB collection and insert all chunks."""
    client = chromadb.PersistentClient(path=db_path)

    existing = [c.name for c in client.list_collections()]
    if collection_name in existing:
        client.delete_collection(collection_name)

    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    ids = [f"{c.metadata['source_file']}_{c.metadata['chunk_index']}" for c in chunks]
    documents = [c.text for c in chunks]
    metadatas = [c.metadata for c in chunks]

    batch_size = 500
    for i in range(0, len(ids), batch_size):
        end = min(i + batch_size, len(ids))
        collection.add(
            ids=ids[i:end],
            documents=documents[i:end],
            embeddings=embeddings[i:end],
            metadatas=metadatas[i:end],
        )

    return collection


def log_chunks_to_csv(
    chunks: list[TextChunk],
    collection_name: str,
    log_dir: str = DEFAULT_LOG_DIR,
) -> str:
    """Write chunk details to a CSV file. Returns the output file path."""
    os.makedirs(log_dir, exist_ok=True)
    filepath = os.path.join(log_dir, f"{collection_name}.csv")

    fieldnames = [
        "chunk_index", "dieu", "sub_chunk_index", "is_sub_chunk",
        "char_length", "source_file", "title", "text",
    ]

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for chunk in chunks:
            writer.writerow({
                "chunk_index": chunk.metadata["chunk_index"],
                "dieu": chunk.metadata["dieu"],
                "sub_chunk_index": chunk.metadata["sub_chunk_index"],
                "is_sub_chunk": chunk.metadata["is_sub_chunk"],
                "char_length": len(chunk.text),
                "source_file": chunk.metadata["source_file"],
                "title": chunk.metadata["title"],
                "text": chunk.text,
            })

    return filepath


def build_all_vectordbs(
    docs: list[ExtractedDocument],
    model: SentenceTransformer,
    db_path: str = DEFAULT_DB_PATH,
    log_dir: str = DEFAULT_LOG_DIR,
) -> dict[str, chromadb.Collection]:
    """Build one ChromaDB collection per document. Returns {collection_name: collection}."""
    collections: dict[str, chromadb.Collection] = {}
    for doc in docs:
        col_name = collection_name_from_filename(doc.filename)
        chunks = chunk_single_document(doc)
        if not chunks:
            continue
        log_chunks_to_csv(chunks, col_name, log_dir=log_dir)
        embeddings = embed_chunks(model, chunks)
        collection = build_vectordb(chunks, embeddings, db_path=db_path, collection_name=col_name)
        collections[col_name] = collection
    return collections


def list_collections(db_path: str = DEFAULT_DB_PATH) -> list[str]:
    """List all collection names in the ChromaDB at *db_path*."""
    client = chromadb.PersistentClient(path=db_path)
    return [c.name for c in client.list_collections()]
