import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Server,
  QrCode,
  Lock,
  ArrowRight
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const KraEtimsView: React.FC = () => {
  const { notify } = useNotification();
  const [kraStatus, setKraStatus] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const data = await api.getKraStatus();
      setKraStatus(data);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleProcessRetryQueue = async () => {
    setIsRetrying(true);
    try {
      const res = await api.retryQueuedKra();
      notify({
        type: 'SUCCESS',
        title: 'Retry Completed',
        message: `Processed ${res.processed.length} pending fiscalization items successfully.`,
      });
      fetchStatus();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Retry Failed', message: err.message });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Kenya Revenue Authority (KRA) eTIMS Compliance Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Electronic Tax Invoice Management System (eTIMS) OSCU server interface and transmission queue.
          </p>
        </div>

        <button
          onClick={handleProcessRetryQueue}
          disabled={isRetrying || !kraStatus?.retryQueueCount}
          className="inline-flex items-center px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>Process Offline Retry Queue ({kraStatus?.retryQueueCount || 0})</span>
        </button>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">OSCU Virtual Device</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-extrabold text-sm text-slate-900">
                {kraStatus?.oscuSerial || 'NAISIAE-OSCU-001'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Trader Code: {kraStatus?.traderCode || 'NAISIAE-OSCU-01'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Trader Tax PIN</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#030A91] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-mono font-black text-base text-slate-900">
              {kraStatus?.traderPin || 'P051839281Z'}
            </span>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              Verified VAT Registered Entity
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Fiscalized Invoices</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-black text-2xl text-slate-900">
              {kraStatus?.fiscalizedCount || 0}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              {kraStatus?.retryQueueCount ? (
                <span className="text-rose-600 font-bold">
                  {kraStatus.retryQueueCount} awaiting transmission
                </span>
              ) : (
                'All transmissions up to date'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Offline Transmission Queue Details */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900">
            Offline Fiscalization Queue & Retry Log
          </h3>
          <span className="text-xs text-slate-500">
            Safety Guarantee: Prevents data loss during internet outages
          </span>
        </div>

        {kraStatus?.retryQueue && kraStatus.retryQueue.length > 0 ? (
          <div className="space-y-3">
            {kraStatus.retryQueue.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900">
                      {item.referenceNumber}
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                      Pending Attempt #{item.attempts}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    Customer: <strong>{item.payload.customerName}</strong> • Total: KES{' '}
                    {item.payload.totalAmount.toLocaleString()} • Tax: KES{' '}
                    {item.payload.taxAmount.toLocaleString()}
                  </p>
                  <p className="text-rose-600 text-[11px] mt-0.5 font-mono">
                    Last Gateway Error: {item.lastError}
                  </p>
                </div>

                <button
                  onClick={handleProcessRetryQueue}
                  className="px-3 py-1.5 bg-[#030A91] text-white rounded-lg font-bold text-xs hover:bg-blue-900 shrink-0"
                >
                  Retry Now
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">The eTIMS retry queue is empty.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              All retail POS and institutional invoices have been transmitted and verified on the KRA ITax portal.
            </p>
          </div>
        )}
      </div>

      {/* Technical Integration Specs Notice */}
      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
          KRA Electronic Tax Invoice Specifications:
        </h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Architecture:</strong> Conforms to Kenya Revenue Authority eTIMS specifications for Electronic Tax Register / Online Software Control Unit (OSCU).
          </li>
          <li>
            <strong>Verification URL:</strong> Receipts include scannable 2D QR codes pointing to{' '}
            <code className="text-[#030A91] font-mono">https://itax.kra.go.ke/KRA-Portal/invoiceChk.htm</code>.
          </li>
          <li>
            <strong>Cryptographic Signature:</strong> Every fiscalized invoice is sealed with an immutable SHA-256 HMAC control code derived from the Trader PIN, CU sequential identifier, gross value, and fiscal timestamp.
          </li>
        </ul>
      </div>
    </div>
  );
};
