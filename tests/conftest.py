import sys
from pathlib import Path

import pytest
import json
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture
def sample_user_profile():
    return {
        "nationality": "United States",
        "idp_type": "1949 Geneva",
        "visa_free_days": 0,
        "has_drone": True,
        "drone_model": "DJI Mini 4 Pro",
    }


@pytest.fixture
def mock_llm_adapter():
    adapter = MagicMock()
    adapter.chat_with_tools.return_value = {
        "content": "✅ Legal — test response.\n\n⚠️ Legal information only, not legal advice.",
        "tool_calls": [],
    }
    return adapter


@pytest.fixture
def mock_chroma_collection():
    col = MagicMock()
    col.count.return_value = 10
    col.query.return_value = {
        "documents": [["Law text chunk 1", "Law text chunk 2", "Law text chunk 3"]],
        "distances": [[0.1, 0.2, 0.3]],
    }
    return col


@pytest.fixture
def mock_chroma_client(mock_chroma_collection):
    client = MagicMock()
    client.get_collection.return_value = mock_chroma_collection
    return client
