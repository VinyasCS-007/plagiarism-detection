# Migration setup for SQLAlchemy models
# Run this script to create all tables in your database

from app.core.db import engine
from app.models import base, ai_detection, batch, comparison, document, embedding, result, task, user

# Create all tables
base.Base.metadata.create_all(engine)

print("Database tables created.")
