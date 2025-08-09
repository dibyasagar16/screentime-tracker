// popup.js

// Format seconds -> "Xh Ym" or "Ym"
const formatTime = (seconds) => {
  seconds = Number(seconds) || 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

// Render top domains sorted desc (with favicons)
// const renderDomainList = (domainTotals, favicons) => {
//   const list = document.getElementById("domain-list");
//   list.innerHTML = "";

//   const entries = Object.entries(domainTotals || {});
//   if (entries.length === 0) {
//     list.innerHTML = `<li class="domain-item"><div class="domain-name muted">No data yet</div></li>`;
//     return;
//   }

//   entries.sort((a, b) => b[1] - a[1]); // desc by seconds

//   entries.slice(0, 20).forEach(([domain, seconds]) => {
//     const li = document.createElement("li");
//     li.className = "domain-item";

//     const img = document.createElement("img");
//     img.src = (favicons && favicons[domain]) || `https://${domain}/favicon.ico`;
//     img.alt = domain;
//     img.className = "favicon";

//     const nameDiv = document.createElement("div");
//     nameDiv.className = "domain-name";
//     nameDiv.textContent = domain;

//     const timeDiv = document.createElement("div");
//     timeDiv.className = "domain-time";
//     timeDiv.textContent = formatTime(seconds);

//     li.appendChild(img);
//     li.appendChild(nameDiv);
//     li.appendChild(timeDiv);

//     list.appendChild(li);
//   });
// };

const renderDomainList = (domainTotals, favicons) => {
  const list = document.getElementById("domain-list");
  list.innerHTML = "";

  const entries = Object.entries(domainTotals || {});
  if (entries.length === 0) {
    list.innerHTML = `<li class="domain-item"><div class="domain-name muted">No data yet</div></li>`;
    return;
  }

  entries.sort((a, b) => b[1] - a[1]); // desc by seconds

  entries.slice(0, 20).forEach(([domain, seconds]) => {
    const li = document.createElement("li");
    li.className = "domain-item";

    // favicon
    const img = document.createElement("img");
    img.src = (favicons && favicons[domain]) || `https://${domain}/favicon.ico`;
    img.alt = domain;
    img.className = "favicon";

    // domain name
    const nameDiv = document.createElement("div");
    nameDiv.className = "domain-name";
    nameDiv.textContent = domain;

    // domain time
    const timeDiv = document.createElement("div");
    timeDiv.className = "domain-time";
    timeDiv.textContent = formatTime(seconds);

    // domain-info wrapper
    const infoDiv = document.createElement("div");
    infoDiv.className = "domain-info";
    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(timeDiv);

    // append all to list item
    li.appendChild(img);
    li.appendChild(infoDiv);

    list.appendChild(li);
  });
};

// Update total time display
const updateTotalDisplay = (seconds) => {
  const el = document.getElementById("total-time");
  el.textContent = formatTime(seconds || 0);
};

// Load initial storage and wire listeners
const init = () => {
  // Reset button
  document.getElementById("reset-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "resetTime" }, () => {
      updateTotalDisplay(0);
      renderDomainList({}, {});
    });
  });

  // Export button
  document.getElementById("export-btn").addEventListener("click", () => {
    chrome.storage.local.get(["timeToday", "domainTotals"], (res) => {
      const payload = {
        date: new Date().toISOString(),
        timeToday: res.timeToday || 0,
        domainTotals: res.domainTotals || {},
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `screentime-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  // Initial load
  chrome.storage.local.get(
    ["timeToday", "domainTotals", "domainFavicons"],
    (res) => {
      updateTotalDisplay(res.timeToday || 0);
      renderDomainList(res.domainTotals || {}, res.domainFavicons || {});
    }
  );

  // Live updates
  chrome.storage.onChanged.addListener((changes) => {
    chrome.storage.local.get(["domainFavicons"], (res) => {
      const favicons = res.domainFavicons || {};
      if (changes.timeToday) {
        updateTotalDisplay(changes.timeToday.newValue || 0);
      }
      if (changes.domainTotals) {
        renderDomainList(changes.domainTotals.newValue || {}, favicons);
      }
    });
  });
};

// Run
document.addEventListener("DOMContentLoaded", init);
