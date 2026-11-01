# Cashback & Order Governance Tracker (Chrome Extension Manifest V3)

Enterprise-grade e-commerce order fraud prevention and cashback governance tracker built for customer support teams communicating on WhatsApp Web and handling order payouts.

## 🚀 Key Features

1. **Instant Duplicate Guardrail**:
   - Live debounce check against all stored order records.
   - Prevents duplicate claims against the same Order ID in real-time.
   - Immediately raises a prominent red warning banner: `⚠️ DUPLICATE ORDER ID DETECTED! Already claimed on [Date] for ₹[Amount].` and locks the submission button.

2. **Full Governance Form**:
   - Order ID (Required, unique identifier with normalization)
   - Customer Name / WhatsApp Number
   - Order Amount (₹) & Cashback Initiated (₹) with real-time Cashback % calculation
   - Disbursement Date & Time (auto-populated to current timestamp)
   - Order Screenshot & Review Screenshot Evidence (Drag-and-drop, File upload, or Direct `Ctrl+V` Clipboard paste!)
   - Status tracking ("Initiated", "Pending UPI", "Completed", "Rejected")
   - UPI Reference / Notes

3. **Dual Persistence Architecture**:
   - **Local Storage (`chrome.storage.local`)**: Fast, persistent, offline-first with 1-click **Export to CSV / Excel**.
   - **Google Sheets Cloud Sync**: Direct webhook integration via Google Apps Script (no OAuth consent screen needed).

4. **WhatsApp Web Live Integration (`content.js`)**:
   - Automatically detects Amazon (`402-XXXXXXX-XXXXXXX`), Flipkart (`ODXXXXXXXXXXXXXXXX`), Shopify (`ORD-XXXXX`), and custom order numbers in WhatsApp Web chats.
   - Injects a 1-click audit badge in chat to pre-fill the order in the tracker and verify if it's already claimed!

---

## 🛠️ How to Install in Google Chrome (Manifest V3)

1. Open Google Chrome and navigate to:
   ```
   chrome://extensions/
   ```
2. Enable the **"Developer mode"** toggle in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the `extension/` directory.
5. Pin **"Cashback & Order Governance Tracker"** 🛡️ to your Chrome toolbar.
6. Open the extension popup or click the Side Panel icon to keep it docked right beside your WhatsApp Web chat!

---

## 📊 Google Sheets Sync Setup (60 Seconds)

1. Create a new Google Sheet at [https://sheets.new](https://sheets.new).
2. Go to **Extensions** > **Apps Script**.
3. Replace the default code with the contents of `google_apps_script.js`.
4. Click **Deploy** > **New deployment**.
5. Select **Web app** as the deployment type:
   - Description: `Cashback Tracker Webhook`
   - Execute as: `Me (your email)`
   - Who has access: `Anyone`
6. Click **Deploy** and copy your **Web App URL** (`https://script.google.com/macros/s/.../exec`).
7. Open the extension, click the ⚙️ Settings gear, paste the Web App URL, and click **Save**.
8. Click **Test Ping** to confirm live synchronization!
