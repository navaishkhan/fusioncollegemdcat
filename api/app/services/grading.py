import random
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    AttemptAnswer,
    AttemptStatus,
    Question,
    Test,
    TestAttempt,
    TestAssignment,
    TestQuestion,
    User,
)
from app.schemas import AnswerUpdate


def grade_attempt(db: Session, attempt: TestAttempt) -> TestAttempt:
    test = attempt.assignment.test
    
    # If manual marking mode, just mark as submitted without grading
    if test.marking_mode.value == "manual":
        attempt.submitted_at = datetime.now(timezone.utc)
        attempt.status = AttemptStatus.SUBMITTED
        db.commit()
        db.refresh(attempt)
        return attempt
    
    # Auto grading mode
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

        if not answer.selected_option:
            breakdown[subject]["skipped"] += 1
            answer.is_correct = None
            continue

        is_correct = answer.selected_option == question.correct_option
        answer.is_correct = is_correct
        if is_correct:
            breakdown[subject]["correct"] += 1
            breakdown[subject]["score"] += test.marks_per_question
            total += test.marks_per_question
        else:
            breakdown[subject]["wrong"] += 1
            breakdown[subject]["score"] += test.negative_marking
            total += test.negative_marking

    attempt.total_score = max(0.0, total)
    attempt.subject_breakdown = breakdown
    attempt.submitted_at = datetime.now(timezone.utc)
    attempt.status = AttemptStatus.SUBMITTED

    _update_batch_ranks(db, attempt.assignment_id)
    db.commit()
    db.refresh(attempt)
    return attempt


def _update_batch_ranks(db: Session, assignment_id: UUID) -> None:
    attempts = (
        db.query(TestAttempt)
        .filter(
            TestAttempt.assignment_id == assignment_id,
            TestAttempt.status == AttemptStatus.SUBMITTED,
            TestAttempt.total_score.isnot(None),
        )
        .order_by(TestAttempt.total_score.desc())
        .all()
    )
    for rank, item in enumerate(attempts, start=1):
        item.rank_in_batch = rank


def build_question_order(test: Test, randomize: bool) -> list[str]:
    ids = [str(tq.question_id) for tq in sorted(test.questions, key=lambda x: x.sort_order)]
    if randomize:
        random.shuffle(ids)
    return ids


def pick_auto_questions(db: Session, rules: list, exclude: set[UUID] | None = None) -> list[Question]:
    exclude = exclude or set()
    picked: list[Question] = []

    for rule in rules:
        query = db.query(Question).filter(
            Question.is_active.is_(True),
            Question.subject == rule.subject,
        )
        if rule.difficulty:
            query = query.filter(Question.difficulty == rule.difficulty)
        if exclude:
            query = query.filter(~Question.id.in_(exclude))

        pool = query.all()
        random.shuffle(pool)
        selected = pool[: rule.count]
        picked.extend(selected)
        exclude.update(q.id for q in selected)

    return picked


def create_test_with_questions(db: Session, payload, creator_id: UUID) -> Test:
    test = Test(
        title=payload.title,
        description=payload.description,
        duration_minutes=payload.duration_minutes,
        marks_per_question=payload.marks_per_question,
        negative_marking=payload.negative_marking or settings.negative_marking_default,
        randomize_order=payload.randomize_order,
        show_review_after_submit=payload.show_review_after_submit,
        marking_mode=payload.marking_mode,
        created_by_id=creator_id,
    )
    db.add(test)
    db.flush()

    questions: list[Question] = []
    if payload.question_ids:
        questions = db.query(Question).filter(Question.id.in_(payload.question_ids)).all()
    elif payload.auto_generate:
        questions = pick_auto_questions(db, payload.auto_generate)

    for index, question in enumerate(questions):
        db.add(TestQuestion(test_id=test.id, question_id=question.id, sort_order=index))

    db.commit()
    db.refresh(test)
    return test


def save_answers(db: Session, attempt: TestAttempt, updates: list[AnswerUpdate]) -> None:
    now = datetime.now(timezone.utc)
    if now >= attempt.server_deadline_at:
        raise ValueError("Time expired")

    for item in updates:
        answer = (
            db.query(AttemptAnswer)
            .filter(
                AttemptAnswer.attempt_id == attempt.id,
                AttemptAnswer.question_id == item.question_id,
            )
            .first()
        )
        if not answer:
            continue
        answer.selected_option = item.selected_option
        answer.marked_for_review = item.marked_for_review

    db.commit()


def build_review_payload(
    db: Session,
    attempt: TestAttempt,
    *,
    reveal_answers: bool = True,
) -> list[dict] | None:
    test = attempt.assignment.test
    if not test.show_review_after_submit:
        return None

    hide_answers = (
        not reveal_answers
        and test.marking_mode.value == "manual"
        and attempt.total_score is None
        and attempt.status == AttemptStatus.SUBMITTED
    )

    answers = {a.question_id: a for a in attempt.answers}
    review = []
    for tq in sorted(test.questions, key=lambda x: x.sort_order):
        q = tq.question
        ans = answers.get(q.id)
        review.append(
            {
                "question_id": str(q.id),
                "stem": q.stem,
                "image_url": q.image_url,
                "options": q.options,
                "selected_option": ans.selected_option if ans else None,
                "marked_for_review": ans.marked_for_review if ans else False,
                "correct_option": None if hide_answers else q.correct_option,
                "explanation": None if hide_answers else q.explanation,
                "is_correct": ans.is_correct if ans else None,
            }
        )
    return review
