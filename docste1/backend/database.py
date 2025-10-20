import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from databases import Database
from sqlalchemy import MetaData

ENV_FILE = ".benv.prod" if os.getenv("ENV") == "prod" else ".benv.dev"
load_dotenv(ENV_FILE)

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
database = Database(DATABASE_URL)
metadata = MetaData()
