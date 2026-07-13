from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.database import get_db
from app.models import Difficulty, Question, Subject, User, UserRole
from app.schemas import QuestionCreate, QuestionResponse
from app.services.ocr import extract_text_from_image

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


@router.post("/extract-from-image")
async def extract_question_from_image(
    file: UploadFile = File(...),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    """Extracts stem and options from an uploaded image using local OCR."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
        
    image_bytes = await file.read()
    parsed_data = extract_text_from_image(image_bytes)
    return parsed_data



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


@router.post("/purge")
def purge_old_questions(
    created_before: str = Query(description="ISO datetime: deactivate all questions created before this"),
    subject: Subject | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Admin-only: bulk deactivate questions created before a given timestamp."""
    from datetime import datetime, timezone
    try:
        cutoff = datetime.fromisoformat(created_before)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ISO datetime format. Use e.g. 2026-07-07T06:00:00")

    if cutoff.tzinfo is None:
        cutoff = cutoff.replace(tzinfo=timezone.utc)

    query = db.query(Question).filter(
        Question.is_active.is_(True),
        Question.created_at < cutoff,
    )
    if subject:
        query = query.filter(Question.subject == subject)

    count = query.count()
    query.update({"is_active": False}, synchronize_session="fetch")
    db.commit()
    return {"deactivated": count, "filter": {"created_before": created_before, "subject": subject.value if subject else None}}
