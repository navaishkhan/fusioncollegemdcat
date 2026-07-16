"""Seed the database with sample data for development/testing."""
import uuid
from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models import (
    AttemptAnswer,
    AttemptStatus,
    Batch,
    Difficulty,
    Enrollment,
    Question,
    Subject,
    Test,
    TestAssignment,
    TestAttempt,
    TestQuestion,
    User,
    UserRole,
)


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Don't seed if data already exists
    if db.query(User).first():
        print("Database already has data, skipping seed.")
        db.close()
        return

    now = datetime.now(timezone.utc)

    # ── Users ──
    admin = User(
        email="admin@fusion.edu.pk",
        full_name="Admin User",
        hashed_password=hash_password("admin123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    tutor = User(
        email="tutor@fusion.edu.pk",
        full_name="Dr. Ahmed",
        hashed_password=hash_password("tutor123"),
        role=UserRole.TUTOR,
        is_active=True,
    )
    students = [
        User(
            email=f"student{i}@fusion.edu.pk",
            full_name=f"Student {i}",
            hashed_password=hash_password("student123"),
            role=UserRole.STUDENT,
            is_active=True,
        )
        for i in range(1, 6)
    ]
    parent = User(
        email="parent@example.com",
        full_name="Parent User",
        hashed_password=hash_password("parent123"),
        role=UserRole.PARENT,
        is_active=True,
    )

    db.add_all([admin, tutor, parent] + students)
    db.flush()

    # Link first student to parent
    students[0].parent_id = parent.id

    # ── Batch ──
    batch = Batch(name="FSC Pre-Med A", description="Morning section", created_by_id=tutor.id)
    db.add(batch)
    db.flush()

    for s in students:
        db.add(Enrollment(batch_id=batch.id, student_id=s.id))

    # ── Questions (60 across 5 subjects) ──
    topics = {
        Subject.BIO: [
            ("Cell Structure", "Which organelle is known as the powerhouse of the cell?"),
            ("Cell Structure", "The fluid mosaic model describes which structure?"),
            ("Genetics", "How many chromosomes are in a human somatic cell?"),
            ("Genetics", "What is the probability of two heterozygous parents having a homozygous recessive child?"),
            ("Enzymes", "What is the optimum pH for pepsin?"),
            ("Enzymes", "Enzymes are composed of which type of macromolecule?"),
            ("Nervous System", "Which part of the brain controls balance?"),
            ("Nervous System", "The resting membrane potential of a neuron is approximately:"),
            ("Circulation", "Which chamber of the heart pumps blood to the aorta?"),
            ("Circulation", "What is the normal heart rate range at rest?"),
            ("Immunity", "Which cells produce antibodies?"),
            ("Immunity", "Vaccination provides which type of immunity?"),
        ],
        Subject.CHEM: [
            ("Atomic Structure", "How many electrons can the d subshell hold?"),
            ("Atomic Structure", "What is the maximum number of orbitals in the n=3 shell?"),
            ("Chemical Bonding", "Which type of bond is formed by the sharing of electrons?"),
            ("Chemical Bonding", "What is the shape of a water molecule?"),
            ("Thermochemistry", "An exothermic reaction has which sign for enthalpy change?"),
            ("Thermochemistry", "The SI unit of enthalpy is:"),
            ("Chemical Equilibrium", "What is the value of K for a reaction at equilibrium?"),
            ("Chemical Equilibrium", "Le Chatelier's principle deals with:"),
            ("Organic Chemistry", "Which functional group characterizes alcohols?"),
            ("Organic Chemistry", "What is the hybridization of carbon in methane?"),
            ("Solutions", "Which of the following is a colligative property?"),
            ("Solutions", "Molarity is defined as:"),
        ],
        Subject.PHYSICS: [
            ("Mechanics", "Newton's first law is also known as the law of:"),
            ("Mechanics", "What is the SI unit of force?"),
            ("Work and Energy", "The work done by a conservative force is:"),
            ("Work and Energy", "What is the kinetic energy of a 2kg object moving at 3 m/s?"),
            ("Waves", "The speed of sound is maximum in which medium?"),
            ("Waves", "What is the frequency of a wave with period 0.02s?"),
            ("Electrostatics", "Coulomb's law is analogous to which law in gravitation?"),
            ("Electrostatics", "What is the SI unit of electric charge?"),
            ("Current Electricity", "Ohm's law relates V, I, and which quantity?"),
            ("Current Electricity", "Resistors in parallel have:"),
            ("Electromagnetism", "A moving charge produces which field?"),
            ("Electromagnetism", "The direction of induced current is given by:"),
        ],
        Subject.ENGLISH: [
            ("Grammar", "Choose the correct: 'Neither the teacher nor the students ___ present.'"),
            ("Grammar", "Which of the following is a compound sentence?"),
            ("Vocabulary", "The antonym of 'benevolent' is:"),
            ("Vocabulary", "The synonym of 'ephemeral' is:"),
            ("Comprehension", "The main idea of a passage is usually found in the:"),
            ("Comprehension", "A 'metaphor' is a figure of speech that:"),
            ("Sentence Correction", "Identify the error: 'He don't like coffee.'"),
            ("Sentence Correction", "Which is correct: 'between you and I' or 'between you and me'?"),
            ("Para Completion", "After the storm, the village was ___ destroyed."),
            ("Para Completion", "The scientist's ___ led to a breakthrough discovery."),
            ("Tenses", "She ___ for the exam since morning."),
            ("Tenses", "By next year, he ___ his degree."),
        ],
        Subject.LOGICAL_REASONING: [
            ("Critical Thinking", "If all A are B and all B are C, then:"),
            ("Critical Thinking", "A statement supported by evidence is called a:"),
            ("Pattern Recognition", "2, 6, 18, 54, ? What comes next?"),
            ("Pattern Recognition", "Which number completes the pattern: 3, 5, 9, 17, 33, ?"),
            ("Analytical Reasoning", "If it takes 5 machines 5 minutes to make 5 widgets, how long does 1 machine take?"),
            ("Analytical Reasoning", "A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much is the ball?"),
            ("Assumptions", "An argument's hidden premise is called a:"),
            ("Assumptions", "Which of the following best describes a 'straw man' fallacy?"),
            ("Data Interpretation", "In a class of 30, the ratio of boys to girls is 2:3. How many girls are there?"),
            ("Data Interpretation", "If a pie chart shows 25% for a category, what is the central angle?"),
            ("Deduction", "All mammals are warm-blooded. Whales are mammals. Therefore:"),
            ("Deduction", "If today is Tuesday, what day was 100 days ago?"),
        ],
    }

    options_pool = {
        "Cell Structure_0": {"A": "Nucleus", "B": "Mitochondria", "C": "Ribosome", "D": "Golgi apparatus"},
        "Cell Structure_1": {"A": "Cell wall", "B": "Cell membrane", "C": "Nucleus", "D": "Cytoplasm"},
        "Genetics_0": {"A": "23", "B": "44", "C": "46", "D": "48"},
        "Genetics_1": {"A": "25%", "B": "50%", "C": "75%", "D": "100%"},
        "Enzymes_0": {"A": "2", "B": "7", "C": "9", "D": "4"},
        "Enzymes_1": {"A": "Carbohydrates", "B": "Lipids", "C": "Proteins", "D": "Nucleic acids"},
        "Nervous System_0": {"A": "Cerebrum", "B": "Cerebellum", "C": "Medulla", "D": "Hypothalamus"},
        "Nervous System_1": {"A": "-70mV", "B": "0mV", "C": "+30mV", "D": "-90mV"},
        "Circulation_0": {"A": "Right atrium", "B": "Right ventricle", "C": "Left atrium", "D": "Left ventricle"},
        "Circulation_1": {"A": "40-60", "B": "60-100", "C": "100-140", "D": "140-180"},
        "Immunity_0": {"A": "T cells", "B": "B cells", "C": "Macrophages", "D": "Neutrophils"},
        "Immunity_1": {"A": "Active natural", "B": "Passive natural", "C": "Active artificial", "D": "Passive artificial"},
    }

    correct_answers = {
        "Cell Structure_0": "B",
        "Cell Structure_1": "B",
        "Genetics_0": "C",
        "Genetics_1": "A",
        "Enzymes_0": "A",
        "Enzymes_1": "C",
        "Nervous System_0": "B",
        "Nervous System_1": "A",
        "Circulation_0": "D",
        "Circulation_1": "B",
        "Immunity_0": "B",
        "Immunity_1": "C",
        "Atomic Structure_0": "B",
        "Atomic Structure_1": "B",
        "Chemical Bonding_0": "A",
        "Chemical Bonding_1": "B",
        "Thermochemistry_0": "A",
        "Thermochemistry_1": "B",
        "Chemical Equilibrium_0": "B",
        "Chemical Equilibrium_1": "C",
        "Organic Chemistry_0": "C",
        "Organic Chemistry_1": "C",
        "Solutions_0": "D",
        "Solutions_1": "A",
        "Mechanics_0": "B",
        "Mechanics_1": "B",
        "Work and Energy_0": "A",
        "Work and Energy_1": "B",
        "Waves_0": "B",
        "Waves_1": "B",
        "Electrostatics_0": "B",
        "Electrostatics_1": "B",
        "Current Electricity_0": "B",
        "Current Electricity_1": "B",
        "Electromagnetism_0": "B",
        "Electromagnetism_1": "B",
        "Grammar_0": "B",
        "Grammar_1": "B",
        "Vocabulary_0": "C",
        "Vocabulary_1": "B",
        "Comprehension_0": "B",
        "Comprehension_1": "C",
        "Sentence Correction_0": "B",
        "Sentence Correction_1": "B",
        "Para Completion_0": "B",
        "Para Completion_1": "B",
        "Tenses_0": "B",
        "Tenses_1": "B",
        "Critical Thinking_0": "B",
        "Critical Thinking_1": "B",
        "Pattern Recognition_0": "B",
        "Pattern Recognition_1": "B",
        "Analytical Reasoning_0": "B",
        "Analytical Reasoning_1": "B",
        "Assumptions_0": "C",
        "Assumptions_1": "B",
        "Data Interpretation_0": "B",
        "Data Interpretation_1": "B",
        "Deduction_0": "B",
        "Deduction_1": "B",
    }

    # Build generic options for subjects without them
    fallback_options = {
        "A": "Option A is the correct statement.",
        "B": "Option B is the correct statement.",
        "C": "Option C is the correct statement.",
        "D": "Option D is the correct statement.",
    }

    all_questions = []
    q_index = 0
    for subject, topic_list in topics.items():
        for topic, stem in topic_list:
            key = f"{topic}_{q_index % 12}"
            opts = options_pool.get(key, fallback_options)
            correct = correct_answers.get(key, "B")
            # Generate past paper year cycling
            year = [2022, 2023, 2024][q_index % 3]

            q = Question(
                subject=subject,
                topic=topic,
                difficulty=[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD][q_index % 3],
                past_paper_year=year,
                stem=stem,
                options=opts,
                correct_option=correct,
                explanation=f"The correct answer is {correct}. {opts[correct]}",
                created_by_id=tutor.id,
                is_active=True,
                is_preset=True,
            )
            all_questions.append(q)
            q_index += 1

    db.add_all(all_questions)
    db.flush()

    # ── Test ──
    test = Test(
        title="Full Length MDCAT #1",
        description="Comprehensive MDCAT practice test covering all 5 subjects.",
        duration_minutes=150,
        marks_per_question=1.0,
        negative_marking=-0.25,
        randomize_order=True,
        show_review_after_submit=True,
        created_by_id=tutor.id,
    )
    db.add(test)
    db.flush()

    for i, q in enumerate(all_questions):
        db.add(TestQuestion(test_id=test.id, question_id=q.id, sort_order=i))

    # ── Assignment ──
    assignment = TestAssignment(
        test_id=test.id,
        batch_id=batch.id,
        start_at=now - timedelta(hours=1),
        end_at=now + timedelta(days=30),
        created_by_id=tutor.id,
    )
    db.add(assignment)
    db.flush()

    # ── Attempts for students (first 3 have submitted, rest are pending) ──
    for i, student in enumerate(students[:3]):
        attempt = TestAttempt(
            assignment_id=assignment.id,
            student_id=student.id,
            status=AttemptStatus.SUBMITTED,
            server_started_at=now - timedelta(days=i),
            server_deadline_at=now - timedelta(days=i) + timedelta(minutes=150),
            submitted_at=now - timedelta(days=i) + timedelta(minutes=120),
            question_order=[str(q.id) for q in all_questions],
            total_score=85.0 - i * 5.0,
            subject_breakdown={
                "bio": {"correct": 9, "wrong": 2, "skipped": 1, "score": 8.5 - i * 0.5},
                "chem": {"correct": 8, "wrong": 3, "skipped": 1, "score": 7.25 - i * 0.5},
                "physics": {"correct": 7, "wrong": 4, "skipped": 1, "score": 6.0 - i * 0.5},
                "english": {"correct": 10, "wrong": 1, "skipped": 1, "score": 9.75 - i * 0.5},
                "logical_reasoning": {"correct": 8, "wrong": 3, "skipped": 1, "score": 7.25 - i * 0.5},
            },
            rank_in_batch=i + 1,
        )
        db.add(attempt)
        db.flush()

        # Create answer records
        for j, q in enumerate(all_questions):
            is_correct = j < 42 - i * 3  # ~70-80% correct
            db.add(
                AttemptAnswer(
                    attempt_id=attempt.id,
                    question_id=q.id,
                    selected_option=q.correct_option if is_correct else ["A", "B", "C", "D"][(j + i) % 4],
                    marked_for_review=False,
                    is_correct=is_correct,
                )
            )

    db.commit()
    db.close()

    print("✅ Database seeded successfully!")
    print(f"   - 1 admin, 1 tutor, 5 students, 1 parent")
    print(f"   - 1 batch with 5 enrolled students")
    print(f"   - 60 questions (12 per subject)")
    print(f"   - 1 test with all questions")
    print(f"   - 3 submitted attempts with scores")
    print(f"   - 1 upcoming assignment (open for 30 days)")
    print()
    print("📧 Login credentials:")
    print("   Admin:  admin@fusion.edu.pk / admin123")
    print("   Tutor:  tutor@fusion.edu.pk / tutor123")
    print("   Parent: parent@example.com / parent123")
    print("   Students: student1-5@fusion.edu.pk / student123")


if __name__ == "__main__":
    seed()
