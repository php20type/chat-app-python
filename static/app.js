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
  // Try to load latest session for this character and its messages
  try {
    const r = await fetch(`${API_BASE}/characters/${character.id}/sessions`);
    if (r.ok) {
      const sessions = await r.json();
      if (sessions.length > 0) {
        // sessions are returned most-recent-first; pick the first
        sessionId = sessions[0].id;
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
