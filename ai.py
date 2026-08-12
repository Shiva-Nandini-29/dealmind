import os
import json
import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from google import genai
from google.genai import errors
from ..database.models import Customer, Deal, Conversation, MemoryMetadata, User, Activity
from .memory import MemoryService

logger = logging.getLogger(__name__)

# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = None

if GEMINI_API_KEY:
    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("Gemini API Client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini Client: {e}")
else:
    logger.warning("GEMINI_API_KEY is not set. AI services will run in simulation mode.")

class AIService:
    @staticmethod
    def _call_gemini(prompt: str, response_mime_type: Optional[str] = None) -> str:
        """
        Helper method to call Gemini, with fallback to simulation mode if API key is missing.
        """
        if not gemini_client:
            return AIService._get_simulated_response(prompt)
        
        try:
            # We use gemini-2.0-flash for fast and intelligent processing
            config = {}
            if response_mime_type:
                # To support older or newer API models, we pass config parameters
                from google.genai import types
                config = types.GenerateContentConfig(
                    response_mime_type=response_mime_type,
                    temperature=0.2
                )
            
            response = gemini_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=config
            )
            return response.text.strip()
        except errors.APIError as e:
            logger.error(f"Gemini API Error: {e}")
            return AIService._get_simulated_response(prompt)
        except Exception as e:
            logger.error(f"Unexpected error calling Gemini: {e}")
            return AIService._get_simulated_response(prompt)

    @staticmethod
    def extract_conversation_intelligence(transcript: str) -> Dict[str, Any]:
        """
        Extracts summary, key takeaways, and critical memory entities from conversation transcript.
        """
        prompt = f"""
        Analyze the following sales call transcript and extract structured intelligence in JSON format.
        
        Transcript:
        \"\"\"{transcript}\"\"\"
        
        Provide the output in the following JSON schema:
        {{
            "summary": "Brief 2-3 sentence overview of the conversation",
            "key_takeaways": ["Takeaway 1", "Takeaway 2", ...],
            "extracted_memories": [
                {{
                    "key": "one of: requirement, objection, pain_point, budget, decision_maker, timeline",
                    "value": "Description of the extracted memory (e.g. Budget is limited to 8,00,000 INR)"
                }}
            ]
        }}
        
        Do not output markdown code blocks. Output raw JSON only.
        """
        
        response_text = AIService._call_gemini(prompt, response_mime_type="application/json")
        
        try:
            # Strip markdown formatting in case Gemini ignored the directive
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "", 1).rstrip("`\n ")
            elif response_text.startswith("```"):
                response_text = response_text.replace("```", "", 1).rstrip("`\n ")
            
            return json.loads(response_text)
        except Exception as e:
            logger.error(f"JSON parsing failed for conversation extraction: {e}. Output: {response_text}")
            return {
                "summary": "Meeting completed. Handled discovery and reviewed project requirements.",
                "key_takeaways": ["Reviewed core features", "Discussed pricing & blockers"],
                "extracted_memories": []
            }

    @staticmethod
    def analyze_deal_risk_and_actions(deal_name: str, stage: str, value: float, requirements: str, pain_points: str, budget: str, decision_maker: str, memories: List[str], conversations: List[str]) -> Dict[str, Any]:
        """
        Analyzes deal stages, budget details, activity, and historical memories to decide risk level and next actions.
        """
        memories_str = "\n".join(memories)
        convs_str = "\n\n".join(conversations[:3]) # Take last 3 conversations

        prompt = f"""
        Analyze this sales deal and generate a risk assessment and recommended Next Best Action.
        
        Deal Details:
        - Name: {deal_name}
        - Stage: {stage}
        - Value: {value}
        - Core Requirements: {requirements}
        - Pain Points: {pain_points}
        - Budget: {budget}
        - Decision Maker: {decision_maker}
        
        Historical Memories & Commitments:
        {memories_str}
        
        Recent Conversations:
        {convs_str}
        
        Determine:
        1. Deal Risk Level: Must be "LOW", "MEDIUM", or "HIGH".
           - Use HIGH risk if budget is unconfirmed, decision maker is not engaged, or there is a major unaddressed pricing objection.
           - Use MEDIUM risk if there is an active pricing objection being negotiated, or timeline is slightly delayed.
           - Use LOW risk if requirements match, decision maker is active, and no objections.
        2. Risk Reasons: Explain exactly why this risk level was selected. List the main concerns.
        3. Next Best Action: Recommend a highly specific, context-aware next step. Do not write generic advice.
        
        Provide the output in the following JSON schema:
        {{
            "risk_level": "LOW or MEDIUM or HIGH",
            "risk_reasons": "Detailed explanation of the risk triggers",
            "next_action": "Specific next action for the salesperson"
        }}
        
        Output raw JSON only.
        """
        
        response_text = AIService._call_gemini(prompt, response_mime_type="application/json")
        
        try:
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "", 1).rstrip("`\n ")
            elif response_text.startswith("```"):
                response_text = response_text.replace("```", "", 1).rstrip("`\n ")
                
            return json.loads(response_text)
        except Exception as e:
            logger.error(f"JSON parsing failed for deal analysis: {e}. Output: {response_text}")
            return {
                "risk_level": "MEDIUM",
                "risk_reasons": "Awaiting finalized pricing alignment and next-stage executive reviews.",
                "next_action": "Contact the technical lead to set up a pricing review call."
            }

    @staticmethod
    def grounded_chat(query: str, user_id: int, deal_id: Optional[int], customer_id: Optional[int], db: Session) -> Dict[str, Any]:
        """
        Grounded sales chatbot. Fetches relevant database records and Hindsight memories to construct a truthful answer.
        """
        sources = []
        context_parts = []
        
        # 1. Fetch structured DB context
        if deal_id:
            deal = db.query(Deal).filter(Deal.id == deal_id, Deal.user_id == user_id).first()
            if deal:
                context_parts.append(f"DEAL DETAILS:\n- Deal Name: {deal.name}\n- Stage: {deal.stage}\n- Pipeline Value: {deal.value}\n- Current Risk: {deal.risk_level} (Reasons: {deal.risk_reasons or 'None'})\n- Next Best Action: {deal.next_action or 'None'}")
                sources.append(f"Database: Deal '{deal.name}'")
                
                customer = deal.customer
                if customer:
                    context_parts.append(f"CUSTOMER DETAILS:\n- Company: {customer.company}\n- Contact: {customer.name} ({customer.role})\n- Budget: {customer.budget or 'Not specified'}\n- Pain Points: {customer.pain_points or 'None'}\n- Decision Maker: {customer.decision_maker or 'Unknown'}")
                    sources.append(f"Database: Customer '{customer.name} @ {customer.company}'")
                
                # Recall Hindsight memories for the deal
                memories = MemoryService.recall_memory(db, deal.id, query)
                if memories:
                    context_parts.append("RECALLED PERSISTENT MEMORIES:")
                    for m in memories:
                        context_parts.append(f"- {m}")
                    sources.append(f"Hindsight Memory Bank: 'deal-{deal.id}' ({len(memories)} facts)")
                    
                # Fetch recent conversations
                conversations = db.query(Conversation).filter(Conversation.deal_id == deal.id).order_by(Conversation.meeting_date.desc()).limit(3).all()
                if conversations:
                    context_parts.append("RECENT CONVERSATIONS:")
                    for conv in conversations:
                        context_parts.append(f"- [{conv.meeting_date.strftime('%Y-%m-%d')}] '{conv.title}': {conv.summary}")
                        if conv.key_takeaways:
                            context_parts.append(f"  Key Takeaways: {conv.key_takeaways}")
                    sources.append(f"Database: {len(conversations)} Conversation logs")

        elif customer_id:
            customer = db.query(Customer).filter(Customer.id == customer_id, Customer.user_id == user_id).first()
            if customer:
                context_parts.append(f"CUSTOMER DETAILS:\n- Company: {customer.company}\n- Contact: {customer.name} ({customer.role})\n- Budget: {customer.budget or 'Not specified'}\n- Requirements: {customer.requirements or 'None'}\n- Pain Points: {customer.pain_points or 'None'}\n- Decision Maker: {customer.decision_maker or 'Unknown'}")
                sources.append(f"Database: Customer '{customer.name} @ {customer.company}'")
                
                # Look up deals for this customer
                deals = db.query(Deal).filter(Deal.customer_id == customer.id).all()
                if deals:
                    context_parts.append("ASSOCIATED DEALS:")
                    for d in deals:
                        context_parts.append(f"- Deal Name: {d.name}\n  Value: {d.value}\n  Stage: {d.stage}\n  Risk: {d.risk_level}\n  Next Action: {d.next_action or 'None'}")
                        # Combine all deal memories
                        mem = MemoryService.recall_memory(db, d.id, query)
                        if mem:
                            context_parts.append(f"  Recalled Memories: {', '.join(mem)}")
                    sources.append(f"Database: {len(deals)} Associated Deals")
        else:
            # Global user query, get all deals/customers
            deals = db.query(Deal).filter(Deal.user_id == user_id).all()
            customers = db.query(Customer).filter(Customer.user_id == user_id).all()
            
            context_parts.append("GLOBAL PIPELINE STATUS:")
            context_parts.append(f"- Total Customers: {len(customers)}")
            context_parts.append(f"- Total Active Deals: {len(deals)}")
            
            for d in deals:
                context_parts.append(f"- Deal '{d.name}' (Value: {d.value}, Stage: {d.stage}, Risk: {d.risk_level})")
            sources.append("Database: Global Account Overview")

        context_str = "\n\n".join(context_parts)
        
        prompt = f"""
        You are DealMind AI, a highly grounded sales intelligence agent.
        Your task is to answer the salesperson's question using ONLY the provided CRM database records and Hindsight recalled memories.
        
        CRITICAL RULES:
        1. Ground your response strictly in the provided context.
        2. Do NOT invent, assume, or hallucinate names, budgets, values, dates, or discussions.
        3. If the context does not contain the answer, state clearly: "I don't have enough information in the deal database or persistent memory to answer that."
        4. Cite facts or conversations where appropriate.
        
        Provided Context:
        \"\"\"{context_str}\"\"\"
        
        Salesperson Question:
        \"{query}\"
        
        Response:
        """
        
        response_text = AIService._call_gemini(prompt)
        
        return {
            "response": response_text,
            "sources": sources
        }

    @staticmethod
    def _get_simulated_response(prompt: str) -> str:
        """
        A simulated fallback if Gemini API client is unconfigured or offline.
        Uses rule-based regex parsing of the prompt to extract context and simulate realistic outputs.
        """
        # Parse prompt to determine what we are simulating
        if "Determine:" in prompt and "risk_level" in prompt:
            # We are simulating deal analysis
            if "pricing objection" in prompt.lower() or "budget is ₹8,00,000 but list price is ₹10,00,000" in prompt.lower():
                return json.dumps({
                    "risk_level": "MEDIUM",
                    "risk_reasons": "Pricing objection raised. Customer wants ₹8,00,000 vs list ₹10,00,000. Needs finance team approval.",
                    "next_action": "Submit discount request for ₹8,00,000 and coordinate meeting with finance team."
                })
            elif "cfo is not yet engaged" in prompt.lower() or "economic buyer" in prompt.lower():
                return json.dumps({
                    "risk_level": "HIGH",
                    "risk_reasons": "Economic buyer (CFO) is not engaged, and budget sign-off is pending.",
                    "next_action": "Schedule demo focusing on ROI and request Sarah to introduce us to the CFO."
                })
            else:
                return json.dumps({
                    "risk_level": "LOW",
                    "risk_reasons": "No active blockers identified. Alignment on key requirements.",
                    "next_action": "Follow up to finalize legal contract review."
                })
                
        elif "extracted_memories" in prompt:
            # Simulating conversation intelligence
            if "budget of 8,00,000" in prompt or "8,00,000 max" in prompt:
                return json.dumps({
                    "summary": "NLP platform demo completed successfully. Product fit is high, but pricing is currently a blocker as budget is capped at ₹8,00,000.",
                    "key_takeaways": [
                        "Demo went very well; loved custom NLP integration.",
                        "Budget is constrained to ₹8,00,000 maximum.",
                        "Objection: Pricing of list ₹10,00,000 is too high.",
                        "Blocker: Needs approval from the finance team before proceeding."
                    ],
                    "extracted_memories": [
                        {"key": "requirement", "value": "AI customer-support platform with custom NLP model"},
                        {"key": "objection", "value": "Pricing of list ₹10,00,000 is too high; budget limit is ₹8,00,000"},
                        {"key": "decision_maker", "value": "Rahul Sharma (CTO) is technical decision maker; Finance team has economic sign-off"},
                        {"key": "blocker", "value": "Requires finance team approval for pricing adjustment"}
                    ]
                })
            else:
                return json.dumps({
                    "summary": "Completed initial requirements review. Validated project scope and technical parameters.",
                    "key_takeaways": ["Clarified client requirements", "Scheduled follow-up session"],
                    "extracted_memories": [
                        {"key": "requirement", "value": "Automated email/SMS notifications and scheduler integration"}
                    ]
                })
                
        else:
            # Simulating general chat
            if "ABC Technologies" in prompt or "abctech.com" in prompt or "Rahul" in prompt:
                if "block" in prompt.lower() or "concern" in prompt.lower() or "pricing" in prompt.lower():
                    return "The biggest blocker for ABC Technologies is pricing. While Rahul Sharma (CTO) is very interested in the platform and the custom NLP capabilities, their maximum budget is ₹8,00,000, which is below the list price of ₹10,00,000. Additionally, finance team approval is required to proceed with any custom pricing."
                elif "meeting" in prompt.lower() or "happen" in prompt.lower():
                    return "In the last meeting (NLP Platform Demo), the team demonstrated the NLP customer support capabilities. Rahul was highly impressed, but stated that the list pricing is too high for their ₹8,00,000 budget and that he needs approval from their finance team before proceeding."
                else:
                    return "ABC Technologies is currently in the Negotiation stage for the AI Customer Support Platform. The deal value is ₹8,00,000 with a 60% probability. The primary technical contact is CTO Rahul Sharma, and the main blocker is adjusting pricing to match their budget."
            elif "Apex" in prompt or "Sarah" in prompt:
                if "risk" in prompt.lower() or "why" in prompt.lower():
                    return "The Apex Booking Integration deal is classified as HIGH risk. The primary reasons are: (1) the economic buyer (CFO) is not yet engaged in the discussion, (2) the budget of $25,000 has not been officially signed off, and (3) the CFO is known to be very strict regarding software expenditures."
                else:
                    return "Apex Health is looking for an automated patient booking scheduler to address their 20% patient no-show rate. The VP of Operations Sarah Jenkins is the technical sponsor. The deal value is $25,000, currently in the Qualification stage (HIGH risk)."
            else:
                return "DealMind AI: I have loaded your sales pipeline including ABC Technologies (Negotiation stage, medium risk) and Apex Health (Qualification stage, high risk). Let me know if you would like me to summarize blockers or suggest next actions for these accounts."
