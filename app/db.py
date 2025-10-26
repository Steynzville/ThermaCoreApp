
# Phase 2 patch: add connection retry
import os
import time
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
for i in range(3):
    try:
        engine = create_engine(os.getenv("DATABASE_URL"))
        break
    except OperationalError:
        print(f"Retry DB connection ({i+1}/3)")
        time.sleep(2)
