from fastapi import APIRouter, HTTPException
from database import database
import logging

router = APIRouter(prefix="/api", tags=["references"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@router.get('/disciplines')
async def get_disciplines():
    try:
        query = ''' SELECT * FROM disciplines ORDER BY id '''
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/project_disciplines/{project_id}')
async def get_project_disciplines(project_id: int):
    try:
        query = '''
            SELECT DISTINCT 
                d.id,
                d.code,
                d."name",
                d.name_native,
                d.department_id
            FROM project_discipline_doctype_reference pddr
            JOIN disciplines d ON d.id = pddr.discipline_id
            WHERE pddr.project_id = :project_id
            ORDER BY d.id
        '''
        rows = await database.fetch_all(query, values={"project_id": project_id})
        return rows
    except Exception as e:
        logger.error(f"Error retrieving project disciplines: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving project disciplines: {str(e)}")


@router.get('/document_types')
async def get_document_types():
    try:
        query = ''' SELECT * FROM document_types ORDER BY id '''
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/project_document_types/{project_id}')
async def get_project_document_types(project_id: int):
    try:
        query = '''
            SELECT DISTINCT 
                dt.id,
                dt.code,
                dt."name",
                dt.name_native
            FROM project_discipline_doctype_reference pddr
            JOIN document_types dt ON dt.id = pddr.type_id
            WHERE pddr.project_id = :project_id 
            AND pddr.type_id IS NOT NULL
            ORDER BY dt.id
        '''
        rows = await database.fetch_all(query, values={"project_id": project_id})
        return rows
    except Exception as e:
        logger.error(f"Error retrieving project document types: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving project document types: {str(e)}")


@router.get('/project_discipline_document_types/{project_id}/{discipline_id}')
async def get_project_discipline_document_types(project_id: int, discipline_id: int):
    try:
        query = '''
            SELECT DISTINCT 
                dt.id,
                dt.code,
                dt."name",
                dt.name_native
            FROM project_discipline_doctype_reference pddr
            JOIN document_types dt ON dt.id = pddr.type_id
            WHERE pddr.project_id = :project_id 
            AND pddr.discipline_id = :discipline_id
            AND pddr.type_id IS NOT NULL
            ORDER BY dt.id
        '''
        rows = await database.fetch_all(query, values={"project_id": project_id, "discipline_id": discipline_id})
        return rows
    except Exception as e:
        logger.error(f"Error retrieving project discipline document types: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving project discipline document types: {str(e)}")


@router.get('/revision_statuses')
async def get_revision_statuses():
    try:
        query = ''' SELECT * FROM revision_statuses ORDER BY id '''
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/revision_steps')
async def get_revision_steps():
    try:
        query = ''' SELECT * FROM revision_steps ORDER BY id '''
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/project_revision_steps/{project_id}')
async def get_project_revision_steps(project_id: int):
    try:
        query = '''
            SELECT DISTINCT 
                rs.*
            FROM project_description_step_reference pdsr
            JOIN revision_steps rs ON rs.id = pdsr.step_id
            WHERE pdsr.project_id = :project_id 
            AND pdsr.step_id IS NOT NULL
            ORDER BY rs.id
        '''
        rows = await database.fetch_all(query, values={"project_id": project_id})
        return rows
    except Exception as e:
        logger.error(f"Error retrieving project revision steps: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving project revision steps: {str(e)}")


@router.get('/revision_descriptions')
async def get_revision_descriptions():
    try:
        query = ''' SELECT * FROM revision_descriptions ORDER BY id '''
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/project_revision_descriptions/{project_id}')
async def get_project_revision_descriptions(project_id: int):
    try:
        query = '''
            SELECT DISTINCT 
                rd.id,
                rd.code,
                rd.description,
                rd.description_native
            FROM project_description_step_reference pdsr
            JOIN revision_descriptions rd ON rd.id = pdsr.description_id
            WHERE pdsr.project_id = :project_id
            ORDER BY rd.id
        '''
        rows = await database.fetch_all(query, values={"project_id": project_id})
        return rows
    except Exception as e:
        logger.error(f"Error retrieving project revision descriptions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving project revision descriptions: {str(e)}")


@router.get('/project_revision_description_revision_steps/{project_id}/{description_id}')
async def get_project_revision_description_revision_steps(project_id: int, description_id: int):
    try:
        query = '''
            SELECT DISTINCT 
                rs.*
            FROM project_description_step_reference pdsr
            JOIN revision_steps rs ON rs.id = pdsr.step_id
            WHERE pdsr.project_id = :project_id
            AND pdsr.description_id = :description_id
            AND pdsr.step_id IS NOT NULL
            ORDER BY rs.id
        '''
        rows = await database.fetch_all(query, values={"project_id": project_id, "description_id": description_id})
        return rows
    except Exception as e:
        logger.error(f"Error retrieving project revision description revision steps: {str(e)}")
        raise HTTPException(status_code=500,
                            detail=f"Error retrieving project revision description revision steps: {str(e)}")


@router.get('/languages')
async def get_languages():
    try:
        query = ''' SELECT * FROM languages ORDER BY id '''
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/originators')
async def get_originators():
    try:
        query = ''' SELECT * FROM originators ORDER BY id '''
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/companies')
async def get_companies():
    try:
        query = ''' SELECT * FROM companies ORDER BY id '''
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/review_codes')
async def get_review_codes():
    try:
        query = ''' SELECT * FROM review_codes ORDER BY id '''
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
