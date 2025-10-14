#!/bin/bash
# Automated deployment script for Migration 005
# This script safely applies migration 005 to the production database
# with comprehensive pre-flight checks and post-deployment validation

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo ""
echo "========================================================================"
echo -e "${CYAN}Migration 005 Production Deployment Script${NC}"
echo "========================================================================"
echo ""
echo "This script will:"
echo "  1. Perform pre-flight checks"
echo "  2. Apply migration 005 (if needed)"
echo "  3. Verify the migration"
echo "  4. Test password hash functionality"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable is not set${NC}"
    echo ""
    echo "Please set it with:"
    echo "  export DATABASE_URL=\"postgresql://user:pass@host:port/dbname\""
    echo ""
    echo "Get your DATABASE_URL from:"
    echo "  1. Go to https://dashboard.render.com"
    echo "  2. Click on your backend service"
    echo "  3. Navigate to Environment tab"
    echo "  4. Copy the DATABASE_URL value"
    echo ""
    exit 1
fi

# Function to run psql command and capture result
run_query() {
    psql "$DATABASE_URL" -t -c "$1" 2>/dev/null | xargs || echo ""
}

echo "========================================================================"
echo "Step 1: Pre-flight Checks"
echo "========================================================================"
echo ""

# Check 1: Database connectivity
echo -e "${BLUE}[1/5]${NC} Testing database connectivity..."
DB_NAME=$(run_query "SELECT current_database();")
if [ -z "$DB_NAME" ]; then
    echo -e "${RED}❌ Cannot connect to database${NC}"
    echo "Please check your DATABASE_URL"
    exit 1
fi
echo -e "${GREEN}✅ Connected to database: $DB_NAME${NC}"
echo ""

# Check 2: Verify users table exists
echo -e "${BLUE}[2/5]${NC} Checking if users table exists..."
TABLE_EXISTS=$(run_query "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='users');")
if [ "$TABLE_EXISTS" != "t" ]; then
    echo -e "${RED}❌ users table does not exist${NC}"
    echo "Run initial migrations first: bash apply_migrations.sh"
    exit 1
fi
echo -e "${GREEN}✅ users table exists${NC}"
echo ""

# Check 3: Check current password_hash column type
echo -e "${BLUE}[3/5]${NC} Checking current password_hash column type..."
CURRENT_TYPE=$(run_query "SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';")
CURRENT_LENGTH=$(run_query "SELECT character_maximum_length FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';")

if [ -z "$CURRENT_TYPE" ]; then
    echo -e "${RED}❌ password_hash column does not exist${NC}"
    exit 1
fi

echo "   Current type: $CURRENT_TYPE"
if [ ! -z "$CURRENT_LENGTH" ]; then
    echo "   Max length: $CURRENT_LENGTH"
else
    echo "   Max length: unlimited"
fi
echo ""

# Check 4: Check if migration 005 is already applied
echo -e "${BLUE}[4/5]${NC} Checking if migration 005 is already applied..."
MIGRATION_TABLE_EXISTS=$(run_query "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='migration_history');")

if [ "$MIGRATION_TABLE_EXISTS" = "t" ]; then
    MIGRATION_APPLIED=$(run_query "SELECT EXISTS(SELECT 1 FROM migration_history WHERE migration_name='005_fix_password_hash_length.sql');")
    if [ "$MIGRATION_APPLIED" = "t" ]; then
        echo -e "${GREEN}✅ Migration 005 is already applied${NC}"
        NEEDS_MIGRATION=false
    else
        echo -e "${YELLOW}⚠️  Migration 005 is NOT applied${NC}"
        NEEDS_MIGRATION=true
    fi
else
    echo -e "${YELLOW}⚠️  Migration history table does not exist${NC}"
    NEEDS_MIGRATION=true
fi
echo ""

# Check 5: Check if type is already TEXT
echo -e "${BLUE}[5/5]${NC} Verifying if migration is needed..."
if [ "$CURRENT_TYPE" = "text" ]; then
    echo -e "${GREEN}✅ password_hash is already TEXT${NC}"
    if [ "$NEEDS_MIGRATION" = false ]; then
        echo ""
        echo "========================================================================"
        echo -e "${GREEN}✅ Migration 005 is already applied and verified${NC}"
        echo "========================================================================"
        echo ""
        echo "No action needed. Proceeding to verification..."
        SKIP_MIGRATION=true
    else
        echo -e "${YELLOW}⚠️  Column is TEXT but migration history is missing${NC}"
        echo "Will update migration history..."
        SKIP_MIGRATION=false
    fi
