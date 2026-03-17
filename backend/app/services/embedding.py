import os
import hashlib
from typing import Tuple

try:
    from sentence_transformers import SentenceTransformer
    HAS_MODEL = True
except ImportError:
    HAS_MODEL = False

class EmbeddingService:
    TARGET_DIM = 786

    def __init__(self, model_name="sentence-transformers/all-mpnet-base-v2"):
        if HAS_MODEL and not os.getenv("VERCEL"):
            self.model = SentenceTransformer(model_name)
        else:
            self.model = None

    def chunk_text(self, text, chunk_size=500, overlap=50):
        """Split text into overlapping chunks"""
        if not text:
            return []
        chunks = []
        for i in range(0, len(text), chunk_size - overlap):
            chunks.append(text[i:i + chunk_size])
            if i + chunk_size >= len(text):
                break
        return chunks

    def encode_chunks(self, text, batch_size=16) -> Tuple[list, list]:
        """Generate embeddings for each chunk of text"""
        if not self.model:
            return [], []

        chunks = self.chunk_text(text)
        if not chunks:
            return [], []

        embeddings = self.model.encode(
            chunks,
            batch_size=batch_size,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        embeddings = self._adjust_dim(embeddings, self.TARGET_DIM)
        return chunks, embeddings

    def generate_text_embedding(self, text):
        if not self.model:
            return []
        
        # For long texts, we chunk and average the embeddings
        chunks, embeddings = self.encode_chunks(text)
        if embeddings is None or len(embeddings) == 0:
            return []
            
        import numpy as np
        avg_embedding = np.mean(embeddings, axis=0)
        avg_embedding = self._adjust_dim(avg_embedding, self.TARGET_DIM)
        return avg_embedding.tolist()

    @staticmethod
    def _adjust_dim(embeddings, target_dim: int):
        """Pad or truncate embeddings to match target_dim."""
        import numpy as np
        emb = np.asarray(embeddings, dtype=float)
        if emb.ndim == 1:
            emb = emb.reshape(1, -1)

        current_dim = emb.shape[1]
        if current_dim == target_dim:
            return emb if emb.shape[0] > 1 else emb.reshape(-1)
        if current_dim > target_dim:
            trimmed = emb[:, :target_dim]
            return trimmed if trimmed.shape[0] > 1 else trimmed.reshape(-1)

        pad_width = target_dim - current_dim
        padding = np.zeros((emb.shape[0], pad_width), dtype=emb.dtype)
        padded = np.hstack([emb, padding])
        return padded if padded.shape[0] > 1 else padded.reshape(-1)

    @staticmethod
    def hash_content(content):
        return hashlib.sha256(content.encode()).hexdigest()
