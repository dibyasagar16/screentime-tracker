let totalTimeToday = 0; // in seconds
let currentDate = new Date().toDateString(); // store as human-readable date
let activeTabId = null;
let startTime = null;

// Load saved data when extension starts
chrome.storage.local.get(["timeToday", "savedDate"], (result) => {
  if (result.savedDate === currentDate) {
    totalTimeToday = result.timeToday || 0;
  } else {
    // Different day → reset
    chrome.storage.local.set({ timeToday: 0, savedDate: currentDate });
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  checkDate();
  updateActiveTime();
  activeTabId = activeInfo.tabId;
  startTime = Date.now();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === "complete") {
    checkDate();
    updateActiveTime();
    activeTabId = tabId;
    startTime = Date.now();
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  checkDate();
  updateActiveTime();
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        activeTabId = tabs[0].id;
        startTime = Date.now();
      }
    });
  } else {
    activeTabId = null;
    startTime = null;
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "resetTime") {
    totalTimeToday = 0;
    startTime = Date.now();
    chrome.storage.local.set({ timeToday: 0, savedDate: currentDate }, () => {
      sendResponse({ status: "ok" });
    });
    return true; // async sendResponse
  }
});

function updateActiveTime() {
  if (activeTabId && startTime) {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    chrome.tabs.get(activeTabId, (tab) => {
      if (tab && tab.url) {
        try {
          const domain = new URL(tab.url).hostname;
          console.log(`Time spent on ${domain}: ${elapsedSeconds} seconds`);
          totalTimeToday += elapsedSeconds;
          chrome.storage.local.set({
            timeToday: totalTimeToday,
            savedDate: currentDate,
          });
        } catch (e) {
          console.error("Error parsing URL:", e);
        }
      }
    });
  }
}

function checkDate() {
  const today = new Date().toDateString();
  if (today !== currentDate) {
    console.log("New day detected — resetting counter");
    currentDate = today;
    totalTimeToday = 0;
    chrome.storage.local.set({ timeToday: 0, savedDate: currentDate });
  }
}
