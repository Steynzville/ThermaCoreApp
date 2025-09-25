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
        
        # Dynamically get all PermissionEnum values to ensure coverage stays in sync
        all_permission_enums = list(PermissionEnum)
        
        for permission in all_permission_enums:
            # Should not raise an error
            result = admin_role.has_permission(permission)
            assert isinstance(result, bool)
        
        # Verify we're testing all expected permissions - use exact count for precision
        expected_count = len(all_permission_enums)
        assert expected_count == 7, f"Expected exactly 7 permissions, found {expected_count}. Update this test when permissions are added/removed."
    
    def test_string_permission_validation(self, client, db_session):
        """Test string permission validation against known values."""
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Dynamically generate valid string permissions from enum to ensure sync
        valid_string_permissions = [perm.value for perm in PermissionEnum]
        
        for permission in valid_string_permissions:
            # Should not raise an error
            result = admin_role.has_permission(permission)
            assert isinstance(result, bool)
            
        # Verify we're testing all expected permissions - use exact count for precision
        expected_count = len(valid_string_permissions)
        assert expected_count == 7, f"Expected exactly 7 permissions, found {expected_count}. Update this test when permissions are added/removed."
        
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
        # This test ensures that when new permissions are added to PermissionEnum,
        # they are automatically included in testing coverage
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Get all enum values dynamically
        all_permissions = list(PermissionEnum)
        
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
            
        print(f"✅ Tested {len(all_permissions)} permissions: {[p.value for p in all_permissions]}")
    
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
        
        for invalid_type in invalid_types:
            with pytest.raises(TypeError, match="Permission must be a string or PermissionEnum"):
                admin_role.has_permission(invalid_type)
        
        print(f"✅ Verified TypeError for {len(invalid_types)} invalid types")