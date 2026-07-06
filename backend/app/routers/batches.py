from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.database import get_db
from app.models import Batch, Enrollment, User, UserRole
from app.schemas import BatchCreate, BatchResponse, EnrollmentCreate, UserResponse

router = APIRouter(prefix="/batches", tags=["batches"])


@router.get("", response_model=list[BatchResponse])
def list_batches(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    return db.query(Batch).order_by(Batch.created_at.desc()).all()


@router.post("", response_model=BatchResponse)
def create_batch(
    payload: BatchCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    batch = Batch(**payload.model_dump(), created_by_id=user.id)
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.post("/{batch_id}/enroll", response_model=UserResponse)
def enroll_student(
    batch_id: UUID,
    payload: EnrollmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    student = db.get(User, payload.student_id)
    if not student or student.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="Invalid student")

    exists = (
        db.query(Enrollment)
        .filter(Enrollment.batch_id == batch_id, Enrollment.student_id == payload.student_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Student already enrolled")

    db.add(Enrollment(batch_id=batch_id, student_id=payload.student_id))
    db.commit()
    return student


@router.get("/{batch_id}/students", response_model=list[UserResponse])
def batch_students(
    batch_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    rows = (
        db.query(User)
        .join(Enrollment, Enrollment.student_id == User.id)
        .filter(Enrollment.batch_id == batch_id)
        .all()
    )
    return rows
