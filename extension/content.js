/**
 * Cashback & Order Governance Tracker - WhatsApp Web Content Script
 * Auto-detects e-commerce Order IDs in active customer chats and enables 1-click audit & duplicate prevention.
 */

// Regex patterns to detect e-commerce Order IDs (Amazon, Flipkart, Shopify, Myntra, Custom)
const ORDER_PATTERNS = [
  /\b(\d{3}-\d{7}-\d{7})\b/g,               // Amazon India: 402-1234567-1234567
  /\b(OD\d{18,20})\b/gi,                   // Flipkart: OD123456789012345678
  /\b(ORD[-_]?[A-Z0-9]{5,12})\b/gi,        // Shopify / Custom: ORD-98124
  /\b(#?\d{5,10})\b/g                      // Standard order numbers: #104928
];

console.log("🛡️ Cashback & Governance Tracker active on WhatsApp Web.");

// Scan visible chat bubbles periodically
let scanInterval = setInterval(scanChatMessages, 2500);

function scanChatMessages() {
  // Target WhatsApp Web message text containers
  const messageNodes = document.querySelectorAll("div.copyable-text:not([data-cashback-scanned])");

  messageNodes.forEach(node => {
    node.setAttribute("data-cashback-scanned", "true");
    const text = node.innerText || "";
    
    // Look for order matches
    for (const pattern of ORDER_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match && match[0]) {
        const orderId = match[0].trim();
        injectAuditBadge(node, orderId);
        break;
      }
    }
  });
}

/**
 * Injects a sleek fraud-check badge right above the detected message
 */
function injectAuditBadge(targetNode, orderId) {
  // Check duplicate status with extension background worker
  chrome.runtime.sendMessage({ action: "checkDuplicate", orderId: orderId }, (response) => {
    if (chrome.runtime.lastError) return;

    const badge = document.createElement("div");
    badge.className = "cgt-whatsapp-badge";

    if (response && response.isDuplicate) {
      const rec = response.record || {};
      badge.classList.add("cgt-badge-duplicate");
      badge.innerHTML = `
        <span class="cgt-icon">⚠️</span>
        <span class="cgt-text"><strong>DUPLICATE CLAIM!</strong> #${orderId} already paid (₹${rec.cashbackAmount || 0})</span>
        <button class="cgt-btn" title="Inspect duplicate claim in side panel">View</button>
      `;
    } else {
      badge.classList.add("cgt-badge-safe");
      badge.innerHTML = `
        <span class="cgt-icon">🛡️</span>
        <span class="cgt-text">Order <strong>#${orderId}</strong> verified (No prior claims)</span>
        <button class="cgt-btn" title="Record cashback in extension">Record</button>
      `;
    }

    badge.querySelector(".cgt-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      // Extract active chat contact name/phone if available
      let contactName = "";
      const contactHeader = document.querySelector("#main header span[dir='auto']");
      if (contactHeader) {
        contactName = contactHeader.innerText;
      }

      chrome.runtime.sendMessage({
        action: "openSidePanelWithOrder",
        orderId: orderId,
        customer: contactName
      });
    });

    targetNode.parentElement.insertBefore(badge, targetNode);
  });
}
