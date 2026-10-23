# 🧩 Resolvedor de Cubo Magico (Foto → Solucao)

App que le o estado de um cubo magico 3x3x3 a partir de 6 fotos (uma por face),
usando IA de visao (Groq, gratis) para identificar as cores, e mostra o passo a
passo dos movimentos para resolver o cubo (algoritmo de Kociemba, via `cubejs`).

## Como funciona (arquitetura)

```
frontend (React + Vite)  --->  backend (Node/Express)
   |  tira foto de cada face         |  /api/analyze-face -> Groq Vision le as 9 cores
   |  mostra grade editavel          |  /api/solve         -> cubejs resolve e devolve os movimentos
   v                                 v
 usuario confere/corrige cores   nenhuma chave de API fica exposta no navegador
```

- **Leitura das cores**: cada foto e enviada para a Groq (modelo de visao), que devolve
  as 9 cores da face em JSON. O usuario pode corrigir manualmente qualquer erro antes
  de resolver (clicando no quadradinho da cor).
- **Montagem do estado do cubo**: os adesivos do CENTRO nunca se movem entre si, entao o
  backend usa a cor central de cada uma das 6 fotos para descobrir automaticamente qual
  foto corresponde a qual face (Cima/Baixo/Frente/Tras/Esquerda/Direita).
- **Solucao**: o backend usa a biblioteca `cubejs`, que implementa o algoritmo de duas
  fases de Herbert Kociemba, e devolve a sequencia de movimentos (ex: `R U F' L2 ...`)
  ja traduzida para descricoes em portugues.

## Pre-requisitos

