const REFERENCE_HUES = [
  { name: 'red', hue: 0 },
  { name: 'orange', hue: 30 },
  { name: 'yellow', hue: 55 },
  { name: 'green', hue: 130 },
  { name: 'blue', hue: 215 },
];

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function classifyHsv({ h, s, v }) {
  if (s < 0.22 && v > 0.6) return 'white';
  let best = REFERENCE_HUES[0];
  let bestDist = 360;
  for (const ref of REFERENCE_HUES) {
    const dist = Math.min(Math.abs(h - ref.hue), 360 - Math.abs(h - ref.hue));
    if (dist < bestDist) { bestDist = dist; best = ref; }
  }
  return best.name;
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function classifyFaceLocally(imageDataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 90;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.width, img.height) * 0.8;
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, 90, 90);

        const colors = [];
        const cell = 30;
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const { data } = ctx.getImageData(col * cell + 8, row * cell + 8, 14, 14);
            const rs = [], gs = [], bs = [];
            for (let i = 0; i < data.length; i += 4) {
              rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
            }
            // Descarta pixels de brilho especular (reflexo forte) antes de
            // calcular a cor da célula: eles puxam a leitura pra "branco"
            // mesmo em adesivos coloridos. Mantém a amostra toda se sobrar
            // pouca coisa depois do filtro (evita zerar a célula).
            const all = rs.map((r, i) => ({ r, g: gs[i], b: bs[i] }));
            const filtered = all.filter(({ r, g, b }) => Math.max(r, g, b) < 248);
            const pool = filtered.length >= all.length * 0.3 ? filtered : all;

            const r = median(pool.map((p) => p.r));
            const g = median(pool.map((p) => p.g));
            const b = median(pool.map((p) => p.b));
            colors.push(classifyHsv(rgbToHsv(r, g, b)));
          }
        }
        resolve(colors);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
}