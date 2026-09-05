.PHONY: up down logs test migrate reset

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

test:
	docker compose run --rm backend pytest

migrate:
	docker compose run --rm backend alembic upgrade head

reset:
	docker compose down -v
