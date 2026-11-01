/**
 * Cashback & Order Governance Tracker - Google Apps Script Webhook
 * 
 * Instructions for deployment:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Click Extensions > Apps Script
 * 3. Delete any code in the editor and paste this entire file
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set Description: "Cashback Tracker Webhook"
 * 7. Set "Execute as": "Me (your email)"
 * 8. Set "Who has access": "Anyone" (allows the Chrome extension to POST without OAuth prompt)
 * 9. Click "Deploy", copy the Web App URL (starts with https://script.google.com/macros/s/...)
 * 10. Paste this URL into the extension's "Google Sheet Webhook URL" field in Settings!
 */

const SHEET_NAME = "Cashback_Disbursements";

// Define the standard columns for the governance sheet
const HEADERS = [
  "Timestamp",
  "Order ID",
  "Customer Name / WhatsApp",
  "Order Amount (₹)",
  "Cashback Initiated (₹)",
  "Cashback %",
  "Date of Cashback",
  "Status",
  "Notes",
  "Order Screenshot Attached",
  "Review Screenshot Attached",
  "Order Screenshot Data",
  "Review Screenshot Data",
  "Logged By"
];

/**
 * Handles incoming POST requests from the Chrome Extension
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 30 seconds for concurrent requests
  const lockAcquired = lock.tryLock(30000);
  
  if (!lockAcquired) {
    return createJsonResponse({
      success: false,
      message: "Server busy. Please try again."
    }, 429);
  }

  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter || {};
    }

    // Ping / Test Connection Action
    if (payload.action === "ping") {
      return createJsonResponse({
        success: true,
        message: "Google Apps Script Webhook is active and connected!",
        timestamp: new Date().toISOString()
      });
    }

    // Duplicate Check Action (Optional remote query)
    if (payload.action === "checkDuplicate") {
      const orderIdToCheck = (payload.orderId || "").trim();
      const existing = findRecordByOrderId(orderIdToCheck);
      return createJsonResponse({
        success: true,
        isDuplicate: !!existing,
        existingRecord: existing
      });
    }

    // Record Cashback Disbursement Action
    const orderId = (payload.orderId || "").trim();
    if (!orderId) {
      return createJsonResponse({
        success: false,
        message: "Order ID is required."
      }, 400);
    }

    // Enforce duplicate prevention in Google Sheets
    const duplicate = findRecordByOrderId(orderId);
    if (duplicate && !payload.forceOverride) {
      return createJsonResponse({
        success: false,
        isDuplicate: true,
        message: `⚠️ DUPLICATE ORDER ID DETECTED! Already claimed on ${duplicate.dateOfCashback || duplicate.timestamp} for ₹${duplicate.cashbackAmount}.`,
        existingRecord: duplicate
      }, 409);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    // Auto-create sheet and styling if not present
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      initializeSheetFormatting(sheet);
    } else if (sheet.getLastRow() === 0) {
      initializeSheetFormatting(sheet);
    }

    const now = new Date();
    const formattedTimestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    
    const orderAmt = Number(payload.orderAmount) || 0;
    const cashbackAmt = Number(payload.cashbackAmount) || 0;
    const cashbackPercent = orderAmt > 0 ? ((cashbackAmt / orderAmt) * 100).toFixed(1) + "%" : "0%";

    const hasOrderScreenshot = payload.orderScreenshot ? "YES" : "NO";
    const hasReviewScreenshot = payload.reviewScreenshot ? "YES" : "NO";

    // Truncate or link screenshot payload to avoid 50k cell character limits
    const orderScreenshotCell = payload.orderScreenshot 
      ? (payload.orderScreenshot.length > 500 ? payload.orderScreenshot.substring(0, 100) + "... [Base64 Image Attached]" : payload.orderScreenshot)
      : "None";

    const reviewScreenshotCell = payload.reviewScreenshot 
      ? (payload.reviewScreenshot.length > 500 ? payload.reviewScreenshot.substring(0, 100) + "... [Base64 Image Attached]" : payload.reviewScreenshot)
      : "None";

    const rowData = [
      formattedTimestamp,
      orderId,
      payload.customerInfo || "N/A",
      orderAmt,
      cashbackAmt,
      cashbackPercent,
      payload.dateOfCashback || formattedTimestamp,
      payload.status || "Initiated",
      payload.notes || "",
      hasOrderScreenshot,
      hasReviewScreenshot,
      orderScreenshotCell,
      reviewScreenshotCell,
      payload.agentName || "Agent / Chrome Ext"
    ];

    sheet.appendRow(rowData);
    const newRowIndex = sheet.getLastRow();

    // Apply color badge to status cell
    applyStatusColor(sheet, newRowIndex, 8, payload.status);

    return createJsonResponse({
      success: true,
      message: `Successfully recorded cashback for Order #${orderId}`,
      row: newRowIndex,
      timestamp: formattedTimestamp
    });

  } catch (err) {
    return createJsonResponse({
      success: false,
      message: "Internal server error: " + err.toString()
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handles incoming GET requests (useful for browser testing or health checks)
 */
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "online",
      service: "Cashback & Order Governance Tracker Webhook",
      timestamp: new Date().toISOString(),
      instructions: "Send POST requests with JSON payload containing orderId, orderAmount, cashbackAmount, etc."
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Searches the active sheet for any existing record with the given Order ID
 */
function findRecordByOrderId(orderId) {
  if (!orderId) return null;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) return null;

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  for (let i = 0; i < data.length; i++) {
    const rowOrderId = String(data[i][1] || "").trim().toLowerCase();
    if (rowOrderId === orderId.trim().toLowerCase()) {
      return {
        timestamp: data[i][0],
        orderId: data[i][1],
        customerInfo: data[i][2],
        orderAmount: data[i][3],
        cashbackAmount: data[i][4],
        dateOfCashback: data[i][6],
        status: data[i][7],
        rowIndex: i + 2
      };
    }
  }
  return null;
}

/**
 * Sets up aesthetic header styling and column freeze
 */
function initializeSheetFormatting(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  
  // Style headers
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground("#1e293b"); // Slate 800
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Inter");
  headerRange.setHorizontalAlignment("center");
  
  sheet.setFrozenRows(1);
  
  // Format numeric columns as Currency ₹
  sheet.getRange(2, 4, 1000, 2).setNumberFormat("₹#,##0.00");
}

/**
 * Applies subtle background colors according to Status
 */
function applyStatusColor(sheet, row, col, status) {
  const cell = sheet.getRange(row, col);
  cell.setFontWeight("bold");
  switch (status) {
    case "Completed":
      cell.setBackground("#dcfce7"); // Green 100
      cell.setFontColor("#15803d"); // Green 700
      break;
    case "Pending UPI":
      cell.setBackground("#fef9c3"); // Yellow 100
      cell.setFontColor("#a16207"); // Yellow 700
      break;
    case "Initiated":
      cell.setBackground("#e0f2fe"); // Sky 100
      cell.setFontColor("#0369a1"); // Sky 700
      break;
    case "Rejected":
      cell.setBackground("#fee2e2"); // Red 100
      cell.setFontColor("#b91c1c"); // Red 700
      break;
    default:
      break;
  }
}

/**
 * Helper to construct JSON response
 */
function createJsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
