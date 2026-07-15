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
    MarkingMode,
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
    ManualGradeUpdate,
    TestAssignmentCreate,
    TestAssignmentResponse,
    TestCreate,
    TestResponse,
)
from app.services.grading import (
    _update_batch_ranks,
    build_question_order,
    build_review_payload,
    create_test_with_questions,
    grade_attempt,
    save_answers,
)

router = APIRouter(prefix="/tests", tags=["tests"])


def _question_payload(question_map: dict, qid: str) -> dict:
    q = question_map[qid]
    return {
        "id": qid,
        "subject": q.subject.value,
        "topic": q.topic,
        "stem": q.stem,
        "image_url": q.image_url,
        "options": q.options,
    }


def _attempt_result(
    db: Session,
    attempt: TestAttempt,
    *,
    include_review: bool = True,
    reveal_answers: bool = True,
) -> AttemptResultResponse:
    attempt = (
        db.query(TestAttempt)
        .options(
            joinedload(TestAttempt.student),
            joinedload(TestAttempt.assignment).joinedload(TestAssignment.test),
            joinedload(TestAttempt.answers),
        )
        .filter(TestAttempt.id == attempt.id)
        .first()
    )
    test = attempt.assignment.test
    review = (
        build_review_payload(db, attempt, reveal_answers=reveal_answers)
        if include_review and attempt.status == AttemptStatus.SUBMITTED
        else None
    )
    return AttemptResultResponse(
        attempt_id=attempt.id,
        status=attempt.status,
        total_score=attempt.total_score,
        subject_breakdown=attempt.subject_breakdown,
        rank_in_batch=attempt.rank_in_batch,
        review=review,
        student_name=attempt.student.full_name,
        test_title=test.title,
        submitted_at=attempt.submitted_at,
        marking_mode=test.marking_mode,
    )


