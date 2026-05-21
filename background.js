const FULL_LIMIT = 75;      
const CONDENSE_LIMIT = 125; 


function applyTiers(entries) {
 

  return entries
    .slice(-(CONDENSE_LIMIT)) // delete anything beyond 125 total
    .map((entry, index, arr) => {
      const positionFromNewest = arr.length - 1 - index;

     
      if (positionFromNewest <= FULL_LIMIT) return entry;

     
      return {
        ...entry,
        text: condenseEntry(entry.text),
        condensed: true
      };
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_ENTRY") {
    const entry = message.payload;

    chrome.storage.local.get(["entries"], (result) => {
      const entries = result.entries || [];

      // avoid exact duplicates
      const isDuplicate = entries.some((e) => e.text === entry.text);
      if (isDuplicate) return;

      entries.push(entry);

      const tiered = applyTiers(entries);

      chrome.storage.local.set({ entries: tiered }, () => {
        const condensedCount = tiered.filter(e => e.condensed).length;
        console.log(`Prompt Memory saved (${entry.role}). Total: ${tiered.length}, condensed: ${condensedCount}`);
      });
    });
  }
});