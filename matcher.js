const MATCH_THRESHOLD = 3;
const DEBOUNCE_MS = 600;   
const MIN_INPUT_LENGTH = 40; 
const SUGGESTION_COOLDOWN_MS = 60000; // same entry won't resurface for 60 seconds


let debounceTimer = null;
let lastSuggestionText = null; // avoid re-suggesting the same entry
let lastSuggestionTime = 0;
let sessionMessageCount = 0;
let toastShownThisSession = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SESSION_COUNT") {
    sessionMessageCount = message.payload;
  }
});

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 3); 
}

// Count how many keywords overlap between input and a saved entry
function scoreMatch(inputTokens, entryText) {
  const entryTokens = new Set(tokenize(entryText));
  return inputTokens.filter(token => entryTokens.has(token)).length;
}

// Find the best matching saved entry for what the user is typing
function findBestMatch(inputText, entries) {
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

// fires when user pauses typing
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
    chrome.storage.local.get(["entries", "contextScope"], (result) => {
      let entries = result.entries || [];
      const scope = result.contextScope || "cross";

    if (scope === "per") {
        entries = entries.filter(e => e.source === window.location.hostname);
      }

      const match = findBestMatch(text, entries);
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

// Attach listeners to any input or content editable element
function attachListeners() {
  document.querySelectorAll("textarea, input[type='text'], [contenteditable='true']")
    .forEach(el => {
      if (el.dataset.pmAttached) return;
      el.dataset.pmAttached = "true";
      el.addEventListener("input", handleInput);
    });
}

// Re-run attachListeners when new inputs appear 
const matcherObserver = new MutationObserver(attachListeners);
matcherObserver.observe(document.body, { childList: true, subtree: true });

attachListeners();

function showToast(entry, targetInput) {
  dismissToast(); // clear any existing toast first

  const toast = document.createElement("div");
  toast.id = "pm-toast";
  toast.innerHTML = `
    <span> Saved context:</span>
    <span class="pm-preview">${entry.text.slice(0, 80)}…</span>
    <button class="pm-accept">Inject</button>
    <button class="pm-dismiss">Dismiss</button>
  `;

  document.body.appendChild(toast);

  // trigger slide-in animation
  requestAnimationFrame(() => toast.classList.add("visible"));

  // auto-dismiss after 8 seconds
  const autoDismiss = setTimeout(dismissToast, 8000);

  toast.querySelector(".pm-accept").addEventListener("click", () => {
    injectContext(entry.text, targetInput);
    clearTimeout(autoDismiss);
    dismissToast();
  });

  toast.querySelector(".pm-dismiss").addEventListener("click", () => {
    clearTimeout(autoDismiss);
    dismissToast();
    lastSuggestionText = null; // allow re-suggesting later
  });
}

function dismissToast() {
  const existing = document.getElementById("pm-toast");
  if (existing) existing.remove();
}

function injectContext(contextText, targetInput) {
  const prefix = `[Context from a previous conversation:\n${contextText}]\n\n`;

  // handle both regular inputs and contenteditable divs (like Claude's input)
  if (targetInput.tagName === "TEXTAREA" || targetInput.tagName === "INPUT") {
    targetInput.value = prefix + targetInput.value;
  } else {
    targetInput.innerText = prefix + targetInput.innerText;
  }

  // fire an input event so the site's React/Vue state updates
  targetInput.dispatchEvent(new Event("input", { bubbles: true }));
}