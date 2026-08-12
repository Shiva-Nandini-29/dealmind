import os
import logging
from sqlalchemy.orm import Session
from ..database.models import MemoryMetadata

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try importing hindsight_client
try:
    from hindsight_client import Hindsight
    HINDSIGHT_AVAILABLE = True
except ImportError:
    HINDSIGHT_AVAILABLE = False
    logger.warning("hindsight-client is not installed or import failed. Falling back to SQL memory store.")

# Initialize Hindsight Client
HINDSIGHT_URL = os.getenv("HINDSIGHT_URL", "http://localhost:8888")
hindsight_client = None

if HINDSIGHT_AVAILABLE:
    try:
        hindsight_client = Hindsight(base_url=HINDSIGHT_URL)
    except Exception as e:
        logger.warning(f"Could not initialize Hindsight client: {e}. Falling back to SQL memory.")

class MemoryService:
    @staticmethod
    def retain_memory(db: Session, deal_id: int, key: str, value: str, source_type: str = "conversation") -> MemoryMetadata:
        """
        Retains information in both local SQL database and Hindsight.
        """
        # 1. Store in Local Database
        # Check if this memory already exists to avoid duplication
        existing = db.query(MemoryMetadata).filter(
            MemoryMetadata.deal_id == deal_id,
            MemoryMetadata.key == key,
            MemoryMetadata.value == value
        ).first()

        if existing:
            return existing

        db_memory = MemoryMetadata(
            deal_id=deal_id,
            key=key,
            value=value,
            source_type=source_type
        )
        db.add(db_memory)
        db.commit()
        db.refresh(db_memory)

        # 2. Store in Hindsight Memory Bank
        if HINDSIGHT_AVAILABLE and hindsight_client:
            bank_id = f"deal-{deal_id}"
            content = f"[{key.upper()}] {value}"
            try:
                # Store memory in Hindsight bank
                hindsight_client.retain(bank_id=bank_id, content=content)
                logger.info(f"Hindsight retained memory for {bank_id}: {content}")
            except Exception as e:
                logger.warning(f"Hindsight server connection failed, saved to local DB only: {e}")

        return db_memory

    @staticmethod
    def recall_memory(db: Session, deal_id: int, query: str) -> list[str]:
        """
        Recalls relevant memories using Hindsight, falling back to local DB memories.
        """
        memories = []
        bank_id = f"deal-{deal_id}"

        # 1. Try recalling from Hindsight
        if HINDSIGHT_AVAILABLE and hindsight_client:
            try:
                response = hindsight_client.recall(bank_id=bank_id, query=query)
                logger.info(f"Hindsight recalled memories for {bank_id}: {response}")
                
                # Parse Hindsight response flexibly
                if response:
                    if isinstance(response, list):
                        for item in response:
                            if isinstance(item, str):
                                memories.append(item)
                            elif isinstance(item, dict):
                                memories.append(item.get("content") or item.get("text") or str(item))
                    elif isinstance(response, dict):
                        # Some versions might return dict with key "memories"
                        m_list = response.get("memories") or response.get("results")
                        if isinstance(m_list, list):
                            for item in m_list:
                                if isinstance(item, str):
                                    memories.append(item)
                                elif isinstance(item, dict):
                                    memories.append(item.get("content") or item.get("text") or str(item))
                        else:
                            memories.append(str(response))
                    elif hasattr(response, "memories") and isinstance(response.memories, list):
                        memories = [m.content if hasattr(m, 'content') else str(m) for m in response.memories]
                    else:
                        memories.append(str(response))
            except Exception as e:
                logger.warning(f"Hindsight recall failed: {e}. Falling back to local DB lookup.")

        # 2. Local Fallback (If Hindsight failed or returned empty)
        if not memories:
            logger.info("Using local DB fallback for memory recall")
            db_memories = db.query(MemoryMetadata).filter(MemoryMetadata.deal_id == deal_id).all()
            # If we have local memories, we retrieve all of them so the LLM has complete context.
            memories = [f"[{m.key.upper()}] {m.value}" for m in db_memories]

        return memories

    @staticmethod
    def reflect_memory(db: Session, deal_id: int, query: str) -> str:
        """
        Runs a reflection reasoning cycle on stored memories.
        """
        bank_id = f"deal-{deal_id}"
        if HINDSIGHT_AVAILABLE and hindsight_client:
            try:
                response = hindsight_client.reflect(bank_id=bank_id, query=query)
                if response:
                    if isinstance(response, dict) and "reflection" in response:
                        return response["reflection"]
                    return str(response)
            except Exception as e:
                logger.warning(f"Hindsight reflect failed: {e}. Performing local reflection.")

        # Fallback local reflection based on recalled memories
        memories = MemoryService.recall_memory(db, deal_id, query)
        if not memories:
            return "No memories found to reflect upon."
        return "\n".join(memories)
