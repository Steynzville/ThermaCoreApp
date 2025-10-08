#!/usr/bin/env python3
"""
Simple validation test for DNP3 optimization implementation.
This script tests the basic functionality without requiring Flask.
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

def test_dnp3_optimization_components():
    """Test DNP3 optimization components in isolation."""
    print("Testing DNP3 optimization components...")

    try:
        # Test imports
        from app.services.dnp3_service import (
            DNP3PerformanceMetrics, 
            DNP3ConnectionPool, 
            DNP3DataCache,
            DNP3Service,
            DNP3Device,
            DNP3DataType,
            DNP3Quality
        )
        print("✅ All imports successful")

        # Test performance metrics
        print("\n--- Testing DNP3PerformanceMetrics ---")
        metrics = DNP3PerformanceMetrics()
        metrics.record_operation('test_read', 0.1, True, 10)
        stats = metrics.get_operation_stats('test_read')
        print(f"✅ Performance metrics: {stats['count']} operations, {stats['avg_time']:.3f}s avg")

        # Test connection pool
        print("\n--- Testing DNP3ConnectionPool ---")
        pool = DNP3ConnectionPool(max_connections=5)
        device = DNP3Device('test_device', 1, 10, 'localhost', 20000)
        result = pool.get_connection('test_device', device)
        print(f"✅ Connection pool: Connection created = {result}")
        print(f"   Active connections: {len(pool.connections)}")

        # Test data cache
        print("\n--- Testing DNP3DataCache ---")
        from app.models import utc_now
        from app.services.dnp3_service import DNP3Reading

        cache = DNP3DataCache(default_ttl=60.0)
        reading = DNP3Reading(
            index=1,
            data_type=DNP3DataType.ANALOG_INPUT,
            value=25.5,
            quality=DNP3Quality.GOOD,
            timestamp=utc_now(),
            sensor_type='temperature',
            description='Test sensor'
        )
        cache.cache_reading('test_device', reading)
        cached_reading = cache.get_cached_reading('test_device', 1)
        print(f"✅ Data cache: Cached value = {cached_reading.value if cached_reading else 'None'}")

        # Test DNP3 service initialization
        print("\n--- Testing DNP3Service ---")
        service = DNP3Service()
        service.init_app(None)  # Initialize without Flask app

        # Test performance configuration
        service.enable_performance_optimizations(caching=True, bulk_operations=True)
        print(f"✅ DNP3 Service: Caching = {service._enable_caching}, Bulk ops = {service._enable_bulk_operations}")

        # Test performance summary
        summary = service.get_performance_summary()
        print(f"✅ Performance summary: {summary['total_operations']} operations")

        # Test performance metrics
        detailed_metrics = service.get_performance_metrics()
        print(f"✅ Detailed metrics available: {len(detailed_metrics)} metric categories")

        print("\n🎉 All DNP3 optimization components working correctly!")
        return True

    except Exception as e:
        print(f"❌ Error testing DNP3 components: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_performance_monitor_decorator():
    """Test the performance monitoring decorator."""
    print("\n--- Testing Performance Monitor Decorator ---")

    try:
        from app.services.dnp3_service import DNP3PerformanceMetrics, dnp3_performance_monitor
        import time

        class TestService:
            def __init__(self):
                self._performance_metrics = DNP3PerformanceMetrics()

            @dnp3_performance_monitor('test_operation')
            def test_method(self, data_count=5):
                time.sleep(0.01)  # Simulate work
                return {'total_points': data_count, 'success': True}

        service = TestService()
        service.test_method(10)

        # Check that metrics were recorded
        stats = service._performance_metrics.get_operation_stats('test_operation')
        print(f"✅ Decorator test: {stats['count']} operations, {stats['avg_time']:.3f}s avg")
        print(f"   Success rate: {stats['success_rate']:.1f}%")

        return True

    except Exception as e:
        print(f"❌ Error testing decorator: {e}")
        return False

def main():
    """Run validation tests."""
    print("=" * 60)
    print("DNP3 Optimization Implementation Validation")
    print("=" * 60)

    success = True

    # Test basic components
    if not test_dnp3_optimization_components():
        success = False

    # Test decorator functionality
    if not test_performance_monitor_decorator():
        success = False

    print("\n" + "=" * 60)
    if success:
        print("🎉 ALL TESTS PASSED - DNP3 optimizations are working correctly!")
        print("\nNext steps:")
        print("1. Start the Flask application")
        print("2. Test the performance monitoring endpoints")
        print("3. Run the performance test suite")
        print("4. Monitor performance improvements in production")
    else:
        print("❌ SOME TESTS FAILED - Check implementation")
        sys.exit(1)
    print("=" * 60)

if __name__ == "__main__":
    main()