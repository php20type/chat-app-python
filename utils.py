import re
from typing import List, Dict
from datetime import datetime

def extract_key_facts(message: str) -> List[str]:
    """Extract potentially important facts from user messages."""
    facts = []
    
    patterns = [
        r"(?:I am|I'm) (?:a\s)?([^.,!?]+)",  # "I am a doctor", "I'm tired"
        r"My (?:name is|favorite|job|hobby) (?:is\s)?([^.,!?]+)",  # Personal facts
        r"I (?:like|love|hate|enjoy) ([^.,!?]+)",  # Preferences
        r"I live (?:in|at) ([^.,!?]+)",  # Location information
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, message, re.IGNORECASE)
        for match in matches:
            facts.append(match.group(0))
    
    return facts

def analyze_sentiment(message: str) -> str:
    """Simple sentiment analysis based on key words."""
    positive_words = {'love', 'like', 'great', 'good', 'happy', 'excellent', 'wonderful', 'amazing'}
    negative_words = {'hate', 'bad', 'terrible', 'awful', 'sad', 'angry', 'upset'}
    
    words = set(message.lower().split())
    pos_count = len(words.intersection(positive_words))
    neg_count = len(words.intersection(negative_words))
    
    if pos_count > neg_count:
        return "positive"
    elif neg_count > pos_count:
        return "negative"
    return "neutral"

def build_system_prompt(character, context_memory: List[str] = None) -> str:
    """Build an enhanced system prompt with memory and context."""
    pieces = []
    pieces.append(f"You are roleplaying as {character.name}.")
    
    if character.personality:
        pieces.append(f"Personality: {character.personality}")
    if character.backstory:
        pieces.append(f"Backstory: {character.backstory}")
    if character.talking_style:
        pieces.append(f"Talking style: {character.talking_style}")
    
    # Add memory context if available
    if context_memory and len(context_memory) > 0:
        pieces.append("\nWhat you know about the user:")
        pieces.extend([f"- {fact}" for fact in context_memory])
    
    # Enhanced instructions
    pieces.append("\nGuidelines:")
    pieces.append("1. Stay consistently in character")
    pieces.append("2. Reference relevant memories about the user when appropriate")
    pieces.append("3. Keep responses concise and engaging")
    pieces.append("4. Use your defined talking style")
    
    return "\n\n".join(pieces)

def build_messages_for_openai(system_prompt: str, history: List[Dict], user_input: str) -> List[Dict[str,str]]:
    # history: list of {'role':'user'|'assistant', 'content':...}
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_input})
    return messages
