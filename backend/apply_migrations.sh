#!/bin/bash
# Script to apply all database migrations in order
# This ensures the database schema is up-to-date with all changes

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable is not set${NC}"
    echo "Please set it with: export DATABASE_URL=\"postgresql://user:pass@host:port/dbname\""
    exit 1
fi

echo "=========================================="
echo "ThermaCore Database Migration Tool"
echo "=========================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}❌ ERROR: Migrations directory not found at $MIGRATIONS_DIR${NC}"
    exit 1
fi

# List of migrations in order
MIGRATIONS=(
    "001_initial_schema.sql"
    "002_seed_data.sql"
    "003_update_rbac_security.sql"
    "004_fix_null_roles.sql"
    "005_fix_password_hash_length.sql"
)

echo "Found ${#MIGRATIONS[@]} migrations to check"
echo ""

# Check which migrations have been applied
echo "Checking current database state..."
echo ""

# Function to check if a migration marker exists
check_migration_applied() {
    local migration_name=$1
    psql "$DATABASE_URL" -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='migration_history');" | grep -q t
    if [ $? -eq 0 ]; then
        psql "$DATABASE_URL" -t -c "SELECT EXISTS(SELECT 1 FROM migration_history WHERE migration_name='$migration_name');" | grep -q t
        return $?
    fi
    return 1
}

# Create migration tracking table if it doesn't exist
echo "Ensuring migration tracking table exists..."
psql "$DATABASE_URL" << 'EOF'
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration tracking table ready${NC}"
else
    echo -e "${RED}❌ Failed to create migration tracking table${NC}"
    exit 1
fi
echo ""

# Apply migrations
for migration in "${MIGRATIONS[@]}"; do
    migration_path="$MIGRATIONS_DIR/$migration"
    
    if [ ! -f "$migration_path" ]; then
        echo -e "${YELLOW}⚠️  Warning: Migration file not found: $migration${NC}"
        continue
    fi
    
    # Check if already applied
    if check_migration_applied "$migration"; then
        echo -e "${GREEN}✓${NC} $migration (already applied)"
    else
        echo -e "${YELLOW}➤${NC} Applying $migration..."
        
        # Apply the migration
        if psql "$DATABASE_URL" -f "$migration_path"; then
            # Mark as applied
            psql "$DATABASE_URL" -c "INSERT INTO migration_history (migration_name) VALUES ('$migration') ON CONFLICT (migration_name) DO NOTHING;"
            echo -e "${GREEN}✅ $migration applied successfully${NC}"
        else
            echo -e "${RED}❌ Failed to apply $migration${NC}"
            echo "Migration failed. Please check the error above and fix any issues."
            exit 1
        fi
    fi
    echo ""
done

echo "=========================================="
echo -e "${GREEN}✅ All migrations completed successfully${NC}"
echo "=========================================="
echo ""

# Verify critical schema changes
echo "Verifying database schema..."
echo ""

# Check if users table exists
echo "Checking if users table exists..."
TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='users');")
TABLE_EXISTS=$(echo "$TABLE_EXISTS" | xargs)  # Trim whitespace

if [ "$TABLE_EXISTS" = "t" ]; then
    echo -e "${GREEN}✅ users table exists${NC}"
    
    # Check if password_hash column exists
    echo "Checking if password_hash column exists..."
    COLUMN_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash');")
    COLUMN_EXISTS=$(echo "$COLUMN_EXISTS" | xargs)  # Trim whitespace
    
    if [ "$COLUMN_EXISTS" = "t" ]; then
        echo -e "${GREEN}✅ password_hash column exists${NC}"
        
        # Check password_hash column type
        echo "Checking password_hash column type..."
        PASSWORD_HASH_TYPE=$(psql "$DATABASE_URL" -t -c "SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';")
        PASSWORD_HASH_TYPE=$(echo "$PASSWORD_HASH_TYPE" | xargs)  # Trim whitespace
        
        if [ "$PASSWORD_HASH_TYPE" = "text" ]; then
            echo -e "${GREEN}✅ password_hash is TEXT (correct)${NC}"
        else
            echo -e "${RED}❌ password_hash is $PASSWORD_HASH_TYPE (should be TEXT)${NC}"
            echo "Migration 005 may not have been applied correctly."
        fi
    else
        echo -e "${RED}❌ password_hash column does not exist${NC}"
        echo "Database schema may be incomplete."
    fi
else
    echo -e "${RED}❌ users table does not exist${NC}"
    echo "Database has not been initialized. Run migrations first."
fi

echo ""
echo "Migration summary:"
psql "$DATABASE_URL" -c "SELECT migration_name, applied_at FROM migration_history ORDER BY applied_at;"

echo ""
echo "Done! Your database is now up to date."
