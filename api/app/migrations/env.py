from logging.config import fileConfig

from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.database import Base
from app.models import User, Batch, Enrollment, Question, Test, TestQuestion, TestAssignment, TestAttempt, AttemptAnswer  # noqa: F401

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    try:
        from sqlalchemy import create_engine
        url = config.get_main_option("sqlalchemy.url")
        connectable = create_engine(url)
        with connectable.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata)
            with context.begin_transaction():
                context.run_migrations()
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Fall back to offline mode if DB is unreachable (e.g. during autogenerate)
        run_migrations_offline()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
