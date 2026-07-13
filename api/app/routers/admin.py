from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import cast, case, Integer, func
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.core.security import hash_password
from app.database import get_db
from app.models import AttemptAnswer, AttemptStatus, Batch, PasswordResetRequest, Question, Test, TestAttempt, User, UserRole
from app.schemas import AdminResetPasswordRequest, AdminUserUpdate, PasswordResetRequestResponse, UserResponse, WeakTopic

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserResponse])
def list_users(
    role: UserRole | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    query = db.query(User).order_by(User.created_at.desc())
    if role:
        query = query.filter(User.role == role)
    return query.limit(200).all()


@router.get("/users/search", response_model=list[UserResponse])
def search_users(
    q: str = Query(min_length=1),
    role: UserRole | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    query = db.query(User).filter(
        (User.email.ilike(f"%{q}%")) | (User.full_name.ilike(f"%{q}%"))
    )
    if role:
        query = query.filter(User.role == role)
    return query.limit(20).all()


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.parent_id is not None:
        parent = db.get(User, payload.parent_id)
        if not parent or parent.role != UserRole.PARENT:
            raise HTTPException(status_code=400, detail="Invalid parent")
        user.parent_id = payload.parent_id
    db.commit()
    db.refresh(user)
    return user


@router.get("/password-reset-requests")
def list_password_reset_requests(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    requests = (
        db.query(PasswordResetRequest)
        .filter(PasswordResetRequest.status == "pending")
        .order_by(PasswordResetRequest.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(r.id),
            "user_id": str(r.user_id),
            "status": r.status,
            "created_at": r.created_at.isoformat(),
            "user_name": r.user.full_name,
            "user_email": r.user.email,
        }
        for r in requests
    ]


@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: UUID,
    payload: AdminResetPasswordRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.patch("/password-reset-requests/{req_id}/resolve")
def resolve_password_reset_request(
    req_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    req = db.get(PasswordResetRequest, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "resolved"
    db.commit()
    return {"ok": True}


@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    return {
        "total_users": db.query(User).count(),
        "total_students": db.query(User).filter(User.role == UserRole.STUDENT).count(),
        "total_tutors": db.query(User).filter(User.role == UserRole.TUTOR).count(),
        "total_parents": db.query(User).filter(User.role == UserRole.PARENT).count(),
        "total_questions": db.query(Question).filter(Question.is_active.is_(True)).count(),
        "total_tests": db.query(Test).count(),
        "total_submissions": db.query(TestAttempt).filter(TestAttempt.status == AttemptStatus.SUBMITTED).count(),
        "total_batches": db.query(Batch).count(),
    }


@router.get("/analytics/weak-topics", response_model=list[WeakTopic])
def weak_topics(
    student_id: UUID | None = None,
    min_attempts: int = 3,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    query = (
        db.query(
            Question.topic,
            Question.subject,
            func.count(AttemptAnswer.question_id).label("total"),
            func.sum(
                case((AttemptAnswer.is_correct.is_(True), 1), else_=0)
            ).label("correct"),
        )
        .join(AttemptAnswer, AttemptAnswer.question_id == Question.id)
        .join(TestAttempt, TestAttempt.id == AttemptAnswer.attempt_id)
        .filter(
            AttemptAnswer.is_correct.isnot(None),
            TestAttempt.status == AttemptStatus.SUBMITTED,
        )
    )
    if student_id:
        query = query.filter(TestAttempt.student_id == student_id)

    query = query.group_by(Question.topic, Question.subject).having(
        func.count(AttemptAnswer.question_id) >= min_attempts
    )
    results = query.all()

    return [
        WeakTopic(
            topic=row.topic,
            subject=row.subject,
            total=int(row.total),
            correct=int(row.correct),
            accuracy=round(int(row.correct) / int(row.total) * 100, 1),
        )
        for row in results
    ]


@router.get("/analytics/trends")
def score_trends(
    student_id: UUID | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    query = (
        db.query(
            TestAttempt.submitted_at,
            TestAttempt.total_score,
            Test.title,
            TestAttempt.id,
            User.full_name,
            TestAttempt.subject_breakdown,
        )
        .join(TestAssignment, TestAssignment.id == TestAttempt.assignment_id)
        .join(Test, Test.id == TestAssignment.test_id)
        .join(User, User.id == TestAttempt.student_id)
        .filter(
            TestAttempt.status == AttemptStatus.SUBMITTED,
            TestAttempt.total_score.isnot(None),
        )
    )
    if student_id:
        query = query.filter(TestAttempt.student_id == student_id)

    results = query.order_by(TestAttempt.submitted_at.asc()).limit(50).all()

    return [
        {
            "attempt_id": str(row.id),
            "test_title": row.title,
            "student_name": row.full_name,
            "total_score": float(row.total_score),
            "submitted_at": row.submitted_at.isoformat(),
            "subject_breakdown": row.subject_breakdown,
        }
        for row in results
    ]
