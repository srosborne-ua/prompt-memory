chrome.storage.local.get(["apiKey", "apiEndpoint", "contextScope", "matchMode"], (result) => {
  if (result.apiKey) document.getElementById("apiKey").value = result.apiKey;
  if (result.apiEndpoint) document.getElementById("apiEndpoint").value = result.apiEndpoint;

  const scope = result.contextScope || "cross";
  document.querySelector(`input[name="scope"][value="${scope}"]`).checked = true;

  const matchMode = result.matchMode || "keyword";
  document.querySelector(`input[name="matchMode"][value="${matchMode}"]`).checked = true;
});



document.querySelectorAll("input[name='scope']").forEach(radio => {
  radio.addEventListener("change", (e) => {
    chrome.storage.local.set({ contextScope: e.target.value });
  });
});

document.querySelectorAll("input[name='matchMode']").forEach(radio => {
  radio.addEventListener("change", (e) => {
    chrome.storage.local.set({ matchMode: e.target.value });
  });
});

document.getElementById("saveKey").addEventListener("click", () => {
  const key = document.getElementById("apiKey").value.trim();
  const endpoint = document.getElementById("apiEndpoint").value.trim();
  chrome.storage.local.set({ apiKey: key, apiEndpoint: endpoint }, () => {
    const confirm = document.getElementById("keyConfirm");
    confirm.style.display = "block";
    setTimeout(() => confirm.style.display = "none", 2000);
  });
});