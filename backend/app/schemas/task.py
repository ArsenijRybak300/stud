from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    group_id: int
    title: str = Field(min_length=2, max_length=200)
    max_score: int = Field(default=100, ge=1, le=1000)
    description: str | None = Field(default=None, max_length=10000)
    subject: str | None = Field(default=None, max_length=160)
    due_at: datetime | None = None
    priority: TaskPriority = TaskPriority.medium


class TaskUpdate(BaseModel):
    group_id: int | None = None
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    subject: str | None = Field(default=None, max_length=160)
    due_at: datetime | None = None
    priority: TaskPriority | None = None


class FileRead(BaseModel):
    id: int
    original_name: str
    content_type: str | None
    size_bytes: int
    created_at: datetime
    download_url: str


class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class CommentRead(BaseModel):
    id: int
    author_id: int
    author_name: str
    text: str
    created_at: datetime


class SubmissionRead(BaseModel):
    id: int
    task_id: int
    student_id: int
    student_name: str
    student_email: str
    status: TaskStatus
    score: int | None = None
    started_at: datetime | None
    submitted_at: datetime | None
    completed_at: datetime | None
    updated_at: datetime
    files: list[FileRead] = []
    comments: list[CommentRead] = []


class TaskRead(BaseModel):
    id: int
    group_id: int
    group_code: str
    title: str
    max_score: int
    description: str | None
    subject: str | None
    due_at: datetime | None
    priority: TaskPriority
    created_by_id: int
    created_by_name: str
    created_at: datetime
    updated_at: datetime
    attachments: list[FileRead] = []
    my_submission: SubmissionRead | None = None
    submissions_total: int = 0
    submitted_count: int = 0
    completed_count: int = 0


class TaskDetail(TaskRead):
    submissions: list[SubmissionRead] = []
