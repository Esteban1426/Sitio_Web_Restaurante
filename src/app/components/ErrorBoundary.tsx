import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type Props = {
  children: ReactNode;
  /** Optional title for the fallback card */
  title?: string;
};

type State = {
  error: Error | null;
};

/**
 * Captura errores de renderizado en el subárbol y evita que tumbe toda la app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const title = this.props.title ?? 'Algo salió mal';
      return (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/25 bg-red-500/10 p-8 text-center max-w-lg mx-auto"
        >
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" aria-hidden />
          <h2 className="text-white font-semibold text-lg mb-2">{title}</h2>
          <p className="text-red-200/90 text-sm mb-6 break-words">
            {this.state.error.message || 'Error inesperado'}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-6 py-3 rounded-xl bg-[#C9A84C] text-[#0A0A0A] font-bold text-sm hover:bg-[#D4AF37] transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
