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
        
        # Valid PermissionEnum values should work
        valid_permissions = [
            PermissionEnum.READ_USERS,
            PermissionEnum.WRITE_USERS,
            PermissionEnum.DELETE_USERS,
            PermissionEnum.READ_UNITS,
            PermissionEnum.WRITE_UNITS,
            PermissionEnum.DELETE_UNITS,
            PermissionEnum.ADMIN_PANEL
        ]
        
        for permission in valid_permissions:
            # Should not raise an error
            result = admin_role.has_permission(permission)
            assert isinstance(result, bool)
    
    def test_string_permission_validation(self, client, db_session):
        """Test string permission validation against known values."""
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Valid string permissions
        valid_string_permissions = [
            "read_users",
            "write_users", 
            "delete_users",
            "read_units",
            "write_units",
            "delete_units",
            "admin_panel"
        ]
        
        for permission in valid_string_permissions:
            # Should not raise an error
            result = admin_role.has_permission(permission)
            assert isinstance(result, bool)
        
        # Invalid string permissions should return False (not raise error)
        invalid_permissions = [
            "invalid_permission",
            "random_string",
            "",
        ]
        
        for permission in invalid_permissions:
            assert admin_role.has_permission(permission) is False