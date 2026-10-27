import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[Naisiae Textiles] Unhandled application error caught by boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#030A91]">
                Something went wrong
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                An unexpected hiccup occurred while rendering this view. Our engineering team has been notified.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#030A91] hover:bg-[#02066F] text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-all active:scale-95"
              >
                <Home className="w-4 h-4" />
                Go to Catalog
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Need help? Call or WhatsApp</span>
              <a
                href="https://wa.me/254792021496"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#030A91] hover:underline"
              >
                +254 792 021 496
              </a>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="mt-4 text-left text-xs bg-slate-100 p-3 rounded-xl overflow-auto max-h-40 text-slate-700">
                <summary className="cursor-pointer font-semibold text-slate-800">Technical Details</summary>
                <p className="mt-2 text-red-600 font-mono break-all">{this.state.error.toString()}</p>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
