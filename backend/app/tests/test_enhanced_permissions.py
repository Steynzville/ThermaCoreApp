"""Unit tests for enhanced permission handling."""
import pytest
from app.models import Role, User, PermissionEnum


class TestEnhancedPermissionHandling:
    """Test enhanced permission handling with strict type validation."""
    
    def test_role_has_permission_with_valid_string(self, client, db_session):
        """Test Role.has_permission with valid string permission."""
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Test with valid string permission
        assert admin_role.has_permission("read_users") is True
        assert admin_role.has_permission("write_users") is True
        assert admin_role.has_permission("nonexistent_permission") is False
    
    def test_role_has_permission_with_valid_enum(self, client, db_session):
        """Test Role.has_permission with valid PermissionEnum."""
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Test with PermissionEnum
        assert admin_role.has_permission(PermissionEnum.READ_USERS) is True
        assert admin_role.has_permission(PermissionEnum.WRITE_USERS) is True
    
    def test_role_has_permission_type_error_on_invalid_type(self, client, db_session):
        """Test Role.has_permission raises TypeError for unsupported types."""
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Test with invalid types that should raise TypeError
        with pytest.raises(TypeError, match="Permission must be a string or PermissionEnum"):
            admin_role.has_permission(123)
        
        with pytest.raises(TypeError, match="Permission must be a string or PermissionEnum"):
            admin_role.has_permission(None)
        
        with pytest.raises(TypeError, match="Permission must be a string or PermissionEnum"):
            admin_role.has_permission([])
        
        with pytest.raises(TypeError, match="Permission must be a string or PermissionEnum"):
            admin_role.has_permission({})
    
    def test_user_has_permission_inherits_type_safety(self, client, db_session):
        """Test User.has_permission inherits type safety from Role.has_permission."""
        from app.models import User
        admin_user = User.query.filter_by(username='admin').first()
        
        # Valid cases should work
        assert admin_user.has_permission("read_users") is True
        assert admin_user.has_permission(PermissionEnum.READ_USERS) is True
        
        # Invalid types should raise TypeError
        with pytest.raises(TypeError, match="Permission must be a string or PermissionEnum"):
            admin_user.has_permission(123)
    
    def test_permission_enum_value_validation(self, client, db_session):
        """Test permission validation against known PermissionEnum values."""
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Use hardcoded expected permissions set for robust validation
        expected_permissions = {
            'read_units', 'write_units', 'delete_units', 
            'read_users', 'write_users', 'delete_users', 
            'admin_panel'
        }
        
        # Verify exact count matches expected
        all_permission_enums = list(PermissionEnum)
        actual_permissions = {perm.value for perm in all_permission_enums}
        
        # Exact count assertion instead of weak count > 0
        assert len(all_permission_enums) == 7, f"Expected exactly 7 permissions, got {len(all_permission_enums)}"
        
        # Set-based comparison for exact matching
        assert actual_permissions == expected_permissions, (
            f"Permission mismatch detected!\n"
            f"Expected: {sorted(expected_permissions)}\n"
            f"Actual:   {sorted(actual_permissions)}\n"
            f"Missing:  {sorted(expected_permissions - actual_permissions)}\n"
            f"Extra:    {sorted(actual_permissions - expected_permissions)}"
        )
        
        # Validate each permission works correctly
        for permission in all_permission_enums:
            result = admin_role.has_permission(permission)
            assert isinstance(result, bool), f"Permission {permission.value} should return boolean"
    
    def test_string_permission_validation(self, client, db_session):
        """Test string permission validation against known values."""
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Use hardcoded expected permissions for exact validation
        expected_permission_strings = {
            'read_units', 'write_units', 'delete_units', 
            'read_users', 'write_users', 'delete_users', 
            'admin_panel'
        }
        
        # Generate actual permissions from enum for comparison  
        actual_permission_strings = {perm.value for perm in PermissionEnum}
        
        # Exact count assertion instead of weak count > 0
        assert len(actual_permission_strings) == 7, f"Expected exactly 7 permissions, got {len(actual_permission_strings)}"
        
        # Set-based comparison with meaningful diff output
        assert actual_permission_strings == expected_permission_strings, (
            f"Permission string mismatch detected!\n"
            f"Expected: {sorted(expected_permission_strings)}\n" 
            f"Actual:   {sorted(actual_permission_strings)}\n"
            f"Missing:  {sorted(expected_permission_strings - actual_permission_strings)}\n"
            f"Extra:    {sorted(actual_permission_strings - expected_permission_strings)}"
        )
        
        # Validate each permission string works correctly
        for permission in expected_permission_strings:
            result = admin_role.has_permission(permission)
            assert isinstance(result, bool), f"Permission string '{permission}' should return boolean"
            
        # Invalid string permissions should return False (not raise error)
        invalid_permissions = [
            "invalid_permission",
            "random_string",
            "",
        ]
        
        for permission in invalid_permissions:
            assert admin_role.has_permission(permission) is False
    
    def test_comprehensive_enum_coverage(self, client, db_session):
        """Test that permission tests cover all enum values automatically."""
        # This test ensures complete coverage with exact validation
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Hardcoded expected permission set for robust validation
        expected_permissions = {
            'read_units', 'write_units', 'delete_units', 
            'read_users', 'write_users', 'delete_users', 
            'admin_panel'
        }
        
        # Get all enum values  
        all_permissions = list(PermissionEnum)
        actual_permissions = {p.value for p in all_permissions}
        
        # Exact count assertion
        assert len(all_permissions) == 7, f"Expected exactly 7 permissions, got {len(all_permissions)}"
        
        # Exact set comparison with meaningful diff
        assert actual_permissions == expected_permissions, (
            f"Permission set mismatch detected!\n"
            f"Expected: {sorted(expected_permissions)}\n"
            f"Actual:   {sorted(actual_permissions)}\n"
            f"Missing:  {sorted(expected_permissions - actual_permissions)}\n"
            f"Extra:    {sorted(actual_permissions - expected_permissions)}"
        )
        
        # Test both enum and string versions of each permission
        for permission_enum in all_permissions:
            # Test enum version
            enum_result = admin_role.has_permission(permission_enum)
            assert isinstance(enum_result, bool)
            
            # Test string version
            string_result = admin_role.has_permission(permission_enum.value)
            assert isinstance(string_result, bool)
            
            # Both should return the same result
            assert enum_result == string_result
    
    def test_call_site_audit_prevention(self, client, db_session):
        """Test that prevents silent coercion at call sites."""
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Test various invalid types that might be passed accidentally
        invalid_types = [
            123,           # integer
            12.34,         # float
            True,          # boolean
            False,         # boolean
            [],            # empty list
            {},            # empty dict
            set(),         # empty set
            None,          # None
            object(),      # generic object
        ]
        
        # Exact count assertion for test coverage
        assert len(invalid_types) == 9, f"Expected exactly 9 invalid types to test, got {len(invalid_types)}"
        
        for invalid_type in invalid_types:
            with pytest.raises(TypeError, match="Permission must be a string or PermissionEnum"):
                admin_role.has_permission(invalid_type)