const MATCH_THRESHOLD = 3;
const DEBOUNCE_MS = 600;
const MIN_INPUT_LENGTH = 40;
const SUGGESTION_COOLDOWN_MS = 60000;
const NUDGE_CHECK_DELAY_MS = 15000; // check nudge 15 seconds after page load

let debounceTimer = null;
let lastSuggestionText = null;
let lastSuggestionTime = 0;
let sessionMessageCount = 0;
let toastShownThisSession = false;

// ─── Session counter ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SESSION_COUNT") {
    sessionMessageCount = message.payload;
  }
});

// ─── Keyword matching ──────────────────────────────────────────────────────

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 3);
}

function scoreMatch(inputTokens, entryText) {
  const entryTokens = new Set(tokenize(entryText));
  return inputTokens.filter(token => entryTokens.has(token)).length;
}

// ─── Embedding matching ────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getQueryEmbedding(text, apiKey, apiEndpoint) {
  try {
    const endpoint = apiEndpoint || "https://api.cohere.com/v1/embed";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        texts: [text],
        model: "embed-english-v3.0",
        input_type: "search_query" // query vs document — cohere distinguishes these
      })
    });
    const data = await response.json();
    return data.embeddings?.[0] || null;
  } catch {
    return null;
  }
}

function findBestMatchByEmbedding(queryEmbedding, entries) {
  let best = null;
  let bestScore = 0;

  entries.forEach(entry => {
    if (!entry.embedding) return;
    const score = cosineSimilarity(queryEmbedding, entry.embedding);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  });

  // cosine similarity threshold — 0.75 is a good starting point
  return bestScore >= 0.75 ? best : null;
}

function findBestMatchByKeyword(inputText, entries) {
  const inputTokens = tokenize(inputText);
  if (inputTokens.length < 3) return null;

  let best = null;
  let bestScore = 0;

  entries.forEach(entry => {
    const score = scoreMatch(inputTokens, entry.text);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  });

  return bestScore >= MATCH_THRESHOLD ? best : null;
}

// ─── Input handler ─────────────────────────────────────────────────────────

function handleInput(e) {
  const input = e.target;
  const text = input.value || input.innerText || "";

  if (sessionMessageCount > 0 || toastShownThisSession) return;
  if (text.length < MIN_INPUT_LENGTH) {
    dismissToast();
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    chrome.storage.local.get(["entries", "contextScope", "apiKey", "apiEndpoint"], async (result) => {
      let entries = result.entries || [];
      const scope = result.contextScope || "cross";
      const apiKey = result.apiKey || null;
      const apiEndpoint = result.apiEndpoint || null;

      if (scope === "per") {
        entries = entries.filter(e => e.source === window.location.hostname);
      }

      let match = null;

      // use embedding matching if API key is set and entries have embeddings
      const hasEmbeddings = entries.some(e => e.embedding);
      if (apiKey && hasEmbeddings) {
        const queryEmbedding = await getQueryEmbedding(text, apiKey, apiEndpoint);
        if (queryEmbedding) {
          match = findBestMatchByEmbedding(queryEmbedding, entries);
        }
      }

      // fall back to keyword matching
      if (!match) {
        match = findBestMatchByKeyword(text, entries);
      }

      if (match) {
        const now = Date.now();
        const isSameEntry = match.text === lastSuggestionText;
        const isCoolingDown = (now - lastSuggestionTime) < SUGGESTION_COOLDOWN_MS;

        if (!(isSameEntry && isCoolingDown)) {
          lastSuggestionText = match.text;
          lastSuggestionTime = now;
          toastShownThisSession = true;
          showToast(match, input);
        }
      }
    });
  }, DEBOUNCE_MS);
}

// ─── Listeners and observers ───────────────────────────────────────────────

function attachListeners() {
  document.querySelectorAll("textarea, input[type='text'], [contenteditable='true']")
    .forEach(el => {
      if (el.dataset.pmAttached) return;
      el.dataset.pmAttached = "true";
      el.addEventListener("input", handleInput);
    });
}

