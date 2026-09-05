from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GroupCreate(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    name: str | None = Field(default=None, max_length=160)


class GroupUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=40)
    name: str | None = Field(default=None, max_length=160)
    is_active: bool | None = None


class GroupRead(BaseModel):
    id: int
    code: str
    name: str | None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
