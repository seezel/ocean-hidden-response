from pathlib import Path

import pytest

from science.acquire import bounded_download, axis_indices, build_grid_query


class Reply:
    def __init__(self, chunks, size):
        self.chunks = chunks
        self.headers = {"Content-Length": str(size)}

    def raise_for_status(self):
        return None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return None

    def iter_content(self, chunk_size):
        yield from self.chunks


class Session:
    def __init__(self, reply):
        self.reply = reply

    def get(self, *args, **kwargs):
        return self.reply


def test_advertised_oversize_never_writes_a_partial_file(tmp_path):
    target = tmp_path / "sample.nc"
    with pytest.raises(ValueError, match="budget"):
        bounded_download("https://example.invalid/data", target, 5, Session(Reply([b"abcdef"], 6)))
    assert not target.exists()
    assert not target.with_suffix(".nc.part").exists()


def test_unadvertised_oversize_removes_partial_file(tmp_path):
    target = tmp_path / "sample.nc"
    with pytest.raises(ValueError, match="budget"):
        bounded_download("https://example.invalid/data", target, 5, Session(Reply([b"abc", b"def"], 0)))
    assert not target.exists()
    assert not target.with_suffix(".nc.part").exists()


def test_small_download_is_saved_exactly(tmp_path):
    target = tmp_path / "sample.nc"
    count = bounded_download("https://example.invalid/data", target, 9, Session(Reply([b"abc", b"def"], 6)))
    assert count == 6
    assert target.read_bytes() == b"abcdef"


def test_descending_axes_stay_inside_approved_rectangle():
    assert axis_indices([10, 5, 0, -5, -10], -5, 5) == (1, 3)
    assert axis_indices([239, 240, 250, 270, 271], 240, 270) == (1, 3)


def test_queries_use_numeric_indices_and_keep_all_months():
    query = build_grid_query(["sst", "mask"], (12, 23), (50, 150), (100, 400), 10)
    assert query == "sst[12:1:23][50:10:150][100:10:400],mask[12:1:23][50:10:150][100:10:400]"
