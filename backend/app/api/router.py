from fastapi import APIRouter

from app.api.routes import auth, groups, health, lessons, schedule, semesters, tasks, users

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(groups.router)
api_router.include_router(users.router)
api_router.include_router(semesters.router)
api_router.include_router(lessons.router)
api_router.include_router(schedule.router)
api_router.include_router(tasks.router)
