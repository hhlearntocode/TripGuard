import os
from sentence_transformers import SentenceTransformer
import chromadb

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")

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


def _init():
    global _embedder, _chroma_client
    if _embedder is None:
        _embedder = SentenceTransformer(EMBEDDING_MODEL)
        _chroma_client = chromadb.PersistentClient(_DB_PATH)


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
    _init()
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
