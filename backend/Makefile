install:
	python3 -m venv .venv
	. .venv/bin/activate && python -m pip install -U pip && python -m pip install -r requirements.txt

migrate:
	. .venv/bin/activate && alembic upgrade head

seed:
	. .venv/bin/activate && python -m app.seed

dev:
	. .venv/bin/activate && python -m uvicorn app.main:app --reload

test:
	. .venv/bin/activate && PYTHONPATH=. pytest
