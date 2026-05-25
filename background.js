const FULL_LIMIT = 75;
const CONDENSE_LIMIT = 125;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const STOPWORDS = new Set([
  "this", "that", "with", "from", "they", "them", "their", "there",
  "have", "will", "would", "could", "should", "about", "which", "when",
  "what", "then", "than", "been", "were", "into", "your", "more",
  "also", "just", "some", "make", "like", "time", "very", "well",
  "here", "only", "need", "each", "used", "using", "these", "those",
  "such", "both", "even", "does", "after", "before", "because"
]);

function condenseEntry(text) {
  const KEEP_CHARS = 150;
  const MAX_KEYWORDS = 20;

  const head = text.slice(0, KEEP_CHARS);
  const tail = text.slice(KEEP_CHARS);

  if (!tail.trim()) return head;

  const tokens = tail
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 4 && !STOPWORDS.has(word));

  const freq = {};
  tokens.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });

  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYWORDS)
    .map(([word]) => word);

  if (keywords.length === 0) return head;

  return `${head.trimEnd()}… | keywords: ${keywords.join(", ")}`;
}

async function summarizeWithCohere(text, apiKey) {
  try {
    console.log("Prompt Memory: calling Cohere API...");
    const response = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "command-a-plus-05-2026",
        messages: [
          {
            role: "system",
            content:
              "You are a concise summarization assistant. " +
              "When given a piece of conversation text, produce a single short paragraph (2–4 sentences) " +
              "that captures the key topic, intent, and any important details. " +
              "Never include preamble like 'Here is a summary' — output only the summary text itself."
          },
          {
            role: "user",
            content: `Summarize the following conversation message:\n\n${text}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn("Prompt Memory: Cohere error", response.status, errorBody);
      return null;
    }

    const data = await response.json();
    console.log("Prompt Memory: Cohere raw response", data);
    console.log("Prompt Memory: content items", data.message?.content?.map(c => c));
return data.message?.content?.[1]?.text?.trim() || data.message?.content?.[0]?.text?.trim() || null;
  } catch (err) {
    console.warn("Prompt Memory: Cohere summarization failed, falling back", err);
    return null;
  }
}

function applyTiers(entries, keywordCondensing = true) {
  return entries
    .slice(-CONDENSE_LIMIT)
    .map((entry, index, arr) => {
      const positionFromNewest = arr.length - 1 - index;
      if (positionFromNewest <= FULL_LIMIT) return entry;
      if (entry.summarized) return entry;
      if (!keywordCondensing) return entry;
      return {
        ...entry,
        text: condenseEntry(entry.text),
        condensed: true
      };
    });
}

function shouldShowNudge(lastNudgeTime, apiKey) {
  if (apiKey) return false;
  if (!lastNudgeTime) return true;
  return (Date.now() - lastNudgeTime) > SEVEN_DAYS_MS;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
  }

  if (message.type === "SAVE_ENTRY") {
    const entry = message.payload;

    chrome.storage.local.get(
      ["entries", "apiKey", "summarizationEnabled", "keywordCondensing"],
      async (result) => {
      const entries = result.entries || [];
      const apiKey = result.apiKey || null;
      const summarizationEnabled = result.summarizationEnabled !== undefined
        ? result.summarizationEnabled
        : true;
      const keywordCondensing = result.keywordCondensing !== undefined
        ? result.keywordCondensing
        : true;

      const isDuplicate = entries.some((e) => e.text === entry.text);
      if (isDuplicate) return;

      console.log("Prompt Memory: summarization check", {
        hasKey: !!apiKey,
        summarizationEnabled,
        alreadySummarized: entry.summarized
      });

      if (apiKey && summarizationEnabled && !entry.summarized) {
        const summary = await summarizeWithCohere(entry.text, apiKey);
        if (summary) {
          console.log("Prompt Memory: summarized!", {
            original: entry.text.slice(0, 100) + "...",
            summary
          });
          entry.text = summary;
          entry.summarized = true;
        }
      }

      entries.push(entry);

      const tiered = applyTiers(entries, keywordCondensing);

      chrome.storage.local.set({ entries: tiered }, () => {
        const condensedCount = tiered.filter(e => e.condensed).length;
        const summarizedCount = tiered.filter(e => e.summarized).length;
        console.log(
          `Prompt Memory saved (${entry.role}). ` +
          `Total: ${tiered.length}, condensed: ${condensedCount}, summarized: ${summarizedCount}`
        );
      });
    });
  }

  if (message.type === "CHECK_NUDGE") {
    chrome.storage.local.get(["lastNudgeTime", "apiKey"], (result) => {
      const show = shouldShowNudge(result.lastNudgeTime, result.apiKey);
      if (show) {
        chrome.storage.local.set({ lastNudgeTime: Date.now() });
      }
      sendResponse({ show });
    });
    return true;
  }

});