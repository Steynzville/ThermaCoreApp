"""Company identifier generation utility for user batching and multi-tenancy.

This module provides functionality to generate unique company identifiers
for batching users by organization (e.g., ABB, MineCor, AT&T).
"""

import hashlib
import re
from datetime import datetime, timezone


class CompanyIdentifier:
    """Utility class for generating and validating company identifiers."""

    @staticmethod
    def generate(company_name, email=None):
        """Generate a unique company identifier from company name and optional email.

        The identifier is generated using the following format:
        <COMPANY_PREFIX>-<HASH_SUFFIX>

        Where:
        - COMPANY_PREFIX: Sanitized uppercase company name (max 20 chars)
        - HASH_SUFFIX: First 8 characters of SHA256 hash of (company_name + email + timestamp)

        Args:
            company_name (str): The company name to generate identifier for
            email (str, optional): User email to add uniqueness. Defaults to None.

        Returns:
            str: A unique company identifier (e.g., "ABB-A1B2C3D4")

        Examples:
            >>> CompanyIdentifier.generate("ABB Group")
            'ABB-12AB34CD'
            >>> CompanyIdentifier.generate("Mine Corp", "user@minecorp.com")
            'MINECORP-56EF78GH'

        """
        if not company_name:
            return None

        # Sanitize company name: remove special characters, keep alphanumeric and spaces
        sanitized = re.sub(r"[^A-Za-z0-9\s]", "", company_name)
        # Remove extra spaces and convert to uppercase
        sanitized = re.sub(r"\s+", "", sanitized).upper()

        # Limit prefix to 20 characters for readability
        prefix = sanitized[:20] if sanitized else "COMPANY"

        # Create hash from company name, email (if provided), and timestamp for uniqueness
        hash_input = f"{company_name.lower()}{email or ''}{datetime.now(timezone.utc).isoformat()}"
        hash_object = hashlib.sha256(hash_input.encode())
        hash_hex = hash_object.hexdigest()

        # Use first 8 characters of hash as suffix
        suffix = hash_hex[:8].upper()

        return f"{prefix}-{suffix}"

    @staticmethod
    def validate(identifier):
        """Validate a company identifier format.

        Args:
            identifier (str): The identifier to validate

        Returns:
            bool: True if identifier matches expected format, False otherwise

        Examples:
            >>> CompanyIdentifier.validate("ABB-A1B2C3D4")
            True
            >>> CompanyIdentifier.validate("invalid")
            False

        """
        if not identifier:
            return False

        # Pattern: PREFIX-SUFFIX where PREFIX is alphanumeric and SUFFIX is 8 hex chars
        pattern = r"^[A-Z0-9]+-[A-F0-9]{8}$"
        return bool(re.match(pattern, identifier))

    @staticmethod
    def extract_company_prefix(identifier):
        """Extract the company prefix from a company identifier.

        Args:
            identifier (str): The company identifier

        Returns:
            str: The company prefix, or None if invalid

        Examples:
            >>> CompanyIdentifier.extract_company_prefix("ABB-A1B2C3D4")
            'ABB'

        """
        if not identifier or "-" not in identifier:
            return None

        return identifier.split("-")[0]
