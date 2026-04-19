import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Grid3X3, Link as LinkIcon, Loader2 } from 'lucide-react';
import { getProducts } from '../lib/api';
import type { Product } from '../lib/localDB';
import { composeImagesToDataUrl, loadImageToDataUrl, shuffle } from '../lib/puzzleImage';

type ImageSource = 'productos' | 'url';
type PuzzleMode = 'single' | 'combined';

function escapeCssUrlArg(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Misma etiqueta (`button`) en reposo y en juego para que React no alterne div↔button
 * con la misma `key` (caso típico de insertBefore / árbol inconsistente).
 */
function PuzzleSlot({
  active,
  grid,
  pieceIndex,
  posIndex,
  selected,
  onClick,
}: {
  active: boolean;
  grid: number;
  pieceIndex: number;
  posIndex: number;
  selected: boolean;
  onClick: () => void;
}) {
  const row = Math.floor(pieceIndex / grid);
  const col = pieceIndex % grid;
  const sizePct = `${grid * 100}%`;
  const xPct = grid <= 1 ? 0 : (col / (grid - 1)) * 100;
  const yPct = grid <= 1 ? 0 : (row / (grid - 1)) * 100;

  return (
    <button
      type="button"
      disabled={!active}
      onClick={active ? onClick : undefined}
      tabIndex={active ? 0 : -1}
      aria-hidden={!active}
      aria-label={active ? `Pieza ${posIndex + 1}` : undefined}
      className={`relative aspect-square rounded-xl overflow-hidden border transition-all text-left ${
        !active
          ? 'border-white/5 bg-white/[0.02] cursor-default opacity-60'
          : selected
            ? 'border-[#C9A84C] ring-2 ring-[#C9A84C]/20'
            : 'border-white/10 hover:border-white/20'
      }`}
    >
      {active ? (
        <>
          <div
            className="absolute inset-0 bg-[#141414]"
            style={{
              backgroundImage: 'var(--puzzle-bg, none)',
              backgroundSize: sizePct,
              backgroundPosition: `${xPct}% ${yPct}%`,
            }}
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors pointer-events-none" />
        </>
      ) : null}
    </button>
  );
}

export function PuzzleGame() {
  const loadGeneration = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [source, setSource] = useState<ImageSource>('productos');
  const [mode, setMode] = useState<PuzzleMode>('single');
  const [grid, setGrid] = useState(3);

  const [urlInput, setUrlInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [img, setImg] = useState<string>('');
  const [imgError, setImgError] = useState<string>('');
  const [preparing, setPreparing] = useState(false);

  const [pieces, setPieces] = useState<number[]>([]);
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);

  const canStart = useMemo(() => {
    if (source === 'url') return Boolean(urlInput.trim());
    if (mode === 'single') return Boolean(selectedProductId);
    return selectedProductIds.length >= 2;
  }, [mode, selectedProductId, selectedProductIds.length, source, urlInput]);

  const isSolved = useMemo(() => {
    if (!pieces.length) return false;
    return pieces.every((p, idx) => p === idx);
  }, [pieces]);

  const slotCount = grid * grid;
  const boardActive = Boolean(img) && pieces.length === slotCount;

  /** Una sola asignación del data URL (evita 9× estilos enormes y reduce presión en el commit de React). */
  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    if (boardActive && img) {
      el.style.setProperty('--puzzle-bg', `url("${escapeCssUrlArg(img)}")`);
    } else {
      el.style.removeProperty('--puzzle-bg');
    }
  }, [boardActive, img]);

  useEffect(() => {
    if (products.length > 0 || productsLoading) return;
    setProductsLoading(true);
    getProducts()
      .then(d => setProducts(d.products ?? []))
      .catch(e => console.error('Error cargando productos para puzzle:', e))
      .finally(() => setProductsLoading(false));
  }, [products.length, productsLoading]);

  useEffect(() => {
    loadGeneration.current += 1;
    setPieces([]);
    setMoves(0);
    setSelectedPos(null);
    setPreparing(false);
  }, [grid]);

  const startPuzzle = async () => {
    loadGeneration.current += 1;
    const gen = loadGeneration.current;
    const gridSnapshot = grid;

    setImgError('');
    setPreparing(true);
    try {
      let base: string;
      if (source === 'url') {
        base = await loadImageToDataUrl(urlInput.trim());
      } else if (mode === 'single') {
        const p = products.find(x => x.id === selectedProductId);
        if (!p?.imageUrl) throw new Error('Selecciona un producto con imagen');
        base = await loadImageToDataUrl(p.imageUrl);
      } else {
        const urls = selectedProductIds
          .map(id => products.find(p => p.id === id)?.imageUrl)
          .filter(Boolean) as string[];
        if (urls.length < 2) throw new Error('Selecciona al menos 2 imágenes');
        base = await composeImagesToDataUrl(urls);
      }

      if (gen !== loadGeneration.current) return;

      setImg(base);
      const total = gridSnapshot * gridSnapshot;
      const shuffled = shuffle(Array.from({ length: total }, (_, i) => i));
      const safe = shuffled.every((v, i) => v === i) ? shuffle(shuffled) : shuffled;
      setPieces(safe);
      setMoves(0);
      setSelectedPos(null);
    } catch (e: unknown) {
      if (gen !== loadGeneration.current) return;
      const msg = e instanceof Error ? e.message : 'No se pudo iniciar el puzzle';
      setImgError(msg);
      setImg('');
      setPieces([]);
    } finally {
      if (gen === loadGeneration.current) {
        setPreparing(false);
      }
    }
  };

  const handleTileClick = (pos: number) => {
    if (!pieces.length) return;
    if (selectedPos === null) {
      setSelectedPos(pos);
      return;
    }
    if (selectedPos === pos) {
      setSelectedPos(null);
      return;
    }
    setPieces(prev => {
      const next = [...prev];
      [next[selectedPos], next[pos]] = [next[pos], next[selectedPos]];
      return next;
    });
    setMoves(m => m + 1);
    setSelectedPos(null);
  };

  const reset = () => {
    if (!pieces.length) return;
    const total = grid * grid;
    const shuffled = shuffle(Array.from({ length: total }, (_, i) => i));
    const safe = shuffled.every((v, i) => v === i) ? shuffle(shuffled) : shuffled;
    setPieces(safe);
    setMoves(0);
    setSelectedPos(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-[#0F0F0F] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        <div className="lg:col-span-2 p-6 border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="space-y-5">
            <div>
              <div className="text-white/60 text-xs mb-2">Fuente de imagen</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSource('productos')}
                  className={`px-4 py-3 rounded-2xl border text-sm font-medium transition-all flex items-center gap-2 justify-center ${
                    source === 'productos'
                      ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                      : 'border-white/10 text-white/50 hover:border-white/20'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" /> Productos
                </button>
                <button
                  type="button"
                  onClick={() => setSource('url')}
                  className={`px-4 py-3 rounded-2xl border text-sm font-medium transition-all flex items-center gap-2 justify-center ${
                    source === 'url'
                      ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                      : 'border-white/10 text-white/50 hover:border-white/20'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" /> URL
                </button>
              </div>
            </div>

            <div>
              <div className="text-white/60 text-xs mb-2">Modo</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${
                    mode === 'single'
                      ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                      : 'border-white/10 text-white/50 hover:border-white/20'
                  }`}
                >
                  Una imagen
                </button>
                <button
                  type="button"
                  onClick={() => setMode('combined')}
                  className={`px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${
                    mode === 'combined'
                      ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                      : 'border-white/10 text-white/50 hover:border-white/20'
                  }`}
                  disabled={source === 'url'}
                  title={source === 'url' ? 'El modo combinado usa imágenes de productos' : undefined}
                >
                  Combinado
                </button>
              </div>
              {source === 'url' && mode === 'combined' && (
                <p className="text-white/35 text-xs mt-2">
                  El modo combinado solo está disponible con imágenes de productos.
                </p>
              )}
            </div>

            <div>
              <div className="text-white/60 text-xs mb-2">Dificultad</div>
              <div className="grid grid-cols-2 gap-2">
                {[3, 4].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setGrid(n)}
                    className={`px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${
                      grid === n
                        ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                        : 'border-white/10 text-white/50 hover:border-white/20'
                    }`}
                  >
                    {n}×{n}
                  </button>
                ))}
              </div>
            </div>

            {source === 'url' ? (
              <div>
                <label className="block text-white/60 text-xs mb-2">URL de imagen</label>
                <input
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#141414] border border-white/10 text-white placeholder-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C]/50"
                />
                <p className="text-white/30 text-[11px] mt-2">
                  Las imágenes externas pasan por un proxy cuando hace falta evitar bloqueos CORS en el lienzo.
                </p>
              </div>
            ) : mode === 'single' ? (
              <div>
                <label className="block text-white/60 text-xs mb-2">Imagen de producto</label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full bg-[#141414] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C]/50"
                >
                  <option value="" className="bg-[#141414]">
                    {productsLoading ? 'Cargando…' : 'Selecciona un producto'}
                  </option>
                  {products
                    .filter(p => Boolean(p.imageUrl))
                    .slice(0, 100)
                    .map(p => (
                      <option key={p.id} value={p.id} className="bg-[#141414]">
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <div className="text-white/60 text-xs mb-2">Selecciona 2–6 productos</div>
                <div className="max-h-56 overflow-auto rounded-2xl border border-white/10 bg-[#141414]">
                  {productsLoading ? (
                    <div className="p-4 text-white/40 text-sm">Cargando productos…</div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {products
                        .filter(p => Boolean(p.imageUrl))
                        .slice(0, 120)
                        .map(p => {
                          const checked = selectedProductIds.includes(p.id);
                          const disabled = !checked && selectedProductIds.length >= 6;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                setSelectedProductIds(prev => {
                                  if (prev.includes(p.id)) return prev.filter(x => x !== p.id);
                                  if (prev.length >= 6) return prev;
                                  return [...prev, p.id];
                                })
                              }
                              disabled={disabled}
                              className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                                checked
                                  ? 'bg-[#C9A84C]/10 text-[#C9A84C]'
                                  : 'text-white/60 hover:bg-white/5'
                              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <span className="truncate">{p.name}</span>
                              <span className={`text-xs ${checked ? 'text-[#C9A84C]' : 'text-white/30'}`}>
                                {checked ? 'Seleccionado' : '—'}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
                <div className="text-white/30 text-[11px] mt-2">Seleccionados: {selectedProductIds.length}</div>
              </div>
            )}

            {imgError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-300 text-sm">
                {imgError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={startPuzzle}
                disabled={!canStart || preparing}
                className="flex-1 py-3 rounded-2xl bg-[#C9A84C] text-[#0A0A0A] font-bold text-sm hover:bg-[#D4AF37] transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                <span
                  className={`inline-flex shrink-0 ${preparing ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}
                  aria-hidden={!preparing}
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                </span>
                <span>{preparing ? 'Preparando…' : pieces.length ? 'Reiniciar imagen' : 'Iniciar puzzle'}</span>
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={!pieces.length}
                className="px-4 py-3 rounded-2xl border border-white/10 text-white/60 text-sm hover:bg-white/5 disabled:opacity-50"
              >
                Mezclar
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 p-6">
          <div className="flex items-center justify-between mb-4 min-h-[1.5rem]">
            <div className="text-white/60 text-sm">
              Movimientos: <span className="text-white font-semibold">{moves}</span>
            </div>
            <div
              className={`text-sm font-semibold transition-opacity ${isSolved ? 'text-green-400 opacity-100' : 'text-transparent opacity-0 select-none pointer-events-none'}`}
              aria-hidden={!isSolved}
            >
              ¡Resuelto!
            </div>
          </div>

          <div className="relative min-h-[280px] w-full">
            <div
              ref={boardRef}
              className={`grid gap-2 w-full transition-opacity ${boardActive ? 'opacity-100' : 'opacity-40'}`}
              style={{ gridTemplateColumns: `repeat(${grid}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: slotCount }, (_, i) => (
                <PuzzleSlot
                  key={`slot-${grid}-${i}`}
                  active={boardActive}
                  grid={grid}
                  pieceIndex={boardActive ? pieces[i]! : 0}
                  posIndex={i}
                  selected={boardActive && selectedPos === i}
                  onClick={() => handleTileClick(i)}
                />
              ))}
            </div>

            {!boardActive && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-[2px] p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mb-4">
                  <Grid3X3 className="w-6 h-6 text-[#C9A84C]" />
                </div>
                <p className="text-white font-semibold">Configura tu puzzle</p>
                <p className="text-white/35 text-sm mt-1">Elige imagen y dificultad, luego inicia el juego.</p>
              </div>
            )}
          </div>

          <div className="mt-4 text-white/30 text-xs">Tip: toca una pieza y luego otra para intercambiarlas.</div>
        </div>
      </div>
    </div>
  );
}