@router.get("/tutor-stats")
def tutor_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    from app.models import MarkingMode as MM
    
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
    
    pending_manual_grading = (
        db.query(TestAttempt)
        .join(TestAssignment)
        .join(Test)
        .filter(
            Test.created_by_id == user.id,
            Test.marking_mode == MM.MANUAL,
            TestAttempt.status == AttemptStatus.SUBMITTED,
            TestAttempt.total_score.is_(None),
        )
        .count()
    )

    from app.models import QuestionReview

    pending_question_reviews = (
        db.query(QuestionReview)
        .filter(QuestionReview.status == "pending")
        .count()
    )

    return {
        "question_count": question_count,
        "test_count": test_count,
        "submission_count": submission_count,
        "enrolled_students": batch_count,
        "pending_manual_grading": pending_manual_grading,
        "pending_question_reviews": pending_question_reviews,
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
            "batch_name": a.assignment.batch.name if a.assignment.batch else "Deleted Batch",
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
        marking_mode=test.marking_mode,
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
    if user.role == UserRole.TUTOR and test.created_by_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own tests")

    test.title = payload.title
    test.description = payload.description
    test.duration_minutes = payload.duration_minutes
    test.marks_per_question = payload.marks_per_question
    test.negative_marking = payload.negative_marking
    test.randomize_order = payload.randomize_order
    test.show_review_after_submit = payload.show_review_after_submit
    test.marking_mode = payload.marking_mode

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
    now = datetime.now(timezone.utc)
    
    if payload.valid_for_minutes is not None:
        start_at = now
        end_at = now + timedelta(minutes=payload.valid_for_minutes)
    else:
        if payload.start_at is None or payload.end_at is None:
            raise HTTPException(status_code=400, detail="Provide either valid_for_minutes, or both start_at and end_at")
        start_at = payload.start_at
        end_at = payload.end_at

    if end_at <= start_at:
        raise HTTPException(status_code=400, detail="end_at must be after start_at")

    assignment = TestAssignment(
        test_id=payload.test_id,
        batch_id=payload.batch_id,
        start_at=start_at,
        end_at=end_at,
        created_by_id=user.id
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.patch("/assignments/{assignment_id}/close", response_model=TestAssignmentResponse)
def close_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    assignment = db.get(TestAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignment.end_at = datetime.now(timezone.utc)
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


@router.get("/attempts/active")
def active_attempt(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    """Check if student has an in-progress attempt for this assignment."""
    existing = (
        db.query(TestAttempt)
        .filter(
            TestAttempt.assignment_id == assignment_id,
            TestAttempt.student_id == user.id,
        )
        .first()
    )
    if not existing:
        return {"active": False}

    if existing.status != AttemptStatus.IN_PROGRESS:
        return {
            "active": False,
            "submitted": True,
            "attempt_id": str(existing.id),
        }

    now = datetime.now(timezone.utc)
    if now >= existing.server_deadline_at:
        grade_attempt(db, existing)
        return {
            "active": False,
            "submitted": True,
            "attempt_id": str(existing.id),
            "timed_out": True,
        }

    return {
        "active": True,
        "attempt_id": str(existing.id),
        "server_deadline_at": existing.server_deadline_at.isoformat(),
    }


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
        .options(
            joinedload(TestAttempt.answers),
            joinedload(TestAttempt.assignment)
            .joinedload(TestAssignment.test)
            .joinedload(Test.questions)
            .joinedload(TestQuestion.question),
        )
        .filter(TestAttempt.assignment_id == assignment_id, TestAttempt.student_id == user.id)
        .first()
    )
    if existing:
        if existing.status != AttemptStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Attempt already submitted")
        now = datetime.now(timezone.utc)
        if now >= existing.server_deadline_at:
            grade_attempt(db, existing)
            raise HTTPException(status_code=400, detail="Time expired. Your test was auto-submitted.")
        test = existing.assignment.test
        question_map = {str(tq.question_id): tq.question for tq in test.questions}
        order = existing.question_order or [str(tq.question_id) for tq in sorted(test.questions, key=lambda x: x.sort_order)]
        saved = [
            {
                "question_id": str(a.question_id),
                "selected_option": a.selected_option,
                "marked_for_review": a.marked_for_review,
            }
            for a in existing.answers
        ]
        return AttemptStartResponse(
            attempt_id=existing.id,
            server_deadline_at=existing.server_deadline_at,
            questions=[_question_payload(question_map, qid) for qid in order if qid in question_map],
            saved_answers=saved,
            marking_mode=test.marking_mode,
            resumed=True,
        )

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

    questions = [_question_payload(question_map, qid) for qid in order]

    return AttemptStartResponse(
        attempt_id=attempt.id,
        server_deadline_at=attempt.server_deadline_at,
        questions=questions,
        marking_mode=test.marking_mode,
        resumed=False,
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
        test = attempt.assignment.test
        reveal = not (
            test.marking_mode.value == "manual" and attempt.total_score is None
        )
        return _attempt_result(db, attempt, reveal_answers=reveal)

    if datetime.now(timezone.utc) > attempt.server_deadline_at and attempt.status == AttemptStatus.IN_PROGRESS:
        attempt.status = AttemptStatus.TIMED_OUT

    graded = grade_attempt(db, attempt)
    test = graded.assignment.test
    reveal = not (test.marking_mode.value == "manual" and graded.total_score is None)
    return _attempt_result(db, graded, reveal_answers=reveal)


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

    reveal = user.role in (UserRole.ADMIN, UserRole.TUTOR)
    return _attempt_result(db, attempt, reveal_answers=reveal)


@router.post("/attempts/{attempt_id}/manual-grade")
def manual_grade_attempt(
    attempt_id: UUID,
    updates: list[ManualGradeUpdate],
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    attempt = (
        db.query(TestAttempt)
        .options(joinedload(TestAttempt.assignment).joinedload(TestAssignment.test))
        .filter(TestAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    test = attempt.assignment.test
    if test.marking_mode.value != "manual":
        raise HTTPException(status_code=400, detail="This test is not in manual marking mode")
    
    if attempt.status != AttemptStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Attempt must be submitted before manual grading")

    # Apply manual grading
    for update in updates:
        answer = (
            db.query(AttemptAnswer)
            .filter(
                AttemptAnswer.attempt_id == attempt.id,
                AttemptAnswer.question_id == update.question_id,
            )
            .first()
        )
        if answer:
            answer.is_correct = update.is_correct

    # Calculate score based on manual grading
    answers = db.query(AttemptAnswer).filter(AttemptAnswer.attempt_id == attempt.id).all()
    question_map = {tq.question_id: tq.question for tq in test.questions}

    total = 0.0
    breakdown: dict[str, dict] = {}

    for answer in answers:
        question = question_map.get(answer.question_id)
        if not question:
            continue

        subject = question.subject.value
        if subject not in breakdown:
            breakdown[subject] = {"correct": 0, "wrong": 0, "skipped": 0, "score": 0.0}

        if answer.is_correct is None:
            breakdown[subject]["skipped"] += 1
        elif answer.is_correct:
            breakdown[subject]["correct"] += 1
            breakdown[subject]["score"] += test.marks_per_question
            total += test.marks_per_question
        else:
            breakdown[subject]["wrong"] += 1
            breakdown[subject]["score"] += test.negative_marking
            total += test.negative_marking

    attempt.total_score = max(0.0, total)
    attempt.subject_breakdown = breakdown

    _update_batch_ranks(db, attempt.assignment_id)
    db.commit()
    db.refresh(attempt)
    
    return _attempt_result(db, attempt, reveal_answers=True)


@router.get("/pending-manual-grading")
def pending_manual_grading(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TUTOR)),
):
    """List attempts that are submitted but not yet manually graded (for manual marking mode tests)"""
    from app.models import MarkingMode as MM

    attempts = (
        db.query(TestAttempt)
        .join(TestAssignment)
        .join(Test)
        .filter(
            Test.marking_mode == MM.MANUAL,
            TestAttempt.status == AttemptStatus.SUBMITTED,
            TestAttempt.total_score.is_(None),
        )
        .options(
            joinedload(TestAttempt.student),
            joinedload(TestAttempt.assignment).joinedload(TestAssignment.test),
        )
        .order_by(TestAttempt.submitted_at.desc())
        .all()
    )
    
    return [
        {
            "attempt_id": str(a.id),
            "student_name": a.student.full_name,
            "test_title": a.assignment.test.title,
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
        }
        for a in attempts
    ]
