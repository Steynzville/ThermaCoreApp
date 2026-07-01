"""Additional coverage tests for DNP3 service internals."""

from unittest.mock import patch

import pytest

from app.services.dnp3_service import DNP3PerformanceMetrics, MockDNP3Master


def test_performance_metrics_history_trimming():
    metrics = DNP3PerformanceMetrics()
    metrics.max_history = 1

    metrics.record_operation("op", duration=1.0, success=True, data_points=5)
    metrics.record_operation("op", duration=2.0, success=False, data_points=10)

    stats = metrics.get_operation_stats("op")
    assert stats["count"] == 2
    assert stats["errors"] == 1
    assert stats["min_time"] == 2.0
    assert stats["max_time"] == 2.0


def test_mock_master_read_and_write_error_and_branches():
    master = MockDNP3Master(master_address=1)

    # add/connect/disconnect exception paths
    master.connected_outstations = None
    assert master.add_outstation(1, "127.0.0.1", 20000) is False
    assert master.connect_outstation(1) is False
    assert master.disconnect_outstation(1) is False

    # normal branches
    master.connected_outstations = {}
    assert master.add_outstation(2, "127.0.0.1", 20000)
    assert master.connect_outstation(2)

    with patch("app.services.dnp3_service.time.sleep"):
        master.read_binary_inputs(2, 0, 2)
        master.read_analog_inputs(2, 5, 4)
        master.read_counters(2, 0, 2)
        # cached analog/counter branches
        master.read_analog_inputs(2, 5, 1)
        master.read_counters(2, 0, 1)

    # disconnected error branches
    master.disconnect_outstation(2)
    with pytest.raises(ConnectionError):
        master.read_bulk_data(2, {"binary_inputs": (0, 1)})
    with pytest.raises(ConnectionError):
        master.write_binary_output(2, 0, True)
    with pytest.raises(ConnectionError):
        master.write_analog_output(2, 0, 1.0)
    with pytest.raises(ConnectionError):
        master.perform_integrity_poll(2)
