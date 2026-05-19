const SELECTORS = {
  "chatgpt.com": "[data-message-author-role='user'] .whitespace-pre-wrap",
  "claude.ai": ".font-user-message"
};

function getSiteKey() {
  for (const key of Object.keys(SELECTORS)) {
    if (window.location.hostname.includes(key)) return key;
  }
  return null;
}

function extractMessages() {
  const siteKey = getSiteKey();
  if (!siteKey) return;

  const selector = SELECTORS[siteKey];
  const messages = document.querySelectorAll(selector);

  messages.forEach((el) => {
    const text = el.innerText.trim();

    // ignore short messages, already-seen ones
    if (text.length < 80) return;
    if (el.dataset.pmSeen) return;

    el.dataset.pmSeen = "true"; // mark so we don't re-save it

    const entry = {
      id: crypto.randomUUID(),
      text,
      source: window.location.hostname,
      savedAt: Date.now()
    };

    chrome.runtime.sendMessage({ type: "SAVE_ENTRY", payload: entry });
    console.log("Prompt Memory captured:", text.slice(0, 60) + "...");
  });
}

// Watch for new messages being added to the DOM
const observer = new MutationObserver(() => {
  extractMessages();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Also run once on load in case messages are already there
extractMessages();