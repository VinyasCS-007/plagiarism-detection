import argparse
import asyncio
from typing import Optional

from sqlalchemy import select

from app.core.db import AsyncSessionLocal
from app.models.document import Document
from app.services.embedding import EmbeddingService


async def backfill_embeddings(batch_size: int, limit: Optional[int], rebuild_all: bool) -> None:
    embedder = EmbeddingService()
    if not embedder.model:
        print("Embedding model unavailable. Ensure sentence-transformers is installed.")
        return

    processed = 0

    async with AsyncSessionLocal() as session:
        while True:
            query = select(Document).where(
                Document.text_content.isnot(None),
                Document.text_content != ""
            )
            if not rebuild_all:
                query = query.where(Document.embedding.is_(None))

            if limit is not None:
                remaining = max(limit - processed, 0)
                if remaining == 0:
                    break
                query = query.limit(min(batch_size, remaining))
            else:
                query = query.limit(batch_size)

            result = await session.execute(query)
            docs = result.scalars().all()
            if not docs:
                break

            for doc in docs:
                try:
                    doc.embedding = embedder.generate_text_embedding(doc.text_content)
                    processed += 1
                except Exception as exc:
                    print(f"Failed embedding for document {doc.id}: {exc}")

            await session.commit()
            print(f"Processed {processed} documents so far...")

    print(f"Backfill complete. Total processed: {processed}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill document embeddings.")
    parser.add_argument("--batch-size", type=int, default=50, help="Documents per batch")
    parser.add_argument("--limit", type=int, default=None, help="Max documents to process")
    parser.add_argument(
        "--rebuild-all",
        action="store_true",
        help="Recompute embeddings even if already present"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(backfill_embeddings(args.batch_size, args.limit, args.rebuild_all))


if __name__ == "__main__":
    main()
