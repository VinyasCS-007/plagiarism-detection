from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.responses import Response
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import json
from app.core.db import get_db
from app.models.user import User
from app.api.auth import fastapi_users, admin_user
from app.services.ai_detection import AIDetectionService
from app.services.plagiarism import PlagiarismService
from app.core.provider_router import ProviderRouter, ProviderType

router = APIRouter()
ai_service = AIDetectionService()

class AnalysisOptions(BaseModel):
    provider: str = Field(default=ProviderType.LOCAL, description="AI detection provider (local, openai, together)")
    ai_threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    check_plagiarism: bool = True
    check_ai: bool = False

class AnalysisResponse(BaseModel):
    batch_id: str
    status: str
    message: str


def _resolve_analysis_type(opts: AnalysisOptions) -> str:
    if opts.check_plagiarism and opts.check_ai:
        return "both"
    if opts.check_plagiarism:
        return "plagiarism"
    if opts.check_ai:
        return "ai"
    raise HTTPException(status_code=400, detail="At least one analysis option must be enabled")


# ============================================================
# STUDENT ENDPOINT: Upload documents only (no analysis triggered)
# ============================================================
@router.post("/upload", response_model=AnalysisResponse)
async def upload_documents(
    files: List[UploadFile] = File(default=[]),
    text: Optional[str] = Form(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(fastapi_users.current_user())
):
    """
    Student upload endpoint: Accept project report files and store them.
    Does NOT trigger plagiarism analysis. Admin must manually trigger it.
    """
    if not files and not text:
        raise HTTPException(status_code=400, detail="Must provide either files or text")

    # Create Batch with status "submitted" (awaiting admin review)
    from app.models import Batch, Document
    batch_id = uuid.uuid4()
    batch = Batch(
        id=batch_id,
        user_id=user.id,
        total_docs=0,
        status="submitted",
        analysis_type="pending",
        ai_provider="none",
        ai_threshold=0.5
    )
    db.add(batch)

    docs_to_process = []

    # Process Text Input
    if text:
        doc_id = uuid.uuid4()
        doc = Document(
            id=doc_id,
            batch_id=batch_id,
            filename="input_text.txt",
            storage_path=f"{batch_id}/input_text.txt",
            text_content=text,
            status="submitted"
        )
        db.add(doc)
        docs_to_process.append(doc)

    # Process Uploaded Files
    from app.services.parsing import extract_text_from_file
    from app.services.storage import StorageService
    storage_service = StorageService()

    for file in files:
        content = await file.read()
        storage_path = f"{batch_id}/{file.filename}"
        storage_service.save(storage_path, content)

        # Extract text
        from io import BytesIO
        file_obj = BytesIO(content)
        file_obj.name = file.filename
        text_content = await extract_text_from_file(file_obj)

        doc = Document(
            batch_id=batch_id,
            filename=file.filename,
            storage_path=storage_path,
            text_content=text_content,
            status="submitted"
        )
        db.add(doc)
        docs_to_process.append(doc)

    batch.total_docs = len(docs_to_process)
    await db.commit()

    return AnalysisResponse(
        batch_id=str(batch_id),
        status="submitted",
        message="Project report uploaded successfully. Awaiting admin review."
    )


# ============================================================
# ADMIN ENDPOINT: Trigger plagiarism analysis on a batch
# ============================================================
@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_content(
    files: List[UploadFile] = File(default=[]),
    text: Optional[str] = Form(default=None),
    options: str = Form(default='{"provider":"local","check_plagiarism":true,"check_ai":false}'),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(admin_user)  # ADMIN ONLY
):
    """
    Admin-only endpoint: Upload and immediately analyze content.
    Supports Plagiarism and AI Detection with configurable providers.
    """
    try:
        opts = AnalysisOptions(**json.loads(options))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid options JSON: {e}")

    if not files and not text:
        raise HTTPException(status_code=400, detail="Must provide either files or text")

    # Create Batch
    from app.models import Batch, Document
    batch_id = uuid.uuid4()
    analysis_type = _resolve_analysis_type(opts)
    batch = Batch(
        id=batch_id,
        user_id=user.id,
        total_docs=0,
        status="queued",
        analysis_type=analysis_type,
        ai_provider=opts.provider if opts.check_ai else "none",
        ai_threshold=opts.ai_threshold if opts.check_ai else 0.0
    )
    db.add(batch)

    # Process Text Input
    docs_to_process = []
    if text:
        doc_id = uuid.uuid4()
        doc = Document(
            id=doc_id,
            batch_id=batch_id,
            filename="input_text.txt",
            storage_path=f"{batch_id}/input_text.txt",
            text_content=text,
            status="queued"
        )
        db.add(doc)
        docs_to_process.append(doc)

    # Process Uploaded Files
    from app.services.parsing import extract_text_from_file
    from app.services.storage import StorageService
    storage_service = StorageService()

    for file in files:
        content = await file.read()
        storage_path = f"{batch_id}/{file.filename}"
        storage_service.save(storage_path, content)

        from io import BytesIO
        file_obj = BytesIO(content)
        file_obj.name = file.filename
        text_content = await extract_text_from_file(file_obj)

        doc = Document(
            batch_id=batch_id,
            filename=file.filename,
            storage_path=storage_path,
            text_content=text_content,
            status="queued"
        )
        db.add(doc)
        docs_to_process.append(doc)

    batch.total_docs = len(docs_to_process)
    await db.commit()

    # Trigger Processing (Async)
    from app.services.batch_processing import process_batch
    process_batch.delay(str(batch_id), provider=opts.provider, ai_threshold=opts.ai_threshold)

    return AnalysisResponse(
        batch_id=str(batch_id),
        status="queued",
        message="Analysis started successfully"
    )


# ============================================================
# ADMIN ENDPOINT: Trigger analysis on an existing student batch
# ============================================================
@router.post("/analyze-batch/{batch_id}", response_model=AnalysisResponse)
async def analyze_existing_batch(
    batch_id: uuid.UUID,
    options: Dict[str, Any] = Body(default={
    "provider": "local",
    "check_plagiarism": True,
    "check_ai": False
}),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(admin_user)  # ADMIN ONLY
):
    """
    Admin-only: Trigger plagiarism/AI analysis on an already-uploaded student batch.
    """
    from app.models import Batch, Document
    from sqlalchemy import select, update as sql_update

    # Find the batch
    batch = await db.execute(select(Batch).where(Batch.id == batch_id))
    batch = batch.scalar_one_or_none()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    try:
        opts = AnalysisOptions(**options)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid options JSON: {e}")

    # Update batch status
    batch.status = "queued"
    analysis_type = _resolve_analysis_type(opts)
    batch.analysis_type = analysis_type
    batch.ai_provider = opts.provider if opts.check_ai else "none"
    batch.ai_threshold = opts.ai_threshold if opts.check_ai else 0.0

    # Update all documents in this batch to queued
    await db.execute(
        sql_update(Document)
        .where(Document.batch_id == batch_id)
        .values(status="queued")
    )
    await db.commit()

    # Trigger Processing
    from app.services.batch_processing import process_batch
    process_batch.delay(str(batch_id), provider=opts.provider, ai_threshold=opts.ai_threshold)

    return AnalysisResponse(
        batch_id=str(batch_id),
        status="queued",
        message="Plagiarism check started on student submission."
    )


# ============================================================
# ADMIN ENDPOINT: List ALL batches from all students
# ============================================================
@router.get("/admin/batches")
async def list_all_batches(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(admin_user)  # ADMIN ONLY
):
    """
    Admin-only: List all batches (submissions) from all students.
    """
    from app.models import Batch
    from sqlalchemy import select, or_, case

    result = await db.execute(
        select(Batch, User)
        .join(User, Batch.user_id == User.id)
        .order_by(Batch.id.desc())
    )
    rows = result.all()

    batches = []
    for batch, batch_user in rows:
        batches.append({
            "batch_id": str(batch.id),
            "student_email": batch_user.email,
            "student_name": batch_user.name or batch_user.email,
            "total_docs": batch.total_docs,
            "status": batch.status,
            "analysis_type": batch.analysis_type,
        })

    return {"status": "ok", "data": batches}


# ============================================================
# STUDENT ENDPOINT: List own submissions
# ============================================================
@router.get("/my-submissions")
async def get_my_submissions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(fastapi_users.current_user())
):
    """
    Any authenticated user: List own batches/submissions with status.
    Students see status only (submitted/queued/completed), NOT plagiarism scores.
    """
    from app.models import Batch
    from sqlalchemy import select, or_, case

    result = await db.execute(
        select(Batch)
        .where(Batch.user_id == user.id)
        .order_by(Batch.id.desc())
    )
    batches = result.scalars().all()

    submissions = []
    for batch in batches:
        # Map internal statuses to student-friendly labels
        status_label = "Submitted"
        if batch.status == "queued":
            status_label = "Under Review"
        elif batch.status == "completed":
            status_label = "Checked"
        elif batch.status == "failed":
            status_label = "Error"

        submissions.append({
            "batch_id": str(batch.id),
            "total_docs": batch.total_docs,
            "status": batch.status,
            "status_label": status_label,
        })

    return {"status": "ok", "data": submissions}


