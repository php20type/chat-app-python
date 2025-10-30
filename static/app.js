const API_BASE = "/api";

let currentCharacter = null;
let sessionId = null;

async function fetchCharacters() {
  const r = await fetch(`${API_BASE}/characters`);
  const data = await r.json();
  return data;
}

function renderCharacters(chars) {
  const ul = document.getElementById("characters");
  ul.innerHTML = "";
  chars.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = c.name;
    li.onclick = () => selectCharacter(c);
    ul.appendChild(li);
  });
}

async function selectCharacter(character) {
  currentCharacter = character;
  document.getElementById("char-name").textContent = character.name;
  document.getElementById("char-info").textContent =
    (character.personality || "") + "\n" + (character.backstory || "");
  // Clear UI
  document.getElementById("chat-window").innerHTML = "";
  // show delete-character button when a character is selected
  const delCharBtn = document.getElementById("delete-character");
  if (delCharBtn) delCharBtn.style.display = "inline-block";
  // Try to load latest session for this character and its messages
  try {
    const r = await fetch(`${API_BASE}/characters/${character.id}/sessions`);
    if (r.ok) {
      const sessions = await r.json();
      if (sessions.length > 0) {
        // sessions are returned most-recent-first; pick the first
        sessionId = sessions[0].id;
        // show clear/delete chat buttons when session exists
        const clearBtn = document.getElementById("clear-chat");
        if (clearBtn) clearBtn.style.display = "inline-block";
        const delChatBtn = document.getElementById("delete-chat");
        if (delChatBtn) delChatBtn.style.display = "inline-block";
        // load messages for the session
        const h = await fetch(
          `${API_BASE}/history?session_id=${encodeURIComponent(sessionId)}`
        );
        if (h.ok) {
          const msgs = await h.json();
          // render messages
          msgs.forEach((m) => addMessageBubble(m.role, m.content));
        }
        return;
      }
    }
  } catch (err) {
    console.warn("Failed to load sessions:", err);
  }

  // no existing session — let backend create one on first chat
  sessionId = null;
  const clearBtn = document.getElementById("clear-chat");
  if (clearBtn) clearBtn.style.display = "none";
  const delChatBtn = document.getElementById("delete-chat");
  if (delChatBtn) delChatBtn.style.display = "none";
}

async function createCharacter(event) {
  event.preventDefault();

  const name = document.getElementById("char-name-input").value.trim();
  const personality = document.getElementById("char-personality").value.trim();
  const backstory = document.getElementById("char-backstory").value.trim();
  const talkingStyle = document
    .getElementById("char-talking-style")
    .value.trim();

  if (!name) {
    alert("Please enter a character name");
    return;
  }

  const payload = {
    name: name,
    personality: personality,
    backstory: backstory,
    talking_style: talkingStyle,
  };

  try {
    const response = await fetch(`${API_BASE}/characters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.detail || "Failed to create character"}`);
      return;
    }

    // Clear the form
    document.getElementById("char-name-input").value = "";
    document.getElementById("char-personality").value = "";
    document.getElementById("char-backstory").value = "";
    document.getElementById("char-talking-style").value = "";

    await loadCharacters();
  } catch (error) {
    alert("Failed to create character: " + error.message);
  }
}

async function loadCharacters() {
  const chars = await fetchCharacters();
  renderCharacters(chars);
}

function addMessageBubble(role, text, sentiment = null) {
  const container = document.getElementById("chat-window");
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;

  if (sentiment) {
    const sentimentDiv = document.createElement("div");
    sentimentDiv.className = `sentiment-indicator sentiment-${sentiment}`;
    sentimentDiv.textContent = `Mood: ${sentiment}`;
    div.appendChild(sentimentDiv);
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function updateMemoryPanel(facts) {
  const memoryPanel =
    document.getElementById("memory-panel") || createMemoryPanel();
  const memoriesList = memoryPanel.querySelector(".memories-list");

  facts.forEach((fact) => {
    const item = document.createElement("div");
    item.className = "memory-item";
    item.textContent = `• ${fact}`;
    memoriesList.appendChild(item);
  });
}

function createMemoryPanel() {
  const profile = document.getElementById("profile");
  const panel = document.createElement("div");
  panel.id = "memory-panel";
  panel.innerHTML = `
    <h4>Remembered Facts</h4>
    <div class="memories-list"></div>
  `;
  profile.appendChild(panel);
  return panel;
}

document
  .getElementById("create-character")
  .addEventListener("click", createCharacter);

document.getElementById("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentCharacter) {
    alert("Select or create a character first.");
    return;
  }
  const input = document.getElementById("message-input");
  const text = input.value.trim();
  if (!text) return;
  addMessageBubble("user", text);

  const payload = {
    session_id: sessionId || null,
    character_id: currentCharacter.id,
    message: text,
    max_context_messages: 12,
  };
  input.value = "";
  const resp = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (resp.ok) {
    sessionId = data.session_id;
    addMessageBubble("assistant", data.reply);
    // show clear/delete chat buttons when a session is active
    const clearBtn = document.getElementById("clear-chat");
    if (clearBtn) clearBtn.style.display = "inline-block";
    const delChatBtn = document.getElementById("delete-chat");
    if (delChatBtn) delChatBtn.style.display = "inline-block";

    // Update memory panel if new facts were extracted
    if (data.extracted_facts && data.extracted_facts.length > 0) {
      updateMemoryPanel(data.extracted_facts);
    }

    // Add sentiment to user's message
    const userBubbles = document.querySelectorAll(".bubble.user");
    const lastUserBubble = userBubbles[userBubbles.length - 1];
    if (lastUserBubble && data.sentiment) {
      const sentimentDiv = document.createElement("div");
      sentimentDiv.className = `sentiment-indicator sentiment-${data.sentiment}`;
      sentimentDiv.textContent = `Mood: ${data.sentiment}`;
      lastUserBubble.appendChild(sentimentDiv);
    }
  } else {
    addMessageBubble(
      "assistant",
      `Error: ${data.detail || JSON.stringify(data)}`
    );
  }
});

