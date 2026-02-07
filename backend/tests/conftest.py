import importlib
import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    storage_path = tmp_path / "storage"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    monkeypatch.setenv("JWT_ALGORITHM", "HS256")
    monkeypatch.setenv("JWT_EXPIRES_MINUTES", "60")
    monkeypatch.setenv("STORAGE_DIR", str(storage_path))

    import app.core.config as config
    import app.core.deps as deps
    import app.core.security as security
    import app.db as db
    import app.main as main

    importlib.reload(config)
    importlib.reload(db)
    importlib.reload(deps)
    importlib.reload(security)
    importlib.reload(main)

    db.create_all()

    with TestClient(main.app) as client:
        yield client
