# User Management Enhancement - Quick Start Guide

## 🎯 What Changed?

This update enhances the user management system with complete profile fields and multi-tenancy support.

## 🔥 Key Features

### 1. Complete User Profiles
Users now have full profile information:
- ✅ Phone Number
- ✅ Company Name
- ✅ Department
- ✅ Position/Title
- ✅ Auto-generated Company Identifier

### 2. Company Identifier System
When a user is registered with a company name, the system automatically generates a unique identifier:
```
Input:  company = "ABB Group"
Output: company_identifier = "ABBGROUP-A1B2C3D4"
```

### 3. Batch Operations
New API endpoints for bulk user management:
- Batch activate/deactivate users
- Get users by company
- Company statistics

## 📋 For Developers

### Database Migration

**PostgreSQL:**
```bash
psql -U username -d database_name -f backend/migrations/007_add_user_profile_fields.sql
```

**SQLite:**
```bash
sqlite3 database.db < backend/migrations/007_add_user_profile_fields_sqlite.sql
```

### API Usage Examples

**Register User with Company:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "email": "john@abb.com",
    "password": "secure123",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1234567890",
    "company": "ABB Group",
    "department": "Engineering",
    "position": "Senior Engineer",
    "role_id": 2
  }'
```

**Filter Users by Company:**
```bash
curl -X GET "http://localhost:5000/api/v1/users?company=ABB" \
  -H "Authorization: Bearer $TOKEN"
```

**Get Company Statistics:**
```bash
curl -X GET http://localhost:5000/api/v1/users/companies/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Batch Activate Users:**
```bash
curl -X POST http://localhost:5000/api/v1/users/batch/activate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": [1, 2, 3]
  }'
```

### Frontend Usage

The AdminPanel user creation form now includes all fields:

```jsx
// State includes all fields
const [newUserFormData, setNewUserFormData] = useState({
  username: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",      // NEW
  company: "",          // NEW
  department: "",       // NEW
  position: "",         // NEW
  roleId: "",
});
```

### Python Utilities

**Company Identifier:**
```python
from app.utils.company_identifier import CompanyIdentifier

# Generate identifier
identifier = CompanyIdentifier.generate("ABB Group", "user@abb.com")
# Returns: "ABBGROUP-A1B2C3D4"

# Validate identifier
is_valid = CompanyIdentifier.validate("ABBGROUP-A1B2C3D4")
# Returns: True

# Extract prefix
prefix = CompanyIdentifier.extract_company_prefix("ABBGROUP-A1B2C3D4")
# Returns: "ABBGROUP"
```

**Batch Manager:**
```python
from app.utils.user_batch_manager import UserBatchManager

# Get all ABB users
abb_users = UserBatchManager.get_users_by_company("ABB Group")

# Get company statistics
stats = UserBatchManager.get_company_statistics()
# Returns: [
#   {
#     "company": "ABB Group",
#     "total_users": 10,
#     "active_users": 8,
#     "inactive_users": 2
#   },
#   ...
# ]

# Batch activate users
count = UserBatchManager.batch_activate_users([1, 2, 3])
# Returns: 3 (number of users activated)
```

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
python -m pytest app/tests/test_company_identifier.py -v
python -m pytest app/tests/test_user_batch_manager.py -v
python -m pytest app/tests/test_enhanced_user_management.py -v
```

### Verify Company Identifier
```bash
cd backend
python -c "
from app.utils.company_identifier import CompanyIdentifier
print(CompanyIdentifier.generate('ABB Group'))
"
```

## 🔐 Security Notes

1. All new endpoints require JWT authentication
2. Batch operations require `write_users` permission
3. All inputs are validated using Marshmallow schemas
4. Company identifiers use SHA256 for uniqueness
5. SQL injection protection via SQLAlchemy ORM

## 🔄 Backward Compatibility

✅ **100% Backward Compatible**

- All new fields are optional (nullable in DB, not required in schemas)
- Existing users work without new fields
- Registration works with or without new fields
- Frontend gracefully handles missing data (shows "N/A")
- Migration uses `IF NOT EXISTS` (safe for existing databases)

## 📊 What's in the User Table Now?

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| username | VARCHAR(80) | Yes | Yes | Unique username |
| email | VARCHAR(120) | Yes | Yes | Unique email |
| password_hash | TEXT | Yes | No | Hashed password |
| first_name | VARCHAR(100) | No | No | User's first name |
| last_name | VARCHAR(100) | No | No | User's last name |
| **phone_number** | **VARCHAR(50)** | **No** | **No** | **User's phone** |
| **company** | **VARCHAR(200)** | **No** | **Yes** | **Company name** |
| **company_identifier** | **VARCHAR(100)** | **No** | **Yes** | **Auto-generated ID** |
| **department** | **VARCHAR(100)** | **No** | **No** | **Department** |
| **position** | **VARCHAR(100)** | **No** | **No** | **Job title** |
| is_active | BOOLEAN | Yes | No | Active status |
| role_id | INTEGER | Yes | No | Foreign key to roles |
| created_at | TIMESTAMP | Auto | No | Creation time |
| updated_at | TIMESTAMP | Auto | No | Last update time |
| last_login | TIMESTAMP | No | No | Last login time |

**Bold** = New fields added in this update

## 🚀 Deployment Checklist

- [ ] 1. Review all changes in pull request
- [ ] 2. Run full test suite (pytest for backend)
- [ ] 3. Apply database migration to staging environment
- [ ] 4. Test user registration with new fields
- [ ] 5. Test company filtering functionality
- [ ] 6. Test batch operations
- [ ] 7. Verify backward compatibility (existing users still work)
- [ ] 8. Review security (authorization, validation)
- [ ] 9. Apply migration to production database
- [ ] 10. Deploy updated backend code
- [ ] 11. Deploy updated frontend code
- [ ] 12. Monitor for issues
- [ ] 13. Update API documentation

## 📞 Support

For questions or issues:
1. Check IMPLEMENTATION_SUMMARY.md for technical details
2. Check VERIFICATION_CHECKLIST.md for validation steps
3. Review test files for usage examples
4. Check commit history for detailed changes

## 🎉 What's Next?

This update lays the foundation for:
- Multi-tenant architecture (ABB, MineCor, AT&T separation)
- Company-specific dashboards
- Advanced user analytics
- Role-based data access by company
- User import/export by company

Happy coding! 🚀
