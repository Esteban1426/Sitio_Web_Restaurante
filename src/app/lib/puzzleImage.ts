/**
 * Carga imágenes para el puzzle (canvas) con intento directo + proxy
 * para evitar lienzo “tainted” por CORS.
 */

function trimSlash(s: string) {
  return s.replace(/\/+$/, '');
}

/** URL del proxy (mismo origen en dev, o función / URL personalizada en prod). */
export function getPuzzleImageProxyUrl(target: string): string | null {
  const custom = import.meta.env.VITE_PUZZLE_IMAGE_PROXY_BASE?.trim();
  if (custom) {
    return `${trimSlash(custom)}?url=${encodeURIComponent(target)}`;
  }
  if (import.meta.env.DEV) {
    return `/puzzle-image-proxy?url=${encodeURIComponent(target)}`;
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (supabaseUrl) {
    return `${trimSlash(supabaseUrl)}/functions/v1/server/make-server-54897cbc/image-proxy?url=${encodeURIComponent(target)}`;
  }
  return null;
}

function drawCoverToDataUrl(img: HTMLImageElement, size = 900): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(size / iw, size / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  ctx.drawImage(img, x, y, w, h);
  return canvas.toDataURL('image/jpeg', 0.92);
}

function loadHtmlImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    image.src = src;
  });
}

async function fetchImageBlobThroughProxy(target: string): Promise<Blob> {
  const proxyUrl = getPuzzleImageProxyUrl(target);
  if (!proxyUrl) {
    throw new Error(
      'No hay proxy de imágenes. Define VITE_PUZZLE_IMAGE_PROXY_BASE o VITE_SUPABASE_URL para producción.'
    );
  }

  const headers: Record<string, string> = {};
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (anon && proxyUrl.includes('supabase.co')) {
    headers.Authorization = `Bearer ${anon}`;
  }

  const res = await fetch(proxyUrl, { headers });
  if (!res.ok) {
    throw new Error(`El proxy respondió ${res.status}`);
  }
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.startsWith('image/')) {
    throw new Error('El proxy no devolvió una imagen');
  }
  return res.blob();
}

async function loadAndRasterize(url: string, crossOrigin: boolean): Promise<string> {
  const img = await loadHtmlImage(url, crossOrigin);
  try {
    return drawCoverToDataUrl(img);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'SecurityError') {
      throw new Error('__TAINTED__');
    }
    throw e;
  }
}

/**
 * Carga una imagen y la devuelve como data URL JPEG 900×900 (recorte tipo cover).
 */
export async function loadImageToDataUrl(src: string): Promise<string> {
  const trimmed = src.trim();
  if (!trimmed) throw new Error('URL vacía');

  try {
    return await loadAndRasterize(trimmed, true);
  } catch {
    // Carga directa fallida o canvas contaminado (CORS) → proxy
  }

  try {
    const blob = await fetchImageBlobThroughProxy(trimmed);
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await loadAndRasterize(objectUrl, false);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    throw new Error(
      'No se pudo cargar la imagen. Revisa la URL, CORS o que el proxy (dev / Supabase) esté disponible.'
    );
  }
}

export async function composeImagesToDataUrl(urls: string[]): Promise<string> {
  const size = 900;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  const dataUrls = await Promise.all(urls.map(u => loadImageToDataUrl(u)));
  const n = dataUrls.length;
  const grid = Math.ceil(Math.sqrt(n));
  const cell = Math.floor(size / grid);
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, size, size);

  await Promise.all(
    dataUrls.map((dataUrl, idx) => {
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

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
