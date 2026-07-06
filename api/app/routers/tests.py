from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, require_roles
from app.database import get_db
from app.models import (
    AttemptAnswer,
    AttemptStatus,
    Batch,
    Enrollment,
    Question,
    Test,
    TestAssignment,
    TestAttempt,
    TestQuestion,
    User,
    UserRole,
)
from app.schemas import (
    AnswerUpdate,
    AttemptResultResponse,
    AttemptStartResponse,
    TestAssignmentCreate,
    TestAssignmentResponse,
    TestCreate,
    TestResponse,
)
from app.services.grading import (
    build_question_order,
    build_review_payload,
    create_test_with_questions,
    grade_attempt,
    save_answers,
)

router = APIRouter(prefix="/tests", tags=["tests"])


@router.get("/tutor-stats")
def tutor_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    question_count = db.query(Question).filter(Question.created_by_id == user.id, Question.is_active.is_(True)).count()
    test_count = db.query(Test).filter(Test.created_by_id == user.id).count()
    submission_count = (
        db.query(TestAttempt)
        .join(TestAssignment)
        .join(Test)
        .filter(Test.created_by_id == user.id, TestAttempt.status == AttemptStatus.SUBMITTED)
        .count()
    )
    recent_submissions = (
        db.query(TestAttempt)
        .join(TestAssignment)
        .join(Test)
        .filter(Test.created_by_id == user.id, TestAttempt.status == AttemptStatus.SUBMITTED)
        .options(
            joinedload(TestAttempt.student),
            joinedload(TestAttempt.assignment).joinedload(TestAssignment.test),
        )
        .order_by(TestAttempt.submitted_at.desc().nullslast())
        .limit(10)
        .all()
    )
    batch_count = db.query(Enrollment).join(Batch).filter(Batch.created_by_id == user.id).count()

    return {
        "question_count": question_count,
        "test_count": test_count,
        "submission_count": submission_count,
        "enrolled_students": batch_count,
        "recent_submissions": [
            {
                "attempt_id": str(s.id),
                "student_name": s.student.full_name,
                "test_title": s.assignment.test.title,
                "total_score": s.total_score,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            }
            for s in recent_submissions
        ],
    }


