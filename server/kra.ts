import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from './db.js';

export interface KraFiscalizationRequest {
  invoiceOrReceiptNumber: string;
  totalAmount: number;
  taxableAmount: number;
  taxAmount: number;
  zeroRatedAmount: number;
  customerPin?: string;
  customerName: string;
  itemsCount: number;
  branchCode: string;
}

export interface KraFiscalizationResult {
  status: 'FISCALIZED' | 'FAILED' | 'PENDING';
  cuInvoiceNumber: string;
  kraControlCode: string;
  kraQrCodeUrl: string;
  qrCodeDataUrl: string;
  timestamp: string;
  error?: string;
}

// In-memory retry queue for fiscalization items that failed or are pending
export const kraRetryQueue: {
  id: string;
  type: 'SALE' | 'INVOICE';
  referenceNumber: string;
  payload: KraFiscalizationRequest;
  attempts: number;
  lastAttemptAt: string;
  lastError: string;
}[] = [];

let cuSequenceCounter = 1000;

export async function fiscalizeTransaction(
  req: KraFiscalizationRequest,
  simulateOffline = false
): Promise<KraFiscalizationResult> {
  const settings = db.getData().settings;
  const traderPin = settings.kraPin || 'P051839281Z';
  const oscuSerial = settings.kraOscuSerial || 'NAISIAE-OSCU-001';

  cuSequenceCounter++;
  const cuInvoiceNumber = `0130${String(cuSequenceCounter).padStart(11, '0')}`;
  const timestamp = new Date().toISOString();

  // If simulation of network glitch or offline fiscalization
  if (simulateOffline) {
    const errorMsg = 'eTIMS Virtual Server Gateway Timeout (HTTP 504 Gateway Error). Transaction saved offline.';
    return {
      status: 'FAILED',
      cuInvoiceNumber: '',
      kraControlCode: '',
      kraQrCodeUrl: '',
      qrCodeDataUrl: '',
      timestamp,
      error: errorMsg,
    };
  }

  // Generate KRA Internal Cryptographic Signature / Control Code
  // Hash combining Trader PIN, CU Number, Amount, Tax, and Timestamp
  const signatureRaw = `${traderPin}|${cuInvoiceNumber}|${req.totalAmount}|${req.taxAmount}|${timestamp}`;
  const hash = crypto.createHash('sha256').update(signatureRaw).digest('hex').toUpperCase();
  const kraControlCode = `${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;

  // Official KRA verification portal URL pattern
  const formattedDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const kraQrCodeUrl = `https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm?actionCode=loadPage&invoiceNo=${cuInvoiceNumber}&traderPin=${traderPin}&invAmt=${req.totalAmount.toFixed(2)}&invDate=${formattedDate}`;

  // Generate SVG/DataURL QR code for direct printing on thermal and A4 receipts
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(kraQrCodeUrl, {
      margin: 1,
      width: 180,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Failed to generate KRA QR code image:', err);
  }

  return {
    status: 'FISCALIZED',
    cuInvoiceNumber,
    kraControlCode,
    kraQrCodeUrl,
    qrCodeDataUrl,
    timestamp,
  };
}

export function enqueueKraRetry(
  id: string,
  type: 'SALE' | 'INVOICE',
  referenceNumber: string,
  payload: KraFiscalizationRequest,
  error: string
) {
  const existing = kraRetryQueue.find((item) => item.id === id);
  if (existing) {
    existing.attempts++;
    existing.lastAttemptAt = new Date().toISOString();
    existing.lastError = error;
  } else {
    kraRetryQueue.push({
      id,
      type,
      referenceNumber,
      payload,
      attempts: 1,
      lastAttemptAt: new Date().toISOString(),
      lastError: error,
    });
  }
}
