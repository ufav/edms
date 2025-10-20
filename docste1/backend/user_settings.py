from fastapi import APIRouter, HTTPException, Query
from pydantic_schemas import UserUpdate, ProjectAccess, RemoveProjectAccessRequest, UserProjectAccess, UserCreate, \
    PasswordChange
from database import database
from typing import List
import logging
from passlib.context import CryptContext

router = APIRouter(prefix="/api", tags=["user_settings"])

logging.basicConfig(level=logging.INFO, filename="api.log", filemode="a",
                    format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def get_user_by_username(username: str):
    query = '''
        SELECT * 
        FROM users 
        WHERE username = :username AND active = 1
    '''
    return await database.fetch_one(query, {"username": username})


async def get_user_by_id(user_id: int):
    query = '''
        SELECT * 
        FROM users 
        WHERE id = :user_id
    '''
    return await database.fetch_one(query, {"user_id": user_id})


async def get_user_by_email(email: str):
    query = '''
        SELECT * 
        FROM users 
        WHERE email = :email AND active = 1
    '''
    return await database.fetch_one(query, {"email": email})


async def create_user(user: UserCreate):
    hashed_password = pwd_context.hash(user.password)
    query = '''
        INSERT INTO users (username, password, role_id, name, surname, email)
        VALUES (:username, :password, :role_id, :name, :surname, :email)
        RETURNING id, username, role_id, name, surname, email
    '''
    values = {
        "username": user.username,
        "password": hashed_password,
        "role_id": user.role_id,
        "name": user.name,
        "surname": user.surname,
        "email": user.email
    }
    result = await database.fetch_one(query, values)
    return {
        "id": result["id"],
        "username": result["username"],
        "role_id": result["role_id"],
        "name": result["name"],
        "surname": result["surname"],
        "email": result["email"]
    }


@router.post("/register")
async def register_user(user: UserCreate):
    db_user = await get_user_by_username(username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    db_user = await get_user_by_email(email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return await create_user(user=user)


@router.post("/change-password")
async def change_password(password_data: PasswordChange):
    db_user = await get_user_by_id(password_data.user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not pwd_context.verify(password_data.current_password, db_user['password']):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if password_data.new_password != password_data.confirm_new_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    hashed_new_password = pwd_context.hash(password_data.new_password)
    query = '''
        UPDATE users 
        SET password = :password 
        WHERE id = :user_id
    '''
    await database.execute(query, {"password": hashed_new_password, "user_id": db_user['id']})
    return {"message": "Password updated successfully"}


@router.get('/users')
async def get_users():
    try:
        query = '''
            SELECT 
                u.id,
                u.username,
                u.role_id,
                u."name",
                u.surname,
                u.email,
                r."name" AS "role"
            FROM users u 
            LEFT JOIN user_roles r ON r.id = u.role_id
            WHERE u.active = 1
        '''
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving users: {str(e)}")


@router.get('/roles')
async def get_roles():
    try:
        query = 'SELECT * FROM user_roles'
        rows = await database.fetch_all(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving roles: {str(e)}")


@router.put("/users/{user_id}")
async def update_user(user_id: int, user_update: UserUpdate):
    try:
        updates = {}
        if user_update.role_id is not None:
            updates["role_id"] = user_update.role_id
        if user_update.name is not None:
            updates["name"] = user_update.name
        if user_update.surname is not None:
            updates["surname"] = user_update.surname
        if user_update.email is not None:
            updates["email"] = user_update.email
        if not updates:
            raise HTTPException(status_code=400, detail="No fields provided for update")
        set_clause = ", ".join([f"{key} = :{key}" for key in updates.keys()])
        query = f'''
            UPDATE users
            SET {set_clause}
            WHERE id = :user_id
        '''
        values = {**updates, "user_id": user_id}
        await database.execute(query=query, values=values)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")


@router.post("/add_users_project_access")
async def add_users_project_access(references: List[ProjectAccess]):
    try:
        query = '''
            INSERT INTO user_project_access (user_id, project_id)
            VALUES (:user_id, :project_id)
            RETURNING id
        '''
        async with database.transaction():
            for ref in references:
                await database.execute(query, {"user_id": ref.user_id, "project_id": ref.project_id})
        return {"message": "References added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding references: {str(e)}")


@router.delete("/remove_users_project_access")
async def remove_users_project_access(request: RemoveProjectAccessRequest):
    try:
        logger.info(f"Received request: user_id={request.user_id}, project_ids={request.project_ids}")
        print(f"Received request: user_id={request.user_id}, project_ids={request.project_ids}")
        query = '''
            DELETE FROM user_project_access
            WHERE user_id = :user_id AND project_id = :project_id
        '''
        async with database.transaction():
            for project_id in request.project_ids:
                await database.execute(query, {"user_id": request.user_id, "project_id": project_id})
        return {"message": "References removed successfully"}
    except Exception as e:
        logger.error(f"Error removing references: {str(e)}")
        print(f"Error removing references: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removing references: {str(e)}")


@router.get('/user_projects')
async def get_user_projects(id: int = Query(..., description="ID пользователя")):
    try:
        query = '''
            SELECT p.id, p.number, p.name, p.name_native
            FROM projects p
            LEFT JOIN user_project_access upa ON upa.project_id = p.id
            WHERE upa.user_id = :id
        '''
        rows = await database.fetch_all(query, {"id": id})
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user projects: {str(e)}")


@router.get("/user_project_access/{user_id}", response_model=List[UserProjectAccess])
async def get_user_project_access(user_id: int):
    try:
        query = '''
            SELECT project_id
            FROM user_project_access
            WHERE user_id = :user_id
        '''
        result = await database.fetch_all(query, {"user_id": user_id})
        return [{"project_id": row["project_id"]} for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user project access: {str(e)}")


@router.put("/user-deactivate/{user_id}")
async def user_deactivate(user_id: int):
    try:
        query = '''
            UPDATE users
            SET active = 0
            WHERE id = :user_id
        '''
        await database.execute(query, {"user_id": user_id})
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deactivating user: {str(e)}")
