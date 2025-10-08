"""Machine Learning Anomaly Detection Service for Phase 3."""
import logging
import statistics
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
from collections import deque
from dataclasses import dataclass

from sqlalchemy import and_
from app.models import Unit, Sensor, SensorReading, db, utc_now  # Use timezone-aware datetime

logger = logging.getLogger(__name__)

# Simple statistics functions to replace numpy
def mean(values: List[float]) -> float:
    """Calculate mean of values."""
    return sum(values) / len(values) if values else 0.0

def std_dev(values: List[float]) -> float:
    """Calculate standard deviation of values."""
    if len(values) < 2:
        return 0.0
    return statistics.stdev(values)

def percentile(values: List[float], p: float) -> float:
    """Calculate percentile of values."""
    if not values:
        return 0.0
    sorted_values = sorted(values)
    k = (len(sorted_values) - 1) * p / 100
    f = int(k)
    c = k - f
    if f == len(sorted_values) - 1:
        return sorted_values[f]
    return sorted_values[f] * (1 - c) + sorted_values[f + 1] * c


@dataclass
class AnomalyResult:
    """Result of anomaly detection analysis."""
    sensor_id: str
    unit_id: str
    sensor_type: str
    value: float
    timestamp: datetime
    is_anomaly: bool
    anomaly_score: float
    confidence: float
    method: str
    baseline_mean: float
    baseline_std: float


class StatisticalAnomalyDetector:
    """Statistical anomaly detection using Z-score and IQR methods."""

    def __init__(self, z_threshold: float = 3.0, iqr_multiplier: float = 1.5):
        self.z_threshold = z_threshold
        self.iqr_multiplier = iqr_multiplier

    def detect_z_score_anomalies(self, values: List[float], current_value: float) -> Tuple[bool, float, Dict]:
        """Detect anomalies using Z-score method."""
        if len(values) < 3:
            return False, 0.0, {'mean': 0, 'std': 0}

        mean_val = mean(values)
        std_val = std_dev(values)

        if std_val == 0:
            return False, 0.0, {'mean': mean_val, 'std': std_val}

        z_score = abs(current_value - mean_val) / std_val
        is_anomaly = z_score > self.z_threshold

        return is_anomaly, z_score, {'mean': mean_val, 'std': std_val}

    def detect_iqr_anomalies(self, values: List[float], current_value: float) -> Tuple[bool, float, Dict]:
        """Detect anomalies using Interquartile Range (IQR) method."""
        if len(values) < 4:
            return False, 0.0, {'q1': 0, 'q3': 0, 'iqr': 0}

        q1 = percentile(values, 25)
        q3 = percentile(values, 75)
        iqr = q3 - q1

        lower_bound = q1 - (self.iqr_multiplier * iqr)
        upper_bound = q3 + (self.iqr_multiplier * iqr)

        is_anomaly = current_value < lower_bound or current_value > upper_bound

        # Calculate anomaly score based on distance from bounds
        if current_value < lower_bound:
            anomaly_score = (lower_bound - current_value) / iqr if iqr > 0 else 0
        elif current_value > upper_bound:
            anomaly_score = (current_value - upper_bound) / iqr if iqr > 0 else 0
        else:
            anomaly_score = 0

        return is_anomaly, anomaly_score, {'q1': q1, 'q3': q3, 'iqr': iqr}


class MovingAverageAnomalyDetector:
    """Anomaly detection using moving average and deviation."""

    def __init__(self, window_size: int = 20, deviation_threshold: float = 2.0):
        self.window_size = window_size
        self.deviation_threshold = deviation_threshold

    def detect_anomalies(self, values: List[float], current_value: float) -> Tuple[bool, float, Dict]:
        """Detect anomalies using moving average method."""
        if len(values) < self.window_size:
            return False, 0.0, {'moving_avg': 0, 'moving_std': 0}

        # Use the last window_size values
        window_values = values[-self.window_size:]
        moving_avg = mean(window_values)
        moving_std = std_dev(window_values)

        if moving_std == 0:
            return False, 0.0, {'moving_avg': moving_avg, 'moving_std': moving_std}

        deviation = abs(current_value - moving_avg) / moving_std
        is_anomaly = deviation > self.deviation_threshold

        return is_anomaly, deviation, {'moving_avg': moving_avg, 'moving_std': moving_std}


