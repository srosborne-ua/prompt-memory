function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function render(entries) {
  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  list.innerHTML = "";

  if (entries.length === 0) {
    empty.style.display = "block";
    return;
  }

  // show newest first
  [...entries].reverse().forEach((entry) => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `
      <button class="delete" data-id="${entry.id}">✕</button>
      <p>${entry.text.slice(0, 120)}${entry.text.length > 120 ? "…" : ""}</p>
      <span class="meta">${entry.source} · ${formatDate(entry.savedAt)}</span>
    `;
    list.appendChild(div);
  });

  // delete handler
  list.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      chrome.storage.local.get(["entries"], (result) => {
        const updated = (result.entries || []).filter((e) => e.id !== id);
        chrome.storage.local.set({ entries: updated }, () => render(updated));
      });
    });
  });
}

chrome.storage.local.get(["entries"], (result) => {
  render(result.entries || []);
});