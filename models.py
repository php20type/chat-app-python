from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from db import Base

class Character(Base):
    __tablename__ = "characters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    personality = Column(Text, nullable=True)   # free text
    backstory = Column(Text, nullable=True)
    talking_style = Column(Text, nullable=True)

    sessions = relationship("Session", back_populates="character")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(String(64), primary_key=True, index=True)  # client-generated or server-generated uuid
    character_id = Column(Integer, ForeignKey("characters.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    character = relationship("Character", back_populates="sessions")
    messages = relationship("Message", back_populates="session", order_by="Message.created_at")
    memories = relationship("Memory", back_populates="session", order_by="Memory.created_at")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("sessions.id"), index=True)
    role = Column(String(16), nullable=False)  # "user" or "assistant" or "system"
    content = Column(Text, nullable=False)
    sentiment = Column(String(16), nullable=True)  # positive, negative, or neutral
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="messages")

class Memory(Base):
    __tablename__ = "memories"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("sessions.id"), index=True)
    fact = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="memories", foreign_keys=[session_id])
