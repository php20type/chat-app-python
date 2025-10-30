from sqlalchemy.orm import Session
import uuid
import models, schemas

def create_character(db: Session, char: schemas.CharacterCreate):
    db_char = models.Character(
        name=char.name,
        personality=char.personality,
        backstory=char.backstory,
        talking_style=char.talking_style
    )
    db.add(db_char)
    db.commit()
    db.refresh(db_char)
    return db_char

def list_characters(db: Session):
    return db.query(models.Character).all()

def get_character(db: Session, char_id: int):
    return db.query(models.Character).filter(models.Character.id == char_id).first()

def get_or_create_session(db: Session, session_id: str | None, character_id: int):
    if session_id:
        s = db.query(models.Session).filter(models.Session.id == session_id).first()
        if s:
            return s
    # create a new session
    new_id = session_id or str(uuid.uuid4())
    s = models.Session(id=new_id, character_id=character_id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

def add_message(db: Session, session_id: str, role: str, content: str, sentiment: str = None):
    m = models.Message(session_id=session_id, role=role, content=content, sentiment=sentiment)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

def get_session_messages(db: Session, session_id: str, limit: int | None = None):
    q = db.query(models.Message).filter(models.Message.session_id == session_id).order_by(models.Message.created_at)
    if limit:
        return q.limit(limit).all()
    return q.all()

def add_memory(db: Session, session_id: str, fact: str):
    memory = models.Memory(session_id=session_id, fact=fact)
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory

def get_session_memories(db: Session, session_id: str):
    return db.query(models.Memory).filter(models.Memory.session_id == session_id).order_by(models.Memory.created_at).all()