@router.get("/my-history")
def my_history(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    rows = (
        db.query(TestAttempt)
        .filter(TestAttempt.student_id == user.id)
        .options(
            joinedload(TestAttempt.assignment).joinedload(TestAssignment.test),
            joinedload(TestAttempt.assignment).joinedload(TestAssignment.batch),
        )
        .order_by(TestAttempt.submitted_at.desc().nullslast(), TestAttempt.server_started_at.desc())
        .all()
    )
    return [
        {
            "attempt_id": str(a.id),
            "test_title": a.assignment.test.title,
            "batch_name": a.assignment.batch.name,
            "status": a.status.value,
            "total_score": a.total_score,
            "subject_breakdown": a.subject_breakdown,
            "rank_in_batch": a.rank_in_batch,
            "started_at": a.server_started_at.isoformat(),
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
        }
        for a in rows
    ]


def _test_response(test: Test) -> TestResponse:
    return TestResponse(
        id=test.id,
        title=test.title,
        description=test.description,
        duration_minutes=test.duration_minutes,
        marks_per_question=test.marks_per_question,
        negative_marking=test.negative_marking,
        randomize_order=test.randomize_order,
        show_review_after_submit=test.show_review_after_submit,
        question_count=len(test.questions),
    )


@router.post("", response_model=TestResponse)
def create_test(
    payload: TestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    if not payload.question_ids and not payload.auto_generate:
        raise HTTPException(status_code=400, detail="Provide question_ids or auto_generate rules")

    test = create_test_with_questions(db, payload, user.id)
    return _test_response(test)


@router.get("", response_model=list[TestResponse])
def list_tests(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    tests = db.query(Test).options(joinedload(Test.questions)).order_by(Test.created_at.desc()).all()
    return [_test_response(t) for t in tests]


@router.put("/{test_id}", response_model=TestResponse)
def update_test(
    test_id: UUID,
    payload: TestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    test = db.get(Test, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    test.title = payload.title
    test.description = payload.description
    test.duration_minutes = payload.duration_minutes
    test.marks_per_question = payload.marks_per_question
    test.negative_marking = payload.negative_marking
    test.randomize_order = payload.randomize_order
    test.show_review_after_submit = payload.show_review_after_submit

    # Replace questions if provided
    if payload.question_ids or payload.auto_generate:
        db.query(TestQuestion).filter(TestQuestion.test_id == test.id).delete()
        questions: list[Question] = []
        if payload.question_ids:
            questions = db.query(Question).filter(Question.id.in_(payload.question_ids)).all()
        elif payload.auto_generate:
            from app.services.grading import pick_auto_questions
            questions = pick_auto_questions(db, payload.auto_generate)
        for index, q in enumerate(questions):
            db.add(TestQuestion(test_id=test.id, question_id=q.id, sort_order=index))

    db.commit()
    db.refresh(test)
    return _test_response(test)


@router.post("/assignments", response_model=TestAssignmentResponse)
def assign_test(
    payload: TestAssignmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    if payload.end_at <= payload.start_at:
        raise HTTPException(status_code=400, detail="end_at must be after start_at")

    assignment = TestAssignment(**payload.model_dump(), created_by_id=user.id)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/my-assignments")
def my_assignments(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    rows = (
        db.query(TestAssignment)
        .join(Enrollment, Enrollment.batch_id == TestAssignment.batch_id)
        .filter(Enrollment.student_id == user.id)
        .options(joinedload(TestAssignment.test))
        .order_by(TestAssignment.start_at.desc())
        .all()
    )
    now = datetime.now(timezone.utc)
    return [
        {
            "id": str(a.id),
            "test_title": a.test.title,
            "start_at": a.start_at,
            "end_at": a.end_at,
            "status": "open" if a.start_at <= now <= a.end_at else ("upcoming" if now < a.start_at else "closed"),
        }
        for a in rows
    ]


@router.post("/attempts/start", response_model=AttemptStartResponse)
def start_attempt(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    assignment = (
        db.query(TestAssignment)
        .options(
            joinedload(TestAssignment.test)
            .joinedload(Test.questions)
            .joinedload(TestQuestion.question)
        )
        .filter(TestAssignment.id == assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    now = datetime.now(timezone.utc)
    if not (assignment.start_at <= now <= assignment.end_at):
        raise HTTPException(status_code=400, detail="Test is not open")

    enrolled = (
        db.query(Enrollment)
        .filter(Enrollment.batch_id == assignment.batch_id, Enrollment.student_id == user.id)
        .first()
    )
    if not enrolled:
        raise HTTPException(status_code=403, detail="Not enrolled in this batch")

    existing = (
        db.query(TestAttempt)
        .filter(TestAttempt.assignment_id == assignment_id, TestAttempt.student_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Attempt already exists")

    test = assignment.test
    order = build_question_order(test, test.randomize_order)
    deadline = now + timedelta(minutes=test.duration_minutes)

    attempt = TestAttempt(
        assignment_id=assignment_id,
        student_id=user.id,
        server_started_at=now,
        server_deadline_at=deadline,
        question_order=order,
    )
    db.add(attempt)
    db.flush()

    question_map = {str(tq.question_id): tq.question for tq in test.questions}
    for qid in order:
        question = question_map[qid]
        db.add(AttemptAnswer(attempt_id=attempt.id, question_id=question.id))

    db.commit()
    db.refresh(attempt)

    questions = [
        {
            "id": qid,
            "subject": question_map[qid].subject.value,
            "topic": question_map[qid].topic,
            "stem": question_map[qid].stem,
            "options": question_map[qid].options,
        }
        for qid in order
    ]

    return AttemptStartResponse(
        attempt_id=attempt.id,
        server_deadline_at=attempt.server_deadline_at,
        questions=questions,
    )


@router.patch("/attempts/{attempt_id}/answers")
def update_answers(
    attempt_id: UUID,
    updates: list[AnswerUpdate],
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    attempt = db.get(TestAttempt, attempt_id)
    if not attempt or attempt.student_id != user.id:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Attempt already submitted")

    try:
        save_answers(db, attempt, updates)
    except ValueError as exc:
        grade_attempt(db, attempt)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"ok": True, "server_deadline_at": attempt.server_deadline_at}


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptResultResponse)
def submit_attempt(
    attempt_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    attempt = (
        db.query(TestAttempt)
        .options(joinedload(TestAttempt.assignment).joinedload(TestAssignment.test))
        .filter(TestAttempt.id == attempt_id, TestAttempt.student_id == user.id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == AttemptStatus.SUBMITTED:
        return AttemptResultResponse(
            attempt_id=attempt.id,
            status=attempt.status,
            total_score=attempt.total_score,
            subject_breakdown=attempt.subject_breakdown,
            rank_in_batch=attempt.rank_in_batch,
            review=build_review_payload(db, attempt),
        )

    graded = grade_attempt(db, attempt)
    return AttemptResultResponse(
        attempt_id=graded.id,
        status=graded.status,
        total_score=graded.total_score,
        subject_breakdown=graded.subject_breakdown,
        rank_in_batch=graded.rank_in_batch,
        review=build_review_payload(db, graded),
    )


@router.get("/attempts/{attempt_id}/result", response_model=AttemptResultResponse)
def attempt_result(
    attempt_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    attempt = db.get(TestAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if user.role == UserRole.STUDENT and attempt.student_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user.role == UserRole.PARENT:
        child = db.get(User, attempt.student_id)
        if not child or child.parent_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    return AttemptResultResponse(
        attempt_id=attempt.id,
        status=attempt.status,
        total_score=attempt.total_score,
        subject_breakdown=attempt.subject_breakdown,
        rank_in_batch=attempt.rank_in_batch,
        review=build_review_payload(db, attempt) if attempt.status == AttemptStatus.SUBMITTED else None,
    )
