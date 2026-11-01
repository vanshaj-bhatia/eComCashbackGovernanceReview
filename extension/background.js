/**
 * Cashback & Order Governance Tracker - Service Worker (Manifest V3)
 * Handles side-panel behavior, WhatsApp Web message bridge, and badge updates.
 */

// Enable side panel to open on toolbar action click
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.log("Sidepanel setup notice:", err));
  }
  updateBadge();
});

// Update badge count whenever storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes["cashback_records_v1"]) {
    updateBadge();
  }
});

// Message listener from content.js (WhatsApp Web)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkDuplicate") {
    chrome.storage.local.get(["cashback_records_v1"], (result) => {
      const records = result["cashback_records_v1"] || [];
      const cleanTarget = (request.orderId || "").trim().toUpperCase().replace(/^#+/, "");
      const match = records.find(r => 
        (r.orderId || "").trim().toUpperCase().replace(/^#+/, "") === cleanTarget
      );
      sendResponse({
        isDuplicate: !!match,
        record: match || null
      });
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === "openSidePanelWithOrder") {
    if (sender.tab && sender.tab.id && chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).then(() => {
        // Send order info to side panel
        chrome.runtime.sendMessage({
          action: "prefillOrder",
          orderId: request.orderId,
          customer: request.customer
        });
      }).catch(err => console.log("Side panel open error:", err));
    }
    sendResponse({ success: true });
    return true;
  }
});

function updateBadge() {
  chrome.storage.local.get(["cashback_records_v1"], (result) => {
    const records = result["cashback_records_v1"] || [];
    const count = records.length;
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: "#4f46e5" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  });
}
