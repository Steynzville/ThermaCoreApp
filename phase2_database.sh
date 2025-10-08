#!/usr/bin/env bash
set -e
echo "🔧 Phase 2: Database Connectivity"

if grep -q "services:" docker-compose.yml; then
  yq eval '.services.db.healthcheck.test = ["CMD-SHELL", "pg_isready -U postgres"]' -i docker-compose.yml
fi

grep -q "OperationalError" app/db.py || cat >> app/db.py <<'EOF'

# Phase 2 patch: add connection retry
import time
from sqlalchemy.exc import OperationalError
for i in range(3):
    try:
        engine = create_engine(os.getenv("DATABASE_URL"))
        break
    except OperationalError:
        print(f"Retry DB connection ({i+1}/3)")
        time.sleep(2)
EOF

git add docker-compose.yml app/db.py
git commit -m "Phase 2: Add DB healthcheck and retry logic" || echo "No changes"
