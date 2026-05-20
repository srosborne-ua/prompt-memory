chrome.storage.local.get(["apiKey"], (result) => {
  if (result.apiKey) {
    document.getElementById("apiKey").value = result.apiKey;
  }
});

document.getElementById("save").addEventListener("click", () => {
  const key = document.getElementById("apiKey").value.trim();
  chrome.storage.local.set({ apiKey: key }, () => {
    const confirm = document.getElementById("confirm");
    confirm.style.display = "block";
    setTimeout(() => confirm.style.display = "none", 2000);
  });
});