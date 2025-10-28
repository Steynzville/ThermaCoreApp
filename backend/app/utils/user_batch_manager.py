"""User batch operations manager for multi-tenancy support.

This module provides functionality for batch operations on users,
particularly for company-based grouping and bulk actions.
"""

from sqlalchemy import func

from app import db
from app.models import User

class UserBatchManager:
    """Manager class for batch user operations."""

    @staticmethod
    def get_users_by_company(company_name):
        """Get all users belonging to a specific company.

        Args:
            company_name (str): The company name to filter by

        Returns:
            List[User]: List of User objects for the company

        """
        if not company_name:
            return []

        return User.query.filter(User.company == company_name).all()

    @staticmethod
    def get_users_by_company_identifier(company_identifier):
        """Get all users with a specific company identifier.

        Args:
            company_identifier (str): The company identifier to filter by

        Returns:
            List[User]: List of User objects with matching identifier

        """
        if not company_identifier:
            return []

        return User.query.filter(
            User.company_identifier == company_identifier,
        ).all()

    @staticmethod
    def get_company_statistics():
        """Get statistics about users grouped by company.

        Returns:
            List[Dict]: List of dictionaries with company stats
                Each dict contains: company, total_users, active_users, inactive_users

        """
        # Query to get counts by company
        stats = (
            db.session.query(
                User.company,
                func.count(User.id).label("total_users"),
                func.sum(func.cast(User.is_active, db.Integer)).label("active_users"),
            )
            .filter(User.company.isnot(None))
            .group_by(User.company)
            .all()
        )

        result = []
        for company, total, active in stats:
            result.append(
                {
                    "company": company,
                    "total_users": total,
                    "active_users": active or 0,
                    "inactive_users": total - (active or 0),
                },
            )

        return result

    @staticmethod
    def batch_activate_users(user_ids: list[int]):
        """Activate multiple users by their IDs.

        Args:
            user_ids (List[int]): List of user IDs to activate

        Returns:
            int: Number of users activated

        """
        if not user_ids:
            return 0

        count = User.query.filter(User.id.in_(user_ids)).update(
            {"is_active": True},
            synchronize_session=False,
        )
        db.session.commit()
        return count

    @staticmethod
    def batch_deactivate_users(user_ids: list[int]):
        """Deactivate multiple users by their IDs.

        Args:
            user_ids (List[int]): List of user IDs to deactivate

        Returns:
            int: Number of users deactivated

        """
        if not user_ids:
            return 0

        count = User.query.filter(User.id.in_(user_ids)).update(
            {"is_active": False},
            synchronize_session=False,
        )
        db.session.commit()
        return count

    @staticmethod
    def batch_update_company(user_ids: list[int], company_name: str):
        """Update company name for multiple users.

        Args:
            user_ids (List[int]): List of user IDs to update
            company_name (str): New company name

        Returns:
            int: Number of users updated

        """
        if not user_ids:
            return 0

        count = User.query.filter(User.id.in_(user_ids)).update(
            {"company": company_name},
            synchronize_session=False,
        )
        db.session.commit()
        return count

    @staticmethod
    def get_unique_companies():
        """Get list of unique company names from all users.

        Returns:
            List[str]: List of unique company names (excluding None)

        """
        companies = (
            db.session.query(User.company)
            .filter(User.company.isnot(None))
            .distinct()
            .all()
        )

        return [company[0] for company in companies if company[0]]

    @staticmethod
    def get_users_by_department(department: str, company: str | None = None):
        """Get users by department, optionally filtered by company.

        Args:
            department (str): Department name to filter by
            company (str, optional): Company name to additionally filter by

        Returns:
            List[User]: List of User objects matching criteria

        """
        query = User.query.filter(User.department == department)

        if company:
            query = query.filter(User.company == company)

        return query.all()

    @staticmethod
    def count_users_by_company():
        """Get a simple count of users per company.

        Returns:
            Dict[str, int]: Dictionary mapping company names to user counts

        """
        counts = (
            db.session.query(User.company, func.count(User.id))
            .filter(User.company.isnot(None))
            .group_by(User.company)
            .all()
        )

        return dict(counts)
