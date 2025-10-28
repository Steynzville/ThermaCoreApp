#!/usr/bin/env python3
"""
API Endpoint Diagnostic Tool for ThermaCoreApp

This script performs systematic testing of the backend API endpoints to diagnose
login and dashboard issues as described in the issue:

1. Test login API and verify JWT token return
2. Test health endpoint
3. If login succeeds, test dashboard endpoint with token

Usage:
    python backend/diagnose_api_endpoints.py [base_url] [username] [password]

Examples:
    python backend/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD
    python backend/diagnose_api_endpoints.py http://localhost:5000 admin admin123
"""

import json
import sys
from typing import Optional, Tuple

import requests
from requests.exceptions import RequestException


class Colors:
    """ANSI color codes for terminal output"""

    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[1;33m"
    BLUE = "\033[0;34m"
    RESET = "\033[0m"


class APITester:
    """API endpoint testing and diagnostic tool"""

    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.access_token: Optional[str] = None
        self.results = {
            "health": False,
            "login": False,
            "dashboard": False,
        }

    def print_section(self, title: str):
        """Print a section header"""
        print(f"\n{Colors.BLUE}{'━' * 80}{Colors.RESET}")
        print(f"{Colors.BLUE}  {title}{Colors.RESET}")
        print(f"{Colors.BLUE}{'━' * 80}{Colors.RESET}\n")

    def print_success(self, message: str):
        """Print success message"""
        print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")

    def print_error(self, message: str):
        """Print error message"""
        print(f"{Colors.RED}❌ {message}{Colors.RESET}")

    def print_warning(self, message: str):
        """Print warning message"""
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.RESET}")

    def print_info(self, message: str):
        """Print info message"""
        print(f"ℹ️  {message}")

    def print_header(self):
        """Print diagnostic tool header"""
        print("\n" + "=" * 80)
        print("  ThermaCoreApp API Diagnostic Tool")
        print("=" * 80)
        print(f"\nBase URL: {self.base_url}")
        print(f"Username: {self.username}")
        print(f"Password: {'*' * len(self.password)}")
        print("\n" + "=" * 80 + "\n")

    def format_json(self, data: dict) -> str:
        """Format JSON data for display"""
        try:
            return json.dumps(data, indent=2)
        except (TypeError, ValueError):
            return str(data)

    def test_health_endpoint(self) -> bool:
        """
        Test the health endpoint to verify backend is running.

        Returns:
            bool: True if health check passed, False otherwise
        """
        self.print_section("STEP 1: Testing Health Endpoint")

        url = f"{self.base_url}/health"
        self.print_info(f"Testing: GET {url}\n")

        try:
            response = requests.get(url, timeout=10)
            print(f"HTTP Status: {response.status_code}\n")

            if response.status_code == 200:
                self.print_success("Health endpoint is responding correctly")
                print("\nResponse:")
                try:
                    print(self.format_json(response.json()))
                except (json.JSONDecodeError, ValueError):
                    print(response.text)
                self.results["health"] = True
                return True
            else:
                self.print_warning(
                    f"Health endpoint returned unexpected status: {response.status_code}"
                )
                print("\nResponse:")
                print(response.text)
                return False

        except RequestException as e:
            self.print_error(
                "Failed to connect to backend - network error or server is down"
            )
            self.print_info("Check if the backend is deployed and running on Render")
            print(f"\nError details: {e}")
            return False

    def test_login_endpoint(self) -> Tuple[bool, Optional[str]]:
        """
        Test the login endpoint and extract JWT token.

        Returns:
            Tuple[bool, Optional[str]]: (success, access_token)
        """
        self.print_section("STEP 2: Testing Login Endpoint")

        url = f"{self.base_url}/api/v1/auth/login"
        self.print_info(f"Testing: POST {url}\n")

        payload = {"username": self.username, "password": self.password}

        headers = {"Content-Type": "application/json"}

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            print(f"HTTP Status: {response.status_code}\n")

            if response.status_code == 200:
                self.print_success("Login endpoint returned 200 OK")

                try:
                    response_data = response.json()

                    # Check if response contains access_token
                    access_token = None
                    if (
                        "data" in response_data
                        and "access_token" in response_data["data"]
                    ):
                        access_token = response_data["data"]["access_token"]
                    elif "access_token" in response_data:
                        access_token = response_data["access_token"]

                    if access_token:
                        self.print_success("JWT token found in response")
                        self.print_success("Successfully extracted access token")
                        print(f"\nToken (first 50 chars): {access_token[:50]}...")
                        self.access_token = access_token
                        self.results["login"] = True
                    else:
                        self.print_warning("No access_token found in response")

                    print("\nLogin Response:")
                    print(self.format_json(response_data))

                    return (True, access_token)

                except (json.JSONDecodeError, ValueError):
                    self.print_warning("Response is not valid JSON")
                    print("\nResponse:")
                    print(response.text)
                    return (False, None)

            elif response.status_code == 401:
                self.print_error("Login failed: Invalid credentials (401 Unauthorized)")
                self.print_info("Check if the username/password are correct")
                print("\nResponse:")
                try:
                    print(self.format_json(response.json()))
                except (json.JSONDecodeError, ValueError):
                    print(response.text)
                return (False, None)

            elif response.status_code == 500:
                self.print_error("Login failed: Internal Server Error (500)")
                self.print_error("Backend is crashing during authentication!")
                self.print_info("Check backend logs on Render for stack traces")
                print("\nResponse:")
                try:
                    print(self.format_json(response.json()))
                except (json.JSONDecodeError, ValueError):
                    print(response.text)
                return (False, None)

            else:
                self.print_warning(
                    f"Login endpoint returned unexpected status: {response.status_code}"
                )
                print("\nResponse:")
                try:
                    print(self.format_json(response.json()))
                except (json.JSONDecodeError, ValueError):
                    print(response.text)
                return (False, None)

        except RequestException as e:
            self.print_error("Failed to connect to login endpoint - network error")
            print(f"\nError details: {e}")
            return (False, None)

    def test_dashboard_endpoint(self, access_token: str) -> bool:
        """
        Test the dashboard endpoint with JWT token.

        Args:
            access_token: JWT token from login

        Returns:
            bool: True if dashboard access succeeded, False otherwise
        """
        self.print_section("STEP 3: Testing Dashboard Endpoint")

        url = f"{self.base_url}/api/v1/dashboard"
        self.print_info(f"Testing: GET {url}")
        self.print_info("Using JWT token from login response\n")

        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            response = requests.get(url, headers=headers, timeout=10)
            print(f"HTTP Status: {response.status_code}\n")

            if response.status_code == 200:
                self.print_success("Dashboard endpoint returned 200 OK")
                self.print_success("Dashboard data retrieved successfully")
                print("\nDashboard Response:")
                try:
                    print(self.format_json(response.json()))
                except (json.JSONDecodeError, ValueError):
                    print(response.text)
                self.results["dashboard"] = True
                return True

            elif response.status_code == 401:
                self.print_error("Dashboard access denied: Unauthorized (401)")
                self.print_warning("Token may be invalid or expired")
                print("\nResponse:")
                try:
                    print(self.format_json(response.json()))
                except (json.JSONDecodeError, ValueError):
                    print(response.text)
                return False

            elif response.status_code == 403:
                self.print_error("Dashboard access denied: Forbidden (403)")
                self.print_warning("User may not have permission to access dashboard")
                print("\nResponse:")
                try:
                    print(self.format_json(response.json()))
                except (json.JSONDecodeError, ValueError):
                    print(response.text)
                return False

            elif response.status_code == 404:
                self.print_error("Dashboard endpoint not found (404)")
                self.print_info("The /api/v1/dashboard endpoint may not exist")
                self.print_info("Try /api/v1/analytics/dashboard/summary instead\n")

                # Try alternative dashboard endpoint
                alt_url = f"{self.base_url}/api/v1/analytics/dashboard/summary"
                self.print_info(f"Testing alternative: GET {alt_url}\n")

                try:
                    alt_response = requests.get(alt_url, headers=headers, timeout=10)
                    print(f"HTTP Status: {alt_response.status_code}\n")

                    if alt_response.status_code == 200:
                        self.print_success("Alternative dashboard endpoint works!")
                        print("\nDashboard Response:")
                        try:
                            print(self.format_json(alt_response.json()))
                        except (json.JSONDecodeError, ValueError):
                            print(alt_response.text)
                        self.results["dashboard"] = True
                        return True
                    else:
                        self.print_error("Alternative dashboard endpoint also failed")
                        print("\nResponse:")
                        try:
                            print(self.format_json(alt_response.json()))
                        except (json.JSONDecodeError, ValueError):
                            print(alt_response.text)
                        return False
                except RequestException as e:
                    self.print_error(
                        "Failed to connect to alternative dashboard endpoint"
                    )
                    print(f"\nError details: {e}")
                    return False

            elif response.status_code == 500:
                self.print_error("Dashboard failed: Internal Server Error (500)")
                self.print_error("Backend is crashing when accessing dashboard!")
                self.print_info("Check backend logs on Render for stack traces")
                print("\nResponse:")
                try:
                    print(self.format_json(response.json()))
                except (json.JSONDecodeError, ValueError):
                    print(response.text)
                return False

            else:
                self.print_warning(
                    f"Dashboard endpoint returned unexpected status: {response.status_code}"
                )
                print("\nResponse:")
                try:
                    print(self.format_json(response.json()))
                except (json.JSONDecodeError, ValueError):
                    print(response.text)
                return False

        except RequestException as e:
            self.print_error("Failed to connect to dashboard endpoint - network error")
            print(f"\nError details: {e}")
            return False

    def print_summary(self):
        """Print summary and recommendations"""
        self.print_section("Summary and Recommendations")

        print("Test Results:\n")

        # Health check summary
        if self.results["health"]:
            self.print_success("Backend is running (health check passed)")
        else:
            self.print_error(
                "Backend health check failed or returned unexpected status"
            )

        # Login summary
        if self.results["login"]:
            self.print_success("Login authentication working (JWT token received)")
        else:
            self.print_error("Login authentication failed (no JWT token)")

        # Dashboard summary
        if self.access_token:
            if self.results["dashboard"]:
                self.print_success("Dashboard endpoint working correctly")
            else:
                self.print_error("Dashboard endpoint failed or returned error")

        print("\nNext Steps:\n")

        # Provide recommendations based on results
        if self.results["login"] and not self.results["dashboard"]:
            print("1. Login is working but dashboard access failed")
            print(
                "   → Check dashboard endpoint exists and user has correct permissions"
            )
            print("   → Review backend logs for dashboard-related errors\n")
        elif not self.results["login"]:
            print("1. Login authentication is failing")
            print("   → Verify credentials are correct")
            print("   → Check backend logs for authentication errors")
            print("   → Review AUTHENTICATION_500_ERROR_FIX.md for known issues\n")

        print("2. Check Render backend logs for detailed error messages:")
        print("   → Go to Render dashboard")
        print("   → Select the thermacoreapp service")
        print("   → View the 'Logs' tab")
        print("   → Look for Python stack traces or error messages\n")

        print("3. If you see a blank page in the frontend after login:")
        print("   → This suggests the frontend received a token but failed to redirect")
        print("   → Check browser console for JavaScript errors")
        print("   → Verify routing in src/App.jsx or src/router")
        print("   → Check AuthContext.jsx for post-login navigation logic\n")

        print("4. Common issues to check:")
        print("   → CORS configuration (CORS_ORIGINS environment variable)")
        print("   → Database connection (check DATABASE_URL)")
        print("   → JWT secret configuration (JWT_SECRET_KEY)")
        print("   → User permissions in database\n")

        self.print_section("Diagnostic Complete")

    def run(self):
        """Run all diagnostic tests"""
        self.print_header()

        # Step 1: Health check
        health_ok = self.test_health_endpoint()

        if not health_ok:
            self.print_warning(
                "\nCannot proceed with login test - backend is not responding"
            )
            self.print_summary()
            return False

        # Step 2: Login test
        login_ok, access_token = self.test_login_endpoint()

        if not login_ok or not access_token:
            self.print_warning("\nCannot proceed with dashboard test - login failed")
            self.print_summary()
            return False

        # Step 3: Dashboard test
        self.test_dashboard_endpoint(access_token)

        # Print summary
        self.print_summary()

        return all(self.results.values())


def main():
    """Main entry point"""

    # Parse arguments
    if len(sys.argv) < 2:
        print(
            "Usage: python backend/diagnose_api_endpoints.py [base_url] [username] [password]"
        )
        print("\nExamples:")
        print(
            "  python backend/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD"
        )
        print(
            "  python backend/diagnose_api_endpoints.py http://localhost:5000 admin admin123"
        )
        sys.exit(1)

    base_url = sys.argv[1]
    username = sys.argv[2] if len(sys.argv) > 2 else "admin"
    password = sys.argv[3] if len(sys.argv) > 3 else "admin123"

    # Run diagnostic
    tester = APITester(base_url, username, password)
    success = tester.run()

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
