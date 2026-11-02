import React, { useState, useEffect, useRef } from 'react';
import { CashbackRecord, ClaimStatus, GovernanceSettings } from '../types';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Download, 
  Search, 
  Trash2, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Settings,
  X,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  Copy,
  Info,
  Pencil
} from 'lucide-react';

interface Props {
  records: CashbackRecord[];
  onAddRecord: (record: CashbackRecord) => Promise<{ success: boolean; message?: string }>;
  onUpdateRecord?: (record: CashbackRecord) => Promise<{ success: boolean; message?: string }>;
  onDeleteRecord?: (orderId: string) => Promise<{ success: boolean; message?: string }>;
  onClearRecords: () => void;
  settings: GovernanceSettings;
  onUpdateSettings: (settings: GovernanceSettings) => void;
  prefillOrderId?: string;
  prefillCustomer?: string;
  onPrefillHandled?: () => void;
  compactMode?: boolean;
  onSyncFromSheet?: () => Promise<void>;
  isSyncingFromSheet?: boolean;
  lastSyncedAt?: Date | null;
}

export const ExtensionSimulator: React.FC<Props> = ({
  records,
  onAddRecord,
  onClearRecords,
  settings,
  onUpdateSettings,
  prefillOrderId,
  prefillCustomer,
  onPrefillHandled,
  compactMode = false,
  onSyncFromSheet,
  isSyncingFromSheet = false,
  lastSyncedAt = null,
  onUpdateRecord,
  onDeleteRecord
}) => {
  // Form state
  const [orderId, setOrderId] = useState('');
  const [customerInfo, setCustomerInfo] = useState('');
  const [orderAmount, setOrderAmount] = useState<string>('');
  const [cashbackAmount, setCashbackAmount] = useState<string>('');
  const [dateOfCashback, setDateOfCashback] = useState('');
  const [status, setStatus] = useState<ClaimStatus>('Completed');
  const [notes, setNotes] = useState('');
  const [orderScreenshot, setOrderScreenshot] = useState<string | null>(null);
  const [reviewScreenshot, setReviewScreenshot] = useState<string | null>(null);

  // Edit mode state
  const [editingRecord, setEditingRecord] = useState<CashbackRecord | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState<{ src: string; title: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [isPingingWebhook, setIsPingingWebhook] = useState(false);
  
  // Settings draft
  const [draftWebhookUrl, setDraftWebhookUrl] = useState(settings.webhookUrl);
  const [draftAutoSync, setDraftAutoSync] = useState(settings.autoSync);
  const [draftSoundAlerts, setDraftSoundAlerts] = useState(settings.soundAlerts);

  const orderFileInputRef = useRef<HTMLInputElement>(null);
  const reviewFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize current local date-time
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDateOfCashback(now.toISOString().slice(0, 16));
  }, []);

  // Sync draft settings
  useEffect(() => {
    setDraftWebhookUrl(settings.webhookUrl);
    setDraftAutoSync(settings.autoSync);
    setDraftSoundAlerts(settings.soundAlerts);
  }, [settings]);

  // Handle external prefill (e.g. from WhatsApp simulator)
  useEffect(() => {
    if (prefillOrderId) {
      setOrderId(prefillOrderId);
      if (prefillCustomer) setCustomerInfo(prefillCustomer);
      if (onPrefillHandled) onPrefillHandled();
      showToastNotification(`Loaded order #${prefillOrderId} for audit`, 'success');
    }
  }, [prefillOrderId, prefillCustomer, onPrefillHandled]);

  // Helper: Normalize Order ID for comparison
  const normalizeId = (id: string) => id.trim().toUpperCase().replace(/^#+/, '');

  // Live duplicate detection (excluding self if editing)
  const normalizedCurrentId = normalizeId(orderId);
  const duplicateRecord = normalizedCurrentId
    ? records.find((r) => normalizeId(r.orderId) === normalizedCurrentId && (!editingRecord || r.id !== editingRecord.id))
    : null;

  // Beep sound on duplicate detection
  useEffect(() => {
    if (duplicateRecord && settings.soundAlerts) {
      playAlertSound();
    }
  }, [duplicateRecord, settings.soundAlerts]);

  // Edit record handler
  const handleStartEdit = (item: CashbackRecord) => {
    setEditingRecord(item);
    setOrderId(item.orderId);
    setCustomerInfo(item.customerInfo === 'N/A' ? '' : item.customerInfo);
    setOrderAmount(String(item.orderAmount));
    setCashbackAmount(String(item.cashbackAmount));
    if (item.dateOfCashback) {
      setDateOfCashback(item.dateOfCashback.substring(0, 16));
    }
    setStatus(item.status);
    setNotes(item.notes || '');
    setOrderScreenshot(item.orderScreenshot);
    setReviewScreenshot(item.reviewScreenshot);
    showToastNotification(`Editing claim #${item.orderId}`, 'success');
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setOrderId('');
    setCustomerInfo('');
    setOrderAmount('');
    setCashbackAmount('');
    setNotes('');
    setOrderScreenshot(null);
    setReviewScreenshot(null);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDateOfCashback(now.toISOString().slice(0, 16));
  };

  const handleDelete = async (targetOrderId: string) => {
    if (!window.confirm(`Are you sure you want to delete claim for Order #${targetOrderId}?\n\nThis will remove it from the governance log.`)) {
      return;
    }
    if (onDeleteRecord) {
      const res = await onDeleteRecord(targetOrderId);
      if (res.success) {
        showToastNotification(res.message || `Deleted order #${targetOrderId}`, 'success');
        if (editingRecord && editingRecord.orderId === targetOrderId) {
          handleCancelEdit();
        }
      } else {
        showToastNotification(res.message || 'Error deleting record', 'error');
      }
    }
  };

  // Audio synthesizer for alert
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // AudioContext policy restriction fallback
    }
  };

  // Cashback percentage
  const numOrderAmt = parseFloat(orderAmount) || 0;
  const numCashbackAmt = parseFloat(cashbackAmount) || 0;
  const cashbackPercent = numOrderAmt > 0 ? ((numCashbackAmt / numOrderAmt) * 100).toFixed(1) : null;

  // Toast Notification helper
  const showToastNotification = (msg: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Image processing helper
  const processImageFile = (file: File, callback: (base64: string) => void) => {
    if (!file.type.startsWith('image/')) {
      showToastNotification('Please upload an image file (PNG, JPG, WebP)', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          callback(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          callback(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle global paste for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            if (!orderScreenshot) {
              processImageFile(file, (b64) => {
                setOrderScreenshot(b64);
                showToastNotification('Pasted image into Order Screenshot! 📦', 'success');
              });
            } else {
              processImageFile(file, (b64) => {
                setReviewScreenshot(b64);
                showToastNotification('Pasted image into Review Screenshot! ⭐', 'success');
              });
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [orderScreenshot, reviewScreenshot]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!normalizedCurrentId) {
      showToastNotification('Please enter an Order ID', 'warning');
      return;
    }

    if (duplicateRecord) {
      showToastNotification('Submission blocked: Duplicate Order ID detected!', 'error');
      return;
    }

    if (numOrderAmt <= 0) {
      showToastNotification('Please enter a valid Order Amount', 'warning');
      return;
    }

    if (numCashbackAmt < 0 || isNaN(numCashbackAmt)) {
      showToastNotification('Please enter a valid Cashback Amount', 'warning');
      return;
    }

    setIsSubmitting(true);

    if (editingRecord) {
      const updated: CashbackRecord = {
        ...editingRecord,
        orderId: orderId.trim(),
        customerInfo: customerInfo.trim() || 'N/A',
        orderAmount: numOrderAmt,
        cashbackAmount: numCashbackAmt,
        dateOfCashback: dateOfCashback || editingRecord.dateOfCashback,
        status,
        notes: notes.trim(),
        orderScreenshot,
        reviewScreenshot
      };

      if (onUpdateRecord) {
        const res = await onUpdateRecord(updated);
        setIsSubmitting(false);
        if (res.success) {
          showToastNotification(res.message || `Updated order #${updated.orderId}!`, 'success');
          handleCancelEdit();
        } else {
          showToastNotification(res.message || 'Error updating record', 'error');
        }
      }
      return;
    }

    const newRecord: CashbackRecord = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      orderId: orderId.trim(),
      customerInfo: customerInfo.trim() || 'N/A',
      orderAmount: numOrderAmt,
      cashbackAmount: numCashbackAmt,
      dateOfCashback: dateOfCashback || new Date().toISOString(),
      status,
      notes: notes.trim(),
      orderScreenshot,
      reviewScreenshot,
      syncedToGoogleSheet: false
    };

    const res = await onAddRecord(newRecord);
    setIsSubmitting(false);

    if (res.success) {
      showToastNotification(res.message || 'Disbursement recorded and order guarded!', 'success');
      // Reset form
      setOrderId('');
      setCustomerInfo('');
      setOrderAmount('');
      setCashbackAmount('');
      setNotes('');
      setOrderScreenshot(null);
      setReviewScreenshot(null);
    } else {
      showToastNotification(res.message || 'Error saving record', 'error');
    }
  };

  // Test Webhook Connection
  const handleTestPing = async () => {
    if (!draftWebhookUrl) {
      showToastNotification('Please enter a Google Apps Script Web App URL first', 'warning');
      return;
    }

    setIsPingingWebhook(true);
    try {
      const res = await fetch(draftWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping' })
      });
      const data = await res.json();
      if (data.success) {
        showToastNotification('Connected! Google Apps Script returned: ' + data.message, 'success');
      } else {
        showToastNotification('Webhook responded: ' + (data.message || 'Unknown response'), 'warning');
      }
    } catch (err: unknown) {
      showToastNotification('Connection check: ' + (err instanceof Error ? err.message : String(err)), 'warning');
    } finally {
      setIsPingingWebhook(false);
    }
  };

  const handleSaveSettings = () => {
    onUpdateSettings({
      ...settings,
      webhookUrl: draftWebhookUrl.trim(),
      autoSync: draftAutoSync,
      soundAlerts: draftSoundAlerts
    });
    setShowSettingsDrawer(false);
    showToastNotification('Settings saved successfully!', 'success');
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (records.length === 0) {
      showToastNotification('No records available to export', 'warning');
      return;
    }

    const headers = [
      'Order ID',
      'Customer / WhatsApp',
      'Order Amount (INR)',
      'Cashback Amount (INR)',
      'Cashback %',
      'Status',
      'Date of Cashback',
      'Notes',
      'Order Screenshot Attached',
      'Review Screenshot Attached',
      'Synced to Google Sheet',
      'Timestamp'
    ];

    const rows = records.map((r) => {
      const amt = r.orderAmount || 0;
      const cb = r.cashbackAmount || 0;
      const pct = amt > 0 ? ((cb / amt) * 100).toFixed(1) + '%' : '0%';
      return [
        `"${(r.orderId || '').replace(/"/g, '""')}"`,
        `"${(r.customerInfo || '').replace(/"/g, '""')}"`,
        r.orderAmount,
        r.cashbackAmount,
        `"${pct}"`,
        `"${(r.status || '').replace(/"/g, '""')}"`,
        `"${(r.dateOfCashback || '').replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        r.orderScreenshot ? 'YES' : 'NO',
        r.reviewScreenshot ? 'YES' : 'NO',
        r.syncedToGoogleSheet ? 'YES' : 'NO',
        `"${r.timestamp || ''}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `cashback_governance_records_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToastNotification(`Exported ${records.length} records to CSV!`, 'success');
  };

  // Filtered claims
  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.orderId && r.orderId.toLowerCase().includes(q)) ||
      (r.customerInfo && r.customerInfo.toLowerCase().includes(q)) ||
      (r.status && r.status.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className={`flex flex-col bg-slate-50 border border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all duration-200 ${compactMode ? 'max-w-[440px] mx-auto w-full' : 'w-full'}`}>
      
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700/60 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-base shadow-md shadow-indigo-600/30">
            🛡️
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>Cashback & Order Governance</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-mono">MV3</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Duplicate Fraud Guardrail Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onSyncFromSheet && (
            <button
              type="button"
              onClick={onSyncFromSheet}
              disabled={isSyncingFromSheet}
              className={`p-1.5 rounded-md hover:bg-slate-700/60 text-slate-300 hover:text-white transition-colors flex items-center gap-1 ${
                isSyncingFromSheet ? 'text-indigo-400' : ''
              }`}
              title="Sync & Pull latest records from Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFromSheet ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className="p-1.5 rounded-md hover:bg-slate-700/60 text-slate-300 hover:text-white transition-colors"
            title="Google Sheets Sync Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Drawer */}
      {showSettingsDrawer && (
        <div className="bg-slate-100 border-b border-slate-300 p-3.5 text-xs text-slate-700 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold flex items-center gap-1.5 text-slate-800">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Google Sheet Webhook Sync</span>
            </span>
            <button 
              onClick={() => setShowSettingsDrawer(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 mb-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Google Apps Script Web App URL
              </label>
              <input
                type="url"
                value={draftWebhookUrl}
                onChange={(e) => setDraftWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Paste your deployed Google Apps Script URL to auto-log claims without OAuth.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[11.5px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={draftAutoSync}
                  onChange={(e) => setDraftAutoSync(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Auto-sync new entries to Sheet</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[11.5px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={draftSoundAlerts}
                  onChange={(e) => setDraftSoundAlerts(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Alert Sounds</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={handleTestPing}
              disabled={isPingingWebhook}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isPingingWebhook ? 'animate-spin' : ''}`} />
              <span>{isPingingWebhook ? 'Testing...' : 'Test Ping'}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-3 py-1 text-[11px] font-semibold bg-indigo-600 rounded text-white hover:bg-indigo-700"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Prominent Duplicate Guardrail Warning Banner */}
      {duplicateRecord && (
        <div 
          className="mx-3.5 mt-3 p-3.5 bg-red-50 border-2 border-red-500 rounded-lg text-red-900 animate-bounce duration-300 shadow-sm"
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-red-100 rounded-md text-red-600 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-black tracking-wide text-red-700 uppercase flex items-center gap-1.5">
                <span>⚠️ DUPLICATE ORDER ID DETECTED!</span>
              </div>
              <div className="text-xs font-medium text-red-800 mt-1 leading-snug">
                Already claimed on <span className="font-bold underline">{duplicateRecord.dateOfCashback || duplicateRecord.timestamp}</span> for <span className="font-bold text-red-900 text-sm">₹{duplicateRecord.cashbackAmount}</span>.
              </div>
              <div className="text-[11px] text-red-700 mt-1.5 pt-1.5 border-t border-red-200 flex flex-wrap items-center justify-between gap-1">
                <span>Customer: <strong>{duplicateRecord.customerInfo || 'N/A'}</strong></span>
                <span className="px-1.5 py-0.5 rounded bg-red-200 text-red-800 font-semibold text-[10px]">
                  Status: {duplicateRecord.status}
                </span>
              </div>
              <div className="mt-2 text-[10.5px] font-semibold text-red-600 bg-red-100/80 px-2 py-1 rounded flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Submission has been locked to prevent duplicate payout fraud.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="p-3.5 space-y-3.5">

        {/* Active Edit Mode Banner */}
        {editingRecord && (
          <div className="p-2.5 bg-indigo-50 border border-indigo-300 rounded-lg flex items-center justify-between text-xs text-indigo-950 animate-in fade-in duration-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Pencil className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                Editing Claim: <strong className="font-mono text-indigo-900">#{editingRecord.orderId}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              ✕ Cancel Edit
            </button>
          </div>
        )}
        
        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-3">
          
          {/* Order ID Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="formOrderId" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>Order ID</span>
                <span className="text-red-500">*</span>
              </label>
              {normalizedCurrentId && !duplicateRecord && (
                <span className="text-[10.5px] font-semibold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Available (No claims)</span>
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 font-mono font-bold text-xs">
                #
              </div>
              <input
                id="formOrderId"
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. 402-9842182-1928421 or ORD-88910"
                className={`w-full pl-7 pr-3 py-1.5 text-xs font-mono font-medium rounded border transition-colors focus:outline-none ${
                  duplicateRecord 
                    ? 'border-red-500 bg-red-50/50 text-red-900 focus:ring-2 focus:ring-red-200' 
                    : normalizedCurrentId 
                    ? 'border-emerald-500 bg-emerald-50/30 text-slate-800'
                    : 'border-slate-300 focus:border-indigo-500 bg-white'
                }`}
                required
                autoComplete="off"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Auto-verified in real time against stored orders & Google Sheets.
            </p>
          </div>

          {/* Customer / WhatsApp Number */}
          <div>
            <label htmlFor="formCustomer" className="block text-xs font-bold text-slate-700 mb-1">
              <span>Customer Name / WhatsApp</span>
              <span className="font-normal text-slate-400 ml-1">(Optional)</span>
            </label>
            <input
              id="formCustomer"
              type="text"
              value={customerInfo}
              onChange={(e) => setCustomerInfo(e.target.value)}
              placeholder="e.g. Rahul Sharma / +91 98765 43210"
              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Order Amount & Cashback Amount */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="formOrderAmt" className="block text-xs font-bold text-slate-700 mb-1">
                <span>Order Amount (₹)</span>
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                  ₹
                </span>
                <input
                  id="formOrderAmt"
                  type="number"
                  min="1"
                  step="any"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  placeholder="1499"
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-semibold rounded border border-slate-300 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="formCashbackAmt" className="text-xs font-bold text-slate-700">
                  <span>Cashback (₹)</span>
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                {cashbackPercent && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                    {cashbackPercent}%
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                  ₹
                </span>
                <input
                  id="formCashbackAmt"
                  type="number"
                  min="0"
                  step="any"
                  value={cashbackAmount}
                  onChange={(e) => setCashbackAmount(e.target.value)}
                  placeholder="150"
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-indigo-700 rounded border border-slate-300 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Date & Status */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="formDate" className="block text-xs font-bold text-slate-700 mb-1">
                <span>Date & Time</span>
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                id="formDate"
                type="datetime-local"
                value={dateOfCashback}
                onChange={(e) => setDateOfCashback(e.target.value)}
                className="w-full px-2 py-1.5 text-[11px] rounded border border-slate-300 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="formStatus" className="block text-xs font-bold text-slate-700 mb-1">
                <span>Status</span>
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                id="formStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value as ClaimStatus)}
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 bg-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="Initiated">Initiated</option>
                <option value="Pending UPI">Pending UPI</option>
                <option value="Completed">Completed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Screenshots Section (Order & Review) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700">
                <span>Screenshots Evidence</span>
                <span className="text-[10px] font-normal text-slate-400 ml-1.5">(Drop or Ctrl+V)</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Order Screenshot Dropzone */}
              <div
                onClick={() => orderFileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    processImageFile(e.dataTransfer.files[0], (b64) => setOrderScreenshot(b64));
                  }
                }}
                className={`relative border-2 border-dashed rounded-lg p-2 flex flex-col items-center justify-center min-h-[82px] cursor-pointer transition-colors ${
                  orderScreenshot ? 'border-indigo-400 bg-indigo-50/20' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                }`}
              >
                {orderScreenshot ? (
                  <div className="relative w-full h-[66px] group">
                    <img
                      src={orderScreenshot}
                      alt="Order Screenshot"
                      className="w-full h-full object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModalImg({ src: orderScreenshot, title: `Order Screenshot - #${orderId || 'Claim'}` });
                        }}
                        className="p-1 rounded bg-white/90 text-slate-700 hover:bg-white"
                        title="View Full"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderScreenshot(null);
                        }}
                        className="p-1 rounded bg-red-500 text-white hover:bg-red-600"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-lg">📦</span>
                    <div className="text-[11px] font-bold text-slate-700">Order Invoice</div>
                    <div className="text-[9.5px] text-slate-400">Click / Drop / Paste</div>
                  </div>
                )}
                <input
                  ref={orderFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      processImageFile(e.target.files[0], (b64) => setOrderScreenshot(b64));
                    }
                  }}
                  className="hidden"
                />
              </div>

              {/* Review Screenshot Dropzone */}
              <div
                onClick={() => reviewFileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    processImageFile(e.dataTransfer.files[0], (b64) => setReviewScreenshot(b64));
                  }
                }}
                className={`relative border-2 border-dashed rounded-lg p-2 flex flex-col items-center justify-center min-h-[82px] cursor-pointer transition-colors ${
                  reviewScreenshot ? 'border-indigo-400 bg-indigo-50/20' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                }`}
              >
                {reviewScreenshot ? (
                  <div className="relative w-full h-[66px] group">
                    <img
                      src={reviewScreenshot}
                      alt="Review Screenshot"
                      className="w-full h-full object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModalImg({ src: reviewScreenshot, title: `Review Screenshot - #${orderId || 'Claim'}` });
                        }}
                        className="p-1 rounded bg-white/90 text-slate-700 hover:bg-white"
                        title="View Full"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewScreenshot(null);
                        }}
                        className="p-1 rounded bg-red-500 text-white hover:bg-red-600"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-lg">⭐</span>
                    <div className="text-[11px] font-bold text-slate-700">Review Proof</div>
                    <div className="text-[9.5px] text-slate-400">Click / Drop / Paste</div>
                  </div>
                )}
                <input
                  ref={reviewFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      processImageFile(e.target.files[0], (b64) => setReviewScreenshot(b64));
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Notes / UPI Ref ID */}
          <div>
            <label htmlFor="formNotes" className="block text-xs font-bold text-slate-700 mb-1">
              <span>Notes / UPI Ref ID</span>
              <span className="font-normal text-slate-400 ml-1">(Optional)</span>
            </label>
            <input
              id="formNotes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via GPay #98102, 5-star review verified on Amazon"
              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (editingRecord) {
                  handleCancelEdit();
                } else {
                  setOrderId('');
                  setCustomerInfo('');
                  setOrderAmount('');
                  setCashbackAmount('');
                  setNotes('');
                  setOrderScreenshot(null);
                  setReviewScreenshot(null);
                }
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
            >
              {editingRecord ? 'Cancel' : 'Clear'}
            </button>
            <button
              type="submit"
              disabled={Boolean(duplicateRecord) || isSubmitting || !orderId.trim()}
              className={`flex-1 py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                duplicateRecord 
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{editingRecord ? 'Updating Claim...' : 'Recording & Syncing...'}</span>
                </>
              ) : duplicateRecord ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  <span>Blocked: Duplicate Order ID</span>
                </>
              ) : editingRecord ? (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Update Claim Record</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Record & Guard Order</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Recent Claims Section */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">Recent Claims</span>
                <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {records.length}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isSyncingFromSheet ? 'bg-amber-400 animate-ping' : settings.webhookUrl ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
                <span>
                  {isSyncingFromSheet
                    ? 'Syncing across phones...'
                    : lastSyncedAt
                    ? `Synced with Sheet at ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : settings.webhookUrl
                    ? 'Sheet sync configured'
                    : 'Local storage mode'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onSyncFromSheet && (
                <button
                  type="button"
                  onClick={onSyncFromSheet}
                  disabled={isSyncingFromSheet}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-200 flex items-center gap-1 transition-colors"
                  title="Fetch latest entries from Google Sheet across all phones"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingFromSheet ? 'animate-spin' : ''}`} />
                  <span>Sync Sheet</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={records.length === 0}
                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                title="Export all records to CSV"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID or WhatsApp..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Claims Table */}
          <div className="border border-slate-200 rounded overflow-hidden max-h-[220px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-1.5 px-2">Order ID</th>
                  <th className="py-1.5 px-2">Customer</th>
                  <th className="py-1.5 px-2">Cashback</th>
                  <th className="py-1.5 px-2">Status</th>
                  <th className="py-1.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setOrderId(item.orderId);
                        showToastNotification(`Loaded #${item.orderId} for inspection`, 'success');
                      }}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      title="Click to check order in form"
                    >
                      <td className="py-1.5 px-2 font-mono font-bold text-slate-800">
                        {item.orderId}
                      </td>
                      <td className="py-1.5 px-2 text-slate-600 truncate max-w-[90px]">
                        {item.customerInfo || 'N/A'}
                      </td>
                      <td className="py-1.5 px-2 font-bold text-indigo-600">
                        ₹{item.cashbackAmount}
                      </td>
                      <td className="py-1.5 px-2">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            item.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Pending UPI'
                              ? 'bg-amber-100 text-amber-800'
                              : item.status === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {item.status}
                        </span>
                        {(item.orderScreenshot || item.reviewScreenshot) && (
                          <span className="ml-1 text-[10px]" title="Evidence attached">
                            📷
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(item);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit claim details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.orderId);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete claim"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                      {searchQuery ? 'No matching orders found' : 'No cashback claims recorded yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Screenshot Zoom Modal */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold">{previewModalImg.title}</span>
              <button 
                onClick={() => setPreviewModalImg(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-slate-950 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img src={previewModalImg.src} alt="Evidence Zoom" className="max-w-full h-auto object-contain rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className={`px-4 py-2 rounded-full text-xs font-medium shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : toast.type === 'warning'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-900 text-white'
          }`}>
            <span>{toast.type === 'error' ? '🚫' : toast.type === 'warning' ? '⚠️' : '✓'}</span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

    </div>
  );
};
