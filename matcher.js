const MATCH_THRESHOLD = 3; // how many keywords must overlap to trigger
const DEBOUNCE_MS = 600;   // wait until user pauses typing
const MIN_INPUT_LENGTH = 40; // don't trigger on short inputs

let debounceTimer = null;
let lastSuggestionText = null; // avoid re-suggesting the same entry

// Tokenize text into meaningful keywords
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 3); // drop "the", "and", "is", etc.
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

  if (text.length < MIN_INPUT_LENGTH) {
    dismissToast();
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    chrome.storage.local.get(["entries"], (result) => {
      const entries = result.entries || [];
      const match = findBestMatch(text, entries);

      if (match && match.text !== lastSuggestionText) {
        lastSuggestionText = match.text;
        showToast(match, input);
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
const observer = new MutationObserver(attachListeners);
observer.observe(document.body, { childList: true, subtree: true });

attachListeners();