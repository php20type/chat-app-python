import os
import openai
from typing import List, Dict

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set in environment variables. Please check your .env file.")
openai.api_key = OPENAI_API_KEY

# simple wrapper for chat completion - synchronous for simplicity
def ai_chat(messages: List[Dict[str, str]], model: str = "gpt-4o-mini") -> str:
    """
    messages: list like [{"role":"system","content":"..."}, {"role":"user","content":"..."}]
    Returns assistant text.
    """
    if not openai.api_key:
        raise RuntimeError("OPENAI_API_KEY not set in environment")

    # using Chat Completions (the exact call may vary depending on openai python library version)
    resp = openai.ChatCompletion.create(
        model=model,
        messages=messages,
        temperature=0.8,
        max_tokens=512
    )
    # typical shape: resp.choices[0].message.content
    return resp.choices[0].message["content"]
