export type ClaimStatus = 'Initiated' | 'Pending UPI' | 'Completed' | 'Rejected';

export interface CashbackRecord {
  id: string;
  timestamp: string;
  orderId: string;
  customerInfo: string;
  orderAmount: number;
  cashbackAmount: number;
  dateOfCashback: string;
  status: ClaimStatus;
  notes: string;
  orderScreenshot: string | null;
  reviewScreenshot: string | null;
  hasOrderScreenshot?: boolean;
  hasReviewScreenshot?: boolean;
  syncedToGoogleSheet?: boolean;
  agentName?: string;
}

export interface GovernanceSettings {
  webhookUrl: string;
  autoSync: boolean;
  soundAlerts: boolean;
  agentName: string;
}

export interface WhatsAppMessage {
  id: string;
  sender: 'customer' | 'agent';
  senderName: string;
  senderPhone: string;
  time: string;
  text: string;
  detectedOrderId?: string;
}
