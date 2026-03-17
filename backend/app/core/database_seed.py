import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.user import User
from app.models.base import Base
import app.models
from passlib.context import CryptContext

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_async_session():
    """Create async database session"""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

async def get_user_by_email(session: AsyncSession, email: str) -> User:
    """Get user by email"""
    result = await session.execute(select(User).filter(User.email == email))
    return result.scalar_one_or_none()

async def create_user(session: AsyncSession, email: str, password: str, role: str = "user", name: str | None = None) -> User:
    """Create a new user"""
    hashed_password = pwd_context.hash(password)
    user = User(
        email=email,
        hashed_password=hashed_password,
        role=role,
        name=name
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

async def seed_database():
    """Seed the database with initial admin and sample users"""
    print("Seeding database...")
    
    try:
        engine = create_async_engine(settings.DATABASE_URL)
        
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Create session
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with async_session() as session:
            # Create admin (faculty) user if not exists
            admin_email = os.getenv("ADMIN_EMAIL", "admin@college.edu")
            admin_password = os.getenv("ADMIN_PASSWORD", "AdminPass123!")
            
            existing_admin = await get_user_by_email(session, admin_email)
            if not existing_admin:
                admin_user = await create_user(session, admin_email, admin_password, "admin", "Prof. Admin")
                print(f"Created admin user: {admin_user.email}")
            else:
                print(f"Admin user already exists: {existing_admin.email}")
            
            # Create sample student users
            sample_users = [
                {"email": "rahul@college.edu", "password": "Student123!", "role": "user", "name": "Rahul Sharma"},
                {"email": "priya@college.edu", "password": "Student123!", "role": "user", "name": "Priya Singh"},
                {"email": "amit@college.edu", "password": "Student123!", "role": "user", "name": "Amit Patel"},
            ]
            
            for user_data in sample_users:
                existing_user = await get_user_by_email(session, user_data["email"])
                if not existing_user:
                    user = await create_user(
                        session, 
                        user_data["email"], 
                        user_data["password"], 
                        user_data["role"],
                        user_data.get("name")
                    )
                    print(f"Created student: {user.email} ({user.name})")
                else:
                    print(f"User already exists: {existing_user.email}")
            
            await session.commit()  # Ensure all transactions are committed
            print("Database seeding completed!")
            
    except Exception as e:
        print(f"Error during database seeding: {str(e)}")
        # Don't raise the exception to allow the app to continue starting
        return

def main():
    """Main function to run the seeding script"""
    asyncio.run(seed_database())

if __name__ == "__main__":
    main()