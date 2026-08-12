from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# --- AUTH SCHEMAS ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- CUSTOMER SCHEMAS ---
class CustomerCreate(BaseModel):
    name: str
    company: str
    role: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    industry: Optional[str] = None
    requirements: Optional[str] = None
    pain_points: Optional[str] = None
    budget: Optional[str] = None
    decision_maker: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    industry: Optional[str] = None
    requirements: Optional[str] = None
    pain_points: Optional[str] = None
    budget: Optional[str] = None
    decision_maker: Optional[str] = None

class CustomerResponse(BaseModel):
    id: int
    name: str
    company: str
    role: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    industry: Optional[str] = None
    requirements: Optional[str] = None
    pain_points: Optional[str] = None
    budget: Optional[str] = None
    decision_maker: Optional[str] = None
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- DEAL SCHEMAS ---
class DealCreate(BaseModel):
    customer_id: int
    name: str
    value: float
    stage: str  # Lead, Qualification, Demo, Proposal, Negotiation, Won, Lost
    probability: Optional[float] = 10.0
    risk_level: Optional[str] = "LOW"
    risk_reasons: Optional[str] = None
    next_action: Optional[str] = None

class DealUpdate(BaseModel):
    customer_id: Optional[int] = None
    name: Optional[str] = None
    value: Optional[float] = None
    stage: Optional[str] = None
    probability: Optional[float] = None
    risk_level: Optional[str] = None
    risk_reasons: Optional[str] = None
    next_action: Optional[str] = None

class DealResponse(BaseModel):
    id: int
    customer_id: int
    name: str
    value: float
    stage: str
    probability: float
    risk_level: str
    risk_reasons: Optional[str] = None
    next_action: Optional[str] = None
    user_id: int
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerResponse] = None

    class Config:
        from_attributes = True

# --- CONVERSATION MESSAGE SCHEMAS ---
class ConversationMessageCreate(BaseModel):
    sender: str  # salesperson or customer
    text: str

class ConversationMessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender: str
    text: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- CONVERSATION SCHEMAS ---
class ConversationCreate(BaseModel):
    title: str
    meeting_date: Optional[datetime] = None
    transcript: Optional[str] = None
    messages: List[ConversationMessageCreate] = []

class ConversationResponse(BaseModel):
    id: int
    deal_id: int
    customer_id: int
    title: str
    summary: Optional[str] = None
    key_takeaways: Optional[str] = None
    meeting_date: datetime
    transcript: Optional[str] = None
    created_at: datetime
    messages: List[ConversationMessageResponse] = []

    class Config:
        from_attributes = True

# --- ACTIVITY SCHEMAS ---
class ActivityCreate(BaseModel):
    type: str  # email, call, meeting, proposal, task
    title: str
    description: Optional[str] = None
    activity_date: Optional[datetime] = None

class ActivityResponse(BaseModel):
    id: int
    deal_id: int
    type: str
    title: str
    description: Optional[str] = None
    activity_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# --- FOLLOW-UP SCHEMAS ---
class FollowUpCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: datetime

class FollowUpUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None  # PENDING, COMPLETED, OVERDUE

class FollowUpResponse(BaseModel):
    id: int
    deal_id: int
    title: str
    description: Optional[str] = None
    due_date: datetime
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- MEMORY METADATA SCHEMAS ---
class MemoryMetadataResponse(BaseModel):
    id: int
    deal_id: int
    key: str
    value: str
    source_type: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- AI & CHAT SCHEMAS ---
class ChatRequest(BaseModel):
    message: str
    deal_id: Optional[int] = None
    customer_id: Optional[int] = None

class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []

class AnalyzeResponse(BaseModel):
    risk_level: str
    risk_reasons: str
    next_action: str

# --- DASHBOARD STATS ---
class DashboardStats(BaseModel):
    total_customers: int
    active_deals: int
    won_deals: int
    at_risk_deals: int
    total_pipeline_value: float
    recent_activities: List[ActivityResponse]
    recent_insights: List[str]
