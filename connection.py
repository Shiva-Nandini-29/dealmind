import os
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from .models import Base, User, Customer, Deal, Conversation, ConversationMessage, Activity, FollowUp, MemoryMetadata

# Load environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dealmind.db")

# Adjust SQLite URL for compatibility
if DATABASE_URL.startswith("sqlite"):
    # SQLite requires check_same_thread=False for multiple threads in FastAPI
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_db(db):
    # Check if we already have users
    if db.query(User).first() is not None:
        return

    print("Seeding database with realistic demo data...")

    # 1. Create Default User (Salesperson)
    hashed_pwd = pwd_context.hash("password123")
    demo_user = User(
        email="demo@dealmind.ai",
        password_hash=hashed_pwd,
        full_name="Alex Mercer"
    )
    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)

    # 2. Create Customers
    customer_abc = Customer(
        name="Rahul Sharma",
        company="ABC Technologies",
        role="CTO",
        email="rahul@abctech.com",
        phone="+91 98765 43210",
        industry="Technology",
        requirements="AI customer-support platform with custom NLP model",
        pain_points="High operational costs for manual chat support, scaling issues",
        budget="₹8,00,000",
        decision_maker="Rahul Sharma (CTO)",
        user_id=demo_user.id
    )
    
    customer_apex = Customer(
        name="Sarah Jenkins",
        company="Apex Health",
        role="VP Operations",
        email="sarah.j@apexhealth.org",
        phone="+1 (555) 234-5678",
        industry="Healthcare",
        requirements="Automated patient booking scheduling and reminders",
        pain_points="Patient no-show rates exceeding 20%, manual scheduling overhead",
        budget="$25,000",
        decision_maker="Sarah Jenkins (VP Operations), CFO (Final sign-off)",
        user_id=demo_user.id
    )

    db.add_all([customer_abc, customer_apex])
    db.commit()
    db.refresh(customer_abc)
    db.refresh(customer_apex)

    # 3. Create Deals
    deal_abc = Deal(
        customer_id=customer_abc.id,
        name="ABC Tech Support Platform",
        value=800000.0,
        stage="Negotiation",
        probability=60.0,
        risk_level="MEDIUM",
        risk_reasons="Pricing objection raised (budget is ₹8,00,000 but list price is ₹10,00,000). Finance team approval required.",
        next_action="Send revised pricing proposal at ₹8,00,000 and schedule follow-up with Rahul and finance lead.",
        user_id=demo_user.id
    )

    deal_apex = Deal(
        customer_id=customer_apex.id,
        name="Apex Booking Integration",
        value=25000.0,
        stage="Qualification",
        probability=30.0,
        risk_level="HIGH",
        risk_reasons="Budget is not fully confirmed and the economic buyer (CFO) is not yet engaged in discussions.",
        next_action="Draft a ROI business case addressing no-show cost reduction and ask Sarah to introduce us to the CFO.",
        user_id=demo_user.id
    )

    db.add_all([deal_abc, deal_apex])
    db.commit()
    db.refresh(deal_abc)
    db.refresh(deal_apex)

    # 4. Create Activities
    act_abc_1 = Activity(
        deal_id=deal_abc.id,
        type="task",
        title="Customer Profile Created",
        description="Customer profile created for Rahul Sharma from ABC Technologies.",
        activity_date=datetime.datetime.now() - datetime.timedelta(days=12)
    )
    act_abc_2 = Activity(
        deal_id=deal_abc.id,
        type="call",
        title="Initial Discovery Call",
        description="Discussed AI-agent support capabilities. Rahul is interested in replacing their Tier-1 support.",
        activity_date=datetime.datetime.now() - datetime.timedelta(days=10)
    )
    act_abc_3 = Activity(
        deal_id=deal_abc.id,
        type="meeting",
        title="NLP Platform Demo",
        description="Conducted technical demo of custom NLP pipelines. Rahul was impressed by accuracy scores.",
        activity_date=datetime.datetime.now() - datetime.timedelta(days=7)
    )

    act_apex_1 = Activity(
        deal_id=deal_apex.id,
        type="task",
        title="Customer Profile Created",
        description="Customer profile created for Sarah Jenkins from Apex Health.",
        activity_date=datetime.datetime.now() - datetime.timedelta(days=7)
    )
    act_apex_2 = Activity(
        deal_id=deal_apex.id,
        type="call",
        title="Discovery Call",
        description="Sarah detailed their 20% patient no-show issue. Mentioned scheduling system integration need.",
        activity_date=datetime.datetime.now() - datetime.timedelta(days=5)
    )

    db.add_all([act_abc_1, act_abc_2, act_abc_3, act_apex_1, act_apex_2])
    db.commit()

    # 5. Create Conversations & Messages
    conv_abc = Conversation(
        deal_id=deal_abc.id,
        customer_id=customer_abc.id,
        title="Demo and Pricing Alignment",
        summary="Conducted full demo of AI support platform. Customer loves the product, but pricing is a blocker. Budget limit is ₹8,00,000, and finance approval is pending.",
        key_takeaways='["Demo went very well; loved custom NLP integration.", "Budget is constrained to ₹8,00,000 maximum.", "Objection: Pricing of list ₹10,00,000 is too high.", "Blocker: Needs approval from the finance team before proceeding."]',
        meeting_date=datetime.datetime.now() - datetime.timedelta(days=7),
        transcript="Salesperson: Thank you for joining, Rahul. How did you like the AI agent dashboard demo?\nRahul: The demo looks very impressive, especially the custom NLP components. However, your pricing of 10,00,000 is too high for our budget. We can go up to 8,00,000 max. Also, I'll need approval from the finance team before we can proceed.\nSalesperson: I understand. Let me check with our finance director if we can adjust the pricing to fit your budget. I'll get back to you with a revised proposal."
    )
    db.add(conv_abc)
    db.commit()
    db.refresh(conv_abc)

    msg_abc_1 = ConversationMessage(conversation_id=conv_abc.id, sender="salesperson", text="Thank you for joining, Rahul. How did you like the AI agent dashboard demo?")
    msg_abc_2 = ConversationMessage(conversation_id=conv_abc.id, sender="customer", text="The demo looks very impressive, especially the custom NLP components. However, your pricing of 10,00,000 is too high for our budget. We can go up to 8,00,000 max. Also, I'll need approval from the finance team before we can proceed.")
    msg_abc_3 = ConversationMessage(conversation_id=conv_abc.id, sender="salesperson", text="I understand. Let me check with our finance director if we can adjust the pricing to fit your budget. I'll get back to you with a revised proposal.")
    db.add_all([msg_abc_1, msg_abc_2, msg_abc_3])

    conv_apex = Conversation(
        deal_id=deal_apex.id,
        customer_id=customer_apex.id,
        title="Apex Scheduling System Requirements",
        summary="VP Operations Sarah Jenkins described scheduling issues (20% no-show rate). Budget is estimated around $25,000, but is not signed off by CFO. CFO is economic decision maker and has not been engaged.",
        key_takeaways='["Pain point: 20% patient no-show rate.", "Requirement: Automated SMS and email scheduling integrations.", "Budget: Around $25,000, but not signed off.", "Blocker: CFO has final sign-off and is very strict on software spending.", "Action: Salesperson needs to draft business case for CFO."]',
        meeting_date=datetime.datetime.now() - datetime.timedelta(days=5),
        transcript="Salesperson: Hi Sarah, can you tell us about your scheduling issues?\nSarah: We have a 20% patient no-show rate. We want an automated SMS/email scheduler. I think we have about $25,000 budget, but our CFO has the final sign-off and he's very strict about software spending. I haven't spoken to him about this tool yet.\nSalesperson: Got it. We should put together a business case for the CFO showing how a 20% reduction in no-shows pays for the software."
    )
    db.add(conv_apex)
    db.commit()
    db.refresh(conv_apex)

    msg_apex_1 = ConversationMessage(conversation_id=conv_apex.id, sender="salesperson", text="Hi Sarah, can you tell us about your scheduling issues?")
    msg_apex_2 = ConversationMessage(conversation_id=conv_apex.id, sender="customer", text="We have a 20% patient no-show rate. We want an automated SMS/email scheduler. I think we have about $25,000 budget, but our CFO has the final sign-off and he's very strict about software spending. I haven't spoken to him about this tool yet.")
    msg_apex_3 = ConversationMessage(conversation_id=conv_apex.id, sender="salesperson", text="Got it. We should put together a business case for the CFO showing how a 20% reduction in no-shows pays for the software.")
    db.add_all([msg_apex_1, msg_apex_2, msg_apex_3])

    # 6. Create FollowUps
    fup_abc = FollowUp(
        deal_id=deal_abc.id,
        title="Send revised proposal",
        description="Prepare proposal with 20% discount (₹8,00,000) and request approval from internal Finance Director first.",
        due_date=datetime.datetime.now() + datetime.timedelta(days=2),
        status="PENDING"
    )
    fup_apex = FollowUp(
        deal_id=deal_apex.id,
        title="Draft ROI Business Case for CFO",
        description="Draft business case detailing how reducing no-shows from 20% to 5% will save them $100k annually.",
        due_date=datetime.datetime.now() + datetime.timedelta(days=1),
        status="PENDING"
    )
    db.add_all([fup_abc, fup_apex])

    # 7. Create Memory Metadata (Seeded memories)
    memories_abc = [
        MemoryMetadata(deal_id=deal_abc.id, key="requirement", value="AI customer-support platform with custom NLP models"),
        MemoryMetadata(deal_id=deal_abc.id, key="objection", value="Pricing: List price of ₹10,00,000 is too high; budget limit is ₹8,00,000"),
        MemoryMetadata(deal_id=deal_abc.id, key="decision_maker", value="Rahul Sharma (CTO) is technical decision maker; Finance team has economic sign-off"),
        MemoryMetadata(deal_id=deal_abc.id, key="blocker", value="Requires finance team approval for pricing adjustment")
    ]
    memories_apex = [
        MemoryMetadata(deal_id=deal_apex.id, key="pain_point", value="Patient no-show rates exceed 20% causing lost revenue"),
        MemoryMetadata(deal_id=deal_apex.id, key="requirement", value="Automated SMS and email scheduler integrated with booking systems"),
        MemoryMetadata(deal_id=deal_apex.id, key="budget", value="Around $25,000 (not signed off)"),
        MemoryMetadata(deal_id=deal_apex.id, key="decision_maker", value="VP Operations Sarah Jenkins (technical sponsor); CFO (final economic sign-off, strict spending)"),
        MemoryMetadata(deal_id=deal_apex.id, key="blocker", value="CFO is strict on software spending and is not yet engaged in the opportunity")
    ]
    db.add_all(memories_abc + memories_apex)

    db.commit()
    print("Database seeding completed.")

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()
