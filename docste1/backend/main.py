from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic_schemas import FileData, RevisionCreate
import os
import json
from fileProperties import get_mime_type, generate_uid
from database import database
import logging
from admin import init_admin
from comments import router as comments_router
from transmittals import router as transmittals_router
from user_settings import router as user_settings_router
from project_settings import router as project_settings_router
from auth import router as auth_router, oauth2_scheme, verify_user_token
from references import router as references_router
from dotenv import load_dotenv
import aiobotocore.session
from contextlib import asynccontextmanager

app = FastAPI()

app.include_router(comments_router)
app.include_router(transmittals_router)
app.include_router(user_settings_router)
app.include_router(project_settings_router)
app.include_router(auth_router)
app.include_router(references_router)

init_admin(app)

# Логирование маршрутов
print("Registered routes:")
for route in app.routes:
    if hasattr(route, 'methods'):
        print(f"Path: {route.path}, Methods: {route.methods}")
    else:
        print(f"Path: {route.path}, Mounted app (no methods)")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "http://195.49.210.188:5173",
    "http://195.49.210.188:5173/"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv(dotenv_path=".benv.dev")

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("MINIO_BUCKET")


@asynccontextmanager
async def get_s3_client():
    session = aiobotocore.session.get_session()
    async with session.create_client(
            's3',
            endpoint_url=MINIO_ENDPOINT,
            aws_access_key_id=MINIO_ACCESS_KEY,
            aws_secret_access_key=MINIO_SECRET_KEY
    ) as client:
        yield client


