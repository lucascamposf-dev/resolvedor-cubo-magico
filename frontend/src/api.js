// Em producao, defina VITE_API_URL no build do frontend apontando para a
// URL publica do backend (ex: https://seu-backend.up.railway.app).
// Em dev, o vite.config.js ja faz proxy de /api para o backend local.
const API_BASE = import.meta.env.VITE_API_URL || '';

export async function analyzeFace(imageDataUrl) {
  const res = await fetch(`${API_BASE}/api/analyze-face`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao analisar a foto.');
  return data.colors;
}

export async function solveCubeRequest(faces) {
  const res = await fetch(`${API_BASE}/api/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ faces }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao resolver o cubo.');
  return data;
}
