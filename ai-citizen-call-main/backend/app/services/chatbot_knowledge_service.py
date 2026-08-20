"""Vector store for the chatbot's RAG knowledge base -- a SEPARATE ChromaDB
collection ("chatbot_knowledge") from the complaint duplicate-detection
collection ("citizen_complaints" in chroma_service.py). Mixing the two
would let FAQ/policy documents surface as "similar complaints" (and vice
versa) in duplicate detection -- a real correctness bug, not just
untidiness -- so this never touches `chroma_service`'s own collection or
its `add_complaint`/`query_similar` methods.

Storage is still shared, deliberately: this reuses `chroma_service.client`
(the same lazily-initialized `PersistentClient`, pointed at the same
`CITIZEN_CHROMA_DIR`-overridable directory) rather than opening a second
`PersistentClient` against the same path -- ChromaDB supports multiple
named collections per client cheaply, and a single client per process
avoids any risk of two client instances contending over the same on-disk
store. This also means the test-isolation override
`chroma_service.py`/`test_config.py` already provide is inherited for
free -- nothing here needs its own isolation logic.
"""

import logging
from typing import Any, Dict, List, Optional

from app.services.chroma_service import chroma_service
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

KNOWLEDGE_COLLECTION_NAME = "chatbot_knowledge"


class ChatbotKnowledgeService:

    def __init__(self):
        self._collection = None

    @property
    def collection(self):
        if self._collection is None:
            # Reuses chroma_service's already-initialized client rather
            # than constructing a second PersistentClient against the
            # same directory.
            self._collection = chroma_service.client.get_or_create_collection(
                name=KNOWLEDGE_COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info("ChromaDB collection '%s' ready.", KNOWLEDGE_COLLECTION_NAME)
        return self._collection

    def upsert_document(self, doc_id: str, text: str, metadata: Dict[str, Any]) -> None:
        """Insert or overwrite-in-place a knowledge document by its stable
        `doc_id`. Using `upsert` (not `add`) is what makes ingestion
        idempotent: re-running it with the same `doc_id`s replaces each
        document's embedding/text/metadata rather than adding a duplicate
        vector alongside the old one."""
        embedding = embedding_service.get_embedding(text)

        sanitized_metadata: Dict[str, Any] = {}
        for k, v in metadata.items():
            if v is None:
                sanitized_metadata[k] = ""
            elif isinstance(v, (str, int, float, bool)):
                sanitized_metadata[k] = v
            else:
                sanitized_metadata[k] = str(v)

        self.collection.upsert(
            ids=[doc_id],
            documents=[text],
            embeddings=[embedding],
            metadatas=[sanitized_metadata],
        )

    def query(self, query_text: str, n_results: int = 3) -> List[Dict[str, Any]]:
        total_items = self.collection.count()
        if total_items == 0:
            return []

        embedding = embedding_service.get_embedding(query_text)
        limit = min(n_results, total_items)
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=limit,
            include=["documents", "metadatas", "distances"],
        )

        matches = []
        if results and results.get("ids") and results["ids"][0]:
            ids = results["ids"][0]
            documents = results.get("documents", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]

            for i in range(len(ids)):
                dist = float(distances[i]) if i < len(distances) else 1.0
                similarity = max(0.0, min(1.0, round(1.0 - dist, 4)))
                matches.append(
                    {
                        "id": ids[i],
                        "document": documents[i] if i < len(documents) else "",
                        "metadata": metadatas[i] if i < len(metadatas) else {},
                        "similarity": similarity,
                    }
                )

        matches.sort(key=lambda x: x["similarity"], reverse=True)
        return matches

    def count(self) -> int:
        return self.collection.count()

    def get_all_ids(self) -> List[str]:
        return self.collection.get(include=[])["ids"]

    def clear(self) -> None:
        """Test-only / re-ingestion-reset helper -- mirrors
        chroma_service.clear_collection()."""
        try:
            chroma_service.client.delete_collection(name=KNOWLEDGE_COLLECTION_NAME)
        except Exception:
            pass
        self._collection = None


chatbot_knowledge_service = ChatbotKnowledgeService()


def ingest_all(documents: Optional[List[Dict[str, Any]]] = None) -> Dict[str, int]:
    """Upserts every knowledge document (see chatbot_knowledge_data.py) into
    the chatbot_knowledge collection. Idempotent: safe to call repeatedly --
    re-running with the same document `id`s overwrites each one in place
    rather than duplicating it (see upsert_document's docstring)."""
    from app.services import chatbot_knowledge_data

    docs = documents if documents is not None else chatbot_knowledge_data.get_all_documents()

    before = chatbot_knowledge_service.count()
    for doc in docs:
        chatbot_knowledge_service.upsert_document(
            doc_id=doc["id"],
            text=doc["text"],
            metadata={"title": doc["title"], "source": doc["source"], "topic": doc["topic"]},
        )
    after = chatbot_knowledge_service.count()

    logger.info(
        "Chatbot knowledge ingestion complete: %d documents processed, collection size %d -> %d.",
        len(docs),
        before,
        after,
    )
    return {"documents_processed": len(docs), "collection_size_before": before, "collection_size_after": after}
