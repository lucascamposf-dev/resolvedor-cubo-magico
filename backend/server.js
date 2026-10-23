require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { readFaceColors } = require('./services/groqVision');
const { solveCube } = require('./services/cubeSolver');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
// Imagens em base64 podem ser grandes, entao aumentamos o limite do body.
app.use(express.json({ limit: '15mb' }));

// Protege as rotas que custam dinheiro/CPU: limita por IP.
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // 20 fotos analisadas por IP a cada 15 min (6 faces = uma sessao completa cabe folgado)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas fotos analisadas em pouco tempo. Aguarde alguns minutos e tente de novo.' },
});

const solveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de resolucao em pouco tempo. Aguarde alguns minutos e tente de novo.' },
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Rubik Solver backend rodando.' });
});

// Recebe a foto de UMA face e devolve as 9 cores lidas pela IA (Groq Vision)
app.post('/api/analyze-face', analyzeLimiter, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Envie "image" como data URL base64 (ex: data:image/jpeg;base64,...).' });
    }
    const colors = await readFaceColors(image);
    res.json({ colors });
  } catch (err) {
    console.error('Erro em /api/analyze-face:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Recebe as 6 faces (cada uma com 9 cores) e devolve a sequencia de movimentos
app.post('/api/solve', solveLimiter, async (req, res) => {
  try {
    const { faces } = req.body;
    if (!faces || typeof faces !== 'object') {
      return res.status(400).json({ error: 'Envie "faces" com as 6 faces (U, R, F, D, L, B).' });
    }
    const result = await solveCube(faces);
    res.json(result);
  } catch (err) {
    console.error('Erro em /api/solve:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Rubik Solver backend rodando em http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn('AVISO: GROQ_API_KEY nao esta definida. Copie .env.example para .env e preencha sua chave.');
  }
});
