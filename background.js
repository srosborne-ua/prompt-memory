chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_ENTRY") {
    const entry = message.payload;

    chrome.storage.local.get(["entries"], (result) => {
      const entries = result.entries || [];

      // avoid exact duplicates
      const isDuplicate = entries.some((e) => e.text === entry.text);
      if (isDuplicate) return;

      entries.push(entry);

      // cap at 200 saved entries so storage doesn't bloat
      const trimmed = entries.slice(-200);

      chrome.storage.local.set({ entries: trimmed }, () => {
        console.log("Saved entry. Total:", trimmed.length);
      });
    });
  }
});