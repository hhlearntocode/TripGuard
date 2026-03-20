"""Tests for main.py — entry point orchestration."""

import sys
from unittest.mock import MagicMock, patch

import pytest

from extract_docs import ExtractedDocument
from tests.conftest import SAMPLE_VIETNAMESE_TEXT


class TestMainBuild:
    """Tests for the build command."""

    @patch("main.format_metrics_report", return_value="report")
    @patch("main.run_metrics", return_value=[])
    @patch("main.build_all_vectordbs")
    @patch("main.load_embedding_model")
    @patch("main.extract_all_docs")
    def test_build_calls_pipeline_in_order(
        self, mock_extract, mock_model, mock_build_all, mock_run_metrics, mock_fmt
    ):
        from main import cmd_build
        import argparse

        mock_extract.return_value = [
            ExtractedDocument("a.doc", "/a.doc", "A", SAMPLE_VIETNAMESE_TEXT)
        ]
        mock_model.return_value = MagicMock()
        mock_col = MagicMock()
        mock_col.count.return_value = 5
        mock_build_all.return_value = {"a_db": mock_col}

        args = argparse.Namespace(doc_dir=".", db_path="/tmp/testdb", log_dir="/tmp/logs")
        cmd_build(args)

        mock_extract.assert_called_once_with(".")
        mock_model.assert_called_once()
        mock_build_all.assert_called_once()
        mock_run_metrics.assert_called_once()

    @patch("main.extract_all_docs")
    def test_build_exits_when_no_docs_found(self, mock_extract):
        from main import cmd_build
        import argparse

        mock_extract.return_value = []
        args = argparse.Namespace(doc_dir="/empty", db_path="/tmp/testdb", log_dir="/tmp/logs")

        with pytest.raises(SystemExit) as exc_info:
            cmd_build(args)
        assert exc_info.value.code == 1


class TestMainQuery:
    """Tests for the query command."""

    @patch("main.format_results")
    @patch("main.query_vectordb")
    @patch("main.load_collection")
    @patch("main.load_embedding_model")
    def test_query_single_collection(self, mock_model, mock_load_col, mock_query, mock_format):
        from main import cmd_query
        import argparse

        mock_model.return_value = MagicMock()
        mock_load_col.return_value = MagicMock()
        mock_query.return_value = {"documents": [["test"]], "metadatas": [[{}]], "distances": [[0.1]]}
        mock_format.return_value = "Kết quả 1"

        args = argparse.Namespace(
            query_text="luật hải quan", top_k=5, db_path="/tmp/testdb", collection="haiquan"
        )
        cmd_query(args)

        mock_load_col.assert_called_once_with("haiquan", db_path="/tmp/testdb")
        mock_query.assert_called_once()
        mock_format.assert_called_once()

    @patch("main.format_all_results")
    @patch("main.query_all_collections")
    @patch("main.load_embedding_model")
    def test_query_all_collections(self, mock_model, mock_query_all, mock_format_all):
        from main import cmd_query
        import argparse

        mock_model.return_value = MagicMock()
        mock_query_all.return_value = {"cutru": {"documents": [["x"]], "metadatas": [[{}]], "distances": [[0.1]]}}
        mock_format_all.return_value = "All results"

        args = argparse.Namespace(
            query_text="luật", top_k=5, db_path="/tmp/testdb", collection=None
        )
        cmd_query(args)

        mock_query_all.assert_called_once()
        mock_format_all.assert_called_once()


class TestMainList:
    """Tests for the list command."""

    @patch("main.list_collections")
    def test_list_shows_collections(self, mock_list):
        from main import cmd_list
        import argparse

        mock_list.return_value = ["cutru", "haiquan", "matuy"]
        args = argparse.Namespace(db_path="/tmp/testdb")
        cmd_list(args)
        mock_list.assert_called_once_with(db_path="/tmp/testdb")

    @patch("main.list_collections")
    def test_list_empty(self, mock_list):
        from main import cmd_list
        import argparse

        mock_list.return_value = []
        args = argparse.Namespace(db_path="/tmp/testdb")
        cmd_list(args)


class TestMainCLI:
    """Tests for argument parsing."""

    def test_no_args_exits(self):
        from main import main
        with patch("sys.argv", ["main.py"]):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 1

    @patch("main.cmd_build")
    def test_build_subcommand_parsed(self, mock_cmd_build):
        from main import main
        with patch("sys.argv", ["main.py", "build", "--doc-dir", "/some/path"]):
            main()
        assert mock_cmd_build.called
        args = mock_cmd_build.call_args[0][0]
        assert args.doc_dir == "/some/path"

    @patch("main.cmd_query")
    def test_query_subcommand_with_collection(self, mock_cmd_query):
        from main import main
        with patch("sys.argv", ["main.py", "query", "tìm kiếm luật", "--collection", "cutru", "--top-k", "3"]):
            main()
        assert mock_cmd_query.called
        args = mock_cmd_query.call_args[0][0]
        assert args.query_text == "tìm kiếm luật"
        assert args.collection == "cutru"
        assert args.top_k == 3

    @patch("main.cmd_query")
    def test_query_subcommand_all_collections(self, mock_cmd_query):
        from main import main
        with patch("sys.argv", ["main.py", "query", "luật hải quan"]):
            main()
        args = mock_cmd_query.call_args[0][0]
        assert args.collection is None

    @patch("main.cmd_metrics")
    def test_metrics_subcommand_parsed(self, mock_cmd_metrics):
        from main import main
        with patch("sys.argv", ["main.py", "metrics", "--top-k", "3"]):
            main()
        assert mock_cmd_metrics.called
        args = mock_cmd_metrics.call_args[0][0]
        assert args.top_k == 3

    @patch("main.cmd_list")
    def test_list_subcommand_parsed(self, mock_cmd_list):
        from main import main
        with patch("sys.argv", ["main.py", "list"]):
            main()
        assert mock_cmd_list.called
