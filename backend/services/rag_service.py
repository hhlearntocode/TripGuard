import importlib
import logging
import os

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
_DISABLE_LOCAL_RAG_VALUES = {"1", "true", "yes", "on"}
logger = logging.getLogger(__name__)

# Absolute path — works regardless of uvicorn launch directory
_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "chroma_db")

# Map category names → actual ChromaDB collection names
COLLECTION_MAP = {
    "traffic":   "gt_db",
    "drone":     "drone",
    "residence": "cutru",
    "customs":   "haiquan",
    "drug":      "matuy",
    "heritage":  "disanvanhoa",
}

_embedder = None
_chroma_client = None
_rag_unavailable_reason = None


def local_rag_disabled() -> bool:
    return os.getenv("DISABLE_LOCAL_RAG", "").strip().lower() in _DISABLE_LOCAL_RAG_VALUES


def _init():
    global _embedder, _chroma_client, _rag_unavailable_reason
    if local_rag_disabled():
        return False
    if _rag_unavailable_reason:
        return False
    if _embedder is None:
        try:
            sentence_transformers = importlib.import_module("sentence_transformers")
            chromadb = importlib.import_module("chromadb")
        except ImportError as exc:
            _rag_unavailable_reason = (
                "Local RAG dependencies are not installed. "
                "Install requirements-rag.txt or set DISABLE_LOCAL_RAG=1."
            )
            logger.warning("%s Import error: %s", _rag_unavailable_reason, exc)
            return False

        try:
            _embedder = sentence_transformers.SentenceTransformer(EMBEDDING_MODEL)
            _chroma_client = chromadb.PersistentClient(_DB_PATH)
        except Exception as exc:
            _rag_unavailable_reason = (
                "Local RAG failed to initialize. "
                "Set DISABLE_LOCAL_RAG=1 for deploys or install/cache the embedding model locally."
            )
            logger.warning("%s Init error: %s", _rag_unavailable_reason, exc)
            _embedder = None
            _chroma_client = None
            return False
    return True


KEYWORDS = {
    "traffic":   ["motorbike","license","idp","drunk","helmet","speed","ride","xe máy","bằng lái","giao thông"],
    "drone":     ["drone","dji","flycam","uav","fly","aerial","permit","bay","tàu bay"],
    "customs":   ["bring","import","export","declare","customs","vape","cigarette","currency","gold","hải quan"],
    "residence": ["visa","overstay","stay","expire","immigration","passport","cư trú","thị thực"],
    "heritage":  ["temple","relic","heritage","antique","artifact","hoi an","hue","cổ vật","di sản"],
    "drug":      ["drug","cannabis","marijuana","adderall","prescription","nightclub","ma túy","thuốc"],
}


def classify(query: str) -> str | None:
    q = query.lower()
    scores = {cat: sum(1 for k in kws if k in q) for cat, kws in KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else None


def _query_collection(col_name: str, vec: list, n: int, where: dict = None) -> tuple[list, list]:
    """Query a single named collection. Returns (docs, distances)."""
    try:
        col = _chroma_client.get_collection(col_name)
        kwargs = {
            "query_embeddings": [vec],
            "n_results": min(n, col.count()),
            "include": ["documents", "distances"],
        }
        if where:
            kwargs["where"] = where
        results = col.query(**kwargs)
        return results["documents"][0], results["distances"][0]
    except Exception:
        return [], []


def retrieve(query: str, category: str = None, n: int = 3) -> list[str]:
    if local_rag_disabled():
        return []
    if not _init():
        return []
    cat = category or classify(query)
    vec = _embedder.encode(query).tolist()

    if cat and cat in COLLECTION_MAP:
        # Query the specific named collection
        col_name = COLLECTION_MAP[cat]
        docs, dists = _query_collection(col_name, vec, n)
        chunks = [doc for doc, dist in zip(docs, dists) if 1 - dist >= 0.55]

        # Fallback: search all collections if insufficient results
        if len(chunks) < 2:
            chunks = _search_all_collections(vec, n)
    else:
        # No category — search all collections
        chunks = _search_all_collections(vec, n)

    return chunks


def _search_all_collections(vec: list, n: int) -> list[str]:
    """Search all 6 collections, return top-n by distance."""
    all_results = []
    for col_name in COLLECTION_MAP.values():
        docs, dists = _query_collection(col_name, vec, n)
        for doc, dist in zip(docs, dists):
            all_results.append((doc, dist))

    # Sort by distance (lower = more similar) and return top-n
    all_results.sort(key=lambda x: x[1])
    return [doc for doc, _ in all_results[:n]]
