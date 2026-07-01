"""Tests for DNP3 service and protocol gateway simulation."""

from datetime import datetime, timezone, timedelta
import pytest
from unittest.mock import MagicMock, patch

from app.models import utc_now
from app.exceptions import ConfigurationException
from app.services.dnp3_service import (
    DNP3DataType,
    DNP3Quality,
    DNP3DataPoint,
    DNP3Device,
    DNP3Reading,
    DNP3CachedReading,
    DNP3PerformanceMetrics,
    DNP3Service,
    MockDNP3Master,
)


def test_dnp3_performance_metrics():
    """Test performance metrics and statistics tracking."""
    metrics = DNP3PerformanceMetrics()
    
    # Record success operation
    metrics.record_operation("read", duration=0.1, success=True, data_points=10)
    # Record fail operation
    metrics.record_operation("read", duration=0.2, success=False, data_points=0)
    
    stats = metrics.get_operation_stats("read")
    assert stats["count"] == 2
    assert stats["errors"] == 1
    assert stats["success_rate"] == 50.0
    assert stats["min_time"] == 0.1
    assert stats["max_time"] == 0.2
    assert stats["avg_time"] == pytest.approx(0.15)
    assert "avg_throughput" in stats

    all_stats = metrics.get_all_stats()
    assert "read" in all_stats

    # Query non-existent operation
    non_exist = metrics.get_operation_stats("ghost")
    assert non_exist["no_data"] is True


def test_dnp3_cached_reading():
    """Test expiration logic on cached DNP3 readings."""
    reading = DNP3Reading(
        index=1,
        data_type=DNP3DataType.ANALOG_INPUT,
        value=23.5,
        quality=DNP3Quality.GOOD,
        timestamp=utc_now(),
        sensor_type="temperature",
        description="Temp Index 1",
    )
    
    # Test non-expired reading
    cached = DNP3CachedReading(reading=reading, cached_at=utc_now(), cache_ttl=2.0)
    assert cached.is_expired() is False

    # Test expired reading
    cached_expired = DNP3CachedReading(reading=reading, cached_at=utc_now() - timedelta(seconds=5), cache_ttl=2.0)
    assert cached_expired.is_expired() is True


def test_mock_dnp3_master_connection_and_read_write():
    """Test MockDNP3Master operations including connect/disconnect/reads/writes."""
    master = MockDNP3Master(master_address=1)
    
    # Setup outstation
    assert master.add_outstation(10, "127.0.0.1", 20000) is True
    # Outstation connect fails if not configured
    assert master.connect_outstation(99) is False

    # Connect configured outstation
    assert master.connect_outstation(10) is True
    assert master.connected_outstations[10]["connected"] is True

    # Reads fail if outstation is disconnected
    master.disconnect_outstation(10)
    with pytest.raises(ConnectionError):
        master.read_binary_inputs(10, 0, 5)

    # Connect again
    master.connect_outstation(10)

    # Test write outputs
    assert master.write_binary_output(10, index=2, value=True) is True
    assert master.write_analog_output(10, index=5, value=12.34) is True

    # Test integrity poll
    assert master.perform_integrity_poll(10) is True


def test_dnp3_service_device_management(app):
    """Test adding, removing, connecting, and disconnecting DNP3 devices."""
    service = DNP3Service(app)
    service.init_master(master_address=1)
    
    device_id = "DEV001"
    # Connect fails for unconfigured device
    assert service.connect_device(device_id) is False

    # Add device config
    assert service.add_device(
        device_id=device_id,
        master_address=1,
        outstation_address=10,
        host="127.0.0.1",
        port=20000,
    ) is True
    
    assert device_id in service._devices

    # Connect configured device
    assert service.connect_device(device_id) is True
    assert service._devices[device_id].is_connected is True

    # Remove device
    assert service.remove_device(device_id) is True
    assert device_id not in service._devices


def test_dnp3_service_read_write_data(app):
    """Test reading and writing data points in DNP3 service with different strategies."""
    service = DNP3Service(app)
    service.init_master(master_address=1)

    device_id = "DEV002"
    service.add_device(
        device_id=device_id,
        master_address=1,
        outstation_address=11,
        host="127.0.0.1",
        port=20000,
    )
    service.connect_device(device_id)

    # Configure data points
    points = [
        {"index": 0, "data_type": "binary_input", "sensor_type": "status", "description": "Status"},
        {"index": 1, "data_type": "analog_input", "sensor_type": "temperature", "scale_factor": 1.5, "offset": 2.0, "description": "Temp"},
        {"index": 2, "data_type": "counter", "sensor_type": "water_level", "description": "Level"},
    ]
    assert service.add_data_point_config(device_id, points) is True

    # Test write_data_point
    # Binary output success
    assert service.write_data_point(device_id, index=10, data_type="binary_output", value=True) is True
    # Analog output success
    assert service.write_data_point(device_id, index=11, data_type="analog_output", value=45.6) is True
    # Invalid data type write fails
    assert service.write_data_point(device_id, index=12, data_type="invalid_type", value=100) is False

    # Test reading device data (bulk mode enabled)
    service._enable_bulk_operations = True
    res_bulk = service.read_device_data(device_id)
    assert res_bulk["success"] is True
    assert len(res_bulk["readings"]) == 3
    # Verify scaling & offset on analog input (index 1)
    # The MockDNP3Master generates fake readings, let's verify index 1 exists
    assert "temperature_1" in res_bulk["readings"]

    # Test reading device data (bulk mode disabled, fallback to individual reads)
    service._enable_bulk_operations = False
    res_indiv = service.read_device_data(device_id)
    assert res_indiv["success"] is True
    assert len(res_indiv["readings"]) == 3

    # Test caching
    service._enable_caching = True
    # Populate cache
    service.read_device_data(device_id)
    # Second read should hit cache
    with patch.object(service._master, "read_binary_inputs", side_effect=Exception("Should not call master")):
        res_cached = service.read_device_data(device_id)
        assert res_cached["success"] is True


def test_dnp3_service_errors_and_failures(app):
    """Test error handling in DNP3 service under various failure conditions."""
    service = DNP3Service(app)
    
    # 1. Read unconfigured device
    res_unconfigured = service.read_device_data("GHOST_DEV")
    assert res_unconfigured["success"] is False
    assert "not configured" in res_unconfigured["error"]

    # 2. Read disconnected device
    service.add_device("DEV003", 1, 12, "127.0.0.1")
    res_disconnected = service.read_device_data("DEV003")
    assert res_disconnected["success"] is False
    assert "not connected" in res_disconnected["error"]

    # 3. Read configured device with no data points
    service.init_master(1)
    service.connect_device("DEV003")
    res_no_points = service.read_device_data("DEV003")
    assert res_no_points["success"] is False
    assert "not connected" in res_no_points["error"] or "No data point configuration" in res_no_points["error"]

    # 4. Read when master not initialized (ConfigurationException)
    service_no_master = DNP3Service(app)
    service_no_master.add_device("DEV004", 1, 13, "127.0.0.1")
    service_no_master._devices["DEV004"].is_connected = True
    service_no_master.add_data_point_config("DEV004", [{"index": 0, "data_type": "binary_input"}])
    res_no_master = service_no_master.read_device_data("DEV004")
    assert res_no_master["success"] is False
    assert "master not initialized" in res_no_master["error"]