- [Node.js](https://nodejs.org) 18 ou superior (18/20/22 LTS funcionam bem)
- Uma chave gratuita da Groq: crie em https://console.groq.com/keys (nao precisa cartao)

## Rodando localmente (Windows / VS Code)

Abra a pasta do projeto no VS Code, abra o terminal integrado (`Ctrl+\``) e siga os passos.
Voce vai precisar de **dois terminais abertos ao mesmo tempo**: um para o backend e outro
para o frontend.

### 1. Configurar e rodar o backend

```powershell
cd backend
npm install
copy .env.example .env
```

Abra o arquivo `backend\.env` e cole sua chave da Groq em `GROQ_API_KEY=`.

```powershell
npm run dev
```

Isso deixa o backend rodando em `http://localhost:3001`. Voce deve ver no terminal:
`Rubik Solver backend rodando em http://localhost:3001`.

### 2. Rodar o frontend (em um segundo terminal)

```powershell
cd frontend
npm install
npm run dev
```

Isso deixa o frontend rodando em `http://localhost:5173`. Abra esse endereco no navegador
(ou no navegador do seu celular, se estiver na mesma rede Wi-Fi, trocando `localhost` pelo
IP do seu computador — util porque a captura de foto funciona melhor no celular).

### 3. Usar o app

1. Fotografe as 6 faces do cubo, seguindo a instrucao de cada etapa na tela (a ordem/giro
   importa, para o app conseguir remontar o cubo corretamente).
2. Na tela de revisao, confira se as cores foram lidas certo. Se alguma estiver errada,
   clique no quadradinho ate ela virar a cor correta.
3. Clique em "Resolver cubo" e siga o passo a passo mostrado na tela.

## Subindo pro Git

```powershell
cd rubik-solver
git init
git add .
git commit -m "Base do app: leitura de cubo via Groq Vision + solver cubejs"
```

Crie um repositorio vazio no GitHub (sem README/gitignore, pra nao dar conflito) e depois:

```powershell
git remote add origin https://github.com/SEU_USUARIO/rubik-solver.git
git branch -M main
git push -u origin main
```

> O `.gitignore` ja exclui `node_modules/`, `.env` e `dist/` — sua chave da Groq nunca vai
> pro GitHub, mas confirme isso abrindo `git status` antes do commit (o erro mais comum e
> rodar `git add .` de dentro de uma subpasta e commitar so metade do projeto — sempre rode
> os comandos de git a partir da raiz `rubik-solver`).

## Publicando online no Railway (backend + frontend)

Este projeto e um monorepo com dois servicos (`backend` e `frontend`). No Railway, cada um
vira um **service** separado dentro do mesmo projeto, apontando pra mesma pasta do GitHub
mas com "Root Directory" diferente. Ja incluí um `railway.json` em cada pasta pra facilitar.

### 1. Backend

1. No Railway: **New Project → Deploy from GitHub repo** → selecione `rubik-solver`.
2. No service criado, va em **Settings → Root Directory** e defina `backend`.
3. Em **Variables**, adicione:
   - `GROQ_API_KEY` = sua chave da Groq
   - `GROQ_VISION_MODEL` = `qwen/qwen3.6-27b` (confira o modelo atual em
     https://console.groq.com/docs/vision se der erro de "modelo nao encontrado")
   - `FRONTEND_ORIGIN` = deixe em branco por enquanto (volta aqui no passo 3 abaixo)
4. Deploy. Em **Settings → Networking**, gere um dominio publico. Copie essa URL
   (ex: `https://rubik-backend-production.up.railway.app`).

### 2. Frontend

1. No mesmo projeto Railway: **+ New → GitHub Repo**, selecione o mesmo repositorio de novo
   (cria um segundo servico).
2. Em **Settings → Root Directory**, defina `frontend`.
3. Em **Variables**, adicione `VITE_API_URL` = a URL do backend copiada acima.
   (Importante: variavel `VITE_*` precisa existir **antes do build**, porque o Vite
   "grava" ela dentro do JS na hora de gerar o `dist/`. Se voce mudar essa variavel depois,
   precisa fazer um redeploy pra ela ter efeito.)
4. Deploy. Gere o dominio publico em **Settings → Networking**
   (ex: `https://rubik-frontend-production.up.railway.app`).

### 3. Fechar o ciclo do CORS

Volte no service do **backend** → **Variables** → atualize `FRONTEND_ORIGIN` com a URL
publica do frontend que voce acabou de gerar, e faça o redeploy do backend. Isso evita que
qualquer site na internet chame sua API — so o seu frontend publicado tem acesso liberado.

Pronto: abra a URL do frontend no celular e testa o fluxo completo de foto → solucao.

> Alternativa: se preferir, o frontend tambem pode ir pro Vercel/Netlify (mais rapido pra
> sites estaticos) em vez de virar um segundo servico no Railway — o passo a passo e o
> mesmo: definir `VITE_API_URL` como variavel de ambiente do build e apontar o
> `FRONTEND_ORIGIN` do backend pra URL gerada.

## Sobre o modelo de IA da Groq usado

O app usa um modelo de visao da Groq (multimodal, le imagens) para identificar as cores
de cada face. No momento em que este projeto foi montado, o modelo documentado pela Groq
para visao era `qwen/qwen3.6-27b`. Modelos da Groq mudam de tempos em tempos (sao
descontinuados/atualizados) — se a leitura de fotos comecar a falhar com erro de "modelo
nao encontrado", troque o valor de `GROQ_VISION_MODEL` no `.env` do backend consultando a
lista atual em https://console.groq.com/docs/vision.

## Roadmap: proximas fases

Este e o **esqueleto funcional** (Fase 0) — captura, leitura por IA, correcao manual e
solucao ja funcionam de ponta a ponta. Da pra usar assim, mas sugiro evoluir nesta ordem:

### Fase 1 — Robustez da leitura (maior impacto, baixo esforco)
- **Guia visual de enquadramento** na tela de captura (moldura tipo leitor de QR code),
  pra reduzir foto torta/mal enquadrada, que e a maior causa de erro de leitura hoje.
- **Cache/retry**: se a Groq falhar (rate limit, timeout), tentar de novo automaticamente
  1-2x antes de mostrar erro pro usuario.
- **Validacao incremental**: conferir a cor central assim que cada face e capturada (nao
  so no final), avisando na hora se duas fotos tem a mesma cor central (sinal de que o
  usuario fotografou a mesma face duas vezes).

### Fase 2 — Visao computacional local (menos dependencia da IA)
- Adicionar deteccao de contornos com **OpenCV.js** no proprio navegador: detectar a
  grade 3x3 e recortar cada quadradinho antes (ou em vez) de mandar pra Groq. Isso deixa
  a leitura mais barata (menos chamadas de IA) e mais robusta a iluminacao ruim.
- Classificacao de cor por HSV com distancia euclidiana como camada extra de confianca,
  cruzando com o resultado da IA.

### Fase 3 — Experiencia de resolucao
- **Renderizacao 3D do cubo** (Three.js): animar o cubo real fazendo cada movimento, em
  vez de so mostrar a notacao (R, U', etc). E o que mais melhora a experiencia pra quem
  esta aprendendo.
- **Modo CFOP opcional**: alem da solucao otima do Kociemba (~20 movimentos, dificil de
  seguir pra iniciante), oferecer a solucao pelo metodo humano CFOP, mais didatica.
- **Conferencia por camera ao vivo**: usar a camera continuamente pra detectar se o
  usuario realmente fez o movimento certo antes de liberar o proximo passo.

### Fase 4 — Produto
- Contagem de tempo/numero de resolucoes (gamificacao leve).
- Historico de cubos resolvidos (precisa de login + banco de dados — dá pra seguir o
  mesmo padrao multi-tenant que voce ja usa no AGENDADO/Estoque Facil se quiser
  contas de usuario).
- PWA instalavel (adicionar manifest.json + service worker no frontend), pra funcionar
  bem no celular sem precisar abrir o navegador toda vez — parecido com o que voce fez
  no fuelapp-mvp.

Recomendo validar a Fase 0 publicada primeiro (testar com cubos reais, ver a taxa de
acerto da IA na leitura) antes de investir na Fase 2, porque ela pode nem ser necessaria
se a Groq sozinha ja acertar bem o suficiente pro seu caso de uso.

## Estrutura de pastas

```
rubik-solver/
├── backend/
│   ├── server.js              # rotas Express (/api/analyze-face, /api/solve)
│   ├── services/
│   │   ├── groqVision.js      # chamada a Groq para ler as 9 cores de uma foto
│   │   └── cubeSolver.js      # monta o estado do cubo e resolve com cubejs
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # fluxo: capturar -> revisar/corrigir -> resolver
│   │   ├── components/
│   │   │   ├── FaceCapture.jsx
│   │   │   ├── ColorGrid.jsx
│   │   │   └── SolutionSteps.jsx
│   │   └── constants.js       # ordem de captura das faces + paleta de cores
│   └── vite.config.js
└── README.md
```
