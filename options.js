// ─── Load saved settings ───────────────────────────────────────────────────

chrome.storage.local.get(
  ["apiKey", "contextScope", "summarizationEnabled", "keywordCondensing"],
  (result) => {
    // API key field + status chip
    const apiKey = result.apiKey || "";
    if (apiKey) {
      document.getElementById("apiKey").value = apiKey;
    }
    updateKeyStatus(!!apiKey);

    // Context scope
    const scope = result.contextScope || "cross";
    document.querySelector(`input[name="scope"][value="${scope}"]`).checked = true;

    // Summarization toggle — default true
    const summarizationEnabled = result.summarizationEnabled !== undefined
      ? result.summarizationEnabled
      : true;
    document.getElementById("summarizationEnabled").checked = summarizationEnabled;

    // Keyword condensing toggle — default true
    const keywordCondensing = result.keywordCondensing !== undefined
      ? result.keywordCondensing
      : true;
    document.getElementById("keywordCondensing").checked = keywordCondensing;
  }
);

// ─── Status chip helper ────────────────────────────────────────────────────

function updateKeyStatus(hasKey) {
  const chip = document.getElementById("keyStatus");
  const text = document.getElementById("keyStatusText");
  chip.style.display = "inline-flex";
  if (hasKey) {
    chip.className = "status-chip connected";
    text.textContent = "Key saved";
  } else {
    chip.className = "status-chip disconnected";
    text.textContent = "No key saved";
  }
}

// ─── Save API key ──────────────────────────────────────────────────────────

document.getElementById("saveKey").addEventListener("click", () => {
  const key = document.getElementById("apiKey").value.trim();
  chrome.storage.local.set({ apiKey: key }, () => {
    updateKeyStatus(!!key);
    const confirm = document.getElementById("keyConfirm");
    confirm.style.display = "block";
    setTimeout(() => (confirm.style.display = "none"), 2000);
  });
});

// ─── Context scope ─────────────────────────────────────────────────────────

document.querySelectorAll("input[name='scope']").forEach(radio => {
  radio.addEventListener("change", (e) => {
    chrome.storage.local.set({ contextScope: e.target.value });
  });
});

// ─── Summarization toggle ──────────────────────────────────────────────────

document.getElementById("summarizationEnabled").addEventListener("change", (e) => {
  chrome.storage.local.set({ summarizationEnabled: e.target.checked });
});

// ─── Keyword condensing toggle ─────────────────────────────────────────────

document.getElementById("keywordCondensing").addEventListener("change", (e) => {
  chrome.storage.local.set({ keywordCondensing: e.target.checked });
});