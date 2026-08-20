"""Chatbot RAG knowledge-base tests -- Stage 1 only (see MASTER_TODO.md's
RAG chatbot item). Covers: the "chatbot_knowledge" collection is separate
from "citizen_complaints"; ingestion populates the expected real,
source-attributed documents; repeated ingestion is idempotent (no
duplicate vectors); ingesting/querying the knowledge base never touches
the complaint duplicate-detection collection; and the SLA answer is
unambiguous and traceable to sla_service.py.

Uses the isolated test ChromaDB (backend/data/test/chroma via
test_config.py) -- never the presentation ChromaDB. No /chatbot/message
endpoint exists yet; this exercises the service layer directly.
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import test_config  # noqa: F401 -- must run before any `app.*` import; isolates ChromaDB

from app.services import chatbot_knowledge_data
from app.services.chatbot_knowledge_service import chatbot_knowledge_service, ingest_all
from app.services.chroma_service import chroma_service


def run_tests():
    print("==================================================")
    print("STARTING CHATBOT KNOWLEDGE BASE TESTS (Stage 1)")
    print("==================================================")

    # Fresh state for both collections so this test's assertions don't
    # depend on what ran before it in the same process (run_tests.py runs
    # every test module in-process).
    chatbot_knowledge_service.clear()
    chroma_service.clear_collection()

    # --- TEST 1: the two collections are genuinely separate ---
    print("\n--- [TEST 1] chatbot_knowledge IS SEPARATE FROM citizen_complaints ---")
    assert chatbot_knowledge_service.collection.name == "chatbot_knowledge"
    assert chroma_service.collection.name == "citizen_complaints"
    assert chatbot_knowledge_service.collection.name != chroma_service.collection.name
    # Same underlying client/storage -- not a second PersistentClient
    # against the same path. Proven via the public API: both collection
    # names are visible from the one client both services were built on.
    client_collection_names = {c.name for c in chroma_service.client.list_collections()}
    assert {"chatbot_knowledge", "citizen_complaints"} <= client_collection_names
    print("[OK] TEST 1 PASSED: distinct named collections sharing one ChromaDB client.")

    # --- TEST 2: ingestion produces the expected real documents ---
    print("\n--- [TEST 2] INGESTION POPULATES EXPECTED REAL DOCUMENTS ---")
    documents = chatbot_knowledge_data.get_all_documents()
    expected_ids = {d["id"] for d in documents}

    # No synthetic/complaint/user content: every document must carry a
    # real source file path, and none may reference complaint or user data.
    for doc in documents:
        assert doc["source"], f"document {doc['id']} has no source attribution"
        assert ".py" in doc["source"] or ".ts" in doc["source"] or ".md" in doc["source"], (
            f"document {doc['id']}'s source '{doc['source']}' doesn't look like a real repo file"
        )
        assert "complaint_id" not in doc["text"].lower().replace(" ", "_")
        assert "CMP-" not in doc["text"]

    result = ingest_all(documents)
    assert result["documents_processed"] == len(documents)
    assert result["collection_size_after"] == len(documents), (
        f"expected {len(documents)} vectors after ingestion, got {result['collection_size_after']}"
    )

    stored_ids = set(chatbot_knowledge_service.get_all_ids())
    assert stored_ids == expected_ids, f"stored ids don't match expected: missing={expected_ids - stored_ids}, extra={stored_ids - expected_ids}"

    # Spot-check the specific sources this stage was scoped to.
    sources = {d["source"].split(" (")[0] for d in documents}
    assert "backend/app/services/sla_service.py" in sources
    assert "backend/app/services/department_routing.py" in sources
    assert "govportal-citizen-assistant/src/data/mockData.ts" in sources
    assert "README.md" in sources
    print(f"[OK] TEST 2 PASSED: {len(documents)} real documents ingested, ids match expected set, all source-attributed.")

    # --- TEST 3: repeated ingestion is idempotent ---
    print("\n--- [TEST 3] REPEATED INGESTION IS IDEMPOTENT ---")
    count_after_first = chatbot_knowledge_service.count()
    ingest_all(documents)
    ingest_all(documents)
    count_after_repeats = chatbot_knowledge_service.count()
    assert count_after_repeats == count_after_first, (
        f"collection size changed after re-ingestion ({count_after_first} -> {count_after_repeats}); "
        "ingestion must upsert by stable id, not duplicate"
    )
    print(f"[OK] TEST 3 PASSED: collection size stayed at {count_after_repeats} across 3 ingestion runs.")

    # --- TEST 4: complaint duplicate-detection collection is untouched ---
    print("\n--- [TEST 4] COMPLAINT COLLECTION UNTOUCHED BY CHATBOT INGESTION ---")
    assert chroma_service.count_complaints() == 0, (
        "citizen_complaints should have zero vectors -- chatbot ingestion must never write there"
    )
    # Add a real complaint vector the normal way, then re-run chatbot
    # ingestion, and confirm the complaint collection is still exactly 1 --
    # untouched by an unrelated knowledge-base re-ingestion.
    from app.services.embedding_service import embedding_service

    chroma_service.add_complaint(
        complaint_id="CMP-ISOLATION-TEST",
        document="test complaint for isolation check",
        embedding=embedding_service.get_embedding("test complaint for isolation check"),
        metadata={"category": "Other", "department": "Other"},
    )
    assert chroma_service.count_complaints() == 1
    ingest_all(documents)
    assert chroma_service.count_complaints() == 1, "chatbot knowledge ingestion must not affect citizen_complaints"
    assert chatbot_knowledge_service.count() == len(documents), "chatbot_knowledge collection size should be unaffected by complaint writes"
    print("[OK] TEST 4 PASSED: citizen_complaints and chatbot_knowledge remain fully isolated from each other's writes.")

    # --- TEST 5: SLA answer is unambiguous and traceable to sla_service.py ---
    print("\n--- [TEST 5] SLA ANSWER IS UNAMBIGUOUS AND SOURCE-TRACEABLE ---")
    results = chatbot_knowledge_service.query("how long does a high priority complaint take to resolve?", n_results=1)
    assert len(results) == 1
    top = results[0]
    assert top["id"] == "sla-policy", f"expected the sla-policy document to be the top match, got '{top['id']}'"
    assert top["metadata"]["source"] == "backend/app/services/sla_service.py (SLA_DURATIONS_HOURS, SLA_AT_RISK_PERCENT)"
    assert "8 hours" in top["document"], "SLA document should state the real High-priority duration (8 hours)"
    assert "48" not in top["document"], "SLA document must not contain the frontend's unresolved '48 hours' figure"
    print("[OK] TEST 5 PASSED: SLA retrieval returns exactly one authoritative, source-traceable answer (8h High priority, no '48h' conflict).")

    print("\n==================================================")
    print("ALL CHATBOT KNOWLEDGE BASE TESTS PASSED!")
    print("==================================================")

    # Leave both collections clean for whichever test runs next in the
    # same process.
    chatbot_knowledge_service.clear()
    chroma_service.clear_collection()


if __name__ == "__main__":
    run_tests()
