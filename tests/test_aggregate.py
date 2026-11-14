import math

import numpy as np
import pytest

from science.aggregate import aggregate_month, region_mask, normalize_longitudes


def test_chlorophyll_uses_area_weighted_log_mean():
    result = aggregate_month(np.array([[1.0, 1.0], [16.0, 16.0]]),
                             np.array([0.0, 60.0]), variable="chlor_a")
    assert result["value"] == pytest.approx(2.5198420997897464)
    assert result["coverage"] == pytest.approx(1)
    assert result["validCells"] == 4


def test_sst_uses_arithmetic_mean_and_preserves_zero_celsius():
    result = aggregate_month(np.array([[0.0, 12.0], [18.0, 18.0]]),
                             np.array([0.0, 60.0]), variable="sst")
    assert result["value"] == pytest.approx(10.0)


def test_land_is_excluded_and_missing_ocean_is_in_coverage_denominator():
    result = aggregate_month(np.array([[1.0, np.nan], [100.0, 4.0]]),
                             np.array([0.0, 0.0]), variable="chlor_a",
                             ocean_mask=np.array([[True, True], [False, True]]))
    assert result["value"] == pytest.approx(2)
    assert result["coverage"] == pytest.approx(2 / 3)
    assert result["validCells"] == 2
    assert result["oceanCells"] == 3


def test_nonpositive_chlorophyll_and_bad_quality_are_missing():
    result = aggregate_month(np.array([[0.0, -1.0, 4.0, 100.0]]),
                             np.array([0.0]), variable="chlor_a",
                             quality_mask=np.array([[True, True, True, False]]))
    assert result["value"] == 4
    assert result["coverage"] == pytest.approx(0.25)


def test_equal_area_weights_are_not_latitude_weighted_twice():
    result = aggregate_month(np.array([[0.0], [20.0]]), np.array([0.0, 60.0]),
                             variable="sst", cell_areas=np.ones((2, 1)))
    assert result["value"] == 10


def test_empty_ocean_returns_null_not_zero():
    result = aggregate_month(np.full((1, 2), np.nan), np.array([0]), variable="sst")
    assert result["value"] is None
    assert result["coverage"] == 0


def test_longitude_conversion_selects_the_approved_eep_rectangle():
    lons = normalize_longitudes(np.array([239.0, 240.0, 250.0, 270.0, 271.0]))
    np.testing.assert_allclose(lons, [-121, -120, -110, -90, -89])
    mask = region_mask(np.array([-6, 0, 6]), lons, (-120, -90, -5, 5))
    np.testing.assert_array_equal(mask, [[False] * 5, [False, True, True, True, False], [False] * 5])


def test_shape_mismatch_and_unknown_variable_fail_loudly():
    with pytest.raises(ValueError):
        aggregate_month(np.ones((2, 2)), np.array([0]), variable="sst")
    with pytest.raises(ValueError):
        aggregate_month(np.ones((1, 1)), np.array([0]), variable="other")
