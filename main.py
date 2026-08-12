import os
import json
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import datetime

from .database.connection import init_db, get_db
from .database.models import User, Customer, Deal, Conversation, ConversationMessage, Activity, FollowUp, MemoryMetadata
from .schemas import schemas
from .services import auth
from .services.memory import MemoryService
from .services.ai import AIService

app = FastAPI(title="DealMind AI API", version="1.0.0")

# Setup CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = auth.get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        password_hash=hashed_pwd,
        full_name=user_in.full_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: User = Depends(auth.get_current_user)):
    return current_user

# --- CUSTOMER ENDPOINTS ---

@app.get("/api/customers", response_model=List[schemas.CustomerResponse])
def list_customers(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    return db.query(Customer).filter(Customer.user_id == current_user.id).order_by(Customer.name).all()

@app.post("/api/customers", response_model=schemas.CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer_in: schemas.CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    customer = Customer(**customer_in.model_dump(), user_id=current_user.id)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@app.get("/api/customers/{id}", response_model=schemas.CustomerResponse)
def get_customer(id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    customer = db.query(Customer).filter(Customer.id == id, Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@app.put("/api/customers/{id}", response_model=schemas.CustomerResponse)
def update_customer(id: int, customer_in: schemas.CustomerUpdate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    customer = db.query(Customer).filter(Customer.id == id, Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = customer_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    return customer

@app.delete("/api/customers/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    customer = db.query(Customer).filter(Customer.id == id, Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return None

# --- DEAL ENDPOINTS ---

@app.get("/api/deals", response_model=List[schemas.DealResponse])
def list_deals(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    return db.query(Deal).filter(Deal.user_id == current_user.id).order_by(Deal.updated_at.desc()).all()

@app.post("/api/deals", response_model=schemas.DealResponse, status_code=status.HTTP_201_CREATED)
def create_deal(deal_in: schemas.DealCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    customer = db.query(Customer).filter(Customer.id == deal_in.customer_id, Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
        
    deal = Deal(**deal_in.model_dump(), user_id=current_user.id)
    db.add(deal)
    db.commit()
    db.refresh(deal)
    
    # Track creation in Activities
    activity = Activity(
        deal_id=deal.id,
        type="task",
        title="Deal Created",
        description=f"Deal '{deal.name}' created with a value of {deal.value}."
    )
    db.add(activity)
    db.commit()
    
    return deal

@app.get("/api/deals/{id}", response_model=schemas.DealResponse)
def get_deal(id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    deal = db.query(Deal).filter(Deal.id == id, Deal.user_id == current_user.id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal

@app.put("/api/deals/{id}", response_model=schemas.DealResponse)
def update_deal(id: int, deal_in: schemas.DealUpdate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    deal = db.query(Deal).filter(Deal.id == id, Deal.user_id == current_user.id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    update_data = deal_in.model_dump(exclude_unset=True)
    
    # Track stage transition
    old_stage = deal.stage
    new_stage = update_data.get("stage")
    
    for field, value in update_data.items():
        setattr(deal, field, value)
        
    db.commit()
    
    if new_stage and old_stage != new_stage:
        activity = Activity(
            deal_id=deal.id,
            type="task",
            title="Stage Updated",
            description=f"Deal moved from {old_stage} to {new_stage}."
        )
        db.add(activity)
        db.commit()
        
    db.refresh(deal)
    return deal

@app.delete("/api/deals/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deal(id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    deal = db.query(Deal).filter(Deal.id == id, Deal.user_id == current_user.id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    db.delete(deal)
    db.commit()
    return None

# --- CONVERSATION ENDPOINTS ---

@app.get("/api/deals/{deal_id}/conversations", response_model=List[schemas.ConversationResponse])
def list_conversations(deal_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    deal = db.query(Deal).filter(Deal.id == deal_id, Deal.user_id == current_user.id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return db.query(Conversation).filter(Conversation.deal_id == deal_id).order_by(Conversation.meeting_date.desc()).all()

@app.post("/api/deals/{deal_id}/conversations", response_model=schemas.ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(deal_id: int, conv_in: schemas.ConversationCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    deal = db.query(Deal).filter(Deal.id == deal_id, Deal.user_id == current_user.id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    # Standardize transcript from messages if not explicitly provided
    transcript = conv_in.transcript
    if not transcript and conv_in.messages:
        transcript_parts = []
        for msg in conv_in.messages:
            sender_name = "Salesperson" if msg.sender == "salesperson" else deal.customer.name
            transcript_parts.append(f"{sender_name}: {msg.text}")
        transcript = "\n".join(transcript_parts)

    # 1. Trigger AI conversation intelligence extraction
    ai_intel = AIService.extract_conversation_intelligence(transcript or conv_in.title)
    
    # 2. Store Conversation
    conv = Conversation(
        deal_id=deal.id,
        customer_id=deal.customer_id,
        title=conv_in.title,
        summary=ai_intel.get("summary"),
        key_takeaways=json.dumps(ai_intel.get("key_takeaways", [])),
        meeting_date=conv_in.meeting_date or datetime.datetime.now(),
        transcript=transcript
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    
    # 3. Store Messages
    for msg_in in conv_in.messages:
        msg = ConversationMessage(
            conversation_id=conv.id,
            sender=msg_in.sender,
            text=msg_in.text
        )
        db.add(msg)
    db.commit()

    # 4. Save extracted facts into Hindsight persistent memory bank and local MemoryMetadata
    for memory in ai_intel.get("extracted_memories", []):
        key = memory.get("key")
        value = memory.get("value")
        if key and value:
            # Retain in Hindsight + SQL
            MemoryService.retain_memory(
                db=db,
                deal_id=deal.id,
                key=key,
                value=value,
                source_type="conversation"
            )

    # 5. Automatically trigger Deal Risk Analysis update based on new conversation memory
    memories = MemoryService.recall_memory(db, deal.id, "List requirements, objections, budget details, pain points, timeline.")
    recent_convs = [c.summary for c in db.query(Conversation).filter(Conversation.deal_id == deal.id).limit(3).all()]
    
    analysis = AIService.analyze_deal_risk_and_actions(
        deal_name=deal.name,
        stage=deal.stage,
        value=deal.value,
        requirements=deal.customer.requirements or "",
        pain_points=deal.customer.pain_points or "",
        budget=deal.customer.budget or "",
        decision_maker=deal.customer.decision_maker or "",
        memories=memories,
        conversations=recent_convs
    )
    
    deal.risk_level = analysis.get("risk_level", "LOW")
    deal.risk_reasons = analysis.get("risk_reasons")
    deal.next_action = analysis.get("next_action")
    db.commit()

    # 6. Add to Activity Log
    activity = Activity(
        deal_id=deal.id,
        type="meeting",
        title=f"Logged Conversation: {conv.title}",
        description=conv.summary
    )
    db.add(activity)
    db.commit()

    db.refresh(conv)
    return conv

# --- TIMELINE ENDPOINT ---

@app.get("/api/deals/{deal_id}/timeline", response_model=List[schemas.ActivityResponse])
def get_deal_timeline(deal_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    deal = db.query(Deal).filter(Deal.id == deal_id, Deal.user_id == current_user.id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return db.query(Activity).filter(Activity.deal_id == deal_id).order_by(Activity.activity_date.desc()).all()

# --- AI ANALYSIS & NEXT BEST ACTION ---

@app.post("/api/deals/{deal_id}/analyze", response_model=schemas.AnalyzeResponse)
def analyze_deal_endpoint(deal_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    deal = db.query(Deal).filter(Deal.id == deal_id, Deal.user_id == current_user.id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    memories = MemoryService.recall_memory(db, deal.id, "List requirements, objections, budget details, pain points, timeline.")
    recent_convs = [c.summary for c in db.query(Conversation).filter(Conversation.deal_id == deal.id).limit(3).all()]
    
    analysis = AIService.analyze_deal_risk_and_actions(
        deal_name=deal.name,
        stage=deal.stage,
        value=deal.value,
        requirements=deal.customer.requirements or "",
        pain_points=deal.customer.pain_points or "",
        budget=deal.customer.budget or "",
        decision_maker=deal.customer.decision_maker or "",
        memories=memories,
        conversations=recent_convs
    )
    
    # Update DB fields
    deal.risk_level = analysis.get("risk_level", "LOW")
    deal.risk_reasons = analysis.get("risk_reasons")
    deal.next_action = analysis.get("next_action")
    db.commit()
    
    # Track update
    activity = Activity(
        deal_id=deal.id,
        type="task",
        title="AI Analysis Refresh",
        description=f"Risk assessed as {deal.risk_level}."
    )
    db.add(activity)
    db.commit()
    
    return {
        "risk_level": deal.risk_level,
        "risk_reasons": deal.risk_reasons,
        "next_action": deal.next_action
    }

# --- AI CHAT ENDPOINT ---

@app.post("/api/ai/chat", response_model=schemas.ChatResponse)
def chat_with_dealmind(request: schemas.ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    res = AIService.grounded_chat(
        query=request.message,
        user_id=current_user.id,
        deal_id=request.deal_id,
        customer_id=request.customer_id,
        db=db
    )
    return res

# --- INSIGHTS ENDPOINT ---

@app.get("/api/insights", response_model=List[str])
def get_insights(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    deals = db.query(Deal).filter(Deal.user_id == current_user.id).all()
    insights = []
    
    for deal in deals:
        if deal.risk_level == "HIGH":
            insights.append(f"WARNING: Deal '{deal.name}' is at HIGH risk. Reason: {deal.risk_reasons}")
        elif deal.risk_level == "MEDIUM":
            insights.append(f"ALERT: Deal '{deal.name}' is at MEDIUM risk. Reason: {deal.risk_reasons}")
            
        if deal.next_action:
            insights.append(f"Next Action for '{deal.name}': {deal.next_action}")
            
    # Add generic followups reminders if any
    followups = db.query(FollowUp).join(Deal).filter(Deal.user_id == current_user.id, FollowUp.status == "PENDING").all()
    for f in followups:
        insights.append(f"REMINDER: Follow-up '{f.title}' is due for deal '{f.deal.name}' by {f.due_date.strftime('%Y-%m-%d')}")
        
    return insights

# --- DASHBOARD ENDPOINTS ---

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    customers_count = db.query(Customer).filter(Customer.user_id == current_user.id).count()
    deals = db.query(Deal).filter(Deal.user_id == current_user.id).all()
    
    active_deals = 0
    won_deals = 0
    at_risk_deals = 0
    total_val = 0.0
    
    for d in deals:
        if d.stage == "Won":
            won_deals += 1
        elif d.stage != "Lost":
            active_deals += 1
            total_val += d.value
            
        if d.risk_level in ["MEDIUM", "HIGH"] and d.stage not in ["Won", "Lost"]:
            at_risk_deals += 1
            
    # Recent Activities
    recent_acts = db.query(Activity).join(Deal).filter(Deal.user_id == current_user.id).order_by(Activity.activity_date.desc()).limit(5).all()
    # Cast sqlalchemy model to response schema
    activities_res = [schemas.ActivityResponse.model_validate(act) for act in recent_acts]
    
    # Gather key insights
    insights = get_insights(db=db, current_user=current_user)
    
    return {
        "total_customers": customers_count,
        "active_deals": active_deals,
        "won_deals": won_deals,
        "at_risk_deals": at_risk_deals,
        "total_pipeline_value": total_val,
        "recent_activities": activities_res,
        "recent_insights": insights[:5]  # Limit to 5
    }
