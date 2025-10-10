#!/usr/bin/env python
"""Test script to verify the health check endpoint.

This script tests the /health endpoint to ensure it's working correctly.
Run this script to quickly verify your health check configuration.
"""
import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)


def test_health_endpoint():
    """Test the health check endpoint."""
    try:
        from app import create_app
        import json
        
        print("=" * 70)
        print("🏥 ThermaCore Health Check Endpoint Test")
        print("=" * 70)
        print()
        
        # Create app with testing configuration
        print("📦 Creating Flask application...")
        app = create_app('testing')
        print("✅ Flask app created successfully")
        print()
        
        # Test the health endpoint
        print("🔍 Testing /health endpoint...")
        with app.test_client() as client:
            response = client.get('/health')
            
            # Check status code
            print(f"   Status Code: {response.status_code}")
            if response.status_code != 200:
                print(f"   ❌ FAILED: Expected 200, got {response.status_code}")
                return False
            
            # Check response data
            data = response.get_json()
            print(f"   Response Type: {type(data)}")
            
            # Validate required fields
            if 'status' not in data:
                print("   ❌ FAILED: Response missing 'status' field")
                return False
            
            if data['status'] != 'healthy':
                print(f"   ❌ FAILED: Expected status='healthy', got \"{data['status']}\"")
                return False
            
            if 'version' not in data:
                print("   ❌ FAILED: Response missing 'version' field")
                return False
            
            print("   ✅ All validations passed!")
            print()
            
            # Display the response
            print("📋 Health Check Response:")
            print("-" * 70)
            print(json.dumps(data, indent=2))
            print("-" * 70)
            print()
            
            # Summary
            print("✅ Health Check Test: PASSED")
            print()
            print("Your health check endpoint is working correctly!")
            print("Endpoint: /health")
            print("Method: GET")
            print("Authentication: None required")
            print()
            
            # Show how to test locally
            print("💡 To test when your server is running locally:")
            print("   curl http://localhost:5000/health")
            print("   or visit: http://localhost:5000/health in your browser")
            print()
            print("=" * 70)
            
            return True
            
    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main entry point."""
    success = test_health_endpoint()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
