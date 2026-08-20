"""Populate the chatbot's RAG knowledge base (the "chatbot_knowledge"
ChromaDB collection -- separate from "citizen_complaints", see
app/services/chatbot_knowledge_service.py). Safe and idempotent to run
repeatedly: it upserts each document by a stable id, so re-running after
editing app/services/chatbot_knowledge_data.py (or the source constants it
reads from) updates the knowledge base in place instead of duplicating it.

Usage (from `backend/`, with the venv active):
    python ingest_chatbot_knowledge.py

By default this writes to the real presentation ChromaDB store
(`backend/data/chroma/`), same as any other normal run of the app --
that is the intended target once the chatbot ships. For a disposable
target instead (e.g. while testing this script itself), set
CITIZEN_CHROMA_DIR before running, exactly as test_config.py does for the
rest of the test suite.
"""

import logging
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

logging.basicConfig(level=logging.INFO)

from app.services.chatbot_knowledge_data import get_all_documents  # noqa: E402
from app.services.chatbot_knowledge_service import chatbot_knowledge_service, ingest_all  # noqa: E402


def main() -> int:
    documents = get_all_documents()
    print(f"Prepared {len(documents)} knowledge documents from real, source-attributed content.")
    for doc in documents:
        print(f"  - {doc['id']}  (source: {doc['source']})")

    result = ingest_all(documents)

    final_count = chatbot_knowledge_service.count()
    print(
        f"\nIngestion complete: {result['documents_processed']} documents processed, "
        f"collection size {result['collection_size_before']} -> {result['collection_size_after']}."
    )
    if final_count != len(documents):
        print(
            f"[WARN] Collection size ({final_count}) does not match the number of "
            f"documents prepared ({len(documents)}) -- investigate before trusting retrieval."
        )
        return 1

    print("[OK] Collection size matches the number of documents prepared.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
