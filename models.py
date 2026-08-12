from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())

    customers = relationship("Customer", back_populates="user", cascade="all, delete-orphan")
    deals = relationship("Deal", back_populates="user", cascade="all, delete-orphan")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    company = Column(String, index=True, nullable=False)
    role = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    requirements = Column(Text, nullable=True)
    pain_points = Column(Text, nullable=True)
    budget = Column(String, nullable=True)
    decision_maker = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="customers")
    deals = relationship("Deal", back_populates="customer", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="customer", cascade="all, delete-orphan")

class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, index=True, nullable=False)
    value = Column(Float, nullable=False, default=0.0)
    stage = Column(String, index=True, nullable=False)  # Lead, Qualification, Demo, Proposal, Negotiation, Won, Lost
    probability = Column(Float, nullable=False, default=10.0)  # Percentage 0-100
    risk_level = Column(String, nullable=False, default="LOW")  # LOW, MEDIUM, HIGH
    risk_reasons = Column(Text, nullable=True)  # JSON or plain text explanations
    next_action = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="deals")
    customer = relationship("Customer", back_populates="deals")
    conversations = relationship("Conversation", back_populates="deal", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="deal", cascade="all, delete-orphan")
    followups = relationship("FollowUp", back_populates="deal", cascade="all, delete-orphan")
    memories = relationship("MemoryMetadata", back_populates="deal", cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    key_takeaways = Column(Text, nullable=True)  # JSON array of points
    meeting_date = Column(DateTime, default=func.now())
    transcript = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    deal = relationship("Deal", back_populates="conversations")
    customer = relationship("Customer", back_populates="conversations")
    messages = relationship("ConversationMessage", back_populates="conversation", cascade="all, delete-orphan")

class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String, nullable=False)  # salesperson or customer
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())

    conversation = relationship("Conversation", back_populates="messages")

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # email, call, meeting, proposal, task
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    activity_date = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())

    deal = relationship("Deal", back_populates="activities")

class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=False)
    status = Column(String, nullable=False, default="PENDING")  # PENDING, COMPLETED, OVERDUE
    created_at = Column(DateTime, default=func.now())

    deal = relationship("Deal", back_populates="followups")

class MemoryMetadata(Base):
    """
    Local fallback memory table if Hindsight is unavailable, and also stores structured, 
    extracted metadata properties for quick DB queries and UI rendering.
    """
    __tablename__ = "memory_metadata"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id", ondelete="CASCADE"), nullable=False)
    key = Column(String, index=True, nullable=False)  # budget, objection, requirement, decision_maker, pain_point, timeline
    value = Column(Text, nullable=False)
    source_type = Column(String, nullable=False, default="conversation")  # conversation, meeting, user_input
    created_at = Column(DateTime, default=func.now())

    deal = relationship("Deal", back_populates="memories")
