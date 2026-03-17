from typing import List, Dict, Any
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Document
from app.services.embedding import EmbeddingService

class PlagiarismService:
    def __init__(self, db_session: AsyncSession = None, embedding_service: EmbeddingService = None):
        self.db_session = db_session
        self.embedding_service = embedding_service or EmbeddingService()

    def calculate_similarity(self, embedding_a, embedding_b) -> float:
        """Calculate cosine similarity between two embeddings"""
        if embedding_a is None or embedding_b is None:
            return 0.0
        
        # Ensure numpy arrays
        vec_a = np.array(embedding_a)
        vec_b = np.array(embedding_b)
        
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
            
        return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

    async def compare_documents(self, doc_a_text: str, doc_b_text: str) -> Dict[str, Any]:
        """
        Compare two documents using chunk-based analysis.
        Returns overall similarity and specific matching passages.
        """
        chunks_a, embeddings_a = self.embedding_service.encode_chunks(doc_a_text)
        chunks_b, embeddings_b = self.embedding_service.encode_chunks(doc_b_text)
        
        if embeddings_a is None or len(embeddings_a) == 0 or embeddings_b is None or len(embeddings_b) == 0:
            return {"score": 0.0, "matches": []}

        import numpy as np

        # Ensure 2D arrays
        emb_a = np.asarray(embeddings_a, dtype=float)
        emb_b = np.asarray(embeddings_b, dtype=float)
        if emb_a.ndim == 1:
            emb_a = emb_a.reshape(1, -1)
        if emb_b.ndim == 1:
            emb_b = emb_b.reshape(1, -1)

        # Embeddings are already normalized in EmbeddingService.encode_chunks
        sim_matrix = emb_a @ emb_b.T
        best_match_scores = sim_matrix.max(axis=1)
        best_match_indices = sim_matrix.argmax(axis=1)

        matches = []
        total_similarity = 0.0

        for i, best_match_score in enumerate(best_match_scores):
            if best_match_score > 0.75:
                best_match_idx = int(best_match_indices[i])
                matches.append({
                    "source_chunk": chunks_a[i],
                    "target_chunk": chunks_b[best_match_idx],
                    "score": round(float(best_match_score), 4),
                    "source_index": i,
                    "target_index": best_match_idx
                })
                total_similarity += float(best_match_score)

        # Normalize overall score
        # Simple approach: (sum of matched chunk scores) / (total chunks in A)
        # This represents "how much of A is found in B"
        overall_score = total_similarity / len(chunks_a) if chunks_a else 0.0

        return {
            "score": round(overall_score, 4),
            "matches": matches,
            "details": {
                "chunks_a": len(chunks_a),
                "chunks_b": len(chunks_b),
                "method": "embedding"
            }
        }

    async def find_similar_in_batch(self, document: Document, batch_id: str) -> List[Dict[str, Any]]:
        """Find similar documents within the same batch"""
        if not self.db_session:
            raise ValueError("Database session required for batch search")

        query = select(Document).where(
            Document.batch_id == batch_id,
            Document.id != document.id
        )
        result = await self.db_session.execute(query)
        other_docs = result.scalars().all()
        
        results = []
        for other_doc in other_docs:
            if not other_doc.text_content:
                continue
            comparison = await self.compare_documents(document.text_content, other_doc.text_content)
            if comparison["score"] > 0.1:
                results.append({
                    "document_id": other_doc.id,
                    "filename": other_doc.filename,
                    "batch_id": other_doc.batch_id,
                    "similarity": comparison["score"],
                    "matches": comparison["matches"]
                })
        
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results

    async def find_similar_across_all_documents(self, document: Document) -> List[Dict[str, Any]]:
        """
        Compare a document against ALL documents in the entire database.
        This is the core plagiarism check — every new upload is compared
        against every previously uploaded document, regardless of batch.
        """
        if not self.db_session:
            raise ValueError("Database session required for cross-DB search")

        if not document.text_content:
            return []

        # Prefer a fast embedding-based prefilter when available
        if not document.embedding and self.embedding_service.model:
            document.embedding = self.embedding_service.generate_text_embedding(document.text_content)

        candidate_docs = None
        if document.embedding:
            # Prefer pgvector cosine top-k when available
            try:
                top_k = 50
                min_similarity = 0.2
                max_distance = 1 - min_similarity

                distance_expr = Document.embedding.cosine_distance(document.embedding)
                query = (
                    select(Document)
                    .where(
                        Document.id != document.id,
                        Document.embedding.isnot(None),
                        Document.text_content.isnot(None),
                        Document.text_content != ""
                    )
                    .where(distance_expr <= max_distance)
                    .order_by(distance_expr)
                    .limit(top_k)
                )
                result = await self.db_session.execute(query)
                candidate_docs = result.scalars().all()
            except Exception:
                candidate_docs = None

        if candidate_docs is None and document.embedding:
            # Fallback: Python-based cosine top-k prefilter
            query = select(
                Document.id,
                Document.filename,
                Document.batch_id,
                Document.embedding
            ).where(
                Document.id != document.id,
                Document.embedding.isnot(None)
            )
            result = await self.db_session.execute(query)
            rows = result.all()

            if rows:
                import numpy as np
                doc_vec = np.asarray(document.embedding, dtype=float)
                doc_norm = np.linalg.norm(doc_vec)
                if doc_norm > 0:
                    doc_vec = doc_vec / doc_norm

                embeddings = np.asarray([r.embedding for r in rows], dtype=float)
                norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
                norms[norms == 0] = 1.0
                embeddings = embeddings / norms

                sims = embeddings @ doc_vec
                top_k = min(50, len(rows))
                top_idx = np.argpartition(-sims, top_k - 1)[:top_k]
                candidate_ids = [rows[i].id for i in top_idx if sims[i] > 0.2]

                if candidate_ids:
                    docs_query = select(Document).where(Document.id.in_(candidate_ids))
                    docs_result = await self.db_session.execute(docs_query)
                    candidate_docs = docs_result.scalars().all()
                else:
                    candidate_docs = []

        if candidate_docs is None:
            # Fallback: compare against all documents with text content
            query = select(Document).where(
                Document.id != document.id,
                Document.text_content.isnot(None),
                Document.text_content != ""
            )
            result = await self.db_session.execute(query)
            candidate_docs = result.scalars().all()

        results = []
        for other_doc in candidate_docs:
            comparison = await self.compare_documents(
                document.text_content, other_doc.text_content
            )
            if comparison["score"] > 0.1:  # Filter noise
                results.append({
                    "document_id": other_doc.id,
                    "filename": other_doc.filename,
                    "batch_id": other_doc.batch_id if other_doc.batch_id else None,
                    "similarity": comparison["score"],
                    "matches": comparison["matches"],
                    "details": comparison.get("details", {})
                })

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results
