import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Grid3X3 } from 'lucide-react';
import { PuzzleGame } from '../components/PuzzleGame';
import { ErrorBoundary } from '../components/ErrorBoundary';

type LocationState = { returnTo?: string };

export function PuzzleGamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const returnTo = state?.returnTo && typeof state.returnTo === 'string' ? state.returnTo : '/track';

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Div nativo: motion/react aquí chocaba con reconciliación al actualizar el puzzle (insertBefore). */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="inline-flex items-center gap-2 text-white/50 hover:text-[#C9A84C] text-sm font-medium transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Order Tracking
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center">
              <Grid3X3 className="w-6 h-6 text-[#C9A84C]" />
            </div>
            <div>
              <div className="text-[#C9A84C] text-xs tracking-[0.3em] uppercase font-medium">Minijuego</div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Puzzle</h1>
              <p className="text-white/40 text-sm mt-1">Misma estética del sitio — juega con calma.</p>
            </div>
          </div>
        </div>

        <ErrorBoundary key={location.key ?? location.pathname} title="Error en el puzzle">
          <PuzzleGame />
        </ErrorBoundary>
      </div>
    </div>
  );
}
