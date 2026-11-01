import React, { useState } from 'react';
import { CashbackRecord } from '../types';
import { 
  Send, 
  ShieldAlert, 
  ShieldCheck, 
  ExternalLink, 
  MessageSquare, 
  User, 
  CheckCheck,
  AlertOctagon,
  Sparkles
} from 'lucide-react';

interface Props {
  records: CashbackRecord[];
  onSelectOrderForAudit: (orderId: string, customer: string) => void;
}

interface ChatThread {
  id: string;
  customerName: string;
  phone: string;
  avatar: string;
  lastMessage: string;
  messages: Array<{
    id: string;
    sender: 'customer' | 'agent';
    text: string;
    time: string;
    detectedOrderId?: string;
  }>;
}

export const WhatsAppSimulator: React.FC<Props> = ({
  records,
  onSelectOrderForAudit
}) => {
  const [threads, setThreads] = useState<ChatThread[]>([
    {
      id: 'thread-1',
      customerName: 'Pooja Verma',
      phone: '+91 98231 09841',
      avatar: '👩',
      lastMessage: 'Amazon order 402-8821941-1029412',
      messages: [
        {
          id: 'm1',
          sender: 'customer',
          text: 'Hi team! I ordered the Wireless Earbuds on Amazon with order ID 402-8821941-1029412. I have posted a 5-star review as agreed. Kindly disburse ₹200 cashback to 9823109841@upi.',
          time: '10:14 AM',
          detectedOrderId: '402-8821941-1029412'
        }
      ]
    },
    {
      id: 'thread-2',
      customerName: 'Vikram Mehta (Potential Duplicate)',
      phone: '+91 99880 12345',
      avatar: '🧔',
      lastMessage: 'Claiming cashback for 402-9842182-1928421',
      messages: [
        {
          id: 'm2',
          sender: 'customer',
          text: 'Hello, I also ordered on Amazon: 402-9842182-1928421. Where is my ₹150 cashback? Send to vikram@okhdfcbank right now.',
          time: '11:05 AM',
          detectedOrderId: '402-9842182-1928421'
        }
      ]
    },
    {
      id: 'thread-3',
      customerName: 'Ananya Sen',
      phone: '+91 91234 56789',
      avatar: '👩‍💼',
      lastMessage: 'Flipkart order OD109284019284',
      messages: [
        {
          id: 'm3',
          sender: 'customer',
          text: 'Shared Flipkart review for OD109284019284. Order amount was ₹2,499. Please confirm ₹250 cashback.',
          time: '11:42 AM',
          detectedOrderId: 'OD109284019284'
        }
      ]
    }
  ]);

  const [activeThreadId, setActiveThreadId] = useState<string>('thread-1');
  const [replyText, setReplyText] = useState('');

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  // Helper to normalize
  const normalizeId = (id: string) => id.trim().toUpperCase().replace(/^#+/, '');

  // Helper to check if detected order in chat is duplicate
  const checkDuplicateStatus = (orderId?: string) => {
    if (!orderId) return null;
    const clean = normalizeId(orderId);
    return records.find((r) => normalizeId(r.orderId) === clean) || null;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    // Detect order IDs in typed text
    const pattern = /\b(\d{3}-\d{7}-\d{7}|OD\d{10,20}|ORD-?[A-Z0-9]{4,10}|#?\d{5,10})\b/gi;
    const match = pattern.exec(replyText);
    const detected = match ? match[0] : undefined;

    const newMsg = {
      id: 'msg_' + Date.now(),
      sender: 'agent' as const,
      text: replyText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      detectedOrderId: detected
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? {
              ...t,
              lastMessage: replyText.trim(),
              messages: [...t.messages, newMsg]
            }
          : t
      )
    );

    setReplyText('');
  };

  // Quick test sample injector
  const injectSampleCustomerMessage = (orderNum: string, isDup: boolean) => {
    const text = isDup
      ? `Hey agent, please process my ₹150 payout for order #${orderNum}. UPI: fraudster@upi.`
      : `New purchase completed! Order #${orderNum}. 5-star review attached. Amount: ₹1,299.`;

    const newMsg = {
      id: 'msg_' + Date.now(),
      sender: 'customer' as const,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      detectedOrderId: orderNum
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? {
              ...t,
              lastMessage: text,
              messages: [...t.messages, newMsg]
            }
          : t
      )
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row h-[620px]">
      
      {/* WhatsApp Sidebar Contacts */}
      <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-3 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <div>
              <span className="font-bold text-xs tracking-wide">WhatsApp Web</span>
              <div className="text-[10px] text-emerald-200">Customer Support Inbound</div>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-800 px-2 py-0.5 rounded text-emerald-100 font-mono">
            Extension Active
          </span>
        </div>

        <div className="p-2 border-b border-slate-200 bg-white">
          <div className="text-[11px] text-slate-500 font-medium px-2 py-1">
            Active Cashback Queries
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {threads.map((t) => {
            const isSelected = t.id === activeThreadId;
            return (
              <div
                key={t.id}
                onClick={() => setActiveThreadId(t.id)}
                className={`p-3 cursor-pointer transition-colors flex items-center gap-3 ${
                  isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-100/70'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xl shrink-0 shadow-xs">
                  {t.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">{t.customerName}</span>
                    <span className="text-[10px] text-slate-400">11:05 AM</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{t.phone}</div>
                  <div className="text-[10.5px] text-slate-600 truncate mt-0.5 font-mono">
                    {t.lastMessage}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick simulation tester buttons */}
        <div className="p-2.5 bg-slate-100 border-t border-slate-200 space-y-1.5">
          <span className="text-[10.5px] font-bold text-slate-600 block">Simulate Incoming Message:</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => injectSampleCustomerMessage('402-9842182-1928421', true)}
              className="flex-1 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-bold rounded border border-red-300 transition-colors"
              title="Test Duplicate Detection from known seed order"
            >
              + Duplicate Claim
            </button>
            <button
              type="button"
              onClick={() => injectSampleCustomerMessage(`ORD-${Math.floor(10000 + Math.random() * 90000)}`, false)}
              className="flex-1 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded border border-emerald-300 transition-colors"
              title="Test Brand New Clean Order"
            >
              + Clean Order
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Chat Main Window */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative">
        
        {/* Chat Header */}
        <div className="p-3 bg-slate-100 border-b border-slate-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-lg shadow-xs">
              {activeThread.avatar}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">{activeThread.customerName}</div>
              <div className="text-[10.5px] text-slate-500 font-mono">{activeThread.phone} • Online</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-[11px] text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium">Extension Content Script Hooked</span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          
          <div className="text-center my-2">
            <span className="bg-white/80 text-slate-600 text-[10px] px-2.5 py-1 rounded shadow-xs font-medium">
              🔒 Messages are end-to-end encrypted. Extension scanning order patterns safely in memory.
            </span>
          </div>

          {activeThread.messages.map((m) => {
            const isCustomer = m.sender === 'customer';
            const detectedId = m.detectedOrderId;
            const duplicate = checkDuplicateStatus(detectedId);

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
              >
                {/* Simulated Extension Injected Audit Badge */}
                {detectedId && (
                  <div className="mb-1.5 max-w-[85%] animate-in fade-in duration-200">
                    {duplicate ? (
                      <div className="bg-red-50 border-2 border-red-500 rounded-lg p-2.5 shadow-sm text-red-900 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                          <div>
                            <span className="text-[11px] font-black text-red-700 block uppercase">
                              ⚠️ DUPLICATE ORDER CLAIM DETECTED!
                            </span>
                            <span className="text-[10.5px] text-red-800">
                              Order <strong className="font-mono">#{detectedId}</strong> was already claimed for <strong>₹{duplicate.cashbackAmount}</strong> on {duplicate.dateOfCashback || duplicate.timestamp}!
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectOrderForAudit(detectedId, activeThread.customerName)}
                          className="px-2.5 py-1 text-[10.5px] font-bold bg-red-600 hover:bg-red-700 text-white rounded shrink-0 shadow-xs transition-colors"
                        >
                          Audit Fraud
                        </button>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2 shadow-xs text-emerald-900 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-[11px] font-bold text-emerald-800 block">
                              Order #{detectedId} Verified
                            </span>
                            <span className="text-[10.5px] text-emerald-700">
                              Zero previous claims found. Safe to disburse.
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectOrderForAudit(detectedId, activeThread.customerName)}
                          className="px-2.5 py-1 text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shrink-0 shadow-xs transition-colors"
                        >
                          Record Cashback
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[78%] rounded-lg p-2.5 shadow-xs text-xs relative ${
                    isCustomer
                      ? 'bg-white text-slate-800 rounded-tl-none'
                      : 'bg-[#d9fdd3] text-slate-800 rounded-tr-none'
                  }`}
                >
                  <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
                  <div className="flex items-center justify-end gap-1 text-[9.5px] text-slate-400 mt-1">
                    <span>{m.time}</span>
                    {!isCustomer && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply Bar */}
        <form onSubmit={handleSendMessage} className="p-2.5 bg-slate-100 border-t border-slate-300 flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type a message or paste an Order ID..."
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-600"
          />
          <button
            type="submit"
            className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