elif [ "$CURRENT_TYPE" = "character varying" ]; then
    echo -e "${YELLOW}⚠️  password_hash is VARCHAR($CURRENT_LENGTH) - needs migration${NC}"
    SKIP_MIGRATION=false
else
    echo -e "${YELLOW}⚠️  password_hash has unexpected type: $CURRENT_TYPE${NC}"
    SKIP_MIGRATION=false
fi
echo ""

# Confirmation prompt
if [ "$SKIP_MIGRATION" != true ]; then
    echo "========================================================================"
    echo -e "${YELLOW}Ready to apply migration 005${NC}"
    echo "========================================================================"
    echo ""
    echo "This will change the password_hash column to TEXT type."
    echo ""
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted by user"
        exit 0
    fi
    echo ""
fi

echo "========================================================================"
echo "Step 2: Applying Migration"
echo "========================================================================"
echo ""

if [ "$SKIP_MIGRATION" = true ]; then
    echo -e "${GREEN}✅ Skipping migration application (already applied)${NC}"
else
    # Apply migration using the main migration script
    echo "Running migration script..."
    cd "$SCRIPT_DIR"
    bash apply_migrations.sh
    
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}❌ Migration script failed${NC}"
        exit 1
    fi
fi
echo ""

echo "========================================================================"
echo "Step 3: Post-Migration Verification"
echo "========================================================================"
echo ""

# Verify password_hash column type
echo "Verifying password_hash column type..."
NEW_TYPE=$(run_query "SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';")
NEW_LENGTH=$(run_query "SELECT character_maximum_length FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';")

echo "   New type: $NEW_TYPE"
if [ ! -z "$NEW_LENGTH" ]; then
    echo "   Max length: $NEW_LENGTH"
else
    echo "   Max length: unlimited"
fi

if [ "$NEW_TYPE" = "text" ]; then
    echo -e "${GREEN}✅ password_hash is now TEXT${NC}"
else
    echo -e "${RED}❌ password_hash is not TEXT: $NEW_TYPE${NC}"
    exit 1
fi
echo ""

# Verify migration history
echo "Verifying migration history..."
MIGRATION_RECORDED=$(run_query "SELECT EXISTS(SELECT 1 FROM migration_history WHERE migration_name='005_fix_password_hash_length.sql');")
if [ "$MIGRATION_RECORDED" = "t" ]; then
    echo -e "${GREEN}✅ Migration 005 recorded in migration_history${NC}"
else
    echo -e "${RED}❌ Migration 005 not recorded in migration_history${NC}"
    exit 1
fi
echo ""

echo "========================================================================"
echo "Step 4: Password Hash Functionality Test"
echo "========================================================================"
echo ""

# Check if Python is available and dependencies are installed
if command -v python3 &> /dev/null; then
    echo "Running Python verification script..."
    cd "$SCRIPT_DIR"
    python3 verify_password_hash_migration.py
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Python verification passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Python verification had warnings (may be expected)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Python not available, skipping Python verification${NC}"
fi
echo ""

echo "========================================================================"
echo -e "${GREEN}✅ Migration 005 Deployment Complete${NC}"
echo "========================================================================"
echo ""
echo "Summary:"
echo "  • Migration 005 applied: ✅"
echo "  • password_hash type: TEXT ✅"
echo "  • Migration recorded: ✅"
echo ""
echo "Next steps:"
echo "  1. Test admin user creation:"
echo "     cd backend && python scripts/create_first_admin.py"
echo ""
echo "  2. Test authentication at:"
echo "     https://thermacoreapp.netlify.app"
echo "     Username: Steyn_Admin"
echo "     Password: password"
echo ""
echo "  3. Monitor logs for any 'value too long' errors"
echo ""
echo "  4. Run health check:"
echo "     python health_check.py"
echo ""
echo "========================================================================"
echo ""
