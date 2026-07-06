from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models import AttemptStatus, Difficulty, Subject, UserRole


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str | None = None


class UserCreate(UserBase):
    password: str = Field(min_length=8)
    role: UserRole = UserRole.STUDENT
    parent_id: UUID | None = None


class UserResponse(UserBase):
    id: UUID
    role: UserRole
    parent_id: UUID | None
    is_active: bool

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class QuestionCreate(BaseModel):
    subject: Subject
    topic: str
    difficulty: Difficulty
    past_paper_year: int | None = None
    stem: str
    options: dict[str, str]
    correct_option: str
    explanation: str | None = None


class QuestionResponse(QuestionCreate):
    id: UUID
    is_active: bool

    model_config = {"from_attributes": True}


class QuestionFilter(BaseModel):
    subject: Subject | None = None
    topic: str | None = None
    difficulty: Difficulty | None = None
    past_paper_year: int | None = None


class BatchCreate(BaseModel):
    name: str
    description: str | None = None


class BatchResponse(BatchCreate):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class EnrollmentCreate(BaseModel):
    student_id: UUID


class AutoGenerateRules(BaseModel):
    subject: Subject
    count: int = Field(ge=1, le=200)
    difficulty: Difficulty | None = None


class TestCreate(BaseModel):
    title: str
    description: str | None = None
    duration_minutes: int = 150
    marks_per_question: float = 1.0
    negative_marking: float = -0.25
    randomize_order: bool = True
    show_review_after_submit: bool = True
    question_ids: list[UUID] | None = None
    auto_generate: list[AutoGenerateRules] | None = None


class TestResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    duration_minutes: int
    marks_per_question: float
    negative_marking: float
    randomize_order: bool
    show_review_after_submit: bool
    question_count: int

    model_config = {"from_attributes": True}


class TestAssignmentCreate(BaseModel):
    test_id: UUID
    batch_id: UUID
    start_at: datetime
    end_at: datetime


class TestAssignmentResponse(TestAssignmentCreate):
    id: UUID
    notify_sent: bool

    model_config = {"from_attributes": True}


class ParentChildProgress(BaseModel):
    student: UserResponse
    total_attempts: int
    average_score: float | None
    recent_scores: list[float]


class HealthResponse(BaseModel):
    status: str
    service: str


class AttemptStartResponse(BaseModel):
    attempt_id: UUID
    server_deadline_at: datetime
    questions: list[dict]


class AnswerUpdate(BaseModel):
    question_id: UUID
    selected_option: str | None = None
    marked_for_review: bool = False


class AttemptResultResponse(BaseModel):
    attempt_id: UUID
    status: AttemptStatus
    total_score: float | None
    subject_breakdown: dict | None
    rank_in_batch: int | None
    review: list[dict] | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None


class AdminUserUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
    parent_id: UUID | None = None


class WeakTopic(BaseModel):
    topic: str
    subject: Subject
    total: int
    correct: int
    accuracy: float


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)
