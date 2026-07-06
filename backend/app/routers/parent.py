from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.database import get_db
from app.models import AttemptStatus, TestAttempt, User, UserRole
from app.schemas import ParentChildProgress, UserResponse

router = APIRouter(prefix="/parent", tags=["parent"])


@router.get("/children", response_model=list[UserResponse])
def list_children(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PARENT)),
):
    return db.query(User).filter(User.parent_id == user.id, User.role == UserRole.STUDENT).all()


@router.get("/progress", response_model=list[ParentChildProgress])
def children_progress(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PARENT)),
):
    children = db.query(User).filter(User.parent_id == user.id, User.role == UserRole.STUDENT).all()
    results: list[ParentChildProgress] = []

    for child in children:
        attempts = (
            db.query(TestAttempt)
            .filter(
                TestAttempt.student_id == child.id,
                TestAttempt.status == AttemptStatus.SUBMITTED,
            )
            .order_by(TestAttempt.submitted_at.desc())
            .all()
        )
        scores = [a.total_score for a in attempts if a.total_score is not None]
        avg = sum(scores) / len(scores) if scores else None

        results.append(
            ParentChildProgress(
                student=UserResponse.model_validate(child),
                total_attempts=len(attempts),
                average_score=avg,
                recent_scores=scores[:5],
            )
        )

    return results
