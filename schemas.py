from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CharacterCreate(BaseModel):
    name: str
    personality: Optional[str] = None
    backstory: Optional[str] = None
    talking_style: Optional[str] = None

class CharacterOut(BaseModel):
    id: int
    name: str
    personality: Optional[str]
    backstory: Optional[str]
    talking_style: Optional[str]

    class Config:
        orm_mode = True

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    character_id: int
    message: str
    max_context_messages: Optional[int] = 10

class ChatResponse(BaseModel):
    session_id: str
    reply: str
    sentiment: str
    extracted_facts: List[str]

class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        orm_mode = True


class SessionOut(BaseModel):
    id: str
    character_id: int
    created_at: datetime

    class Config:
        orm_mode = True
