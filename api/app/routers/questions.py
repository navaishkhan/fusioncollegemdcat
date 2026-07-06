from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.database import get_db
from app.models import Difficulty, Question, Subject, User, UserRole
from app.schemas import QuestionCreate, QuestionResponse

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("", response_model=list[QuestionResponse])
def list_questions(
    subject: Subject | None = None,
    topic: str | None = None,
    difficulty: Difficulty | None = None,
    past_paper_year: int | None = None,
    q: str | None = Query(default=None, description="Search in stem/topic"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    query = db.query(Question).filter(Question.is_active.is_(True))
    if subject:
        query = query.filter(Question.subject == subject)
    if topic:
        query = query.filter(Question.topic.ilike(f"%{topic}%"))
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if past_paper_year:
        query = query.filter(Question.past_paper_year == past_paper_year)
    if q:
        query = query.filter(Question.stem.ilike(f"%{q}%"))

    return query.order_by(Question.created_at.desc()).limit(200).all()


@router.post("", response_model=QuestionResponse)
def create_question(
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    question = Question(**payload.model_dump(), created_by_id=user.id)
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: UUID,
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    for field, value in payload.model_dump().items():
        setattr(question, field, value)
    db.commit()
    db.refresh(question)
    return question


@router.post("/bulk", response_model=list[QuestionResponse])
def bulk_create_questions(
    payload: list[QuestionCreate],
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    questions = [Question(**q.model_dump(), created_by_id=user.id) for q in payload]
    db.add_all(questions)
    db.commit()
    for q in questions:
        db.refresh(q)
    return questions


@router.delete("/{question_id}")
def deactivate_question(
    question_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    question.is_active = False
    db.commit()
    return {"ok": True}
