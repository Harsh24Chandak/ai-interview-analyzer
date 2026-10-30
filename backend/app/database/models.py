"""Database Models & Relational Query Helpers (SQLAlchemy ORM + Native SQLite Interface)."""
import json
from typing import Any, Dict, List, Optional

# Provide SQLAlchemy declarative definitions when SQLAlchemy is installed
try:
    from sqlalchemy import Column, Integer, String, Text, ForeignKey
    from sqlalchemy.orm import declarative_base

    Base = declarative_base()

    class UserModel(Base):
        __tablename__ = "users"
        id = Column(Integer, primary_key=True, index=True)
        full_name = Column(String(255), nullable=False)
        email = Column(String(255), unique=True, index=True, nullable=False)
        password_hash = Column(String(512), nullable=False)
        target_role = Column(String(255), default="Full Stack Software Engineer")
        experience_level = Column(String(128), default="Entry Level (0-2 Years)")
        years_of_experience = Column(Integer, default=1)
        bio = Column(Text, default="")
        education = Column(Text, default="[]")
        experience = Column(Text, default="[]")
        skills = Column(Text, default="[]")
        career_interests = Column(Text, default="[]")
        theme_preference = Column(String(32), default="dark")
        notification_preferences = Column(Text, default="{}")
        created_at = Column(String(64), nullable=False)
        updated_at = Column(String(64), nullable=False)
except ImportError:
    Base = None


def row_to_dict(row) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    return dict(row)


def parse_json_fields(data: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
    out = dict(data)
    for field in fields:
        if field in out and isinstance(out[field], str):
            try:
                out[field] = json.loads(out[field])
            except Exception:
                out[field] = [] if field != "extracted_skills" and field != "parsed_data" and field != "notification_preferences" else {}
    return out


def format_user_record(row) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    d = row_to_dict(row)
    d.pop("password_hash", None)
    return parse_json_fields(
        d,
        ["education", "experience", "skills", "career_interests", "notification_preferences"],
    )
