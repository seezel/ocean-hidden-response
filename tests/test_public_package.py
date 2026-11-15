"""Guard the publicly downloadable reproduction archive against internal-file leaks."""
from pathlib import PurePosixPath
from zipfile import ZipFile

from science import export


def test_public_reproduction_archive_contains_science_without_internal_instructions():
    export.package()
    with ZipFile(export.ROOT / "downloads" / "reproduction.zip") as archive:
        paths = set(archive.namelist())

    required = {
        "README.md", "LICENSE", "data/observations.json",
        "data/reference-results.json", "data/provenance.json",
        "docs/statistics-report.md", "science/export.py"
    }
    assert required <= paths, f"Missing reproduction evidence: {sorted(required - paths)}"

    forbidden = {
        "PRODUCT.md", "DESIGN.md", "docs/build-ledger.md",
        "docs/website-release-audit.md", "docs/website-enhancement-design.md",
        "docs/website-v4-integration-status.md", "docs/submission-alignment-v3.md",
        "docs/geography-report.md", "docs/ui-task.md", "docs/statistics-task.md"
    }
    assert paths.isdisjoint(forbidden), f"Internal files exposed: {sorted(paths & forbidden)}"
    assert not any(
        p.startswith("artifacts/submission/")
        or p.lower().endswith(("/agents.md", "/codex.md"))
        or PurePosixPath(p).name in {"AGENTS.md", "CODEX.md", "CLAUDE.md"}
        for p in paths
    ), "Internal instructions or draft submission materials in reproduction archive"