# ============================================================
# AI DETECTION ENDPOINTS
# ============================================================
@router.get("/ai-detection/health")
async def ai_health_check():
    """Health check for AI detection service."""
    health_status = ai_service.health_check()
    return {"service": "ai_detection", "health": health_status}

@router.post("/ai-detection")
async def detect_ai_only(
    text: str = Body(..., embed=True),
    provider: str = Body("local", embed=True),
    threshold: float = Body(0.5, embed=True),
    user: User = Depends(admin_user)  # ADMIN ONLY
):
    """
    Admin-only: Direct AI detection endpoint for text.
    """
    try:
        ai_result = ai_service.detect(text, provider=provider, threshold=threshold)

        return {
            "is_ai": ai_result["is_ai"],
            "score": ai_result["score"],
            "confidence": ai_result["confidence"],
            "label": ai_result["label"],
            "provider": ai_result["provider"],
            "details": ai_result["details"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI detection failed: {str(e)}")


# ============================================================
# ADMIN ENDPOINT: View batch results (plagiarism scores, matches)
# ============================================================
@router.get("/batches/{batch_id}/results")
async def get_batch_results(
    batch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(admin_user)  # ADMIN ONLY
):
    """
    Admin-only: Get detailed results for a batch, including AI scores and plagiarism matches.
    """
    from app.models import Batch, Document, Comparison
    from sqlalchemy import select, or_, case
    from sqlalchemy.orm import aliased

    # Admin can see any batch (not filtered by user_id)
    batch_stmt = select(Batch).where(Batch.id == batch_id)
    batch_result = await db.execute(batch_stmt)
    batch = batch_result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    documents_stmt = select(Document).where(Document.batch_id == batch_id)
    documents_result = await db.execute(documents_stmt)
    documents = documents_result.scalars().all()

    results = []
    for doc in documents:
        DocB = aliased(Document)
        DocA = aliased(Document)
        comparisons_stmt = (
            select(
                Comparison,
                case(
                    (Comparison.doc_a == doc.id, DocB.filename),
                    else_=DocA.filename
                ).label("match_filename")
            )
            .join(DocA, Comparison.doc_a == DocA.id)
            .join(DocB, Comparison.doc_b == DocB.id)
            .where(or_(Comparison.doc_a == doc.id, Comparison.doc_b == doc.id))
            .order_by(Comparison.similarity.desc())
        )
        comparisons_result = await db.execute(comparisons_stmt)
        comparisons = comparisons_result.all()

        plagiarism_details = []
        for comp, match_filename in comparisons:
            plagiarism_details.append({
                "similar_document": match_filename,
                "similarity": comp.similarity,
                "matches": comp.matches or []
            })

        results.append({
            "document_id": str(doc.id),
            "filename": doc.filename,
            "status": doc.status,
            "ai_analysis": {
                "score": doc.ai_score,
                "is_ai": doc.is_ai_generated,
                "confidence": doc.ai_confidence,
                "provider": doc.ai_provider
            },
            "plagiarism_analysis": plagiarism_details
        })

    return {"status": "ok", "data": results}


# ============================================================
# ADMIN ENDPOINT: Download batch report (PDF/CSV)
# ============================================================
@router.get("/batches/{batch_id}/report")
async def download_batch_report(
    batch_id: uuid.UUID,
    format: str = "pdf",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(admin_user)  # ADMIN ONLY
):
    """
    Admin-only: Download a PDF or CSV report for a batch.
    """
    from app.models import Batch, Document, Comparison
    from app.services.report import ReportService
    from sqlalchemy import select, or_

    fmt = format.lower()
    if fmt not in {"pdf", "csv"}:
        raise HTTPException(status_code=400, detail="format must be 'pdf' or 'csv'")

    batch_stmt = select(Batch).where(Batch.id == batch_id)
    batch_result = await db.execute(batch_stmt)
    batch = batch_result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    documents_stmt = select(Document).where(Document.batch_id == batch_id)
    documents_result = await db.execute(documents_stmt)
    documents = documents_result.scalars().all()

    doc_ids = [doc.id for doc in documents]
    comparisons_stmt = select(Comparison).where(
        or_(Comparison.doc_a.in_(doc_ids), Comparison.doc_b.in_(doc_ids))
    )
    comparisons_result = await db.execute(comparisons_stmt)
    comparisons = comparisons_result.scalars().all()

    plagiarism_scores = ReportService.build_plagiarism_scores(documents, comparisons)

    if fmt == "csv":
        csv_content = ReportService.generate_csv_report(documents, plagiarism_scores)
        filename = f"batch_{batch_id}_report.csv"
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    pdf_bytes = ReportService.generate_pdf_report(batch, documents, plagiarism_scores)
    filename = f"batch_{batch_id}_report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
