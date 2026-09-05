from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.session import SessionLocal
from app.services.bootstrap import ensure_initial_data


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.uploads_path.mkdir(parents=True, exist_ok=True)
    with SessionLocal() as db:
        ensure_initial_data(db)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="REST API системы StudentPlan: роли, группы, семестровое расписание и задания",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"name": settings.app_name, "docs": "/docs"}