@app.on_event("startup")
async def startup():
    await database.connect()


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get('/api/data')
async def get_data(project_id: int):
    try:
        query = '''
            WITH outgoing_transmittals AS (
                SELECT DISTINCT ON (tr.revision_id) 
                    tr.revision_id,
                    t.id AS outgoing_transmittal_id,
                    t.transmittal_number AS outgoing_transmittal_number,
                    TO_CHAR(t.issued, 'YYYY-MM-DD') AS outgoing_issued,
                    c."name" AS outgoing_party,
                    TO_CHAR(t.created, 'YYYY-MM-DD HH24:MI:SS') AS outgoing_transmittal_created,
                    TO_CHAR(t.idc, 'YYYY-MM-DD') AS outgoing_idc,
                    TO_CHAR(t.due_date, 'YYYY-MM-DD') AS outgoing_due_date,
                    o.id AS outgoing_originator_id,
                    o."name" AS outgoing_originator
                FROM transmittal_revisions tr
                JOIN transmittals t ON t.id = tr.transmittal_id AND t."type" = 'Outgoing'
                LEFT JOIN companies c ON c.id = t.party_id
                LEFT JOIN originators o ON o.id = t.originator_id
                ORDER BY tr.revision_id, t.issued DESC
            ), 
            incoming_transmittals AS (
                SELECT DISTINCT ON (tr.revision_id) 
                    tr.revision_id,
                    t.id AS incoming_transmittal_id,
                    t.transmittal_number AS incoming_transmittal_number,
                    TO_CHAR(t.issued, 'YYYY-MM-DD') AS incoming_issued,
                    c."name" AS incoming_party,
                    TO_CHAR(t.created, 'YYYY-MM-DD HH24:MI:SS') AS incoming_transmittal_created,
                    rc."code" AS incoming_review_code,
                    rc."name" AS incoming_review_code_status,
                    TO_CHAR(t.responded, 'YYYY-MM-DD') AS incoming_responded,
                    TO_CHAR(t.contractor_responded, 'YYYY-MM-DD') AS incoming_contractor_responded,
                    cw."name" AS incoming_waiting_response_from
                FROM transmittal_revisions tr
                JOIN transmittals t ON t.id = tr.transmittal_id AND t."type" = 'Incoming'
                LEFT JOIN companies c ON c.id = t.party_id
                LEFT JOIN companies cw ON cw.id = t.waiting_response_from_id
                LEFT JOIN review_codes rc ON rc.id = t.review_code_id
                ORDER BY tr.revision_id, t.issued DESC
            )

            SELECT
                d.id AS document_id,
                d."number" AS document_number,
                d.title AS document_title,
                d.title_native AS document_title_native,
                p."name" AS project,
                di.id AS discipline_id,
                di."name" AS discipline,
                di.code AS discipline_code,
                dt.id AS document_type_id,
                dt."name" AS document_type,
                dt.code AS document_type_code,
                l."name" AS language,
                d.drs,
                dr.id AS revision_id,
                dr.remarks,
                rs1."name" AS revision_status,
                rs2.id AS revision_step_id,
                rs2.description AS revision_step,
                rs2.code AS revision_step_code,
                rd.id AS revision_description_id,
                rd.code AS revision_code,
                rd.description AS revision_description,
                dr."number" AS revision_number,
                TO_CHAR(d.created, 'YYYY-MM-DD HH24:MI:SS') AS document_created,
                TO_CHAR(dr.created, 'YYYY-MM-DD HH24:MI:SS') AS revision_created,
                dr.user_id,
                uf.id AS file_id,
                uf.path AS file_path,
                
                -- Исходящие трансмитталы
                ot.outgoing_transmittal_id,
                ot.outgoing_transmittal_number,
                ot.outgoing_issued,
                ot.outgoing_party,
                ot.outgoing_transmittal_created,
                ot.outgoing_idc,
                ot.outgoing_due_date,
                ot.outgoing_originator_id,
                ot.outgoing_originator,

                -- Входящие трансмитталы
                it.incoming_transmittal_id,
                it.incoming_transmittal_number,
                it.incoming_issued,
                it.incoming_party,
                it.incoming_transmittal_created,
                it.incoming_review_code,
                it.incoming_review_code_status,
                it.incoming_responded,
                it.incoming_contractor_responded,
                it.incoming_waiting_response_from

            FROM unique_documents d
            LEFT JOIN document_revisions dr ON dr.document_id = d.id
            LEFT JOIN projects p ON p.id = d.project_id
            LEFT JOIN disciplines di ON di.id = d.discipline_id
            LEFT JOIN document_types dt ON dt.id = d.type_id
            LEFT JOIN revision_statuses rs1 ON rs1.id = dr.status_id
            LEFT JOIN revision_steps rs2 ON rs2.id = dr.step_id
            LEFT JOIN languages l ON l.id = d.language_id
            LEFT JOIN revision_descriptions rd ON rd.id = dr.description_id
            LEFT JOIN uploaded_files uf ON uf.revision_id = dr.id AND uf.deleted = 0
            LEFT JOIN outgoing_transmittals ot ON ot.revision_id = dr.id
            LEFT JOIN incoming_transmittals it ON it.revision_id = dr.id
            WHERE dr.deleted = 0
                AND rs1."name" = 'Active'
                AND d.project_id = :project_id
            ORDER BY dr.id DESC;
        '''
        rows = await database.fetch_all(query=query, values={"project_id": project_id})

        processed_rows = []
        async with get_s3_client() as client:
            for row in rows:
                row_dict = dict(row)
                if row_dict['file_path']:
                    file_key = row_dict['file_path']
                    file_name = file_key.split('/')[-1]
                    try:
                        presigned_url = await client.generate_presigned_url(
                            'get_object',
                            Params={'Bucket': MINIO_BUCKET, 'Key': file_key},
                            ExpiresIn=3600
                        )
                        row_dict['file_name'] = file_name
                        row_dict['file_url'] = presigned_url
                    except Exception as e:
                        logger.warning(f"Failed to generate presigned URL for {file_key}: {str(e)}")
                        row_dict['file_name'] = file_name
                        row_dict['file_url'] = None
                else:
                    row_dict['file_name'] = None
                    row_dict['file_url'] = None
                del row_dict['file_path']
                processed_rows.append(row_dict)

        return processed_rows
    except Exception as e:
        logger.error(f"Error in get_data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/document')
async def get_document(document_id: int):
    try:
        query = '''
            WITH outgoing_transmittals AS (
                SELECT DISTINCT ON (tr.revision_id) 
                    tr.revision_id,
                    t.id AS outgoing_transmittal_id,
                    t.transmittal_number AS outgoing_transmittal_number,
                    TO_CHAR(t.issued, 'YYYY-MM-DD') AS outgoing_issued,
                    c."name" AS outgoing_party,
                    TO_CHAR(t.created, 'YYYY-MM-DD HH24:MI:SS') AS outgoing_transmittal_created,
                    TO_CHAR(t.idc, 'YYYY-MM-DD') AS outgoing_idc,
                    TO_CHAR(t.due_date, 'YYYY-MM-DD') AS outgoing_due_date,
                    o."name" AS outgoing_originator
                FROM transmittal_revisions tr
                JOIN transmittals t ON t.id = tr.transmittal_id AND t."type" = 'Outgoing'
                LEFT JOIN companies c ON c.id = t.party_id
                LEFT JOIN originators o ON o.id = t.originator_id
                ORDER BY tr.revision_id, t.issued DESC
            ), 
            incoming_transmittals AS (
                SELECT DISTINCT ON (tr.revision_id) 
                    tr.revision_id,
                    t.id AS incoming_transmittal_id,
                    t.transmittal_number AS incoming_transmittal_number,
                    TO_CHAR(t.issued, 'YYYY-MM-DD') AS incoming_issued,
                    c."name" AS incoming_party,
                    TO_CHAR(t.created, 'YYYY-MM-DD HH24:MI:SS') AS incoming_transmittal_created,
                    rc."code" AS incoming_review_code,
                    rc."name" AS incoming_review_code_status,
                    TO_CHAR(t.responded, 'YYYY-MM-DD') AS incoming_responded,
                    TO_CHAR(t.contractor_responded, 'YYYY-MM-DD') AS incoming_contractor_responded,
                    cw."name" AS incoming_waiting_response_from
                FROM transmittal_revisions tr
                JOIN transmittals t ON t.id = tr.transmittal_id AND t."type" = 'Incoming'
                LEFT JOIN companies c ON c.id = t.party_id
                LEFT JOIN companies cw ON cw.id = t.waiting_response_from_id
                LEFT JOIN review_codes rc ON rc.id = t.review_code_id
                ORDER BY tr.revision_id, t.issued DESC
            )

            SELECT DISTINCT ON (dr.id)
                d.id AS document_id,
                d."number" AS document_number,
                d.title AS document_title,
                d.title_native AS document_title_native,
                p."name" AS project,
                di."name" AS discipline,
                dt."name" AS document_type,
                l."name" AS language,
                o_doc."name" AS originator,
                d.drs,
                dr.id AS revision_id,
                dr.remarks,
                rs1."name" AS revision_status,
                rs2.description AS revision_step,
                rs2.code AS revision_step_code,
                rd.description AS revision_description,
                rd.code AS revision_code,
                dr."number" AS revision_number,
                TO_CHAR(d.created, 'YYYY-MM-DD HH24:MI:SS') AS document_created,
                TO_CHAR(dr.created, 'YYYY-MM-DD HH24:MI:SS') AS revision_created,
                d.modified,
                dr.user_id,
                uf.id AS file_id,
                uf.path AS file_path,
                
                -- Исходящие трансмитталы
                ot.outgoing_transmittal_id,
                ot.outgoing_transmittal_number,
                ot.outgoing_issued,
                ot.outgoing_party,
                ot.outgoing_transmittal_created,
                ot.outgoing_idc,
                ot.outgoing_due_date,
                ot.outgoing_originator,
            
                -- Входящие трансмитталы
                it.incoming_transmittal_id,
                it.incoming_transmittal_number,
                it.incoming_issued,
                it.incoming_party,
                it.incoming_transmittal_created,
                it.incoming_review_code,
                it.incoming_review_code_status,
                it.incoming_responded,
                it.incoming_contractor_responded,
                it.incoming_waiting_response_from

            FROM document_revisions dr
            LEFT JOIN unique_documents d ON dr.document_id = d.id AND d.deleted = 0
            LEFT JOIN projects p ON p.id = d.project_id
            LEFT JOIN disciplines di ON di.id = d.discipline_id
            LEFT JOIN document_types dt ON dt.id = d.type_id
            LEFT JOIN revision_statuses rs1 ON rs1.id = dr.status_id
            LEFT JOIN revision_steps rs2 ON rs2.id = dr.step_id
            LEFT JOIN languages l ON l.id = d.language_id
            LEFT JOIN revision_descriptions rd ON rd.id = dr.description_id
            LEFT JOIN originators o_doc ON o_doc.id = d.originator_id
            LEFT JOIN uploaded_files uf ON uf.revision_id = dr.id AND uf.deleted = 0
            LEFT JOIN outgoing_transmittals ot ON ot.revision_id = dr.id
            LEFT JOIN incoming_transmittals it ON it.revision_id = dr.id

            WHERE dr.deleted = 0 AND d.id = :document_id
            ORDER BY dr.id DESC
        '''
        rows = await database.fetch_all(query=query, values={"document_id": document_id})

        processed_rows = []
        async with get_s3_client() as client:
            for row in rows:
                row_dict = dict(row)
                if row_dict['file_path']:
                    file_key = row_dict['file_path']
                    file_name = file_key.split('/')[-1]
                    try:
                        presigned_url = await client.generate_presigned_url(
                            'get_object',
                            Params={'Bucket': MINIO_BUCKET, 'Key': file_key},
                            ExpiresIn=3600
                        )
                        row_dict['file_name'] = file_name
                        row_dict['file_url'] = presigned_url
                    except Exception as e:
                        logger.warning(f"Failed to generate presigned URL for {file_key}: {str(e)}")
                        row_dict['file_name'] = file_name
                        row_dict['file_url'] = None
                else:
                    row_dict['file_name'] = None
                    row_dict['file_url'] = None
                del row_dict['file_path']
                processed_rows.append(row_dict)

        return processed_rows
    except Exception as e:
        logger.error(f"Error in get_document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/addnewdoc/")
async def post_addnewdoc(
        document_number: str = Form(...),
        document_title: str = Form(...),
        document_title_native: Optional[str] = Form(None),
        project_id: int = Form(...),
        discipline_id: int = Form(...),
        document_type_id: int = Form(...),
        language_id: Optional[int] = Form(None),
        drs: Optional[str] = Form(None),
        revision_status_id: int = Form(...),
        revision_step_id: int = Form(...),
        revision_description_id: int = Form(...),
        user_id: int = Form(...),
        files: List[UploadFile] = File(None),
        payload: dict = Depends(verify_user_token)
):
    async with database.transaction():
        try:
            logger.info(f"Creating new document: {document_number} by user {user_id}")

            # Проверка типов и размеров файлов
            allowed_extensions = {'.pdf', '.docx', '.xlsx', '.png'}
            max_file_size = 10 * 1024 * 1024  # 10 MB
            if files:
                for file in files:
                    ext = os.path.splitext(file.filename)[1].lower()
                    if ext not in allowed_extensions:
                        logger.warning(f"Invalid file type: {file.filename}")
                        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
                    content = await file.read()
                    if len(content) > max_file_size:
                        logger.warning(f"File too large: {file.filename}")
                        raise HTTPException(status_code=400, detail="File size exceeds 10MB")
                    file.file.seek(0)

            # Получаем revision_code
            revision_query = "SELECT code FROM revision_descriptions WHERE id = :revision_description_id"
            revision_result = await database.fetch_one(revision_query,
                                                       {"revision_description_id": revision_description_id})
            if not revision_result:
                logger.warning(f"Revision description with id {revision_description_id} not found")
                raise HTTPException(status_code=404, detail="Revision description not found")
            revision_code = revision_result['code']

            # Проверяем существование проекта
            project_number = await get_project_number(project_id)
            if not project_number:
                logger.warning(f"Project with id {project_id} not found")
                raise HTTPException(status_code=404, detail="Project not found")

            # Проверяем уникальность document_number
            check_query = """
                SELECT id FROM unique_documents 
                WHERE number = :number AND project_id = :project_id
            """
            existing_doc = await database.fetch_one(check_query, {
                "number": document_number,
                "project_id": project_id
            })
            if existing_doc:
                logger.warning(f"Document number {document_number} already exists in project {project_id}")
                raise HTTPException(status_code=400, detail="Document number already exists in this project")

            # Сохраняем документ
            document_query = '''
                INSERT INTO unique_documents (
                    number, title, title_native, project_id, discipline_id, type_id, 
                    language_id, drs
                )
                VALUES (:number, :title, :title_native, :project_id, :discipline_id, :type_id, 
                        :language_id, :drs)
                RETURNING id
            '''
            document_values = {
                "number": document_number,
                "title": document_title,
                "title_native": document_title_native,
                "project_id": project_id,
                "discipline_id": discipline_id,
                "type_id": document_type_id,
                "language_id": language_id,
                "drs": drs
            }
            document_result = await database.fetch_one(document_query, document_values)
            document_id = document_result['id']
            logger.info(f"Document created with id {document_id}")

            # Устанавливаем начальный номер ревизии
            revision_number = "01"

            # Формируем ключ для MinIO
            revision_key_prefix = f"{project_number}/{document_number}/{revision_code}{revision_number}_{revision_description_id}"

            # Сохраняем ревизию
            revision_query = '''
                INSERT INTO document_revisions (
                    document_id, status_id, step_id, description_id, "number", user_id
                )
                VALUES (:document_id, :status_id, :step_id, :description_id, :number, :user_id)
                RETURNING id
            '''
            revision_values = {
                "document_id": document_id,
                "status_id": revision_status_id,
                "step_id": revision_step_id,
                "description_id": revision_description_id,
                "number": revision_number,
                "user_id": user_id
            }
            revision_id = await database.fetch_val(revision_query, revision_values)
            logger.info(f"Revision created with id {revision_id}")

            # Загружаем файлы в MinIO
            saved_files = []
            if files:
                async with get_s3_client() as client:
                    for file in files:
                        file_key = f"{revision_key_prefix}/{file.filename}"
                        await client.put_object(
                            Bucket=MINIO_BUCKET,
                            Key=file_key,
                            Body=await file.read()
                        )
                        logger.info(f"File uploaded to MinIO: {file_key}")

                        file_query = """
                            INSERT INTO uploaded_files (path, revision_id)
                            VALUES (:path, :revision_id)
                            RETURNING id
                        """
                        file_values = {
                            "path": file_key,
                            "revision_id": revision_id
                        }
                        file_id = await database.fetch_val(file_query, file_values)
                        saved_files.append({
                            "file_id": file_id,
                            "file_name": file.filename,
                            "file_path": file_key,
                        })

            response = {
                "message": "Document, revision, and files created successfully",
                "document_id": document_id,
                "revision_id": revision_id,
                "revision_number": revision_number,
                "revision_path": revision_key_prefix,
                "files": saved_files,
                "success": True
            }
            logger.info(f"Document creation completed successfully: {response}")
            return response

        except HTTPException as e:
            logger.error(f"HTTP error creating document: {str(e)}")
            raise e
        except Exception as e:
            logger.error(f"Error creating document with files: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create document: {str(e)}")


@app.put('/api/upddoc/{id}')
async def put_upddoc(id: int, update_data: dict, payload: dict = Depends(verify_user_token)):
    if not update_data:
        logger.warning("No update data provided")
        raise HTTPException(status_code=400, detail="No update data provided")

    allowed_document_fields = {
        'number': 'number',
        'title': 'title',
        'title_native': 'title_native',
        'discipline_id': 'discipline_id',
        'type_id': 'type_id',
        'language_id': 'language_id',
        'drs': 'drs'
    }

    allowed_revision_fields = {
        'status_id': 'status_id',
        'step_id': 'step_id',
        'description_id': 'description_id'
    }

    revision_id = update_data.get('revision_id')
    if revision_id is not None:
        try:
            revision_id = int(revision_id)
        except (ValueError, TypeError):
            logger.error(f"Invalid revision_id: {revision_id}")
            raise HTTPException(status_code=400, detail="revision_id must be an integer")

    logger.info(f"Received request for document {id} with data: {update_data}")

    try:
        async with database.transaction():
            current_doc_query = '''
                SELECT number, project_id 
                FROM unique_documents 
                WHERE id = :id
            '''
            current_doc = await database.fetch_one(query=current_doc_query, values={"id": id})
            if not current_doc:
                logger.warning(f"Document with id {id} not found")
                raise HTTPException(status_code=404, detail="Document not found")

            current_document_number = current_doc['number']
            project_id = current_doc['project_id']

            document_data = {k: v for k, v in update_data.items() if k in allowed_document_fields}
            updated_document_id = None
            if document_data:
                logger.info(f"Updating unique_documents with data: {document_data}")
                set_clause = ', '.join(
                    [f'"{allowed_document_fields[column]}" = :{column}' for column in document_data.keys()])
                query = f'''
                    UPDATE unique_documents
                    SET {set_clause}
                    WHERE id = :id
                    RETURNING id
                '''
                values = {"id": id, **document_data}
                updated_document_id = await database.fetch_val(query=query, values=values)

                if not updated_document_id:
                    logger.error(f"Failed to update document {id}")
                    raise HTTPException(status_code=500, detail="Failed to update document")

                logger.info(f"Document {id} updated successfully")

                new_document_number = document_data.get('number')
                if new_document_number and new_document_number != current_document_number:
                    logger.info(f"Document number changed from {current_document_number} to {new_document_number}")

                    project_number = await get_project_number(project_id)
                    if not project_number:
                        logger.warning(f"Project with id {project_id} not found")
                        raise HTTPException(status_code=404, detail="Project not found")

                    async with get_s3_client() as client:
                        file_query = '''
                            SELECT path 
                            FROM uploaded_files 
                            WHERE revision_id IN (
                                SELECT id FROM document_revisions WHERE document_id = :document_id AND deleted = 0
                            ) AND deleted = 0
                        '''
                        files = await database.fetch_all(query=file_query, values={"document_id": id})

                        for file in files:
                            old_key = file['path']
                            if old_key.startswith(f"{project_number}/{current_document_number}/"):
                                new_key = old_key.replace(
                                    f"{project_number}/{current_document_number}/",
                                    f"{project_number}/{new_document_number}/"
                                )
                                await client.copy_object(
                                    Bucket=MINIO_BUCKET,
                                    CopySource={'Bucket': MINIO_BUCKET, 'Key': old_key},
                                    Key=new_key
                                )
                                await client.delete_object(Bucket=MINIO_BUCKET, Key=old_key)
                                logger.info(f"Moved file in MinIO from {old_key} to {new_key}")

                                update_file_query = '''
                                    UPDATE uploaded_files 
                                    SET path = :new_path 
                                    WHERE path = :old_path AND deleted = 0
                                '''
                                await database.execute(update_file_query, {
                                    "old_path": old_key,
                                    "new_path": new_key
                                })

            revision_data = {k: v for k, v in update_data.items() if k in allowed_revision_fields}
            updated_revision_id = None
            if revision_data:
                if not revision_id:
                    logger.warning("Revision data provided but revision_id is missing")
                    raise HTTPException(status_code=400, detail="revision_id is required for updating revision")

                logger.info(f"Updating document_revisions with data: {revision_data} for revision {revision_id}")
                check_revision_query = '''
                    SELECT id FROM document_revisions 
                    WHERE id = :revision_id AND document_id = :document_id AND deleted = 0
                '''
                revision = await database.fetch_one(
                    query=check_revision_query,
                    values={"revision_id": revision_id, "document_id": id}
                )
                if not revision:
                    logger.warning(f"Revision with id {revision_id} for document {id} not found")
                    raise HTTPException(status_code=404, detail="Revision not found")

                for field in revision_data:
                    if revision_data[field] is not None:
                        try:
                            revision_data[field] = int(revision_data[field])
                        except (ValueError, TypeError):
                            logger.error(f"Invalid value for {field}: {revision_data[field]}")
                            raise HTTPException(status_code=400, detail=f"{field} must be an integer")

                set_clause = ', '.join(
                    [f'"{allowed_revision_fields[column]}" = :{column}' for column in revision_data.keys()])
                query = f'''
                    UPDATE document_revisions
                    SET {set_clause}
                    WHERE id = :revision_id
                    RETURNING id
                '''
                values = {"revision_id": revision_id, **revision_data}
                updated_revision_id = await database.fetch_val(query=query, values=values)

                if not updated_revision_id:
                    logger.error(f"Failed to update revision {revision_id}")
                    raise HTTPException(status_code=500, detail="Failed to update revision")

                logger.info(f"Revision {revision_id} updated successfully")

            if not document_data and not revision_data:
                logger.warning("No valid fields provided for update")
                raise HTTPException(status_code=400, detail="No valid fields provided for update")

            response = {'message': 'Update successful'}
            if updated_document_id:
                response['document_id'] = updated_document_id
            if updated_revision_id:
                response['revision_id'] = updated_revision_id

            logger.info(f"Response: {response}")
            return response

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating document or revision {id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@app.put('/api/deldoc/{id}')
async def put_deldoc(id: int, payload: dict = Depends(verify_user_token)):
    try:
        query = '''
            UPDATE unique_documents
            SET deleted = 1
            WHERE id = :id
        '''
        await database.execute(query=query, values={"id": id})

        return {'message': 'Document deleted successfully'}

    except Exception as e:
        logger.error(f"Error deleting document {id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


async def get_project_number(project_id: int) -> str | None:
    query = "SELECT number FROM projects WHERE id = :project_id"
    result = await database.fetch_one(query=query, values={"project_id": project_id})
    return result["number"] if result else None


@app.post("/api/uploadfiles/")
async def upload_files(
        project_id: int = Form(...),
        revision_id: int = Form(...),
        files: Optional[UploadFile] = File(None),
        deleted_files: str = Form(None),
        payload: dict = Depends(verify_user_token)
):
    async with database.transaction():
        try:
            # Проверка типов и размеров файлов
            allowed_extensions = {'.pdf', '.docx', '.xlsx', '.png'}
            max_file_size = 10 * 1024 * 1024  # 10 MB
            if files:
                ext = os.path.splitext(files.filename)[1].lower()
                if ext not in allowed_extensions:
                    logger.warning(f"Invalid file type: {files.filename}")
                    raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
                content = await files.read()
                if len(content) > max_file_size:
                    logger.warning(f"File too large: {files.filename}")
                    raise HTTPException(status_code=400, detail="File size exceeds 10MB")
                files.file.seek(0)

            document_query = """
                SELECT number FROM unique_documents WHERE id = (
                    SELECT document_id FROM document_revisions WHERE id = :revision_id
                )
            """
            document_result = await database.fetch_one(document_query, {"revision_id": revision_id})
            if not document_result:
                raise HTTPException(status_code=404, detail="Document not found")
            document_number = document_result['number']

            revision_query = """
                SELECT rd.code, dr.number, dr.description_id
                FROM document_revisions dr
                LEFT JOIN revision_descriptions rd ON rd.id = dr.description_id
                WHERE dr.id = :revision_id AND dr.deleted = 0
            """
            revision_result = await database.fetch_one(revision_query, {"revision_id": revision_id})
            if not revision_result:
                raise HTTPException(status_code=404, detail="Revision not found")
            revision_code = revision_result['code']
            revision_number = revision_result['number']
            description_id = revision_result['description_id']

            project_number = await get_project_number(project_id)
            if not project_number:
                raise HTTPException(status_code=404, detail="Project not found")

            revision_key_prefix = f"{project_number}/{document_number}/{revision_code}{revision_number}_{description_id}"

            # Обработка удалённых файлов
            if deleted_files:
                deleted_file_ids = json.loads(deleted_files)
                if deleted_file_ids:
                    logger.info(f"Processing deletion for file IDs: {deleted_file_ids}")
                    async with get_s3_client() as client:
                        for file_id in deleted_file_ids:
                            file_query = """
                                SELECT path 
                                FROM uploaded_files 
                                WHERE id = :file_id AND revision_id = :revision_id AND deleted = 0
                            """
                            file_result = await database.fetch_one(file_query,
                                                                   {"file_id": file_id, "revision_id": revision_id})
                            if file_result:
                                file_key = file_result['path']
                                try:
                                    await client.delete_object(Bucket=MINIO_BUCKET, Key=file_key)
                                    logger.info(f"Deleted file from MinIO: {file_key}")
                                except Exception as e:
                                    logger.warning(f"Failed to delete file {file_key}: {str(e)}")
                                delete_query = """
                                    UPDATE uploaded_files
                                    SET deleted = 1
                                    WHERE id = :file_id AND revision_id = :revision_id
                                """
                                await database.execute(delete_query, {"file_id": file_id, "revision_id": revision_id})

            # Сохранение нового файла
            saved_files = []
            if files:
                async with get_s3_client() as client:
                    file_key = f"{revision_key_prefix}/{files.filename}"
                    await client.put_object(
                        Bucket=MINIO_BUCKET,
                        Key=file_key,
                        Body=await files.read()
                    )
                    logger.info(f"File uploaded to MinIO: {file_key}")

                    file_query = """
                        INSERT INTO uploaded_files (path, revision_id)
                        VALUES (:path, :revision_id)
                        RETURNING id
                    """
                    values = {"path": file_key, "revision_id": revision_id}
                    file_id = await database.fetch_val(file_query, values)
                    saved_files.append({
                        "file_id": file_id,
                        "file_name": files.filename,
                        "file_path": file_key,
                    })

            return {
                "message": "File uploaded successfully",
                "files": saved_files,
                "success": True
            }

        except Exception as e:
            logger.error(f"Error uploading file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@app.get('/api/getfiles/{revision_id}', response_model=List[FileData])
async def get_files(revision_id: int, payload: dict = Depends(verify_user_token)):
    logger.info(f"Fetching files for revision_id: {revision_id}, user: {payload.get('sub')}")
    query = '''
        SELECT id, path
        FROM uploaded_files
        WHERE revision_id = :revision_id AND deleted = 0
    '''
    try:
        rows = await database.fetch_all(query=query, values={"revision_id": revision_id})
        files = []
        async with get_s3_client() as client:
            for row in rows:
                file_key = row["path"]
                file_name = file_key.split('/')[-1]

                presigned_url = await client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': MINIO_BUCKET, 'Key': file_key},
                    ExpiresIn=3600
                )

                try:
                    head = await client.head_object(Bucket=MINIO_BUCKET, Key=file_key)
                    file_size = head['ContentLength']
                    mime_type = head.get('ContentType', get_mime_type(os.path.splitext(file_name)[1]))
                except Exception:
                    file_size = 0
                    mime_type = get_mime_type(os.path.splitext(file_name)[1])

                files.append(FileData(
                    uid=generate_uid(),
                    file_id=row["id"],
                    file_name=file_name,
                    mime_type=mime_type,
                    file_size=file_size,
                    status="done",
                    url=presigned_url
                ))
        return files
    except Exception as e:
        logger.error(f"Error retrieving files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving files: {str(e)}")


@app.get('/api/download_file/{file_id}')
async def download_file(file_id: int, payload: dict = Depends(verify_user_token)):
    try:
        query = '''
            SELECT path
            FROM uploaded_files
            WHERE id = :file_id AND deleted = 0
        '''
        file_result = await database.fetch_one(query=query, values={"file_id": file_id})
        if not file_result:
            raise HTTPException(status_code=404, detail="File not found")

        file_key = file_result['path']
        file_name = file_key.split('/')[-1]

        async with get_s3_client() as client:
            response = await client.get_object(Bucket=MINIO_BUCKET, Key=file_key)
            content = response['Body']

            return StreamingResponse(
                content,
                media_type=get_mime_type(os.path.splitext(file_name)[1]),
                headers={"Content-Disposition": f"attachment; filename={file_name}"}
            )
    except Exception as e:
        logger.error(f"Error downloading file {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")


@app.post("/api/addrevision/")
async def post_addrevision(
        revision: str = Form(...),
        files: Optional[UploadFile] = File(None),
        payload: dict = Depends(verify_user_token)
):
    try:
        revision_data = RevisionCreate(**json.loads(revision))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid revision data: {str(e)}")

    async with database.transaction():
        try:
            # Проверка типов и размеров файлов
            allowed_extensions = {'.pdf', '.docx', '.xlsx', '.png'}
            max_file_size = 10 * 1024 * 1024  # 10 MB
            if files:
                ext = os.path.splitext(files.filename)[1].lower()
                if ext not in allowed_extensions:
                    logger.warning(f"Invalid file type: {files.filename}")
                    raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
                content = await files.read()
                if len(content) > max_file_size:
                    logger.warning(f"File too large: {files.filename}")
                    raise HTTPException(status_code=400, detail="File size exceeds 10MB")
                files.file.seek(0)

            # Получаем revision_code
            revision_query = "SELECT code FROM revision_descriptions WHERE id = :description_id"
            revision_result = await database.fetch_one(revision_query, {"description_id": revision_data.description_id})
            revision_code = revision_result['code'] if revision_result else 'K'

            # Получаем document_number
            doc_query = '''
                SELECT number 
                FROM unique_documents 
                WHERE id = :document_id
            '''
            doc_result = await database.fetch_one(doc_query, {"document_id": revision_data.document_id})
            if not doc_result:
                raise HTTPException(status_code=404, detail="Document not found")
            document_number = doc_result['number']

            # Получаем project_number
            project_number = await get_project_number(revision_data.project_id)
            if not project_number:
                raise HTTPException(status_code=404, detail="Project not found")

            # Определяем номер ревизии
            last_revision_query = '''
                SELECT number 
                FROM document_revisions 
                WHERE document_id = :document_id 
                AND description_id = :description_id 
                AND deleted = 0 
                ORDER BY number DESC 
                LIMIT 1
            '''
            last_revision = await database.fetch_one(
                last_revision_query,
                {"document_id": revision_data.document_id, "description_id": revision_data.description_id}
            )
            revision_number = revision_data.number if not last_revision else f"{int(last_revision['number']) + 1:02d}"

            # Обновляем предыдущую ревизию
            if revision_data.status_id == 1:
                query_prev_revision = '''
                    SELECT id 
                    FROM document_revisions 
                    WHERE document_id = :document_id 
                    AND status_id = 1 
                    AND deleted = 0
                    ORDER BY created DESC
                    LIMIT 1
                '''
                prev_revision = await database.fetch_one(query=query_prev_revision,
                                                         values={"document_id": revision_data.document_id})

                if prev_revision:
                    query_update_prev = '''
                        UPDATE document_revisions 
                        SET status_id = 5 
                        WHERE id = :revision_id
                    '''
                    await database.execute(query=query_update_prev, values={"revision_id": prev_revision['id']})

            # Формируем ключ для MinIO
            revision_key_prefix = f"{project_number}/{document_number}/{revision_code}{revision_number}_{revision_data.description_id}"

            # Создаем ревизию
            revision_query = '''
                INSERT INTO document_revisions (
                    document_id, status_id, step_id, description_id, "number", user_id
                )
                VALUES (:document_id, :status_id, :step_id, :description_id, :number, :user_id)
                RETURNING id
            '''
            revision_values = {
                "document_id": revision_data.document_id,
                "status_id": revision_data.status_id,
                "step_id": revision_data.step_id,
                "description_id": revision_data.description_id,
                "number": revision_number,
                "user_id": revision_data.user_id
            }
            revision_id = await database.fetch_val(revision_query, revision_values)

            # Сохраняем файл в MinIO
            saved_files = []
            if files:
                async with get_s3_client() as client:
                    file_key = f"{revision_key_prefix}/{files.filename}"
                    await client.put_object(
                        Bucket=MINIO_BUCKET,
                        Key=file_key,
                        Body=await files.read()
                    )
                    logger.info(f"File uploaded to MinIO: {file_key}")

                    file_query = """
                        INSERT INTO uploaded_files (path, revision_id)
                        VALUES (:path, :revision_id)
                        RETURNING id
                    """
                    file_values = {"path": file_key, "revision_id": revision_id}
                    file_id = await database.fetch_val(file_query, file_values)

                    saved_files.append({
                        "file_id": file_id,
                        "file_name": files.filename,
                        "file_path": file_key,
                    })

            return {
                "message": "Revision and file created successfully",
                "revision_id": revision_id,
                "revision_number": revision_number,
                "revision_path": revision_key_prefix,
                "files": saved_files,
                "success": True
            }
        except Exception as e:
            logger.error(f"Error creating revision with file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create revision: {str(e)}")
