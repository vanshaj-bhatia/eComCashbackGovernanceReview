/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CashbackRecord, GovernanceSettings } from './types';
import { ExtensionSimulator } from './components/ExtensionSimulator';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { CodeInspector } from './components/CodeInspector';
import { GoogleSheetsGuide } from './components/GoogleSheetsGuide';
import { downloadExtensionZip } from './extensionCode';
import { 
  ShieldCheck, 
  ShieldAlert, 
  MessageSquare, 
  Code2, 
  FileSpreadsheet, 
  Download, 
  RotateCcw, 
  Layers, 
  CheckCircle,
  HelpCircle,
  Smartphone,
  Maximize2,
  Sparkles,
  RefreshCw
} from 'lucide-react';

const STORAGE_KEY_APP_RECORDS = 'cgt_app_records_v1';
const STORAGE_KEY_APP_SETTINGS = 'cgt_app_settings_v1';

// Seed demo data so users can test duplicate detection immediately
const SEED_RECORDS: CashbackRecord[] = [
  {
    id: 'seed-1',
    timestamp: '2026-10-28T14:32:00.000Z',
    orderId: '402-9842182-1928421',
    customerInfo: 'Rahul Sharma (+91 98765 43210)',
    orderAmount: 1499,
    cashbackAmount: 150,
    dateOfCashback: '2026-10-28T14:30',
    status: 'Completed',
    notes: 'Paid via GPay #91028421, 5-star verified on Amazon India',
    orderScreenshot: null,
    reviewScreenshot: null,
    syncedToGoogleSheet: true
  },
  {
    id: 'seed-2',
    timestamp: '2026-10-30T16:15:00.000Z',
    orderId: 'OD109284019284',
    customerInfo: 'Ananya Sen (+91 91234 56789)',
    orderAmount: 2499,
    cashbackAmount: 250,
    dateOfCashback: '2026-10-30T16:00',
    status: 'Completed',
    notes: 'Flipkart soundbar purchase, review verified',
    orderScreenshot: null,
    reviewScreenshot: null,
    syncedToGoogleSheet: true
  },
  {
    id: 'seed-3',
    timestamp: '2026-10-31T09:40:00.000Z',
    orderId: 'ORD-77819',
    customerInfo: 'Amit Patel (+91 98112 23344)',
    orderAmount: 899,
    cashbackAmount: 100,
    dateOfCashback: '2026-10-31T09:35',
    status: 'Pending UPI',
    notes: 'Customer provided incorrect UPI VPA; awaiting update',
    orderScreenshot: null,
    reviewScreenshot: null,
    syncedToGoogleSheet: false
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'whatsapp' | 'code' | 'sheets'>('sandbox');
  const [compactSidePanel, setCompactSidePanel] = useState<boolean>(true);
  
  // Records state
  const [records, setRecords] = useState<CashbackRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APP_RECORDS);
      return saved ? JSON.parse(saved) : SEED_RECORDS;
    } catch {
      return SEED_RECORDS;
    }
  });

  // Settings state
  const [settings, setSettings] = useState<GovernanceSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APP_SETTINGS);
      return saved ? JSON.parse(saved) : {
        webhookUrl: '',
        autoSync: true,
        soundAlerts: true,
        agentName: 'Operations Lead'
      };
    } catch {
      return {
        webhookUrl: '',
        autoSync: true,
        soundAlerts: true,
        agentName: 'Operations Lead'
      };
    }
  });

  // Prefill state from WhatsApp simulator
  const [prefillOrderId, setPrefillOrderId] = useState<string | undefined>();
  const [prefillCustomer, setPrefillCustomer] = useState<string | undefined>();

  // Cloud Sheet Sync State
  const [isSyncingFromSheet, setIsSyncingFromSheet] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncToast, setSyncToast] = useState<{ msg: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Helper to normalize Order IDs
  const normalizeId = (id: string) => id.trim().toUpperCase().replace(/^#+/, '');

  // Synchronize entries from Google Sheet across all phones & devices
  const syncFromGoogleSheet = async (silent = false) => {
    if (!settings.webhookUrl) {
      if (!silent) {
        setSyncToast({
          msg: 'Please set your Google Apps Script URL in Google Sheets Cloud Setup first',
          type: 'warning'
        });
        setTimeout(() => setSyncToast(null), 3500);
      }
      return;
    }

    setIsSyncingFromSheet(true);
    try {
      const syncUrl = settings.webhookUrl + (settings.webhookUrl.includes('?') ? '&' : '?') + 'action=getRecords';
      const res = await fetch(syncUrl);
      const data = await res.json();

      if (data.success && Array.isArray(data.records)) {
        const remoteRecords: CashbackRecord[] = data.records;

        setRecords((prev) => {
          const map = new Map<string, CashbackRecord>();
          prev.forEach((r) => {
            const norm = normalizeId(r.orderId);
            if (norm) map.set(norm, r);
          });

          remoteRecords.forEach((remote) => {
            const norm = normalizeId(remote.orderId);
            if (!norm) return;

            if (map.has(norm)) {
              const existing = map.get(norm)!;
              map.set(norm, {
                ...existing,
                ...remote,
                orderScreenshot: existing.orderScreenshot || remote.orderScreenshot,
                reviewScreenshot: existing.reviewScreenshot || remote.reviewScreenshot,
                syncedToGoogleSheet: true
              });
            } else {
              map.set(norm, {
                ...remote,
                syncedToGoogleSheet: true
              });
            }
          });

          return Array.from(map.values()).sort((a, b) => {
            const timeA = new Date(a.dateOfCashback || a.timestamp || 0).getTime();
            const timeB = new Date(b.dateOfCashback || b.timestamp || 0).getTime();
            return timeB - timeA;
          });
        });

        setLastSyncedAt(new Date());

        if (!silent) {
          setSyncToast({
            msg: `Successfully synced ${remoteRecords.length} records from Google Sheet across devices!`,
            type: 'success'
          });
          setTimeout(() => setSyncToast(null), 3500);
        }
      } else {
        if (!silent) {
          setSyncToast({
            msg: 'Sync notice: ' + (data.message || 'No records returned'),
            type: 'warning'
          });
          setTimeout(() => setSyncToast(null), 3500);
        }
      }
    } catch (err: unknown) {
      console.warn('Sync failed:', err);
      if (!silent) {
        setSyncToast({
          msg: 'Sync error: ' + (err instanceof Error ? err.message : String(err)),
          type: 'error'
        });
        setTimeout(() => setSyncToast(null), 3500);
      }
    } finally {
      setIsSyncingFromSheet(false);
    }
  };

  // Auto-sync on first page load across all phones & computers!
  useEffect(() => {
    if (settings.webhookUrl) {
      syncFromGoogleSheet(true);
    }
  }, [settings.webhookUrl]);

  // Persist records
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_APP_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.warn('Storage quota notice:', e);
    }
  }, [records]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_APP_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Storage quota notice:', e);
    }
  }, [settings]);

  // Record handler
  const handleAddRecord = async (newRecord: CashbackRecord): Promise<{ success: boolean; message?: string }> => {
    // Duplicate check
    const cleanNew = normalizeId(newRecord.orderId);
    const exists = records.some((r) => normalizeId(r.orderId) === cleanNew);

    if (exists) {
      return {
        success: false,
        message: `⚠️ DUPLICATE ORDER ID DETECTED! Payout blocked for #${newRecord.orderId}.`
      };
    }

    let synced = false;
    let syncErrorMsg = '';

    if (settings.webhookUrl && settings.autoSync) {
      try {
        const payload = {
          orderId: newRecord.orderId,
          customerInfo: newRecord.customerInfo,
          orderAmount: newRecord.orderAmount,
          cashbackAmount: newRecord.cashbackAmount,
          dateOfCashback: newRecord.dateOfCashback,
          status: newRecord.status,
          notes: newRecord.notes,
          orderScreenshot: newRecord.orderScreenshot ? '[Base64 Proof Attached]' : '',
          reviewScreenshot: newRecord.reviewScreenshot ? '[Base64 Proof Attached]' : '',
          agentName: settings.agentName
        };

        const res = await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          synced = true;
        } else {
          syncErrorMsg = data.message || 'Webhook rejected payload';
        }
      } catch (err: unknown) {
        syncErrorMsg = err instanceof Error ? err.message : 'Network sync failed';
      }
    }

    const recordWithSync: CashbackRecord = {
      ...newRecord,
      syncedToGoogleSheet: synced
    };

    setRecords((prev) => [recordWithSync, ...prev]);

    return {
      success: true,
      message: synced
        ? `Claim #${newRecord.orderId} recorded and synced to Google Sheets!`
        : syncErrorMsg
        ? `Recorded in local storage (Sheet sync note: ${syncErrorMsg})`
        : `Claim #${newRecord.orderId} secured in local storage!`
    };
  };

  // Update existing record handler
  const handleUpdateRecord = async (updatedRecord: CashbackRecord): Promise<{ success: boolean; message?: string }> => {
    // Ensure Order ID isn't colliding with another claim
    const cleanId = normalizeId(updatedRecord.orderId);
    const collision = records.some((r) => r.id !== updatedRecord.id && normalizeId(r.orderId) === cleanId);

    if (collision) {
      return {
        success: false,
        message: `⚠️ Order ID #${updatedRecord.orderId} is already used by another claim.`
      };
    }

    setRecords((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? { ...updatedRecord, syncedToGoogleSheet: true } : r))
    );

    let syncNote = '';
    if (settings.webhookUrl && settings.autoSync) {
      try {
        const payload = {
          action: 'updateRecord',
          orderId: updatedRecord.orderId,
          customerInfo: updatedRecord.customerInfo,
          orderAmount: updatedRecord.orderAmount,
          cashbackAmount: updatedRecord.cashbackAmount,
          dateOfCashback: updatedRecord.dateOfCashback,
          status: updatedRecord.status,
          notes: updatedRecord.notes
        };

        const res = await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) {
          syncNote = ` (Sheet note: ${data.message})`;
        }
      } catch (err: unknown) {
        syncNote = ` (Sheet sync pending: ${err instanceof Error ? err.message : String(err)})`;
      }
    }

    return {
      success: true,
      message: `Updated claim #${updatedRecord.orderId}${syncNote}`
    };
  };

  // Delete record handler
  const handleDeleteRecord = async (orderIdToDelete: string): Promise<{ success: boolean; message?: string }> => {
    const cleanTarget = normalizeId(orderIdToDelete);
    setRecords((prev) => prev.filter((r) => normalizeId(r.orderId) !== cleanTarget));

    let syncNote = '';
    if (settings.webhookUrl && settings.autoSync) {
      try {
        const payload = {
          action: 'deleteRecord',
          orderId: orderIdToDelete
        };

        const res = await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) {
          syncNote = ` (Sheet note: ${data.message})`;
        }
      } catch (err: unknown) {
        syncNote = ` (Sheet sync pending: ${err instanceof Error ? err.message : String(err)})`;
      }
    }

    return {
      success: true,
      message: `Deleted claim #${orderIdToDelete}${syncNote}`
    };
  };

  const handleClearRecords = () => {
    if (window.confirm('Reset all governance records back to empty?')) {
      setRecords([]);
    }
  };

  const handleSeedDemoRecords = () => {
    setRecords(SEED_RECORDS);
  };

  // Metrics calculation
  const totalDisbursed = records
    .filter((r) => r.status === 'Completed')
    .reduce((sum, r) => sum + (Number(r.cashbackAmount) || 0), 0);

  const pendingDisbursements = records
    .filter((r) => r.status === 'Pending UPI' || r.status === 'Initiated')
    .reduce((sum, r) => sum + (Number(r.cashbackAmount) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Top Governance Control Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Logo & Tag */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-lg shadow-lg shadow-indigo-600/30">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm text-white tracking-tight">
                  Cashback & Order Governance Tracker
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Chrome Extension V3 Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                E-Commerce Fraud Prevention • Duplicate Claim Guardrail • WhatsApp Web Automation
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Total Disbursed</div>
              <div className="text-xs font-mono font-bold text-emerald-400">
                ₹{totalDisbursed.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Recorded Claims</div>
              <div className="text-xs font-mono font-bold text-indigo-400">
                {records.length} Orders
              </div>
            </div>

            <button
              type="button"
              onClick={handleSeedDemoRecords}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
              title="Load demo orders to test duplicate detection instantly"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Seed</span>
            </button>

            <button
              type="button"
              onClick={() => syncFromGoogleSheet(false)}
              disabled={isSyncingFromSheet}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                settings.webhookUrl
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
              title="Sync latest orders from Google Sheet across all phones & devices"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFromSheet ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isSyncingFromSheet ? 'Syncing...' : 'Sync Sheet'}</span>
            </button>

            <button
              type="button"
              onClick={() => downloadExtensionZip()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download ZIP</span>
            </button>
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-slate-800/80 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('sandbox')}
            className={`px-3 py-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'sandbox'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Extension Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`px-3 py-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Web Live Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`px-3 py-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Extension Source Code (8 Files)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`px-3 py-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'sheets'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Google Sheets Cloud Setup</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Tab 1: Extension Simulator */}
        {activeTab === 'sandbox' && (
          <div className="space-y-4">
            
            {/* View Mode Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <span className="font-semibold text-white">Live Simulator:</span>
                <span>Test duplicate detection, screenshot clipboard paste, and CSV export.</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">View:</span>
                <button
                  type="button"
                  onClick={() => setCompactSidePanel(true)}
                  className={`px-2.5 py-1 text-xs rounded font-semibold transition-colors ${
                    compactSidePanel
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Docked Side Panel (380px)
                </button>
                <button
                  type="button"
                  onClick={() => setCompactSidePanel(false)}
                  className={`px-2.5 py-1 text-xs rounded font-semibold transition-colors ${
                    !compactSidePanel
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Full Width Dashboard
                </button>
              </div>
            </div>

            {/* Quick Test Prompt Card */}
            <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  <strong>Quick Test:</strong> Type or paste <code className="bg-indigo-900/60 px-1.5 py-0.5 rounded text-amber-300 font-mono font-bold cursor-pointer hover:underline" onClick={() => setPrefillOrderId('402-9842182-1928421')}>402-9842182-1928421</code> to see the Duplicate Prevention Guardrail immediately block submission! Or enter a new unique Order ID.
                </span>
              </div>
            </div>

            {/* Extension Simulator Component */}
            <div className="flex justify-center">
              <ExtensionSimulator
                records={records}
                onAddRecord={handleAddRecord}
                onUpdateRecord={handleUpdateRecord}
                onDeleteRecord={handleDeleteRecord}
                onClearRecords={handleClearRecords}
                settings={settings}
                onUpdateSettings={setSettings}
                prefillOrderId={prefillOrderId}
                prefillCustomer={prefillCustomer}
                onPrefillHandled={() => {
                  setPrefillOrderId(undefined);
                  setPrefillCustomer(undefined);
                }}
                compactMode={compactSidePanel}
                onSyncFromSheet={() => syncFromGoogleSheet(false)}
                isSyncingFromSheet={isSyncingFromSheet}
                lastSyncedAt={lastSyncedAt}
              />
            </div>
          </div>
        )}

        {/* Tab 2: WhatsApp Web Live Simulator */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300">
              <div className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                <span>💬 WhatsApp Web Content Script Automation</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">content.js</span>
              </div>
              <p>
                When customer support agents open WhatsApp Web (<code className="bg-slate-800 px-1 py-0.2 rounded text-slate-200">https://web.whatsapp.com</code>), the extension automatically identifies order numbers inside chat bubbles. Clean orders show a green <strong>"Record Cashback"</strong> badge; duplicate claims show a red <strong>"DUPLICATE CLAIM"</strong> alert.
              </p>
            </div>

            <WhatsAppSimulator
              records={records}
              onSelectOrderForAudit={(orderId, customer) => {
                setPrefillOrderId(orderId);
                setPrefillCustomer(customer);
                setActiveTab('sandbox');
              }}
            />
          </div>
        )}

        {/* Tab 3: Code Inspector & ZIP Exporter */}
        {activeTab === 'code' && (
          <div className="space-y-4">
            <CodeInspector />
          </div>
        )}

        {/* Tab 4: Google Sheets Cloud Setup */}
        {activeTab === 'sheets' && (
          <div className="space-y-4">
            <GoogleSheetsGuide
              records={records}
              webhookUrl={settings.webhookUrl}
              onUpdateWebhookUrl={(url) => setSettings({ ...settings, webhookUrl: url })}
            />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-4 px-4 text-center text-xs text-slate-500">
        <p>Cashback & Order Governance Tracker • Chrome Manifest V3 Production Extension • Internal E-Commerce Fraud Prevention</p>
      </footer>

      {/* Sync Notification Banner */}
      {syncToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className={`px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 border animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            syncToast.type === 'error'
              ? 'bg-red-950 text-red-200 border-red-700'
              : syncToast.type === 'warning'
              ? 'bg-amber-950 text-amber-200 border-amber-700'
              : 'bg-emerald-950 text-emerald-200 border-emerald-700'
          }`}>
            <span>{syncToast.type === 'error' ? '🚫' : syncToast.type === 'warning' ? '⚠️' : '🔄'}</span>
            <span>{syncToast.msg}</span>
          </div>
        </div>
      )}

    </div>
  );
}
