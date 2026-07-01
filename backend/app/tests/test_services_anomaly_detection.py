"""Additional coverage tests for anomaly detection service."""

from app.services.anomaly_detection import AnomalyDetectionService


def test_analyze_unit_anomalies_and_recent_anomalies_smoke(app):
    service = AnomalyDetectionService(app)

    result = service.analyze_unit_anomalies("TEST001")
    assert result["unit_id"] == "TEST001"
    assert "anomalies" in result

    recent = service.get_recent_anomalies(limit=5)
    assert isinstance(recent, list)
