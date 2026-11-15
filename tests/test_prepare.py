import netCDF4
import numpy as np
import pytest

from science.prepare import nearest_indices, read_regional_file, complete_calendar


def make_grid(path, variable="sst", units="degree_C"):
    with netCDF4.Dataset(path, "w") as file:
        for name, size in (("time", 2), ("latitude", 1), ("longitude", 2)):
            file.createDimension(name, size)
        time = file.createVariable("time", "f8", ("time",))
        time.units = "days since 2020-01-01"
        time[:] = [15, 75]
        file.createVariable("latitude", "f8", ("latitude",))[:] = [0]
        file.createVariable("longitude", "f8", ("longitude",))[:] = [240, 241]
        data = file.createVariable(variable, "f8", ("time", "latitude", "longitude"), fill_value=-999)
        data.units = units
        data[:] = [[[273.15, 283.15]], [[283.15, -999]]]


def test_nearest_mask_indices_work_with_both_axis_directions():
    np.testing.assert_array_equal(nearest_indices([10, 5, 0], [9, 1]), [0, 2])
    np.testing.assert_array_equal(nearest_indices([0, 5, 10], [9, 1]), [2, 0])


def test_netcdf_temperature_units_and_missing_months_are_preserved(tmp_path):
    path = tmp_path / "grid.nc"
    make_grid(path, units="kelvin")
    records = read_regional_file(path, "eep", "mur", np.ones((1, 2), dtype=bool))
    assert [row["month"] for row in records] == ["2020-01", "2020-03"]
    assert records[0]["value"] == pytest.approx(5)
    assert records[1]["value"] == pytest.approx(10)
    assert records[1]["coverage"] == pytest.approx(0.5)
    assert records[0]["units"] == "degC"


def test_unknown_temperature_units_cannot_silently_enter_the_analysis(tmp_path):
    path = tmp_path / "grid.nc"
    make_grid(path, units="furlongs")
    with pytest.raises(ValueError, match="units"):
        read_regional_file(path, "eep", "mur", np.ones((1, 2), dtype=bool))


def test_calendar_completion_inserts_nulls_not_observations():
    rows = [{"month": "2020-01", "region": "eep", "variable": "sst", "value": 5,
             "units": "degC", "coverage": 1, "validCells": 2, "oceanCells": 2, "provenance": "mur"}]
    complete = complete_calendar(rows, "2020-01", "2020-03")
    assert [row["month"] for row in complete] == ["2020-01", "2020-02", "2020-03"]
    assert [row["value"] for row in complete] == [5, None, None]
    assert complete[1]["validCells"] == 0
    assert complete[1]["coverage"] == 0
