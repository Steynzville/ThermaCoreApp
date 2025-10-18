"""Tests for user batch manager utility."""

from app.models import User, Role
from app.utils.user_batch_manager import UserBatchManager


class TestUserBatchManager:
    """Test user batch operations."""

    def test_get_users_by_company(self, db_session):
        """Test getting users by company name."""
        # Get admin role
        admin_role = Role.query.filter_by(name="admin").first()
        
        # Create test users with different companies
        user1 = User(
            username="abb_user1",
            email="user1@abb.com",
            company="ABB Group",
            role_id=admin_role.id
        )
        user1.set_password("password123")
        
        user2 = User(
            username="abb_user2",
            email="user2@abb.com",
            company="ABB Group",
            role_id=admin_role.id
        )
        user2.set_password("password123")
        
        user3 = User(
            username="minecor_user",
            email="user@minecor.com",
            company="MineCor",
            role_id=admin_role.id
        )
        user3.set_password("password123")
        
        db_session.add_all([user1, user2, user3])
        db_session.commit()
        
        # Test getting users by company
        abb_users = UserBatchManager.get_users_by_company("ABB Group")
        assert len(abb_users) == 2
        
        minecor_users = UserBatchManager.get_users_by_company("MineCor")
        assert len(minecor_users) == 1

    def test_get_users_by_company_identifier(self, db_session):
        """Test getting users by company identifier."""
        admin_role = Role.query.filter_by(name="admin").first()
        
        user1 = User(
            username="test_user1",
            email="user1@test.com",
            company="TestCorp",
            company_identifier="TESTCORP-12345678",
            role_id=admin_role.id
        )
        user1.set_password("password123")
        
        user2 = User(
            username="test_user2",
            email="user2@test.com",
            company="TestCorp",
            company_identifier="TESTCORP-12345678",
            role_id=admin_role.id
        )
        user2.set_password("password123")
        
        db_session.add_all([user1, user2])
        db_session.commit()
        
        users = UserBatchManager.get_users_by_company_identifier("TESTCORP-12345678")
        assert len(users) == 2

    def test_get_company_statistics(self, db_session):
        """Test getting company statistics."""
        admin_role = Role.query.filter_by(name="admin").first()
        
        # Create users with different companies and active states
        user1 = User(
            username="stat_user1",
            email="user1@stats.com",
            company="StatsCorp",
            is_active=True,
            role_id=admin_role.id
        )
        user1.set_password("password123")
        
        user2 = User(
            username="stat_user2",
            email="user2@stats.com",
            company="StatsCorp",
            is_active=False,
            role_id=admin_role.id
        )
        user2.set_password("password123")
        
        db_session.add_all([user1, user2])
        db_session.commit()
        
        stats = UserBatchManager.get_company_statistics()
        
        # Find StatsCorp in stats
        statscorp_stats = next((s for s in stats if s["company"] == "StatsCorp"), None)
        assert statscorp_stats is not None
        assert statscorp_stats["total_users"] == 2
        assert statscorp_stats["active_users"] == 1
        assert statscorp_stats["inactive_users"] == 1

    def test_batch_activate_users(self, db_session):
        """Test batch activating users."""
        admin_role = Role.query.filter_by(name="admin").first()
        
        user1 = User(
            username="activate_user1",
            email="user1@activate.com",
            is_active=False,
            role_id=admin_role.id
        )
        user1.set_password("password123")
        
        user2 = User(
            username="activate_user2",
            email="user2@activate.com",
            is_active=False,
            role_id=admin_role.id
        )
        user2.set_password("password123")
        
        db_session.add_all([user1, user2])
        db_session.commit()
        
        user_ids = [user1.id, user2.id]
        count = UserBatchManager.batch_activate_users(user_ids)
        
        assert count == 2
        
        # Verify users are activated
        db_session.refresh(user1)
        db_session.refresh(user2)
        assert user1.is_active is True
        assert user2.is_active is True

    def test_batch_deactivate_users(self, db_session):
        """Test batch deactivating users."""
        admin_role = Role.query.filter_by(name="admin").first()
        
        user1 = User(
            username="deactivate_user1",
            email="user1@deactivate.com",
            is_active=True,
            role_id=admin_role.id
        )
        user1.set_password("password123")
        
        user2 = User(
            username="deactivate_user2",
            email="user2@deactivate.com",
            is_active=True,
            role_id=admin_role.id
        )
        user2.set_password("password123")
        
        db_session.add_all([user1, user2])
        db_session.commit()
        
        user_ids = [user1.id, user2.id]
        count = UserBatchManager.batch_deactivate_users(user_ids)
        
        assert count == 2
        
        # Verify users are deactivated
        db_session.refresh(user1)
        db_session.refresh(user2)
        assert user1.is_active is False
        assert user2.is_active is False

    def test_batch_update_company(self, db_session):
        """Test batch updating company name."""
        admin_role = Role.query.filter_by(name="admin").first()
        
        user1 = User(
            username="update_user1",
            email="user1@update.com",
            company="OldCorp",
            role_id=admin_role.id
        )
        user1.set_password("password123")
        
        user2 = User(
            username="update_user2",
            email="user2@update.com",
            company="OldCorp",
            role_id=admin_role.id
        )
        user2.set_password("password123")
        
        db_session.add_all([user1, user2])
        db_session.commit()
        
        user_ids = [user1.id, user2.id]
        count = UserBatchManager.batch_update_company(user_ids, "NewCorp")
        
        assert count == 2
        
        # Verify company is updated
        db_session.refresh(user1)
        db_session.refresh(user2)
        assert user1.company == "NewCorp"
        assert user2.company == "NewCorp"

    def test_get_unique_companies(self, db_session):
        """Test getting unique company names."""
        admin_role = Role.query.filter_by(name="admin").first()
        
        user1 = User(
            username="unique_user1",
            email="user1@unique.com",
            company="UniqueCorpA",
            role_id=admin_role.id
        )
        user1.set_password("password123")
        
        user2 = User(
            username="unique_user2",
            email="user2@unique.com",
            company="UniqueCorpB",
            role_id=admin_role.id
        )
        user2.set_password("password123")
        
        user3 = User(
            username="unique_user3",
            email="user3@unique.com",
            company="UniqueCorpA",  # Duplicate
            role_id=admin_role.id
        )
        user3.set_password("password123")
        
        db_session.add_all([user1, user2, user3])
        db_session.commit()
        
        companies = UserBatchManager.get_unique_companies()
        
        assert "UniqueCorpA" in companies
        assert "UniqueCorpB" in companies
        # Should only appear once even though there are 2 users with UniqueCorpA
        assert companies.count("UniqueCorpA") == 1

    def test_get_users_by_department(self, db_session):
        """Test getting users by department."""
        admin_role = Role.query.filter_by(name="admin").first()
        
        user1 = User(
            username="dept_user1",
            email="user1@dept.com",
            department="Engineering",
            role_id=admin_role.id
        )
        user1.set_password("password123")
        
        user2 = User(
            username="dept_user2",
            email="user2@dept.com",
            department="Engineering",
            role_id=admin_role.id
        )
        user2.set_password("password123")
        
        user3 = User(
            username="dept_user3",
            email="user3@dept.com",
            department="Sales",
            role_id=admin_role.id
        )
        user3.set_password("password123")
        
        db_session.add_all([user1, user2, user3])
        db_session.commit()
        
        eng_users = UserBatchManager.get_users_by_department("Engineering")
        assert len(eng_users) == 2
        
        sales_users = UserBatchManager.get_users_by_department("Sales")
        assert len(sales_users) == 1

    def test_count_users_by_company(self, db_session):
        """Test counting users by company."""
        admin_role = Role.query.filter_by(name="admin").first()
        
        user1 = User(
            username="count_user1",
            email="user1@count.com",
            company="CountCorpA",
            role_id=admin_role.id
        )
        user1.set_password("password123")
        
        user2 = User(
            username="count_user2",
            email="user2@count.com",
            company="CountCorpA",
            role_id=admin_role.id
        )
        user2.set_password("password123")
        
        user3 = User(
            username="count_user3",
            email="user3@count.com",
            company="CountCorpB",
            role_id=admin_role.id
        )
        user3.set_password("password123")
        
        db_session.add_all([user1, user2, user3])
        db_session.commit()
        
        counts = UserBatchManager.count_users_by_company()
        
        assert counts.get("CountCorpA") == 2
        assert counts.get("CountCorpB") == 1
