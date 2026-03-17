# Alembic migration to enable pgvector and move embeddings to vector(786)
"""
Revision ID: 0002_pgvector_embedding
Revises: 0001_initial
Create Date: 2026-03-16
"""

from alembic import op

revision = "0002_pgvector_embedding"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Convert embedding column to pgvector(786). Existing bytea values are dropped.
    op.execute(
        "ALTER TABLE documents "
        "ALTER COLUMN embedding TYPE vector(786) "
        "USING NULL::vector(786)"
    )

    # Optional cosine index for faster similarity search (requires pgvector server support)
    op.execute(
        "CREATE INDEX IF NOT EXISTS documents_embedding_ivfflat_idx "
        "ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS documents_embedding_ivfflat_idx")
    op.execute(
        "ALTER TABLE documents "
        "ALTER COLUMN embedding TYPE bytea "
        "USING NULL::bytea"
    )

    # Leave extension installed if other objects depend on it
