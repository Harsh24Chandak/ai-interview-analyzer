"""Authentication & User Profile API Routes."""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.database.connection import db_session
from app.database.models import format_user_record
from app.schemas.api_schemas import (
    RegisterRequest,
    LoginRequest,
    ProfileUpdateRequest,
    PasswordChangeRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Profile"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(req: RegisterRequest):
    email_clean = req.email.strip().lower()
    if "@" not in email_clean or "." not in email_clean.split("@")[-1]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a valid email address.")

    now = datetime.utcnow().isoformat()
    with db_session() as conn:
        existing = conn.execute("SELECT id FROM users WHERE lower(email) = ?", (email_clean,)).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Please sign in instead.",
            )
        cur = conn.execute(
            """
            INSERT INTO users (
                full_name, email, password_hash, target_role, experience_level,
                years_of_experience, bio, education, experience, skills,
                career_interests, theme_preference, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                req.full_name.strip(),
                email_clean,
                hash_password(req.password),
                req.target_role or "Full Stack Software Engineer",
                req.experience_level or "Entry Level (0-2 Years)",
                1,
                f"Preparing for {req.target_role or 'Software Engineering'} interviews.",
                json.dumps([]),
                json.dumps([]),
                json.dumps(["Python", "JavaScript", "SQL", "Git"]),
                json.dumps([req.target_role or "Software Engineering"]),
                "dark",
                now,
                now,
            ),
        )
        user_id = cur.lastrowid
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        user_dict = format_user_record(row)

    token = create_access_token({"sub": str(user_id), "email": email_clean})
    return {"access_token": token, "token_type": "bearer", "user": user_dict}


@router.post("/login")
def login_user(req: LoginRequest):
    email_clean = req.email.strip().lower()
    with db_session() as conn:
        row = conn.execute("SELECT * FROM users WHERE lower(email) = ?", (email_clean,)).fetchone()
        if not row or not verify_password(req.password, row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )
        user_dict = format_user_record(row)
        user_id = row["id"]

    token = create_access_token({"sub": str(user_id), "email": email_clean})
    return {"access_token": token, "token_type": "bearer", "user": user_dict}


@router.post("/demo")
def demo_login():
    """Instant one-click login into the pre-seeded demonstration account."""
    with db_session() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", ("demo@aiinterview.dev",)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Demo account not initialized.")
        user_dict = format_user_record(row)
        user_id = row["id"]

    token = create_access_token({"sub": str(user_id), "email": "demo@aiinterview.dev"})
    return {"access_token": token, "token_type": "bearer", "user": user_dict}


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


@router.put("/profile")
def update_profile(req: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    now = datetime.utcnow().isoformat()
    user_id = current_user["id"]
    with db_session() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        existing = format_user_record(row)

        full_name = req.full_name.strip() if req.full_name is not None else existing["full_name"]
        target_role = req.target_role if req.target_role is not None else existing["target_role"]
        experience_level = req.experience_level if req.experience_level is not None else existing["experience_level"]
        years_of_experience = req.years_of_experience if req.years_of_experience is not None else existing["years_of_experience"]
        bio = req.bio if req.bio is not None else existing["bio"]
        education = json.dumps(req.education if req.education is not None else existing["education"])
        experience = json.dumps(req.experience if req.experience is not None else existing["experience"])
        skills = json.dumps(req.skills if req.skills is not None else existing["skills"])
        career_interests = json.dumps(req.career_interests if req.career_interests is not None else existing["career_interests"])
        theme_preference = req.theme_preference if req.theme_preference is not None else existing["theme_preference"]
        notification_preferences = json.dumps(
            req.notification_preferences if req.notification_preferences is not None else existing["notification_preferences"]
        )

        conn.execute(
            """
            UPDATE users SET
                full_name = ?, target_role = ?, experience_level = ?, years_of_experience = ?,
                bio = ?, education = ?, experience = ?, skills = ?, career_interests = ?,
                theme_preference = ?, notification_preferences = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                full_name, target_role, experience_level, years_of_experience,
                bio, education, experience, skills, career_interests,
                theme_preference, notification_preferences, now, user_id,
            ),
        )
        updated_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return {"message": "Profile updated successfully.", "user": format_user_record(updated_row)}


@router.post("/change-password")
def change_password(req: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    with db_session() as conn:
        row = conn.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row or not verify_password(req.current_password, row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect.",
            )
        conn.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (hash_password(req.new_password), datetime.utcnow().isoformat(), user_id),
        )
    return {"message": "Password updated successfully."}
