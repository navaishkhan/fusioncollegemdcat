from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, require_roles
from app.database import get_db
from app.models import Difficulty, Question, QuestionReview, Subject, User, UserRole
from app.schemas import QuestionCreate, QuestionResponse, QuestionReviewCreate, QuestionReviewResponse
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


@router.post("/{question_id}/review", response_model=QuestionReviewResponse)
def create_question_review(
    question_id: UUID,
    payload: QuestionReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    """Students can request a review of a question they believe is incorrect."""
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if student already has a pending review for this question
    existing = db.query(QuestionReview).filter(
        QuestionReview.student_id == user.id,
        QuestionReview.question_id == question_id,
        QuestionReview.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending review for this question")
    
    review = QuestionReview(
        student_id=user.id,
        question_id=question_id,
        reason=payload.reason,
        status="pending"
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/reviews/my")
def get_my_reviews(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    """Students can view their own question reviews."""
    reviews = db.query(QuestionReview).filter(
        QuestionReview.student_id == user.id
    ).order_by(QuestionReview.created_at.desc()).all()
    return reviews


@router.get("/reviews/pending")
def get_pending_reviews(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    """Admins/tutors can view pending question reviews."""
    reviews = (
        db.query(QuestionReview)
        .filter(QuestionReview.status == "pending")
        .options(
            joinedload(QuestionReview.student),
            joinedload(QuestionReview.question)
        )
        .order_by(QuestionReview.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(r.id),
            "student_id": str(r.student_id),
            "student_name": r.student.full_name,
            "question_id": str(r.question_id),
            "question_stem": r.question.stem,
            "question_subject": r.question.subject.value,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        }
        for r in reviews
    ]


@router.patch("/reviews/{review_id}")
def update_question_review(
    review_id: UUID,
    status: str = Query(description="New status: resolved, rejected"),
    admin_notes: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    """Admins/tutors can resolve or reject question reviews."""
    from datetime import datetime, timezone
    
    review = db.get(QuestionReview, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if status not in ["resolved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'resolved' or 'rejected'")
    
    review.status = status
    review.resolved_at = datetime.now(timezone.utc)
    review.resolved_by_id = user.id
    if admin_notes:
        review.admin_notes = admin_notes
    
    db.commit()
    db.refresh(review)
    return review
