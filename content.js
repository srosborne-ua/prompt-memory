const SELECTORS = {
  "chatgpt.com": {
    user: "[data-message-author-role='user'] .whitespace-pre-wrap",
    assistant: "[data-message-author-role='assistant'] .whitespace-pre-wrap"
  },
  "claude.ai": {
    user: ".font-user-message",
    assistant: ".font-claude-message"
  }
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

  const { user, assistant } = SELECTORS[siteKey];

  [[user, "user"], [assistant, "assistant"]].forEach(([selector, role]) => {
    document.querySelectorAll(selector).forEach((el) => {
      const text = el.innerText.trim();

      if (text.length < 80) return;
      if (el.dataset.pmSeen) return;
      el.dataset.pmSeen = "true";

      const entry = {
        id: crypto.randomUUID(),
        text,
        role,
        source: window.location.hostname,
        savedAt: Date.now()
      };

      chrome.runtime.sendMessage({ type: "SAVE_ENTRY", payload: entry });
      console.log(`Prompt Memory captured (${role}):`, text.slice(0, 60) + "...");
    });
  });
}

const observer = new MutationObserver(() => extractMessages());
observer.observe(document.body, { childList: true, subtree: true });
extractMessages();