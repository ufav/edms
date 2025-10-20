from fastapi import APIRouter, HTTPException
from pydantic_schemas import DisciplineReference, DocTypeReference, RevisionDescriptionReference, RevisionStepReference, \
    Project
from database import database
from typing import List
import logging
import os

router = APIRouter(prefix="/api", tags=["project_settings"])

logging.basicConfig(level=logging.INFO, filename="api.log", filemode="a",
                    format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@router.get('/projects')
async def get_projects():
    query = '''
        SELECT id, number, name, name_native 
        FROM projects 
        ORDER BY id
    '''
    try:
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching projects: {str(e)}")


@router.post("/save_discipline_references")
async def save_discipline_references(references: List[DisciplineReference]):
    try:
        if not references:
            # Если список пустой, удаляем все записи для project_id
            project_id = references[0].project_id if references else None
            if project_id:
                delete_query = '''
                    DELETE FROM project_discipline_doctype_reference
                    WHERE project_id = :project_id
                '''
                await database.execute(delete_query, {"project_id": project_id})
            return {'message': 'Discipline references updated successfully (all removed)'}

        project_id = references[0].project_id  # Предполагаем, что все записи для одного проекта
        new_discipline_ids = {ref.discipline_id for ref in references}  # Множество новых discipline_id

        # Получаем текущие discipline_id из базы для project_id
        current_query = '''
            SELECT discipline_id
            FROM project_discipline_doctype_reference
            WHERE project_id = :project_id
        '''
        current_rows = await database.fetch_all(current_query, {"project_id": project_id})
        current_discipline_ids = {row['discipline_id'] for row in current_rows}

        # Определяем, что нужно добавить и удалить
        to_add = new_discipline_ids - current_discipline_ids  # Новые discipline_id, которых нет в базе
        to_remove = current_discipline_ids - new_discipline_ids  # Старые discipline_id, которых нет в новом списке

        async with database.transaction():
            # Добавляем новые записи
            if to_add:
                insert_query = '''
                    INSERT INTO project_discipline_doctype_reference (project_id, discipline_id)
                    VALUES (:project_id, :discipline_id)
                    RETURNING id
                '''
                insert_values = [{"project_id": project_id, "discipline_id": discipline_id} for discipline_id in to_add]
                await database.execute_many(insert_query, insert_values)
                logger.info(f"Added {len(to_add)} new discipline references for project {project_id}")

            # Удаляем старые записи
            if to_remove:
                delete_query = '''
                    DELETE FROM project_discipline_doctype_reference
                    WHERE project_id = :project_id AND discipline_id = :discipline_id
                '''
                delete_values = [{"project_id": project_id, "discipline_id": discipline_id} for discipline_id in
                                 to_remove]
                await database.execute_many(delete_query, delete_values)
                logger.info(f"Removed {len(to_remove)} discipline references for project {project_id}")

        return {'message': 'Discipline references updated successfully'}

    except Exception as e:
        logger.error(f"Error updating discipline references: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating discipline references: {str(e)}")


@router.get('/get_discipline_references/{project_id}')
async def get_discipline_references(project_id: int):
    try:
        query = '''
            SELECT DISTINCT 
                CAST(p.discipline_id AS TEXT) AS discipline_id,
                d.code,
                d."name"
            FROM project_discipline_doctype_reference p
            LEFT JOIN disciplines d ON d.id = p.discipline_id
            WHERE p.project_id = :project_id
        '''
        rows = await database.fetch_all(query, values={"project_id": project_id})
        return rows
    except Exception as e:
        logger.error(f"Error retrieving discipline references: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving discipline references: {str(e)}")


@router.get('/get_doctype_references/{project_id}/{discipline_id}')
async def get_doctype_references(project_id: int, discipline_id: int):
    try:
        query = '''
            SELECT 
                CAST(p.id AS TEXT) AS id,
                CAST(p.project_id AS TEXT) AS project_id,
                CAST(p.discipline_id AS TEXT) AS discipline_id,
                CAST(p.type_id AS TEXT) AS type_id,
                dt.code,
                dt."name"
            FROM project_discipline_doctype_reference p
            LEFT JOIN document_types dt ON dt.id = p.type_id
            WHERE p.project_id = :project_id AND p.discipline_id = :discipline_id AND p.type_id IS NOT NULL
        '''
        rows = await database.fetch_all(query, values={"project_id": project_id, "discipline_id": discipline_id})
        return rows
    except Exception as e:
        logger.error(f"Error retrieving doctype references: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving doctype references: {str(e)}")


@router.post("/save_doctype_references")
async def save_doctype_references(references: List[DocTypeReference]):
    try:
        logger.info(f"Received references: {references}")
        if not references:
            # Если список пустой, ничего не делаем или удаляем все записи для project_id
            return {'message': 'No references provided, nothing to update'}

        project_id = references[0].project_id  # Предполагаем, что все записи для одного проекта

        # Группируем новые данные по discipline_id
        new_references_by_discipline = {}
        for ref in references:
            if ref.discipline_id not in new_references_by_discipline:
                new_references_by_discipline[ref.discipline_id] = set()
            new_references_by_discipline[ref.discipline_id].add(ref.type_id)

        # Получаем текущие данные из базы для project_id
        current_query = '''
            SELECT discipline_id, type_id
            FROM project_discipline_doctype_reference
            WHERE project_id = :project_id AND type_id IS NOT NULL
        '''
        current_rows = await database.fetch_all(current_query, {"project_id": project_id})
        current_references_by_discipline = {}
        for row in current_rows:
            if row['discipline_id'] not in current_references_by_discipline:
                current_references_by_discipline[row['discipline_id']] = set()
            current_references_by_discipline[row['discipline_id']].add(row['type_id'])

        async with database.transaction():
            # Удаляем старые записи, которых нет в новом списке
            for discipline_id in current_references_by_discipline:
                current_type_ids = current_references_by_discipline[discipline_id]
                new_type_ids = new_references_by_discipline.get(discipline_id, set())
                to_remove = current_type_ids - new_type_ids
                if to_remove:
                    delete_query = '''
                        DELETE FROM project_discipline_doctype_reference
                        WHERE project_id = :project_id AND discipline_id = :discipline_id AND type_id = :type_id
                    '''
                    delete_values = [
                        {"project_id": project_id, "discipline_id": discipline_id, "type_id": type_id}
                        for type_id in to_remove
                    ]
                    await database.execute_many(delete_query, delete_values)
                    logger.info(
                        f"Removed {len(to_remove)} doctype references for project {project_id}, discipline {discipline_id}")

            # Добавляем новые записи
            for discipline_id in new_references_by_discipline:
                new_type_ids = new_references_by_discipline[discipline_id]
                current_type_ids = current_references_by_discipline.get(discipline_id, set())
                to_add = new_type_ids - current_type_ids
                if to_add:
                    insert_query = '''
                        INSERT INTO project_discipline_doctype_reference (project_id, discipline_id, type_id)
                        VALUES (:project_id, :discipline_id, :type_id)
                        RETURNING id
                    '''
                    insert_values = [
                        {"project_id": project_id, "discipline_id": discipline_id, "type_id": type_id}
                        for type_id in to_add
                    ]
                    await database.execute_many(insert_query, insert_values)
                    logger.info(
                        f"Added {len(to_add)} new doctype references for project {project_id}, discipline {discipline_id}")

        return {'message': 'Doctype references updated successfully'}
    except Exception as e:
        logger.error(f"Error updating doctype references: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating doctype references: {str(e)}")


@router.get('/get_revision_description_references/{project_id}')
async def get_revision_description_references(project_id: int):
    try:
        query = '''
            SELECT DISTINCT 
                CAST(p.description_id AS TEXT) AS description_id,
                d.code,
                d.description
            FROM project_description_step_reference p
            LEFT JOIN revision_descriptions d ON d.id = p.description_id
            WHERE p.project_id = :project_id
        '''
        rows = await database.fetch_all(query, values={"project_id": project_id})
        return rows
    except Exception as e:
        logger.error(f"Error retrieving revision description references: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving revision description references: {str(e)}")


@router.post("/save_revision_description_references")
async def save_revision_description_references(references: List[RevisionDescriptionReference]):
    try:
        logger.info(f"Received revision description references: {references}")
        if not references:
            project_id = references[0].project_id if references else None
            if project_id:
                delete_query = '''
                    DELETE FROM project_description_step_reference
                    WHERE project_id = :project_id
                '''
                await database.execute(delete_query, {"project_id": project_id})
            return {'message': 'Revision description references updated successfully (all removed)'}

        project_id = references[0].project_id
        new_description_ids = {ref.description_id for ref in references}

        current_query = '''
            SELECT DISTINCT description_id
            FROM project_description_step_reference
            WHERE project_id = :project_id
        '''
        current_rows = await database.fetch_all(current_query, {"project_id": project_id})
        current_description_ids = {row['description_id'] for row in current_rows}

        to_add = new_description_ids - current_description_ids
        to_remove = current_description_ids - new_description_ids

        async with database.transaction():
            if to_add:
                insert_query = '''
                    INSERT INTO project_description_step_reference (project_id, description_id)
                    VALUES (:project_id, :description_id)
                    RETURNING id
                '''
                insert_values = [{"project_id": project_id, "description_id": description_id} for description_id in
                                 to_add]
                await database.execute_many(insert_query, insert_values)
                logger.info(f"Added {len(to_add)} new revision description references for project {project_id}")

            if to_remove:
                delete_query = '''
                    DELETE FROM project_description_step_reference
                    WHERE project_id = :project_id AND description_id = :description_id
                '''
                delete_values = [{"project_id": project_id, "description_id": description_id} for description_id in
                                 to_remove]
                await database.execute_many(delete_query, delete_values)
                logger.info(f"Removed {len(to_remove)} revision description references for project {project_id}")

        return {'message': 'Revision description references updated successfully'}

    except Exception as e:
        logger.error(f"Error updating revision description references: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating revision description references: {str(e)}")


@router.get('/get_revision_step_references/{project_id}/{description_id}')
async def get_revision_step_references(project_id: int, description_id: int):
    try:
        query = '''
            SELECT 
                CAST(pdsr.id AS TEXT) AS id,
                CAST(pdsr.project_id AS TEXT) AS project_id,
                CAST(pdsr.description_id AS TEXT) AS description_id,
                CAST(pdsr.step_id AS TEXT) AS step_id,
                rs.code,
                rs.description
            FROM project_description_step_reference pdsr
            LEFT JOIN revision_steps rs ON rs.id = pdsr.step_id
            WHERE pdsr.project_id = :project_id AND pdsr.description_id = :description_id AND pdsr.step_id IS NOT NULL
        '''
        rows = await database.fetch_all(query, values={"project_id": project_id, "description_id": description_id})
        return rows
    except Exception as e:
        logger.error(f"Error retrieving revision step references: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving revision step references: {str(e)}")


@router.post("/save_revision_step_references")
async def save_revision_step_references(references: List[RevisionStepReference]):
    try:
        logger.info(f"Received revision step references: {references}")
        if not references:
            return {'message': 'No references provided, nothing to update'}

        project_id = references[0].project_id  # Предполагаем, что все записи для одного проекта

        # Группируем новые данные по description_id
        new_references_by_description = {}
        for ref in references:
            if ref.description_id not in new_references_by_description:
                new_references_by_description[ref.description_id] = set()
            new_references_by_description[ref.description_id].add(ref.step_id)

        # Получаем текущие данные из базы для project_id
        current_query = '''
            SELECT description_id, step_id
            FROM project_description_step_reference
            WHERE project_id = :project_id AND step_id IS NOT NULL
        '''
        current_rows = await database.fetch_all(current_query, {"project_id": project_id})
        current_references_by_description = {}
        for row in current_rows:
            if row['description_id'] not in current_references_by_description:
                current_references_by_description[row['description_id']] = set()
            current_references_by_description[row['description_id']].add(row['step_id'])

        async with database.transaction():
            # Удаляем старые записи, которых нет в новом списке
            for description_id in current_references_by_description:
                current_step_ids = current_references_by_description[description_id]
                new_step_ids = new_references_by_description.get(description_id, set())
                to_remove = current_step_ids - new_step_ids
                if to_remove:
                    delete_query = '''
                        DELETE FROM project_description_step_reference
                        WHERE project_id = :project_id AND description_id = :description_id AND step_id = :step_id
                    '''
                    delete_values = [
                        {"project_id": project_id, "description_id": description_id, "step_id": step_id}
                        for step_id in to_remove
                    ]
                    await database.execute_many(delete_query, delete_values)
                    logger.info(
                        f"Removed {len(to_remove)} revision step references for project {project_id}, description {description_id}")

            # Добавляем новые записи
            for description_id in new_references_by_description:
                new_step_ids = new_references_by_description[description_id]
                current_step_ids = current_references_by_description.get(description_id, set())
                to_add = new_step_ids - current_step_ids
                if to_add:
                    insert_query = '''
                        INSERT INTO project_description_step_reference (project_id, description_id, step_id)
                        VALUES (:project_id, :description_id, :step_id)
                        RETURNING id
                    '''
                    insert_values = [
                        {"project_id": project_id, "description_id": description_id, "step_id": step_id}
                        for step_id in to_add
                    ]
                    await database.execute_many(insert_query, insert_values)
                    logger.info(
                        f"Added {len(to_add)} new revision step references for project {project_id}, description {description_id}")

        return {'message': 'Revision step references updated successfully'}
    except Exception as e:
        logger.error(f"Error updating revision step references: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating revision step references: {str(e)}")


@router.post("/create_project")
async def create_project(project: Project):
    try:
        query = '''
            INSERT INTO projects (
                number,
                name,
                name_native
            )
            VALUES (:number, :name, :name_native)
            RETURNING id
        '''

        async with database.transaction():
            project_id = await database.fetch_val(query, {
                "number": project.number,
                "name": project.name,
                "name_native": project.name_native
            })

        folder_path = os.path.join('file_storage', project.number)
        os.makedirs(folder_path, exist_ok=True)

        return {
            'message': 'Project created successfully',
            'project_id': project_id,
            'folder_path': folder_path
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating project: {str(e)}")
