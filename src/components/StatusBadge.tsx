import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'sale' | 'invoice' | 'stock' | 'kra' | 'transfer' | 'po';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type }) => {
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  const s = status.toUpperCase();

  if (s === 'COMPLETED' || s === 'PAID' || s === 'RECEIVED' || s === 'FISCALIZED' || s === 'ACTIVE') {
    colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
  } else if (s === 'PARTIALLY_PAID' || s === 'PARTIALLY_RECEIVED' || s === 'PENDING' || s === 'DISPATCHED' || s === 'ORDERED' || s === 'ISSUED') {
    colorStyles = 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
  } else if (s === 'VOIDED' || s === 'CANCELLED' || s === 'REFUNDED' || s === 'FAILED' || s === 'OVERDUE' || s === 'INACTIVE' || s === 'CRITICAL') {
    colorStyles = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
  } else if (s === 'DRAFT' || s === 'SENT') {
    colorStyles = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
  } else if (s === 'ACCEPTED' || s === 'CONVERTED') {
    colorStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border tracking-tight ${colorStyles}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {status.replace(/_/g, ' ')}
    </span>
  );
};
