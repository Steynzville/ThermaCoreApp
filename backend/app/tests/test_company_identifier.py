"""Tests for company identifier utility."""

from app.utils.company_identifier import CompanyIdentifier


class TestCompanyIdentifier:
    """Test company identifier generation and validation."""

    def test_generate_basic(self):
        """Test basic company identifier generation."""
        identifier = CompanyIdentifier.generate("ABB Group")
        
        assert identifier is not None
        assert "-" in identifier
        assert identifier.startswith("ABB")
        
    def test_generate_with_email(self):
        """Test company identifier generation with email."""
        identifier = CompanyIdentifier.generate("MineCor", "user@minecor.com")
        
        assert identifier is not None
        assert identifier.startswith("MINECOR")
        assert len(identifier.split("-")[1]) == 8  # Hash suffix should be 8 chars

    def test_generate_sanitizes_special_chars(self):
        """Test that special characters are removed from company name."""
        identifier = CompanyIdentifier.generate("AT&T Communications Inc.")
        
        assert identifier is not None
        assert "&" not in identifier
        assert "." not in identifier
        assert identifier.startswith("ATTCOMMUNICATIONS")

    def test_generate_handles_spaces(self):
        """Test that spaces are removed from company prefix."""
        identifier = CompanyIdentifier.generate("Big Tech Corp")
        
        assert identifier is not None
        assert " " not in identifier
        assert identifier.startswith("BIGTECHCORP")

    def test_generate_limits_prefix_length(self):
        """Test that prefix is limited to 20 characters."""
        long_name = "VeryLongCompanyNameThatExceedsTwentyCharacters"
        identifier = CompanyIdentifier.generate(long_name)
        
        assert identifier is not None
        prefix = identifier.split("-")[0]
        assert len(prefix) <= 20

    def test_generate_returns_none_for_empty(self):
        """Test that None is returned for empty company name."""
        identifier = CompanyIdentifier.generate("")
        
        assert identifier is None

    def test_generate_returns_none_for_none(self):
        """Test that None is returned for None company name."""
        identifier = CompanyIdentifier.generate(None)
        
        assert identifier is None

    def test_validate_valid_identifier(self):
        """Test validation of valid identifier."""
        assert CompanyIdentifier.validate("ABB-A1B2C3D4") is True
        assert CompanyIdentifier.validate("MINECOR-12345678") is True
        assert CompanyIdentifier.validate("ATT-ABCDEF01") is True

    def test_validate_invalid_identifier(self):
        """Test validation of invalid identifier."""
        assert CompanyIdentifier.validate("invalid") is False
        assert CompanyIdentifier.validate("ABB-123") is False  # Too short
        assert CompanyIdentifier.validate("ABB-12345678X") is False  # Too long
        assert CompanyIdentifier.validate("") is False
        assert CompanyIdentifier.validate(None) is False

    def test_validate_requires_uppercase(self):
        """Test that validation expects uppercase."""
        # Valid format but lowercase should fail
        assert CompanyIdentifier.validate("abb-a1b2c3d4") is False

    def test_extract_company_prefix(self):
        """Test extracting company prefix from identifier."""
        assert CompanyIdentifier.extract_company_prefix("ABB-A1B2C3D4") == "ABB"
        assert CompanyIdentifier.extract_company_prefix("MINECOR-12345678") == "MINECOR"

    def test_extract_company_prefix_invalid(self):
        """Test extracting prefix from invalid identifier."""
        assert CompanyIdentifier.extract_company_prefix("invalid") is None
        assert CompanyIdentifier.extract_company_prefix("") is None
        assert CompanyIdentifier.extract_company_prefix(None) is None

    def test_uniqueness(self):
        """Test that generated identifiers are unique."""
        id1 = CompanyIdentifier.generate("TestCorp", "user1@test.com")
        id2 = CompanyIdentifier.generate("TestCorp", "user2@test.com")
        
        # Should be different due to timestamp in hash
        assert id1 != id2
        
        # But should have same prefix
        assert id1.split("-")[0] == id2.split("-")[0]
