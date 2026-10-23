const Groq = require('groq-sdk');

const VALID_COLORS = ['white', 'yellow', 'red', 'orange', 'blue', 'green'];

let groqClient = null;
function getClient() {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error(
        'GROQ_API_KEY nao configurada. Copie backend/.env.example para backend/.env e preencha sua chave.'
      );
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

// Reexecuta `fn` em caso de erro transitorio (rate limit 429 ou erro 5xx do
// servidor da Groq), com backoff exponencial + jitter. Erros de validacao
// (400, chave invalida 401, etc.) NAO sao retentados, pois tentar de novo
// nao vai resolver.
async function withRetry(fn, { retries = 2, baseDelayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.response?.status;
      const retriable = status === 429 || (status >= 500 && status < 600) || !status;
      const isLastAttempt = attempt === retries;
      if (!retriable || isLastAttempt) throw err;
      const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 200);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

const SYSTEM_PROMPT = `Voce e um leitor de imagens especializado em identificar as 9 cores de uma
face de um cubo magico (Rubik's Cube) 3x3x3 a partir de uma foto.

Regras:
- As unicas cores possiveis sao: white, yellow, red, orange, blue, green.
- Leia a grade 3x3 na ordem: da esquerda para a direita, de cima para baixo
  (posicao 1 = canto superior esquerdo, posicao 9 = canto inferior direito).
- Ignore reflexos de luz, sombras e o fundo da imagem; foque apenas nos 9 adesivos.
- Se a foto estiver ruim ou nao mostrar claramente uma face de cubo magico,
  ainda assim faca sua melhor estimativa para as 9 posicoes.
- Responda APENAS com um objeto JSON, em uma unica linha, sem markdown, sem
  crases, sem explicacao antes ou depois. Formato exato:
  {"colors": ["red","white","blue","green","red","white","orange","yellow","green"]}
- O array "colors" deve ter exatamente 9 itens, cada um sendo uma das 6 cores validas.`;

/**
 * Extrai o primeiro objeto JSON valido de um texto, mesmo que venha com
 * texto extra em volta ou dentro de blocos de codigo markdown.
 */
function extractJson(text) {
  // Camada extra de seguranca: se o modelo ainda assim mandar um bloco de
  // raciocinio (<think>...</think>), removemos antes de procurar o JSON.
  const withoutThinking = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Remove blocos de codigo markdown tipo ```json ... ``` ou ``` ... ```
  const withoutFences = withoutThinking.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Tenta parsear direto primeiro.
  try {
    return JSON.parse(withoutFences);
  } catch (_) {
    // segue para a extracao por regex abaixo
  }

  const match = withoutFences.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0]);
  }

  throw new Error('Nao foi possivel encontrar um JSON valido na resposta: ' + text);
}

/**
 * Envia uma imagem (data URL base64) para o modelo de visao da Groq e retorna
 * um array com as 9 cores lidas na face do cubo, na ordem esquerda->direita,
 * cima->baixo.
 * @param {string} imageDataUrl - ex: "data:image/jpeg;base64,AAAA..."
 * @returns {Promise<string[]>} array de 9 cores
 */
async function readFaceColors(imageDataUrl) {
  const client = getClient();
  const model = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';

  let completion;
  try {
    completion = await withRetry(() =>
      client.chat.completions.create({
        model,
        temperature: 0,
        max_completion_tokens: 400,
        reasoning_effort: 'none',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Leia as 9 cores desta face do cubo magico e responda apenas com o JSON pedido.',
              },
              {
                type: 'image_url',
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
      })
    );
  } catch (err) {
    // Erros da propria API da Groq (ex: modelo indisponivel, chave invalida,
    // validacao interna de formato) chegam aqui. Repassamos uma mensagem
    // mais clara pro usuario final.
    const detail = err?.error?.message || err?.message || String(err);
    throw new Error('Erro ao chamar a IA da Groq: ' + detail);
  }

  const raw = completion.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error('A Groq nao retornou conteudo para esta imagem.');
  }

  let parsed;
  try {
    parsed = extractJson(raw);
  } catch (err) {
    throw new Error('Resposta da Groq nao veio em JSON valido: ' + raw);
  }

  const colors = parsed.colors;
  if (!Array.isArray(colors) || colors.length !== 9) {
    throw new Error('A IA nao retornou 9 cores. Resposta: ' + JSON.stringify(parsed));
  }

  const normalized = colors.map((c) => String(c).trim().toLowerCase());
  const invalid = normalized.filter((c) => !VALID_COLORS.includes(c));
  if (invalid.length > 0) {
    throw new Error('Cores invalidas retornadas pela IA: ' + invalid.join(', '));
  }

  return normalized;
}

module.exports = { readFaceColors, VALID_COLORS };