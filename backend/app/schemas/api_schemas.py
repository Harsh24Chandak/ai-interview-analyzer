"""Pydantic request and response schemas for AI Interview Analyzer."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=160)
    password: str = Field(..., min_length=6, max_length=128)
    target_role: Optional[str] = "Full Stack Software Engineer"
    experience_level: Optional[str] = "Entry Level (0-2 Years)"


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    target_role: Optional[str] = None
    experience_level: Optional[str] = None
    years_of_experience: Optional[int] = None
    bio: Optional[str] = None
    education: Optional[List[Dict[str, Any]]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    skills: Optional[List[str]] = None
    career_interests: Optional[List[str]] = None
    theme_preference: Optional[str] = None
    notification_preferences: Optional[Dict[str, Any]] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


class ResumeAnalyzeRequest(BaseModel):
    resume_id: Optional[int] = None
    raw_text: Optional[str] = None
    target_role: str = "Full Stack Software Engineer"


class JobAnalyzeRequest(BaseModel):
    job_title: str = Field(..., min_length=2)
    company_name: Optional[str] = ""
    raw_text: str = Field(..., min_length=20)
    resume_id: Optional[int] = None


class StartInterviewRequest(BaseModel):
    job_role: str = Field(..., min_length=2)
    experience_level: str = "Entry Level (0-2 Years)"
    interview_type: str = "Technical"  # Technical, HR, Behavioral, Situational, Resume-Based, Job-Description-Based
    difficulty: str = "Medium"  # Easy, Medium, Hard
    question_count: int = Field(default=5, ge=1, le=15)
    resume_id: Optional[int] = None
    job_description_id: Optional[int] = None


class SubmitAnswerRequest(BaseModel):
    question_id: int
    answer_text: str = Field(..., min_length=2)
    answer_mode: str = "text"  # text or voice
    time_taken_seconds: int = Field(default=60, ge=0)
    generate_follow_up: bool = False


class CompleteInterviewRequest(BaseModel):
    duration_seconds: int = Field(default=600, ge=0)


# Structured AI Output Schemas validated by Pydantic
class AIResumeAnalysisOutput(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    ats_compatibility_score: int = Field(..., ge=0, le=100)
    impact_score: int = Field(..., ge=0, le=100)
    technical_depth_score: int = Field(..., ge=0, le=100)
    technical_skills: List[str] = []
    soft_skills: List[str] = []
    experience_summary: List[Dict[str, Any]] = []
    education_summary: List[Dict[str, Any]] = []
    projects_summary: List[Dict[str, Any]] = []
    strengths: List[str] = []
    weaknesses: List[str] = []
    missing_skills: List[str] = []
    improvement_recommendations: List[str] = []
    ai_provider: str = "fallback"


class AIJobMatchOutput(BaseModel):
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    experience_requirements: str = ""
    role_expectations: List[str] = []
    match_percentage: int = Field(..., ge=0, le=100)
    matching_skills: List[str] = []
    missing_skills: List[str] = []
    learning_roadmap: List[Dict[str, str]] = []
    readiness_recommendations: List[str] = []
    ai_provider: str = "fallback"


class AIQuestionItem(BaseModel):
    question_text: str
    category: str
    difficulty: str
    topic: str
    expected_key_points: List[str]
    sample_answer: str


class AIAnswerEvaluationOutput(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    relevance_score: int = Field(..., ge=0, le=100)
    technical_accuracy_score: int = Field(..., ge=0, le=100)
    completeness_score: int = Field(..., ge=0, le=100)
    clarity_score: int = Field(..., ge=0, le=100)
    communication_score: int = Field(..., ge=0, le=100)
    problem_solving_score: int = Field(..., ge=0, le=100)
    practical_understanding_score: int = Field(..., ge=0, le=100)
    what_went_well: List[str] = []
    what_was_missing: List[str] = []
    incorrect_statements: List[str] = []
    suggested_improved_answer: str = ""
    concepts_to_study: List[str] = []
    actionable_tips: List[str] = []
    follow_up_question: str = ""
    ai_provider: str = "fallback"