class AnomalyDetectionService:
    """Main anomaly detection service integrating multiple detection methods."""

    def __init__(self, app=None):
        """Initialize anomaly detection service."""
        self._app = app
        self._statistical_detector = StatisticalAnomalyDetector()
        self._moving_average_detector = MovingAverageAnomalyDetector()
        self._sensor_baselines = {}  # Cache for sensor baselines
        self._recent_anomalies = deque(maxlen=1000)  # Store recent anomalies

        if app:
            self.init_app(app)

    def init_app(self, app):
        """Initialize with Flask app."""
        self._app = app
        logger.info("Anomaly detection service initialized")

    def analyze_sensor_reading(self, sensor_id: str, unit_id: str, value: float, 
                              timestamp: datetime = None) -> AnomalyResult:
        """Analyze a single sensor reading for anomalies."""
        if timestamp is None:
            timestamp = utc_now()

        try:
            # Get sensor information
            sensor = Sensor.query.get(sensor_id)
            if not sensor:
                raise ValueError(f"Sensor {sensor_id} not found")

            # Get historical data for baseline
            historical_values = self._get_historical_values(sensor_id, days=7)

            if len(historical_values) < 10:
                # Not enough historical data for reliable detection
                return AnomalyResult(
                    sensor_id=sensor_id,
                    unit_id=unit_id,
                    sensor_type=sensor.sensor_type,
                    value=value,
                    timestamp=timestamp,
                    is_anomaly=False,
                    anomaly_score=0.0,
                    confidence=0.0,
                    method="insufficient_data",
                    baseline_mean=0.0,
                    baseline_std=0.0
                )

            # Run multiple detection methods
            z_anomaly, z_score, z_stats = self._statistical_detector.detect_z_score_anomalies(
                historical_values, value
            )

            iqr_anomaly, iqr_score, iqr_stats = self._statistical_detector.detect_iqr_anomalies(
                historical_values, value
            )

            ma_anomaly, ma_score, ma_stats = self._moving_average_detector.detect_anomalies(
                historical_values, value
            )

            # Combine detection methods (ensemble approach)
            anomaly_votes = sum([z_anomaly, iqr_anomaly, ma_anomaly])
            is_anomaly = anomaly_votes >= 2  # Majority vote

            # Calculate combined anomaly score
            anomaly_score = (z_score + iqr_score + ma_score) / 3

            # Calculate confidence based on agreement between methods
            confidence = (anomaly_votes / 3) * 100  # Percentage agreement

            # Determine primary method
            scores = {'z_score': z_score, 'iqr': iqr_score, 'moving_average': ma_score}
            primary_method = max(scores, key=scores.get)

            result = AnomalyResult(
                sensor_id=sensor_id,
                unit_id=unit_id,
                sensor_type=sensor.sensor_type,
                value=value,
                timestamp=timestamp,
                is_anomaly=is_anomaly,
                anomaly_score=anomaly_score,
                confidence=confidence,
                method=primary_method,
                baseline_mean=z_stats['mean'],
                baseline_std=z_stats['std']
            )

            # Store anomaly if detected
            if is_anomaly:
                self._recent_anomalies.append(result)
                logger.warning(f"Anomaly detected: {result}")

            return result

        except Exception as e:
            logger.error(f"Error analyzing sensor reading: {e}")
            # Return safe default
            return AnomalyResult(
                sensor_id=sensor_id,
                unit_id=unit_id,
                sensor_type="unknown",
                value=value,
                timestamp=timestamp,
                is_anomaly=False,
                anomaly_score=0.0,
                confidence=0.0,
                method="error",
                baseline_mean=0.0,
                baseline_std=0.0
            )

    def analyze_unit_anomalies(self, unit_id: str, hours: int = 24) -> Dict[str, Any]:
        """Analyze anomalies for all sensors in a unit over a time period."""
        try:
            unit = Unit.query.get(unit_id)
            if not unit:
                raise ValueError(f"Unit {unit_id} not found")

            start_time = utc_now() - timedelta(hours=hours)

            # Get recent readings for the unit
            recent_readings = db.session.query(
                SensorReading, Sensor
            ).join(Sensor).filter(
                and_(
                    Sensor.unit_id == unit_id,
                    SensorReading.timestamp >= start_time
                )
            ).order_by(SensorReading.timestamp.desc()).all()

            anomalies = []
            sensor_stats = {}

            for reading, sensor in recent_readings:
                result = self.analyze_sensor_reading(
                    sensor.id, unit_id, reading.value, reading.timestamp
                )

                if result.is_anomaly:
                    anomalies.append({
                        'sensor_id': result.sensor_id,
                        'sensor_type': result.sensor_type,
                        'value': result.value,
                        'timestamp': result.timestamp.isoformat(),
                        'anomaly_score': result.anomaly_score,
                        'confidence': result.confidence,
                        'method': result.method
                    })

                # Collect sensor statistics
                if result.sensor_type not in sensor_stats:
                    sensor_stats[result.sensor_type] = {
                        'total_readings': 0,
                        'anomaly_count': 0,
                        'avg_anomaly_score': 0,
                        'max_anomaly_score': 0
                    }

                stats = sensor_stats[result.sensor_type]
                stats['total_readings'] += 1

                if result.is_anomaly:
                    stats['anomaly_count'] += 1
                    stats['avg_anomaly_score'] = (
                        (stats['avg_anomaly_score'] * (stats['anomaly_count'] - 1) + result.anomaly_score)
                        / stats['anomaly_count']
                    )
                    stats['max_anomaly_score'] = max(stats['max_anomaly_score'], result.anomaly_score)

            # Calculate anomaly rates
            for sensor_type in sensor_stats:
                stats = sensor_stats[sensor_type]
                stats['anomaly_rate'] = (
                    stats['anomaly_count'] / stats['total_readings'] * 100
                    if stats['total_readings'] > 0 else 0
                )

            return {
                'unit_id': unit_id,
                'unit_name': unit.name,
                'analysis_period_hours': hours,
                'total_anomalies': len(anomalies),
                'anomalies': anomalies,
                'sensor_statistics': sensor_stats,
                'overall_anomaly_rate': (
                    len(anomalies) / len(recent_readings) * 100
                    if recent_readings else 0
                )
            }

        except Exception as e:
            logger.error(f"Error analyzing unit anomalies: {e}")
            return {
                'unit_id': unit_id,
                'error': str(e),
                'total_anomalies': 0,
                'anomalies': [],
                'sensor_statistics': {},
                'overall_anomaly_rate': 0
            }

    def get_recent_anomalies(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent anomalies across all sensors."""
        recent = list(self._recent_anomalies)[-limit:]
        return [
            {
                'sensor_id': anomaly.sensor_id,
                'unit_id': anomaly.unit_id,
                'sensor_type': anomaly.sensor_type,
                'value': anomaly.value,
                'timestamp': anomaly.timestamp.isoformat(),
                'anomaly_score': anomaly.anomaly_score,
                'confidence': anomaly.confidence,
                'method': anomaly.method,
                'baseline_mean': anomaly.baseline_mean,
                'baseline_std': anomaly.baseline_std
            }
            for anomaly in recent
        ]

    def get_status(self) -> Dict[str, Any]:
        """Get service status."""
        return {
            'service': 'anomaly_detection',
            'status': 'active',
            'total_anomalies_detected': len(self._recent_anomalies),
            'detection_methods': ['z_score', 'iqr', 'moving_average'],
            'baseline_cache_size': len(self._sensor_baselines)
        }

    def _get_historical_values(self, sensor_id: str, days: int = 7) -> List[float]:
        """Get historical sensor values for baseline calculation."""
        start_time = utc_now() - timedelta(days=days)

        readings = db.session.query(SensorReading.value).filter(
            and_(
                SensorReading.sensor_id == sensor_id,
                SensorReading.timestamp >= start_time
            )
        ).order_by(SensorReading.timestamp).all()

        return [float(reading.value) for reading in readings]


# Global anomaly detection service instance
anomaly_detection_service = AnomalyDetectionService()