const matcherObserver = new MutationObserver(attachListeners);
matcherObserver.observe(document.body, { childList: true, subtree: true });
attachListeners();

// ─── API key nudge ─────────────────────────────────────────────────────────

setTimeout(() => {
  if (toastShownThisSession) return; // don't compete with context toast
  chrome.runtime.sendMessage({ type: "CHECK_NUDGE" }, (response) => {
    if (response?.show) showNudgeToast();
  });
}, NUDGE_CHECK_DELAY_MS);

// ─── Toast UI ──────────────────────────────────────────────────────────────

function showToast(entry, targetInput) {
  dismissToast();

  const DURATION = 14;
  const toast = document.createElement("div");
  toast.id = "pm-toast";
  toast.innerHTML = `
    <span>💡 Saved context:</span>
    <span class="pm-preview">${entry.text.slice(0, 80)}…</span>
    <span class="pm-countdown">${DURATION}s</span>
    <button class="pm-accept">Inject</button>
    <button class="pm-dismiss">Dismiss</button>
  `;

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));

  let secondsLeft = DURATION;
  const countdownEl = toast.querySelector(".pm-countdown");

  const countdownInterval = setInterval(() => {
    secondsLeft--;
    if (countdownEl) countdownEl.textContent = `${secondsLeft}s`;
    if (secondsLeft <= 0) clearInterval(countdownInterval);
  }, 1000);

  const autoDismiss = setTimeout(() => {
    clearInterval(countdownInterval);
    dismissToast();
  }, DURATION * 1000);

  toast.querySelector(".pm-accept").addEventListener("click", () => {
    injectContext(entry.text, targetInput);
    clearTimeout(autoDismiss);
    clearInterval(countdownInterval);
    dismissToast();
  });

  toast.querySelector(".pm-dismiss").addEventListener("click", () => {
    clearTimeout(autoDismiss);
    clearInterval(countdownInterval);
    dismissToast();
  });
}

 


function showNudgeToast() {
  const existing = document.getElementById("pm-nudge");
  if (existing) return;

  const DURATION = 15;
  const nudge = document.createElement("div");
  nudge.id = "pm-nudge";
  nudge.innerHTML = `
    <span>⚡ Prompt Memory works better with an API key — enables smart matching and auto-summarization.</span>
    <span class="pm-countdown">${DURATION}s</span>
    <button id="pm-nudge-open">Set up</button>
    <button id="pm-nudge-dismiss">Maybe later</button>
  `;

  document.body.appendChild(nudge);
  requestAnimationFrame(() => nudge.classList.add("visible"));

  let secondsLeft = DURATION;
  const countdownEl = nudge.querySelector(".pm-countdown");

  const countdownInterval = setInterval(() => {
    secondsLeft--;
    if (countdownEl) countdownEl.textContent = `${secondsLeft}s`;
    if (secondsLeft <= 0) clearInterval(countdownInterval);
  }, 1000);

  const autoDismiss = setTimeout(() => {
    clearInterval(countdownInterval);
    nudge.remove();
  }, DURATION * 1000);

  nudge.querySelector("#pm-nudge-open").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
    clearTimeout(autoDismiss);
    clearInterval(countdownInterval);
    nudge.remove();
  });

  nudge.querySelector("#pm-nudge-dismiss").addEventListener("click", () => {
    clearTimeout(autoDismiss);
    clearInterval(countdownInterval);
    nudge.remove();
  });
}

function dismissToast() {
  const existing = document.getElementById("pm-toast");
  if (existing) existing.remove();
}

function injectContext(contextText, targetInput) {
  const prefix = `[Context from a previous conversation:\n${contextText}]\n\n`;

  
  if (targetInput.tagName === "TEXTAREA" || targetInput.tagName === "INPUT") {
    targetInput.value = prefix + targetInput.value;
  } else {
    targetInput.innerText = prefix + targetInput.innerText;
  }

  
  targetInput.dispatchEvent(new Event("input", { bubbles: true }));
}