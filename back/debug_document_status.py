import sys
import os

# Добавляем текущую директорию в путь импорта
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.document import Document, DocumentRevision
from app.models.transmittal import Transmittal, TransmittalRevision
from app.models.references import WorkflowStatus, RevisionDescription

def check_document(doc_number_pattern):
    db = SessionLocal()
    try:
        print(f"--- Searching for Documents like: {doc_number_pattern} (Project ID: 27, Not Deleted) ---")
        docs = db.query(Document).filter(
            Document.number.like(f"%{doc_number_pattern}%"),
            Document.project_id == 27,
            Document.is_deleted == 0
        ).all()
        
        if not docs:
            print(f"No documents found matching '{doc_number_pattern}' in project 27.")
            return

        for doc in docs:
            print(f"\nDOCUMENT ID: {doc.id} | Number: {doc.number}")
            print(f"Title: {doc.title}")
            print(f"Project ID: {doc.project_id}")
            
            revisions = db.query(DocumentRevision).filter(DocumentRevision.document_id == doc.id).order_by(DocumentRevision.created_at).all()
            
            print(f"Found {len(revisions)} revisions:")
        
        for rev in revisions:
            wf_status = db.query(WorkflowStatus).filter(WorkflowStatus.id == rev.workflow_status_id).first()
            wf_status_name = wf_status.name if wf_status else "None"
            
            print(f"REV:{rev.id} | WF:{wf_status_name}({rev.workflow_status_id})", flush=True)
            
            links = db.query(TransmittalRevision, Transmittal).join(
                Transmittal, Transmittal.id == TransmittalRevision.transmittal_id
            ).filter(TransmittalRevision.revision_id == rev.id).all()
            
            for tr_rev, tr in links:
                 print(f" -> TR:{tr.id} | DIR:{tr.direction} | CCS:{tr_rev.ccs_status}", flush=True)

    finally:
        db.close()

if __name__ == "__main__":
    check_document("020-3300-PPP-DSW-20222-05")
