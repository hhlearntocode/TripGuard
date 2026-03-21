import pytest
from unittest.mock import patch, MagicMock
from backend.services.rag_service import classify, COLLECTION_MAP


def test_classify_traffic_keywords():
    assert classify("Can I ride a motorbike?") == "traffic"
    assert classify("do I need a license to drive?") == "traffic"


def test_classify_drone_keywords():
    assert classify("Can I fly my drone here?") == "drone"
    assert classify("DJI permit requirements") == "drone"


def test_classify_customs_keywords():
    assert classify("Can I bring cigarettes through customs?") == "customs"
    assert classify("how much currency can I import?") == "customs"


def test_classify_residence_keywords():
    assert classify("My visa is about to expire") == "residence"
    assert classify("visa overstay penalties") == "residence"


def test_classify_drug_keywords():
    assert classify("drug test positive what to do") == "drug"
    assert classify("cannabis laws in Vietnam") == "drug"


def test_classify_heritage_keywords():
    assert classify("Can I visit the temple?") == "heritage"
    assert classify("heritage site rules hoi an") == "heritage"


def test_classify_unknown_returns_none():
    result = classify("what is the weather today")
    assert result is None


def test_collection_map_has_all_categories():
    expected = {"traffic", "drone", "residence", "customs", "drug", "heritage"}
    assert set(COLLECTION_MAP.keys()) == expected


def test_collection_map_values():
    assert COLLECTION_MAP["traffic"] == "gt_db"
    assert COLLECTION_MAP["drone"] == "drone"
    assert COLLECTION_MAP["residence"] == "cutru"
    assert COLLECTION_MAP["customs"] == "haiquan"
    assert COLLECTION_MAP["drug"] == "matuy"
    assert COLLECTION_MAP["heritage"] == "disanvanhoa"


def test_retrieve_with_mocked_chroma(mock_chroma_client):
    # encode() must return something with .tolist() — use a MagicMock
    encoded = MagicMock()
    encoded.tolist.return_value = [0.1] * 768

    with patch("backend.services.rag_service._chroma_client", mock_chroma_client), \
         patch("backend.services.rag_service._embedder") as mock_emb:
        mock_emb.encode.return_value = encoded
        from backend.services.rag_service import retrieve
        chunks = retrieve("motorbike license", category="traffic")
        assert isinstance(chunks, list)
        assert len(chunks) > 0


def test_retrieve_fallback_when_low_results(mock_chroma_client):
    """When specific category returns < 2 chunks, should fall back to all collections."""
    low_result_col = MagicMock()
    low_result_col.count.return_value = 1
    low_result_col.query.return_value = {
        "documents": [["Only one chunk"]],
        "distances": [[0.6]],  # below 0.55 confidence threshold (1 - 0.6 = 0.4)
    }
    mock_chroma_client.get_collection.return_value = low_result_col

    encoded = MagicMock()
    encoded.tolist.return_value = [0.1] * 768

    with patch("backend.services.rag_service._chroma_client", mock_chroma_client), \
         patch("backend.services.rag_service._embedder") as mock_emb:
        mock_emb.encode.return_value = encoded
        from backend.services.rag_service import retrieve
        chunks = retrieve("motorbike license", category="traffic")
        # Should have called get_collection multiple times (fallback to all)
        assert mock_chroma_client.get_collection.call_count > 1


def test_retrieve_returns_empty_when_local_rag_disabled():
    with patch.dict("os.environ", {"DISABLE_LOCAL_RAG": "1"}):
        from backend.services.rag_service import retrieve
        chunks = retrieve("motorbike license", category="traffic")
        assert chunks == []
