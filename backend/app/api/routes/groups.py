from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.group import StudyGroup
from app.models.user import User
from app.schemas.group import GroupCreate, GroupRead, GroupUpdate

router = APIRouter(prefix="/groups", tags=["Учебные группы"])


@router.get("", response_model=list[GroupRead])
def list_groups(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return list(db.scalars(select(StudyGroup).order_by(StudyGroup.code)).all())


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(payload: GroupCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    code = payload.code.strip().upper()
    if db.scalar(select(StudyGroup).where(StudyGroup.code == code)):
        raise HTTPException(status_code=409, detail="Группа с таким кодом уже существует")
    group = StudyGroup(code=code, name=payload.name.strip() if payload.name else None)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.patch("/{group_id}", response_model=GroupRead)
def update_group(group_id: int, payload: GroupUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    group = db.get(StudyGroup, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"]:
        data["code"] = data["code"].strip().upper()
        exists = db.scalar(select(StudyGroup).where(StudyGroup.code == data["code"], StudyGroup.id != group_id))
        if exists:
            raise HTTPException(status_code=409, detail="Группа с таким кодом уже существует")
    for field, value in data.items():
        setattr(group, field, value)
    db.commit()
    db.refresh(group)
    return group
