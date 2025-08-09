document.getElementById("reset-btn").addEventListener("click", () => {
  // Send a reset message to background.js
  chrome.runtime.sendMessage({ action: "resetTime" });

  // Update UI immediately
  document.getElementById("time-today").textContent = "Today: 0m";
});

// Load saved time on popup open
chrome.storage.local.get(["timeToday"], (data) => {
  document.getElementById("time-today").textContent = `Today: ${
    data.timeToday || 0
  }m`;
});

// Listen for changes in storage and update UI instantly
chrome.storage.onChanged.addListener((changes) => {
  if (changes.timeToday) {
    document.getElementById(
      "time-today"
    ).textContent = `Today: ${changes.timeToday.newValue} sec`;
  }
});
