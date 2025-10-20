from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from pydantic_schemas import CommentCreate, CommentUpdate
from database import database
import logging

router = APIRouter(prefix="/api", tags=["comments"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"

logger = logging.getLogger(__name__)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("id")
        if username is None or user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return {"username": username, "user_id": user_id}
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return {"username": username}
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/get_comments/{document_id}")
async def get_comments(document_id: int, token: str = Depends(oauth2_scheme)):
    await verify_token(token)
    try:
        query = '''
            SELECT 
                c.id,
                c.document_id,
                c.user_id,
                u."name",
                u.surname,
                c.parent_id,
                c.content,
                TO_CHAR(c.created, 'YYYY-MM-DD HH24:MI:SS') AS created,
                TO_CHAR(c.modified, 'YYYY-MM-DD HH24:MI:SS') AS updated
            FROM comments c
            LEFT JOIN users u ON u.id = c.user_id
            WHERE c.document_id = :document_id AND c.deleted = 0
            ORDER BY c.created ASC
        '''
        rows = await database.fetch_all(query=query, values={"document_id": document_id})
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Error retrieving comments: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving comments: {str(e)}")


@router.post("/add_comment")
async def add_comment(comment: CommentCreate, token: str = Depends(oauth2_scheme)):
    user_data = await verify_token(token)
    async with database.transaction():
        try:
            query = '''
                INSERT INTO comments (document_id, user_id, parent_id, content)
                VALUES (:document_id, :user_id, :parent_id, :content)
                RETURNING id, TO_CHAR(created, 'YYYY-MM-DD HH24:MI:SS') AS created
            '''
            values = {
                "document_id": comment.document_id,
                "user_id": comment.user_id,
                "parent_id": comment.parent_id,
                "content": comment.content
            }
            result = await database.fetch_one(query=query, values=values)
            return {
                "id": result["id"],
                "document_id": comment.document_id,
                "user_id": comment.user_id,
                "parent_id": comment.parent_id,
                "content": comment.content,
                "created": result["created"],
                "message": "Comment added successfully"
            }
        except Exception as e:
            logger.error(f"Error adding comment: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error adding comment: {str(e)}")


@router.get("/get_comment_count/{document_id}")
async def get_comment_count(document_id: int, token: str = Depends(oauth2_scheme)):
    await verify_token(token)
    try:
        query = '''
            SELECT COUNT(*) as comment_count
            FROM comments
            WHERE document_id = :document_id AND deleted = 0
        '''
        result = await database.fetch_one(query=query, values={"document_id": document_id})
        return {"comment_count": result["comment_count"]}
    except Exception as e:
        logger.error(f"Error retrieving comment count: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving comment count: {str(e)}")


@router.put("/update_comment/{comment_id}")
async def update_comment(comment_id: int, comment: CommentUpdate, current_user: dict = Depends(get_current_user)):
    try:
        check_query = '''
            SELECT user_id 
            FROM comments 
            WHERE id = :comment_id AND deleted = 0
        '''
        comment_data = await database.fetch_one(query=check_query, values={"comment_id": comment_id})
        if not comment_data:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment_data["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="You can only edit your own comments")
        update_query = '''
            UPDATE comments 
            SET content = :content, modified = CURRENT_TIMESTAMP 
            WHERE id = :comment_id 
            RETURNING id, TO_CHAR(modified, 'YYYY-MM-DD HH24:MI:SS') AS updated
        '''
        values = {"comment_id": comment_id, "content": comment.content}
        result = await database.fetch_one(query=update_query, values=values)
        return {
            "id": result["id"],
            "content": comment.content,
            "updated": result["updated"],
            "message": "Comment updated successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating comment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating comment: {str(e)}")


@router.put("/delete_comment/{comment_id}")
async def delete_comment(comment_id: int, current_user: dict = Depends(get_current_user)):
    try:
        check_query = '''
            SELECT user_id 
            FROM comments 
            WHERE id = :comment_id AND deleted = 0
        '''
        comment_data = await database.fetch_one(query=check_query, values={"comment_id": comment_id})
        if not comment_data:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment_data["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="You can only delete your own comments")
        delete_query = '''
            UPDATE comments 
            SET deleted = 1 
            WHERE id = :comment_id 
            RETURNING id
        '''
        result = await database.fetch_one(query=delete_query, values={"comment_id": comment_id})
        return {"id": result["id"], "message": "Comment deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting comment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting comment: {str(e)}")
