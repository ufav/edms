import os
import asyncio
from dotenv import load_dotenv
import aiobotocore.session
from contextlib import asynccontextmanager
from databases import Database

load_dotenv(dotenv_path=".benv.dev")

# Настройки MinIO
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("MINIO_BUCKET")

# Настройки базы данных
DATABASE_URL = os.getenv("DATABASE_URL")


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


async def migrate_files():
    database = Database(DATABASE_URL)
    await database.connect()

    try:
        query = "SELECT id, path FROM uploaded_files WHERE deleted = 0"
        files = await database.fetch_all(query)

        async with get_s3_client() as client:
            for file in files:
                file_id = file['id']
                old_path = file['path']

                if old_path.startswith('file_storage\\'):
                    # Формируем новый ключ, заменяя \ на / и убирая file_storage
                    new_key = old_path.replace('file_storage\\', '').replace('\\', '/')

                    # Проверяем существование файла
                    local_path = old_path.replace('\\', os.sep)
                    if os.path.exists(local_path):
                        try:
                            with open(local_path, 'rb') as f:
                                await client.put_object(
                                    Bucket=MINIO_BUCKET,
                                    Key=new_key,
                                    Body=f
                                )
                            print(f"Uploaded {local_path} to MinIO as {new_key}")

                            # Обновляем путь в базе
                            update_query = """
                                UPDATE uploaded_files 
                                SET path = :new_path 
                                WHERE id = :id
                            """
                            await database.execute(update_query, {
                                "new_path": new_key,
                                "id": file_id
                            })
                            print(f"Updated path for file_id {file_id} to {new_key}")
                        except Exception as e:
                            print(f"Failed to migrate {local_path}: {str(e)}")
                    else:
                        print(f"File not found: {local_path}")
                else:
                    print(f"Skipping {old_path}: not in file_storage")

    except Exception as e:
        print(f"Error during migration: {str(e)}")
    finally:
        await database.disconnect()


if __name__ == "__main__":
    asyncio.run(migrate_files())
