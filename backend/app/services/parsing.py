from fastapi import UploadFile
from pdfminer.high_level import extract_text
import docx
import io
import os
from PIL import Image
import pytesseract
from pdf2image import convert_from_path
import tempfile


async def extract_text_from_file(file) -> str:
    """
    Extract text from UploadFile or raw bytes.
    Supports .txt, .docx, .pdf, and images.
    """

    # Handle UploadFile vs bytes
    if isinstance(file, UploadFile):
        content = await file.read()
        filename = file.filename.lower()
    else:
        content = file if isinstance(file, bytes) else file.read()
        filename = getattr(file, 'name', getattr(file, 'filename', '')).lower()

    if filename.endswith(".docx"):
        doc = docx.Document(io.BytesIO(content))
        return " ".join([para.text for para in doc.paragraphs])

    elif filename.endswith(".pdf"):
        text = extract_text(io.BytesIO(content))

        if len(text.strip()) < 10:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            try:
                images = convert_from_path(tmp_path)
                ocr_text = ""
                for img in images:
                    ocr_text += pytesseract.image_to_string(img)
                return ocr_text
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        return text

    elif filename.endswith((".png", ".jpg", ".jpeg")):
        image = Image.open(io.BytesIO(content))
        return pytesseract.image_to_string(image)

    elif filename.endswith(".txt"):
        return content.decode("utf-8", errors="ignore")

    else:
        try:
            return content.decode("utf-8", errors="ignore")
        except Exception:
            return ""