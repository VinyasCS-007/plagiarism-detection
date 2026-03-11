from celery import Celery
from app.core.config import settings

print("BROKER:", settings.CELERY_BROKER_URL)
print("BACKEND:", settings.CELERY_RESULT_BACKEND)

app = Celery("plagiarism_detection")

app.conf.update(
    broker_url=settings.CELERY_BROKER_URL,
    result_backend=settings.CELERY_RESULT_BACKEND,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Tell Celery where tasks are
app.autodiscover_tasks(["app.services"], related_name="batch_processing")