import React from 'react';
import { X, Download, FileText } from 'lucide-react';

interface StatementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  statementText: string;
  onDownload: () => void;
}

export const StatementPreviewModal: React.FC<StatementPreviewModalProps> = ({
  isOpen,
  onClose,
  statementText,
  onDownload,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 bg-[#030A91] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#FACB00]" />
            <h3 className="font-black text-sm uppercase tracking-wider">Statement Preview</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto bg-slate-50 font-mono text-[10px] whitespace-pre text-slate-800 leading-relaxed">
          {statementText}
        </div>

        <div className="p-4 border-t border-slate-200 flex space-x-2">
          <button
            onClick={onDownload}
            className="flex-1 py-2.5 bg-[#030A91] hover:bg-blue-900 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4 text-[#FACB00]" />
            <span>Download File</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
