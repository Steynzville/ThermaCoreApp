#!/usr/bin/env python
"""
Script to test the authentication endpoint directly.

This script can be used to verify that the login endpoint is working correctly
and not returning 500 errors.

Usage:
    python test_login_endpoint.py [backend_url] [username] [password]

Example:
    python test_login_endpoint.py https://thermacoreapp.onrender.com admin admin123
"""

import sys
import json
import requests
from requests.exceptions import RequestException

def test_login(base_url, username, password):
    """Test the login endpoint and display the response."""

    # Ensure base_url doesn't end with /
    base_url = base_url.rstrip("/")

    # Construct login URL
    login_url = f"{base_url}/api/v1/auth/login"

    print(f"\n{'=' * 60}")
    print("Testing Login Endpoint")
    print(f"{'=' * 60}")
    print(f"URL: {login_url}")
    print(f"Username: {username}")
    print(f"Password: {'*' * len(password)}")
    print(f"{'=' * 60}\n")

    # Prepare request
    headers = {"Content-Type": "application/json"}

    payload = {"username": username, "password": password}

    try:
        # Make request
        print("Sending POST request...")
        response = requests.post(login_url, json=payload, headers=headers, timeout=10)

        # Display response
        print(f"\n{'=' * 60}")
        print(f"Response Status Code: {response.status_code}")
        print(f"{'=' * 60}")

        # Try to parse JSON
        try:
            response_data = response.json()
            print("\nResponse Body:")
            print(json.dumps(response_data, indent=2))
        except json.JSONDecodeError:
            print("\nResponse Body (not JSON):")
            print(response.text)

        # Display headers
        print(f"\n{'=' * 60}")
        print("Response Headers:")
        print(f"{'=' * 60}")
        for key, value in response.headers.items():
            print(f"{key}: {value}")

        # Analyze response
        print(f"\n{'=' * 60}")
        print("Analysis:")
        print(f"{'=' * 60}")

        if response.status_code == 200:
            print("✅ SUCCESS - Login endpoint working correctly")
            if "access_token" in str(response.text):
                print("✅ JWT tokens present in response")
            else:
                print("⚠️  WARNING - No access_token found in response")

        elif response.status_code == 401:
            print("❌ AUTHENTICATION FAILED - Invalid credentials")
            print("   This is expected behavior for wrong credentials")

        elif response.status_code == 500:
            print("❌ INTERNAL SERVER ERROR - Backend is crashing!")
            print("   This indicates an unhandled exception in the backend")
            print("   Check backend logs for details")

        elif response.status_code == 429:
            print("⚠️  RATE LIMITED - Too many requests")
            print("   Wait a moment and try again")

        else:
            print(f"ℹ️  Unexpected status code: {response.status_code}")

        print(f"\n{'=' * 60}\n")

        return response.status_code == 200

    except RequestException as e:
        print("\n❌ ERROR - Network request failed!")
        print(f"Error: {e}")
        print(f"\n{'=' * 60}\n")
        return False

def main():
    """Main entry point."""

    # Parse arguments
    if len(sys.argv) < 2:
        print(
            "Usage: python test_login_endpoint.py [backend_url] [username] [password]"
        )
        print("\nExamples:")
        print("  python test_login_endpoint.py http://localhost:5000 admin admin123")
        print(
            "  python test_login_endpoint.py https://thermacoreapp.onrender.com admin admin123"
        )
        sys.exit(1)

    base_url = sys.argv[1]
    username = sys.argv[2] if len(sys.argv) > 2 else "admin"
    password = sys.argv[3] if len(sys.argv) > 3 else "admin123"

    # Test login
    success = test_login(base_url, username, password)

    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
