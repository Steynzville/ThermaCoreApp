#!/usr/bin/env bash
set -e
echo "⚙️ Phase 5: CI Optimization and Lint"

pip install pytest-xdist ruff
pytest -n auto
ruff check --fix .
git add .
git commit -m "Phase 5: Parallel testing and lint fixes" || echo "No changes"
