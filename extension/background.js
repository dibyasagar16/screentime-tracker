let totalTimeToday = 0; // seconds
let domainTotals = {}; // { "youtube.com": 3600 }
let domainFavicons = {}; // { "youtube.com": "https://www.youtube.com/favicon.ico" }
let currentDate = new Date().toDateString();
let activeTabId = null;
let startTime = null;

// Load saved data on startup
chrome.storage.local.get(
  ["timeToday", "domainTotals", "domainFavicons", "savedDate"],
  (result) => {
    if (result.savedDate === currentDate) {
      totalTimeToday = result.timeToday || 0;
      domainTotals = result.domainTotals || {};
      domainFavicons = result.domainFavicons || {};
    } else {
      resetData();
    }
  }
);

function saveTotals() {
  chrome.storage.local.set({
    timeToday: totalTimeToday,
    domainTotals,
    domainFavicons,
    savedDate: currentDate,
  });
}

function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return "unknown";
  }
}

function updateActiveTime() {
  if (!activeTabId || !startTime) return;

  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  startTime = Date.now();

  chrome.tabs.get(activeTabId, (tab) => {
    if (!tab || !tab.url) return;
    const domain = getDomainFromUrl(tab.url);
    domainTotals[domain] = (domainTotals[domain] || 0) + elapsedSeconds;

    // Save favicon if available
    if (tab.favIconUrl) {
      domainFavicons[domain] = tab.favIconUrl;
    } else {
      // fallback to generic favicon
      domainFavicons[domain] = `https://${domain}/favicon.ico`;
    }

    totalTimeToday += elapsedSeconds;
    saveTotals();
    console.log(`Logged ${elapsedSeconds}s for ${domain}`);
  });
}

function resetData() {
  totalTimeToday = 0;
  domainTotals = {};
  domainFavicons = {};
  chrome.storage.local.set({
    timeToday: 0,
    domainTotals: {},
    domainFavicons: {},
    savedDate: currentDate,
  });
}

function checkDate() {
  const today = new Date().toDateString();
  if (today !== currentDate) {
    currentDate = today;
    resetData();
    console.log("New day detected — resetting counters.");
  }
}

// Tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  checkDate();
  updateActiveTime();
  activeTabId = activeInfo.tabId;
  startTime = Date.now();
});

// Tab URL change
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === "complete") {
    checkDate();
    updateActiveTime();
    activeTabId = tabId;
    startTime = Date.now();
  }
});

// Window focus change
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

// Reset request from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === "resetTime") {
    resetData();
    sendResponse({ status: "ok" });
    return true;
  }
});

// Heartbeat save
chrome.alarms.create("heartbeat", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "heartbeat") saveTotals();
});
