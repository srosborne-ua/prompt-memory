// load saved settings on open
chrome.storage.local.get(["apiKey", "contextScope"], (result) => {
  if (result.apiKey) {
    document.getElementById("apiKey").value = result.apiKey;
  }

  // default to cross-AI if not set
  const scope = result.contextScope || "cross";
  document.querySelector(`input[name="scope"][value="${scope}"]`).checked = true;
});


// save scope immediately on change
document.querySelectorAll("input[name='scope']").forEach(radio => {
  radio.addEventListener("change", (e) => {
    chrome.storage.local.set({ contextScope: e.target.value }, () => {
      console.log("Prompt Memory scope set to:", e.target.value);
    });
  });
});