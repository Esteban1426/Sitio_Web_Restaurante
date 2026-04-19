import { useEffect, useMemo, useState } from 'react';
import { X, Image as ImageIcon, Grid3X3, Link as LinkIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getProducts } from '../lib/api';
import type { Product } from '../lib/localDB';

type ImageSource = 'productos' | 'url';
type PuzzleMode = 'single' | 'combined';
type FetchState = 'idle' | 'loading' | 'success' | 'error';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadImageToDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 900;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas no disponible'));

      // "cover" centrado
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const scale = Math.max(size / iw, size / ih);
      const w = iw * scale;
      const h = ih * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen (posible bloqueo CORS)'));
    img.src = src;
  });
}

async function composeImagesToDataUrl(urls: string[]): Promise<string> {
  const size = 900;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  const imgs = await Promise.all(urls.map(u => loadImageToDataUrl(u).then(d => d)));
  // Ya vienen como dataURL 900x900; los componemos en una cuadrícula
  const n = imgs.length;
  const grid = Math.ceil(Math.sqrt(n));
  const cell = Math.floor(size / grid);
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, size, size);

  await Promise.all(
    imgs.map((dataUrl, idx) => {
      const col = idx % grid;
      const row = Math.floor(idx / grid);
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, col * cell, row * cell, cell, cell);
          resolve();
        };
        img.onerror = () => reject(new Error('No se pudo componer la imagen'));
        img.src = dataUrl;
      });
    })
  );

  return canvas.toDataURL('image/jpeg', 0.92);
}

function Tile({
  img,
  grid,
  pieceIndex,
  posIndex,
  selected,
  onClick,
}: {
  img: string;
  grid: number;
  pieceIndex: number;
  posIndex: number;
  selected: boolean;
  onClick: () => void;
}) {
  const row = Math.floor(pieceIndex / grid);
  const col = pieceIndex % grid;
  const sizePct = `${grid * 100}%`;
  const xPct = (col / (grid - 1)) * 100;
  const yPct = (row / (grid - 1)) * 100;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square rounded-xl overflow-hidden border transition-all ${
        selected ? 'border-[#C9A84C] ring-2 ring-[#C9A84C]/20' : 'border-white/10 hover:border-white/20'
      }`}
      aria-label={`Pieza ${posIndex + 1}`}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${img})`,
          backgroundSize: sizePct,
          backgroundPosition: `${xPct}% ${yPct}%`,
        }}
      />
      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
    </button>
  );
}

export function PuzzleWaitingModal({
  open,
  fetchState,
  fetchLabel,
  onClose,
}: {
  open: boolean;
  fetchState: FetchState;
  fetchLabel: string;
  onClose: () => void;
}) {
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

  useEffect(() => {
    if (!open) return;
    setImgError('');
    setSelectedPos(null);
    // cargar productos una vez
    if (products.length > 0 || productsLoading) return;
    setProductsLoading(true);
    getProducts()
      .then(d => setProducts(d.products ?? []))
      .catch(e => console.error('Error cargando productos para puzzle:', e))
      .finally(() => setProductsLoading(false));
  }, [open, products.length, productsLoading]);

  useEffect(() => {
    if (!open) return;
    // reset puzzle cuando cambie grid
    setPieces([]);
    setMoves(0);
    setSelectedPos(null);
  }, [open, grid]);

  const startPuzzle = async () => {
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

      setImg(base);
      const total = grid * grid;
      const shuffled = shuffle(Array.from({ length: total }, (_, i) => i));
      // evitar "ya resuelto"
      const safe = shuffled.every((v, i) => v === i) ? shuffle(shuffled) : shuffled;
      setPieces(safe);
      setMoves(0);
      setSelectedPos(null);
    } catch (e: any) {
      setImgError(e?.message ?? 'No se pudo iniciar el puzzle');
      setImg('');
      setPieces([]);
    } finally {
      setPreparing(false);
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
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="w-full max-w-5xl bg-[#0F0F0F] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center">
                    <Grid3X3 className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold leading-tight">
                      Puzzle mientras buscamos tu pedido
                    </h3>
                    <p className="text-white/40 text-xs truncate">{fetchLabel}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {fetchState === 'loading' ? (
                  <div className="flex items-center gap-2 text-white/50 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Buscando…
                  </div>
                ) : fetchState === 'success' ? (
                  <div className="flex items-center gap-2 text-green-400 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    Pedido listo
                  </div>
                ) : fetchState === 'error' ? (
                  <div className="text-red-400 text-xs">No encontrado</div>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 flex items-center justify-center transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              {/* Config */}
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
                        Nota: algunas URLs bloquean el uso en canvas por CORS.
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
                                const disabled =
                                  !checked && selectedProductIds.length >= 6;
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
                      <div className="text-white/30 text-[11px] mt-2">
                        Seleccionados: {selectedProductIds.length}
                      </div>
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
                      className="flex-1 py-3 rounded-2xl bg-[#C9A84C] text-[#0A0A0A] font-bold text-sm hover:bg-[#D4AF37] transition-colors disabled:opacity-60"
                    >
                      {preparing ? 'Preparando…' : pieces.length ? 'Reiniciar imagen' : 'Iniciar puzzle'}
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

              {/* Game */}
              <div className="lg:col-span-3 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white/60 text-sm">
                    Movimientos: <span className="text-white font-semibold">{moves}</span>
                  </div>
                  {isSolved && (
                    <div className="text-green-400 text-sm font-semibold">
                      ¡Resuelto!
                    </div>
                  )}
                </div>

                {!img || !pieces.length ? (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-10 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 mx-auto flex items-center justify-center mb-4">
                      <Grid3X3 className="w-6 h-6 text-[#C9A84C]" />
                    </div>
                    <p className="text-white font-semibold">Configura tu puzzle</p>
                    <p className="text-white/35 text-sm mt-1">
                      Inicia el juego y ordena las piezas mientras cargamos el estado.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${grid}, minmax(0, 1fr))` }}>
                    {pieces.map((pieceIndex, posIndex) => (
                      <Tile
                        key={posIndex}
                        img={img}
                        grid={grid}
                        pieceIndex={pieceIndex}
                        posIndex={posIndex}
                        selected={selectedPos === posIndex}
                        onClick={() => handleTileClick(posIndex)}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-4 text-white/30 text-xs">
                  Tip: toca una pieza y luego otra para intercambiarlas.
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

