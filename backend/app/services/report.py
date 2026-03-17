import csv
import io
from typing import List, Dict
from collections import defaultdict
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from app.models.document import Document
from app.models.batch import Batch

class ReportService:
    """Service for generating reports (PDF, CSV)"""

    @classmethod
    def generate_csv_report(cls, documents: List[Document], plagiarism_scores: Dict[str, float]) -> str:
        """Generate CSV report for a list of documents"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['Filename', 'Status', 'AI Score', 'Is AI?', 'Plagiarism Score'])
        
        # Data
        for doc in documents:
            writer.writerow([
                doc.filename,
                doc.status,
                f"{doc.ai_score:.2f}" if doc.ai_score is not None else "N/A",
                "Yes" if doc.is_ai_generated else "No",
                f"{plagiarism_scores.get(str(doc.id), 0.0):.2f}"
            ])
            
        return output.getvalue()
    
    @classmethod
    def build_plagiarism_scores(cls, documents: List[Document], comparisons: List) -> Dict[str, float]:
        """
        Calculate plagiarism score per document based on stored semantic comparisons.
        Uses the maximum similarity observed for each document in the batch.
        """
        scores = defaultdict(float)
        for comp in comparisons:
            doc_a = str(comp.doc_a)
            doc_b = str(comp.doc_b)
            scores[doc_a] = max(scores[doc_a], float(comp.similarity or 0.0))
            scores[doc_b] = max(scores[doc_b], float(comp.similarity or 0.0))

        for doc in documents:
            scores.setdefault(str(doc.id), 0.0)

        return dict(scores)

    @staticmethod
    def generate_pdf_report(batch: Batch, documents: List[Document], plagiarism_scores: Dict[str, float]) -> bytes:
        """Generate PDF report for a batch"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = styles['Title']
        story.append(Paragraph(f"Analysis Report - Batch {batch.id}", title_style))
        story.append(Spacer(1, 12))

        # Summary
        story.append(Paragraph(f"Total Documents: {len(documents)}", styles['Normal']))
        story.append(Spacer(1, 24))

        # Summary chart (avg plagiarism vs avg AI)
        if documents:
            plag_values = [plagiarism_scores.get(str(doc_item.id), 0.0) * 100 for doc_item in documents]
            ai_values = [(doc_item.ai_score or 0.0) * 100 for doc_item in documents]
            avg_plag = sum(plag_values) / len(plag_values)
            avg_ai = sum(ai_values) / len(ai_values)

            drawing = Drawing(420, 200)
            chart = VerticalBarChart()
            chart.x = 60
            chart.y = 30
            chart.height = 120
            chart.width = 300
            chart.data = [[avg_plag, avg_ai]]
            chart.categoryAxis.categoryNames = ['Plagiarism', 'AI']
            chart.valueAxis.valueMin = 0
            chart.valueAxis.valueMax = 100
            chart.valueAxis.valueStep = 20
            chart.barWidth = 30
            chart.groupSpacing = 10
            chart.barSpacing = 5
            drawing.add(chart)

            story.append(Paragraph("Summary Averages (%)", styles['Heading3']))
            story.append(drawing)
            story.append(Spacer(1, 24))

        # Table Data
        data = [['Filename', 'AI Score', 'Verdict', 'Plagiarism Score']]
        for doc_item in documents:
            score = f"{doc_item.ai_score:.1%}" if doc_item.ai_score is not None else "N/A"
            verdict = "AI-Generated" if doc_item.is_ai_generated else "Human-Written"
            if doc_item.ai_score is None:
                verdict = "Pending/Error"
            
            plag_score = f"{plagiarism_scores.get(str(doc_item.id), 0.0):.2f}"
            data.append([doc_item.filename, score, verdict, plag_score])

        # Table Style
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))

        story.append(table)
        doc.build(story)
        
        return buffer.getvalue()
