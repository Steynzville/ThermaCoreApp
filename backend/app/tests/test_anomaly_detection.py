"""Tests for Machine Learning Anomaly Detection Service."""

from datetime import datetime, timedelta

from app.models import Sensor, SensorReading, Unit, db
from app.services.anomaly_detection import (
    AnomalyDetectionService,
    MovingAverageAnomalyDetector,
    StatisticalAnomalyDetector,
    mean,
    percentile,
    std_dev,
)


def test_statistics_helpers():
    """Test standard deviation, mean, and percentile calculations."""
    # Test mean
    assert mean([]) == 0.0
    assert mean([1.0, 2.0, 3.0]) == 2.0

    # Test std_dev
    assert std_dev([]) == 0.0
    assert std_dev([5.0]) == 0.0
    assert std_dev([1.0, 2.0, 3.0]) > 0.0

    # Test percentile
    assert percentile([], 50) == 0.0
    assert percentile([1.0, 2.0, 3.0, 4.0, 5.0], 50) == 3.0
    assert percentile([1.0, 2.0, 3.0, 4.0, 5.0], 100) == 5.0


def test_statistical_anomaly_detector_z_score():
    """Test Z-score anomaly detection."""
    detector = StatisticalAnomalyDetector(z_threshold=2.0)

    # Less than 3 values
    is_anom, score, stats = detector.detect_z_score_anomalies([1.0, 2.0], 3.0)
    assert is_anom is False
    assert score == 0.0

    # Zero standard deviation
    is_anom, score, stats = detector.detect_z_score_anomalies([1.0, 1.0, 1.0], 1.0)
    assert is_anom is False
    assert score == 0.0

    # Normal value
    values = [10.0, 10.5, 9.5, 10.1, 9.9, 10.0]
    is_anom, score, stats = detector.detect_z_score_anomalies(values, 10.2)
    assert is_anom is False

    # Anomaly value
    is_anom, score, _stats = detector.detect_z_score_anomalies(values, 15.0)
    assert is_anom is True
    assert score > 2.0


def test_statistical_anomaly_detector_iqr():
    """Test Interquartile Range (IQR) anomaly detection."""
    detector = StatisticalAnomalyDetector(iqr_multiplier=1.5)

    # Less than 4 values
    is_anom, score, stats = detector.detect_iqr_anomalies([1.0, 2.0, 3.0], 4.0)
    assert is_anom is False

    # Normal value
    values = [10.0, 10.5, 9.5, 10.1, 9.9, 10.0, 10.2, 9.8]
    is_anom, score, stats = detector.detect_iqr_anomalies(values, 10.1)
    assert is_anom is False

    # Extreme low anomaly
    is_anom, score, stats = detector.detect_iqr_anomalies(values, 5.0)
    assert is_anom is True
    assert score > 0.0

    # Extreme high anomaly
    is_anom, score, stats = detector.detect_iqr_anomalies(values, 15.0)
    assert is_anom is True
    assert score > 0.0

    # Zero IQR
    is_anom, score, _stats = detector.detect_iqr_anomalies([1.0, 1.0, 1.0, 1.0], 5.0)
    assert is_anom is True


def test_moving_average_anomaly_detector():
    """Test Moving Average anomaly detection."""
    detector = MovingAverageAnomalyDetector(window_size=5, deviation_threshold=2.0)

    # Less than window size
    is_anom, score, stats = detector.detect_anomalies([1.0, 2.0, 3.0, 4.0], 5.0)
    assert is_anom is False

    # Zero variance
    is_anom, score, stats = detector.detect_anomalies([5.0, 5.0, 5.0, 5.0, 5.0], 5.0)
    assert is_anom is False

    # Normal value
    values = [10.0, 11.0, 10.5, 9.5, 10.0, 10.2]
    is_anom, score, stats = detector.detect_anomalies(values, 10.1)
    assert is_anom is False

    # Anomaly
    is_anom, _score, _stats = detector.detect_anomalies(values, 15.0)
    assert is_anom is True


