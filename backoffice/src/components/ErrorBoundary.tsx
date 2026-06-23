import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle size={36} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[rgb(var(--color-text))] mb-2">
              خطایی رخ داد
            </h2>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] max-w-md">
              متأسفانه یک خطای غیرمنتظره رخ داده است. لطفاً صفحه را رفرش کنید یا با پشتیبانی تماس بگیرید.
            </p>
            {this.state.error && (
              <p className="text-xs text-red-400 mt-3 font-mono bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0088cc] text-white rounded-xl hover:bg-[#0077bb] transition-colors font-medium"
          >
            <RefreshCw size={16} />
            رفرش صفحه
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
