from fastapi import APIRouter, HTTPException
from pydantic_schemas import TransmittalCreate
from database import database
import logging

router = APIRouter(prefix="/api", tags=["transmittals"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@router.post("/addtransmittal/")
async def post_addtransmittal(transmittal: TransmittalCreate):
    async with database.transaction():
        try:
            logger.info(f"Creating transmittal: {transmittal.transmittal_number}")
            check_query = """
                SELECT id FROM transmittals WHERE transmittal_number = :transmittal_number
            """
            existing_transmittal = await database.fetch_one(check_query, {
                "transmittal_number": transmittal.transmittal_number
            })
            if existing_transmittal:
                logger.warning(f"Transmittal number {transmittal.transmittal_number} already exists")
                raise HTTPException(status_code=400, detail="Transmittal number already exists")

            transmittal_query = """
                INSERT INTO transmittals (
                    transmittal_number,
                    type,
                    party_id,
                    issued,
                    due_date,
                    originator_id,
                    idc,
                    user_id,
                    review_code_id,
                    responded,
                    contractor_responded,
                    waiting_response_from_id,
                    remarks
                )
                VALUES (
                    :transmittal_number,
                    :type,
                    :party_id,
                    :issued,
                    :due_date,
                    :originator_id,
                    :idc,
                    :user_id,
                    :review_code_id,
                    :responded,
                    :contractor_responded,
                    :waiting_response_from_id,
                    :remarks
                )
                RETURNING id
            """
            transmittal_values = {
                "transmittal_number": transmittal.transmittal_number,
                "type": transmittal.type,
                "party_id": transmittal.party_id,
                "issued": transmittal.issued,
                "due_date": transmittal.due_date,
                "originator_id": transmittal.originator_id,
                "idc": transmittal.idc,
                "user_id": transmittal.user_id,
                "review_code_id": transmittal.review_code_id,
                "responded": transmittal.responded,
                "contractor_responded": transmittal.contractor_responded,
                "waiting_response_from_id": transmittal.waiting_response_from_id,
                "remarks": transmittal.remarks,
            }
            transmittal_id = await database.fetch_val(transmittal_query, transmittal_values)
            logger.info(f"Transmittal created with id {transmittal_id}")

            if transmittal.revision_ids:
                revision_query = """
                    INSERT INTO transmittal_revisions (transmittal_id, revision_id)
                    VALUES (:transmittal_id, :revision_id)
                """
                revision_values = [
                    {"transmittal_id": transmittal_id, "revision_id": revision_id}
                    for revision_id in transmittal.revision_ids
                ]
                await database.execute_many(revision_query, revision_values)
                logger.info(f"Linked {len(transmittal.revision_ids)} revisions to transmittal {transmittal_id}")

            response = {
                "message": "Transmittal created successfully",
                "transmittal_id": transmittal_id,
                "success": True
            }
            logger.info(f"Transmittal creation completed: {response}")
            return response

        except HTTPException as e:
            logger.error(f"HTTP error creating transmittal: {str(e)}")
            raise e
        except Exception as e:
            logger.error(f"Error creating transmittal: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create transmittal: {str(e)}")


@router.get("/transmittals")
async def get_transmittals(project_id: int):
    try:
        query = '''
            SELECT 
                t.id transmittal_id,
                t.transmittal_number,
                t."type" transmittal_type,
                TO_CHAR(t.issued, 'YYYY-MM-DD') issued,
                c."name" AS party,
                TO_CHAR(t.created, 'YYYY-MM-DD HH24:MI:SS') transmittal_created,
                TO_CHAR(t.idc, 'YYYY-MM-DD') idc,
                TO_CHAR(t.due_date, 'YYYY-MM-DD') due_date,
                o."name" originator,
                u.username,
                d.project_id
            FROM transmittals t 
            LEFT JOIN (
                SELECT transmittal_id, MAX(revision_id) AS max_revision
                FROM transmittal_revisions
                GROUP BY transmittal_id
            ) tr ON tr.transmittal_id = t.id
            LEFT JOIN document_revisions dr ON dr.id = tr.max_revision
            LEFT JOIN unique_documents d ON d.id = dr.document_id
            LEFT JOIN companies c ON c.id = t.party_id
            LEFT JOIN originators o ON o.id = t.originator_id
            LEFT JOIN users u ON u.id = t.user_id
            WHERE t.deleted = 0
            AND d.project_id = :project_id
            ORDER BY t.id DESC;
        '''
        rows = await database.fetch_all(query=query, values={"project_id": project_id})

        # Преобразуем результаты в список словарей
        processed_rows = [dict(row) for row in rows]

        return processed_rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
