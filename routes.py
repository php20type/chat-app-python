from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import db, crud, schemas, openai_client, utils, models

router = APIRouter()

@router.get("/characters", response_model=list[schemas.CharacterOut])
def read_characters(database: Session = Depends(db.get_db)):
    return crud.list_characters(database)

@router.post("/characters", response_model=schemas.CharacterOut)
def create_character(char_in: schemas.CharacterCreate, database: Session = Depends(db.get_db)):
    existing = database.query(models.Character).filter(models.Character.name == char_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Character name already exists")
    return crud.create_character(database, char_in)


@router.get("/characters/{character_id}/sessions", response_model=list[schemas.SessionOut])
def list_sessions_for_character(character_id: int, database: Session = Depends(db.get_db)):
    # return recent sessions for a character (most recent first)
    q = database.query(models.Session).filter(models.Session.character_id == character_id).order_by(models.Session.created_at.desc()).limit(20)
    return q.all()


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, database: Session = Depends(db.get_db)):
    s = database.query(models.Session).filter(models.Session.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    crud.delete_session(database, session_id)
    return {"detail": "session deleted"}


@router.delete("/sessions/{session_id}/messages")
def clear_session_messages(session_id: str, database: Session = Depends(db.get_db)):
    s = database.query(models.Session).filter(models.Session.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    crud.clear_session(database, session_id)
    return {"detail": "session cleared"}


@router.delete("/characters/{character_id}")
def delete_character(character_id: int, database: Session = Depends(db.get_db)):
    c = database.query(models.Character).filter(models.Character.id == character_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Character not found")
    crud.delete_character(database, character_id)
    return {"detail": "character deleted"}

@router.post("/chat", response_model=schemas.ChatResponse)
def chat(req: schemas.ChatRequest, database: Session = Depends(db.get_db)):
    char = crud.get_character(database, req.character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    # get or create session
    session = crud.get_or_create_session(database, req.session_id, req.character_id)

    # Extract and store any key facts from user's message
    new_facts = utils.extract_key_facts(req.message)
    for fact in new_facts:
        crud.add_memory(database, session.id, fact)

    # Get stored memories for context
    memories = crud.get_session_memories(database, session.id)
    memory_facts = [m.fact for m in memories]

    # Analyze message sentiment
    sentiment = utils.analyze_sentiment(req.message)

    # fetch last N messages for context
    max_msgs = req.max_context_messages or 10
    history_objs = crud.get_session_messages(database, session.id, limit=max_msgs)
    history = [{"role": m.role, "content": m.content} for m in history_objs]

    # build enhanced system prompt with memories
    system_prompt = utils.build_system_prompt(char, memory_facts)

    # build messages
    messages = utils.build_messages_for_openai(system_prompt, history, req.message)

    # store user message with sentiment
    crud.add_message(database, session.id, "user", req.message, sentiment)

    # call OpenAI
    try:
        ai_text = openai_client.ai_chat(messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI call failed: {e}")

    # store assistant reply
    crud.add_message(database, session.id, "assistant", ai_text)

    return schemas.ChatResponse(
        session_id=session.id,
        reply=ai_text,
        sentiment=sentiment,
        extracted_facts=new_facts
    )

@router.get("/history", response_model=list[schemas.MessageOut])
def get_history(session_id: str, database: Session = Depends(db.get_db)):
    msgs = crud.get_session_messages(database, session_id)
    return msgs