loadCharacters();

// Delete chat (permanently delete session)
document.getElementById("delete-chat")?.addEventListener("click", async () => {
  if (!sessionId) {
    alert("No active conversation to delete.");
    return;
  }
  if (!confirm("Delete this chat and all its messages? This cannot be undone."))
    return;

  try {
    const resp = await fetch(
      `${API_BASE}/sessions/${encodeURIComponent(sessionId)}`,
      { method: "DELETE" }
    );
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: "delete failed" }));
      alert("Delete failed: " + (err.detail || JSON.stringify(err)));
      return;
    }
    // clear UI
    document.getElementById("chat-window").innerHTML = "";
    sessionId = null;
    // clear memory panel if present
    const mem = document.querySelector("#memory-panel .memories-list");
    if (mem) mem.innerHTML = "";
    // hide clear/delete buttons
    const clearBtn = document.getElementById("clear-chat");
    if (clearBtn) clearBtn.style.display = "none";
    const delChatBtn = document.getElementById("delete-chat");
    if (delChatBtn) delChatBtn.style.display = "none";
    alert("Chat deleted.");
  } catch (e) {
    alert("Delete failed: " + e.message);
  }
});

// Clear chat (remove messages and memories, keep session)
document.getElementById("clear-chat")?.addEventListener("click", async () => {
  if (!sessionId) {
    alert("No active conversation to clear.");
    return;
  }
  if (!confirm("Clear this chat (remove messages & memories) ?")) return;

  try {
    const resp = await fetch(
      `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages`,
      { method: "DELETE" }
    );
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: "clear failed" }));
      alert("Clear failed: " + (err.detail || JSON.stringify(err)));
      return;
    }
    // clear UI but keep sessionId so subsequent messages continue in same session
    document.getElementById("chat-window").innerHTML = "";
    const mem = document.querySelector("#memory-panel .memories-list");
    if (mem) mem.innerHTML = "";
    alert("Chat cleared.");
  } catch (e) {
    alert("Clear failed: " + e.message);
  }
});

// Delete character handler
document
  .getElementById("delete-character")
  ?.addEventListener("click", async () => {
    if (!currentCharacter) {
      alert("No character selected.");
      return;
    }
    if (
      !confirm(
        `Delete character '${currentCharacter.name}' and all its conversations? This cannot be undone.`
      )
    )
      return;

    try {
      const resp = await fetch(
        `${API_BASE}/characters/${currentCharacter.id}`,
        { method: "DELETE" }
      );
      if (!resp.ok) {
        const err = await resp
          .json()
          .catch(() => ({ detail: "delete failed" }));
        alert("Delete failed: " + (err.detail || JSON.stringify(err)));
        return;
      }
      // refresh character list and clear UI
      await loadCharacters();
      document.getElementById("chat-window").innerHTML = "";
      const mem = document.querySelector("#memory-panel .memories-list");
      if (mem) mem.innerHTML = "";
      sessionId = null;
      currentCharacter = null;
      document.getElementById("char-name").textContent = "Select a character";
      document.getElementById("char-info").textContent = "";
      // hide delete buttons
      const delCharBtn = document.getElementById("delete-character");
      if (delCharBtn) delCharBtn.style.display = "none";
      const clearBtn = document.getElementById("clear-chat");
      if (clearBtn) clearBtn.style.display = "none";
      const delChatBtn = document.getElementById("delete-chat");
      if (delChatBtn) delChatBtn.style.display = "none";
      alert("Character deleted.");
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  });
