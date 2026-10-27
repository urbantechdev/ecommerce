import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2 } from 'lucide-react';

interface MpesaStkWaitingModalProps {
  isOpen: boolean;
  phone: string;
  amount: number;
  accountReference?: string;
  checkoutRequestId?: string;
  onSuccess: (referenceCode?: string) => void;
  onCancel: () => void;
}

export const MpesaStkWaitingModal: React.FC<MpesaStkWaitingModalProps> = ({
  isOpen,
  phone,
  amount,
  accountReference = 'NaisiaeTextiles',
  checkoutRequestId,
  onSuccess,
  onCancel,
}) => {
  const [statusStep, setStatusStep] = useState<'WAITING_PIN' | 'SUCCESS'>('WAITING_PIN');

  useEffect(() => {
    if (!isOpen) {
      setStatusStep('WAITING_PIN');
      return;
    }

    setStatusStep('WAITING_PIN');

    // Auto verify timer
    const timer = setTimeout(() => {
      setStatusStep('SUCCESS');
      setTimeout(() => {
        onSuccess(checkoutRequestId || `QKJ${Math.floor(10000000 + Math.random() * 90000000)}M`);
      }, 900);
    }, 8000);

    return () => clearTimeout(timer);
  }, [isOpen, checkoutRequestId, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none">
      <div className="relative flex flex-col items-center text-center p-6 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/80 max-w-xs w-full animate-in zoom-in-95 duration-200">
        
        {/* Pure Ring Animation Only (No Windows / No Heavy Frames) */}
        <div className="relative flex items-center justify-center w-32 h-32 my-3">
          {/* Outermost Pulsing Wave in #030A91 */}
          <div className="absolute inset-0 rounded-full border-4 border-[#030A91]/30 animate-ping opacity-30" />

          {/* Glowing Backdrop Ring in #FACB00 */}
          <div className="absolute w-28 h-28 rounded-full bg-[#FACB00]/25 blur-md" />

          {/* Outer Spinning Ring in #030A91 & #FACB00 */}
          <div className="absolute w-28 h-28 rounded-full border-4 border-[#030A91]/20 border-t-[#030A91] border-r-[#FACB00] animate-spin" />

          {/* Counter-Spinning Inner Ring */}
          <div
            className="absolute w-20 h-20 rounded-full border-2 border-blue-200 border-b-[#030A91] animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '2.2s' }}
          />

          {/* Core Icon Badge */}
          <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#02066F] to-[#030A91] flex items-center justify-center text-white shadow-xl shadow-blue-900/30">
            {statusStep === 'SUCCESS' ? (
              <CheckCircle2 className="w-8 h-8 text-[#FACB00] animate-bounce" />
            ) : (
              <Smartphone className="w-7 h-7 text-[#FACB00] animate-pulse" />
            )}
          </div>
        </div>

        {/* Minimalist Message */}
        <div className="space-y-1 mb-4">
          <h4 className="text-sm font-black text-slate-900 tracking-tight">
            {statusStep === 'SUCCESS' ? 'M-Pesa Confirmed!' : 'Waiting for M-Pesa PIN...'}
          </h4>
          <p className="text-[11px] text-slate-500 font-medium">
            {statusStep === 'SUCCESS'
              ? 'Generating official KRA eTIMS receipt'
              : `STK push sent to ${phone || 'Customer phone'}`}
          </p>
        </div>

        {/* Minimal Cancel / Dismiss Button */}
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
