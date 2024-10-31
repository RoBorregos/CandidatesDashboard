# Install the required packages
# !pip install pandas sqlalchemy psycopg2-binary

from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os
import pandas as pd
import typer
from sqlalchemy.dialects.postgresql import UUID
import uuid

app = typer.Typer()
load_dotenv()  # Make sure to have a .env file in the same directory as this script

Base = declarative_base()


class AdminTable(Base):
    __tablename__ = 'Admin'
    email = Column(String, primary_key=True)


class JudgeTable(Base):
    __tablename__ = 'Judge'
    email = Column(String, primary_key=True)


class EmailTeam(Base):
    __tablename__ = 'EmailTeam'
    email = Column(String, primary_key=True)
    team = Column(String)


class Team(Base):
    __tablename__ = 'Team'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, primary_key=True)


def getSession():
    # Database URL
    DATABASE_URL = os.getenv("DATABASE_URL")

    # Set up SQLAlchemy Base and engine
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)

    return Session()


@app.command()
def admin_table(file_name: str, col_name: str = 'email'):
    df = pd.read_excel(file_name)
    session = getSession()

    try:
        for _, row in df.iterrows():
            record = AdminTable(
                email=row[col_name],
            )
            session.add(record)

        # Commit records
        session.commit()
        print("Data successfully inserted!")

    except Exception as e:
        session.rollback()  # Rollback
        print(f"Error occurred: {e}")
    finally:
        session.close()  # Close session


@app.command()
def judge_table(file_name: str, col_name: str = 'email'):
    df = pd.read_excel(file_name)
    session = getSession()

    try:
        for _, row in df.iterrows():
            record = JudgeTable(
                email=row[col_name],
            )
            session.add(record)

        # Commit records
        session.commit()
        print("Data successfully inserted!")

    except Exception as e:
        session.rollback()  # Rollback
        print(f"Error occurred: {e}")
    finally:
        session.close()  # Close session


@app.command()
def email_team_table(file_name: str, col_name: str = 'email', col_name2: str = 'team'):
    df = pd.read_excel(file_name)
    session = getSession()

    try:
        for _, row in df.iterrows():
            record = EmailTeam(
                email=row[col_name],
                team=row[col_name2]
            )
            session.add(record)

        # Commit records
        session.commit()
        print("Data successfully inserted!")

    except Exception as e:
        session.rollback()  # Rollback
        print(f"Error occurred: {e}")
    finally:
        session.close()  # Close session


@app.command()
def team_table(file_name: str, col_name: str = 'name'):
    df = pd.read_excel(file_name)
    session = getSession()

    try:
        for _, row in df.iterrows():
            record = Team(
                name=row[col_name],
            )
            session.add(record)

        # Commit records
        session.commit()
        print("Data successfully inserted!")

    except Exception as e:
        session.rollback()  # Rollback
        print(f"Error occurred: {e}")
    finally:
        session.close()  # Close session


if __name__ == "__main__":
    app()

# Run with typer:

# python3 upload.py admin-table example_upload/test.xlsx
# python3 upload.py judge-table example_upload/test.xlsx
# python3 upload.py email-team-table example_upload/email_team.xlsx
# python3 upload.py team-table example_upload/teams.xlsx
