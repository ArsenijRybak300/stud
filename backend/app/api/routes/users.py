from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db, require_admin
from app.core.security import hash_password
from app.models.group import StudyGroup
from app.models.user import User, UserRole
from app.schemas.user import UserAdminCreate, UserAdminUpdate, UserRead

router = APIRouter(prefix="/users", tags=["Пользователи"])


def serialize(user: User) -> UserRead:
    return UserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        group_id=user.group_id,
        group_code=user.group.code if user.group else None,
        is_active=user.is_active,
        created_at=user.created_at,
    )


def validate_group(db: Session, role: UserRole, group_id: int | None) -> None:
    if role == UserRole.student and group_id is None:
        raise HTTPException(status_code=422, detail="Для студента необходимо выбрать группу")
    if group_id is not None and db.get(StudyGroup, group_id) is None:
        raise HTTPException(status_code=422, detail="Учебная группа не найдена")


@router.get("", response_model=list[UserRead])
def list_users(
    group_id: int | None = Query(default=None),
    role: UserRole | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    stmt = select(User).options(selectinload(User.group)).order_by(User.full_name)
    if group_id is not None:
        stmt = stmt.where(User.group_id == group_id)
    if role is not None:
        stmt = stmt.where(User.role == role)
    return [serialize(user) for user in db.scalars(stmt).all()]


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserAdminCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует")
    validate_group(db, payload.role, payload.group_id)
    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        group_id=payload.group_id if payload.role == UserRole.student else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return serialize(user)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserAdminUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    data = payload.model_dump(exclude_unset=True)
    role = data.get("role", user.role)
    group_id = data.get("group_id", user.group_id)
    validate_group(db, role, group_id)
    if user.id == admin.id and data.get("is_active") is False:
        raise HTTPException(status_code=422, detail="Нельзя отключить собственную учетную запись")
    password = data.pop("password", None)
    if password:
        user.hashed_password = hash_password(password)
    for field, value in data.items():
        setattr(user, field, value)
    if user.role == UserRole.admin:
        user.group_id = None
    db.commit()
    db.refresh(user)
    return serialize(user)
