# Alembic script for initial migration
"""
Revision ID: 0001_initial
Revises: 
Create Date: 2026-03-13
"""

from alembic import op
import sqlalchemy as sa
import uuid

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email', sa.String, unique=True, index=True, nullable=False),
        sa.Column('hashed_password', sa.String, nullable=False),
        sa.Column('name', sa.String, nullable=True),
        sa.Column('role', sa.String, nullable=False, default='user'),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )
    op.create_table(
        'batches',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('name', sa.String),
        sa.Column('total_docs', sa.Integer),
        sa.Column('processed_docs', sa.Integer, default=0),
        sa.Column('status', sa.String),
        sa.Column('analysis_type', sa.String, default='plagiarism'),
        sa.Column('ai_provider', sa.String, default='local'),
        sa.Column('ai_threshold', sa.Float, default=0.5),
        sa.Column('created_at', sa.DateTime(timezone=True)),
    )
    op.create_table(
        'documents',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('batch_id', sa.UUID(as_uuid=True), sa.ForeignKey('batches.id')),
        sa.Column('filename', sa.String, nullable=False),
        sa.Column('content_hash', sa.String),
        sa.Column('mime_type', sa.String),
        sa.Column('text_content', sa.Text),
        sa.Column('embedding', sa.LargeBinary),
        sa.Column('storage_path', sa.String),
        sa.Column('uploaded_by', sa.UUID(as_uuid=True)),
        sa.Column('status', sa.String, default='queued'),
        sa.Column('ai_score', sa.Float, default=0.0),
        sa.Column('is_ai_generated', sa.Boolean, default=False),
        sa.Column('ai_confidence', sa.Float, default=0.0),
        sa.Column('ai_provider', sa.String),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )
    op.create_table(
        'comparisons',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('doc_a', sa.UUID(as_uuid=True), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('doc_b', sa.UUID(as_uuid=True), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('similarity', sa.Float, nullable=False),
        sa.Column('matches', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime),
    )
    op.create_table(
        'results',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('file_id', sa.UUID(as_uuid=True), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('matched_file_id', sa.UUID(as_uuid=True), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('score', sa.Float, nullable=False),
        sa.Column('type', sa.String, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True)),
    )
    op.create_table(
        'embeddings',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('file_id', sa.UUID(as_uuid=True), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('vector', sa.LargeBinary, nullable=False),
        sa.Column('type', sa.String, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True)),
    )
    op.create_table(
        'ai_detection',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('document_id', sa.UUID(as_uuid=True), sa.ForeignKey('documents.id')),
        sa.Column('model_version', sa.String),
        sa.Column('probability', sa.Float),
        sa.Column('meta_data', sa.JSON),
        sa.Column('created_at', sa.DateTime(timezone=True)),
    )

def downgrade():
    op.drop_table('ai_detection')
    op.drop_table('embeddings')
    op.drop_table('results')
    op.drop_table('comparisons')
    op.drop_table('documents')
    op.drop_table('batches')
    op.drop_table('users')