def test_anomaly_detection_service_init(app):
    """Test initialization of anomaly detection service."""
    service = AnomalyDetectionService(app)
    assert service._app == app

    status = service.get_status()
    assert status["status"] == "active"
    assert "z_score" in status["detection_methods"]


def test_analyze_sensor_reading_insufficient_data(app, db_session):
    """Test analyzing reading with insufficient data (less than 10 historical values)."""
    service = AnomalyDetectionService(app)

    # Create test sensor
    unit = Unit.query.get("TEST001")
    sensor = Sensor(
        unit_id=unit.id,
        name="Flow Rate Sensor",
        sensor_type="flow_rate",
        unit_of_measurement="L/min",
    )
    db.session.add(sensor)
    db.session.commit()

    # No historical readings yet
    result = service.analyze_sensor_reading(sensor.id, unit.id, 100.0)
    assert result.is_anomaly is False
    assert result.method == "insufficient_data"


def test_analyze_sensor_reading_ensemble(app, db_session):
    """Test analyzing reading using ensemble of methods."""
    service = AnomalyDetectionService(app)

    # Create test sensor
    unit = Unit.query.get("TEST001")
    sensor = Sensor(
        unit_id=unit.id,
        name="Pressure Sensor",
        sensor_type="pressure",
        unit_of_measurement="bar",
    )
    db.session.add(sensor)
    db.session.commit()

    # Seed 12 historical normal readings
    now = datetime.utcnow()
    for i in range(12):
        reading = SensorReading(
            sensor_id=sensor.id,
            value=10.0 + (i % 2) * 0.1,  # stable around 10.0
            timestamp=now - timedelta(hours=i),
        )
        db.session.add(reading)
    db.session.commit()

    # Test normal reading
    res_normal = service.analyze_sensor_reading(sensor.id, unit.id, 10.05)
    assert res_normal.is_anomaly is False
    assert res_normal.anomaly_score < 1.0

    # Test anomalous reading (extreme high)
    res_anomalous = service.analyze_sensor_reading(sensor.id, unit.id, 25.0)
    assert res_anomalous.is_anomaly is True
    assert res_anomalous.confidence >= 66.6  # at least 2 methods agreed

    # Check recent anomalies cache
    recent = service.get_recent_anomalies(limit=5)
    assert len(recent) > 0
    assert recent[-1]["sensor_id"] == sensor.id


def test_analyze_sensor_reading_exceptions(app):
    """Test handling of exceptions gracefully in analyze_sensor_reading."""
    service = AnomalyDetectionService(app)

    # Non-existent sensor triggers ValueError
    result = service.analyze_sensor_reading("NONEXIST", "TEST001", 100.0)
    assert result.is_anomaly is False
    assert result.method == "error"


def test_analyze_unit_anomalies(app, db_session):
    """Test analyzing anomalies for all sensors in a unit."""
    service = AnomalyDetectionService(app)
    unit_id = "TEST001"

    # Create multiple sensors for unit
    sensor_temp = Sensor.query.filter_by(
        unit_id=unit_id,
        sensor_type="temperature",
    ).first()

    # Seed historical readings for sensor_temp to have sufficient data
    now = datetime.utcnow()
    for i in range(15):
        reading = SensorReading(
            sensor_id=sensor_temp.id,
            value=25.0,
            timestamp=now - timedelta(hours=i),
        )
        db.session.add(reading)
    db.session.commit()

    # Add an anomalous reading within past 2 hours
    anomaly_reading = SensorReading(
        sensor_id=sensor_temp.id,
        value=100.0,  # anomalous
        timestamp=now - timedelta(minutes=10),
    )
    db.session.add(anomaly_reading)
    db.session.commit()

    # Run unit analysis
    report = service.analyze_unit_anomalies(unit_id, hours=5)
    assert report["unit_id"] == unit_id
    assert report["total_anomalies"] > 0
    assert "temperature" in report["sensor_statistics"]


def test_analyze_unit_anomalies_error(app):
    """Test unit analysis with invalid unit ID."""
    service = AnomalyDetectionService(app)
    report = service.analyze_unit_anomalies("NONEXIST")
    assert "error" in report
    assert report["total_anomalies"] == 0
