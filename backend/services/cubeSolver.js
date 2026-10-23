const Cube = require('cubejs');

// Ordem exigida pelo cubejs na string de 54 caracteres: U, R, F, D, L, B
// (9 adesivos por face, lidos esquerda->direita, cima->baixo)
const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

const FACE_NAMES_PT = {
  U: 'Cima',
  D: 'Baixo',
  L: 'Esquerda',
  R: 'Direita',
  F: 'Frente',
  B: 'Tras',
};

let solverReady = null;
function ensureSolverInitialized() {
  if (!solverReady) {
    // Cube.initSolver() e sincrono e demorado (poucos segundos) na primeira
    // vez. Guardamos numa promise para so rodar uma vez por processo.
    solverReady = new Promise((resolve, reject) => {
      try {
        Cube.initSolver();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }
  return solverReady;
}
// Comeca a inicializar assim que o modulo e carregado, para nao atrasar
// a primeira requisicao do usuario.
ensureSolverInitialized().catch((err) => {
  console.error('Falha ao inicializar o solver do cubo:', err);
});

/**
 * Recebe um objeto { U: [9 cores], R: [9 cores], F: [...], D: [...], L: [...], B: [...] }
 * onde cada array tem as cores lidas na ordem esquerda->direita, cima->baixo,
 * e devolve a string de 54 caracteres no formato exigido pelo cubejs.
 */
function buildFaceletString(faces) {
  for (const face of FACE_ORDER) {
    if (!Array.isArray(faces[face]) || faces[face].length !== 9) {
      throw new Error(`Face ${face} (${FACE_NAMES_PT[face]}) esta incompleta ou ausente.`);
    }
  }

  // O centro de cada face nunca se move: usamos a cor do centro (posicao
  // index 4, ou seja, a 5a de 9) para descobrir qual letra (U/R/F/D/L/B)
  // corresponde a qual cor fisica do cubo.
  const colorToFace = {};
  for (const face of FACE_ORDER) {
    const centerColor = faces[face][4];
    if (colorToFace[centerColor]) {
      throw new Error(
        `A cor central "${centerColor}" apareceu em mais de uma face (${colorToFace[centerColor]} e ${face}). ` +
          'Confira se as 6 fotos correspondem mesmo a 6 faces diferentes.'
      );
    }
    colorToFace[centerColor] = face;
  }
  if (Object.keys(colorToFace).length !== 6) {
    throw new Error('Nao foi possivel identificar 6 cores centrais distintas.');
  }

  let facelets = '';
  const colorCount = {};
  for (const face of FACE_ORDER) {
    for (const color of faces[face]) {
      const letter = colorToFace[color];
      if (!letter) {
        throw new Error(`Cor "${color}" nao corresponde a nenhuma das 6 faces centrais lidas.`);
      }
      facelets += letter;
      colorCount[letter] = (colorCount[letter] || 0) + 1;
    }
  }

  for (const face of FACE_ORDER) {
    if (colorCount[face] !== 9) {
      throw new Error(
        `A cor da face ${FACE_NAMES_PT[face]} apareceu ${colorCount[face] || 0} vezes ` +
          '(deveria aparecer exatamente 9). Revise as fotos/cores dessa face e das faces vizinhas.'
      );
    }
  }

  return facelets;
}

function translateMove(move) {
  const face = move[0];
  const modifier = move.slice(1); // '', "'" ou '2'
  const faceName = FACE_NAMES_PT[face] || face;

  if (modifier === '2') {
    return `Gire a face ${faceName} 180 graus (duas vezes)`;
  }
  if (modifier === "'") {
    return `Gire a face ${faceName} 90 graus no sentido anti-horario`;
  }
  return `Gire a face ${faceName} 90 graus no sentido horario`;
}

/**
 * Resolve o cubo a partir do objeto de faces lidas e devolve os movimentos
 * (notacao padrao) junto com uma descricao em portugues de cada passo.
 */
// ---------------------------------------------------------------------
// Validacao fisica do cubo (paridade) — roda ANTES de tentar resolver.
// ---------------------------------------------------------------------
// Um cubo "escaneado errado" (uma ou mais celulas lidas com a cor trocada)
// quase sempre gera um estado ILEGAL pra um cubo real: uma peca com uma
// combinacao de cores que nao existe em nenhum cubo fisico (ex: branco e
// amarelo no mesmo cantinho — cores opostas nunca ficam na mesma peca),
// ou pecas cuja permutacao/orientacao nenhuma sequencia de giros consegue
// alcancar. Sem essa checagem, cube.solve() as vezes ainda devolve "uma"
// sequencia de movimentos — so que ela resolve um cubo diferente do que a
// pessoa tem na mao, e a animacao 3D diverge do cubo real a cada passo.
//
// Os indices abaixo seguem a mesma convencao de facelet string (ordem
// U R F D L B, 9 por face, 0-53) que a propria lib `cubejs` usa
// internamente — e a mesma que buildFaceletString() ja monta.

const CORNER_FACELETS = [
  [8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11],
  [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51],
];
const CORNER_COLORS = [
  ['U', 'R', 'F'], ['U', 'F', 'L'], ['U', 'L', 'B'], ['U', 'B', 'R'],
  ['D', 'F', 'R'], ['D', 'L', 'F'], ['D', 'B', 'L'], ['D', 'R', 'B'],
];

const EDGE_FACELETS = [
  [5, 10], [7, 19], [3, 37], [1, 46],
  [32, 16], [28, 25], [30, 43], [34, 52],
  [23, 12], [21, 41], [50, 39], [48, 14],
];
const EDGE_COLORS = [
  ['U', 'R'], ['U', 'F'], ['U', 'L'], ['U', 'B'],
  ['D', 'R'], ['D', 'F'], ['D', 'L'], ['D', 'B'],
  ['F', 'R'], ['F', 'L'], ['B', 'L'], ['B', 'R'],
];

function cornerLabel(i) {
  return CORNER_COLORS[i].map((f) => FACE_NAMES_PT[f]).join('/');
}
function edgeLabel(i) {
  return EDGE_COLORS[i].map((f) => FACE_NAMES_PT[f]).join('/');
}

// Conta o numero de transposicoes (paridade) de uma permutacao, decompondo
// em ciclos: cada ciclo de tamanho N contribui N-1 trocas.
function permutationParity(perm) {
  const seen = new Array(perm.length).fill(false);
  let swaps = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    let len = 0;
    let j = i;
    while (!seen[j]) {
      seen[j] = true;
      j = perm[j];
      len++;
    }
    swaps += len - 1;
  }
  return swaps % 2;
}

/**
 * Confere se a string de 54 letras monta um cubo fisicamente possivel.
 * Lanca um erro descritivo (em portugues, apontando a regiao do cubo) na
 * primeira inconsistencia encontrada. Nao retorna nada se o cubo for valido.
 */
function validateFaceletString(facelets) {
  // --- Cantos (corners): 8 pecas, 3 cores cada ---
  const cornerPerm = new Array(8).fill(-1);
  const cornerTwist = new Array(8).fill(0);

  for (let slot = 0; slot < 8; slot++) {
    const read = CORNER_FACELETS[slot].map((idx) => facelets[idx]);
    let matchIdx = -1;
    let rotation = -1;
    for (let ref = 0; ref < 8 && matchIdx === -1; ref++) {
      for (let r = 0; r < 3; r++) {
        const rotated = [read[r], read[(r + 1) % 3], read[(r + 2) % 3]];
        if (rotated.every((c, k) => c === CORNER_COLORS[ref][k])) {
          matchIdx = ref;
          rotation = r;
          break;
        }
      }
    }
    if (matchIdx === -1) {
      throw new Error(
        `Combinacao de cores impossivel no cantinho perto de ${cornerLabel(slot)}: as tres cores ` +
          `lidas ali (${read.join(', ')}) nao formam nenhuma peca de cubo real (cores opostas nunca ` +
          'ficam juntas na mesma peca). Revise as fotos dessas faces, provavelmente uma celula foi ' +
          'lida com a cor errada.'
      );
    }
    if (cornerPerm.includes(matchIdx)) {
      throw new Error(
        `A peca de canto ${cornerLabel(matchIdx)} aparece repetida em mais de uma posicao do cubo. ` +
          'Revise as cores das faces que formam esse cantinho.'
      );
    }
    cornerPerm[slot] = matchIdx;
    cornerTwist[slot] = rotation;
  }

  // --- Arestas (edges): 12 pecas, 2 cores cada ---
  const edgePerm = new Array(12).fill(-1);
  const edgeFlip = new Array(12).fill(0);

  for (let slot = 0; slot < 12; slot++) {
    const read = EDGE_FACELETS[slot].map((idx) => facelets[idx]);
    let matchIdx = -1;
    let flip = -1;
    for (let ref = 0; ref < 12; ref++) {
      if (read[0] === EDGE_COLORS[ref][0] && read[1] === EDGE_COLORS[ref][1]) {
        matchIdx = ref; flip = 0; break;
      }
      if (read[0] === EDGE_COLORS[ref][1] && read[1] === EDGE_COLORS[ref][0]) {
        matchIdx = ref; flip = 1; break;
      }
    }
    if (matchIdx === -1) {
      throw new Error(
        `Combinacao de cores impossivel na aresta perto de ${edgeLabel(slot)}: as duas cores lidas ` +
          `ali (${read.join(', ')}) nao formam nenhuma peca de cubo real. Revise as fotos dessas faces.`
      );
    }
    if (edgePerm.includes(matchIdx)) {
      throw new Error(
        `A peca de aresta ${edgeLabel(matchIdx)} aparece repetida em mais de uma posicao do cubo. ` +
          'Revise as cores das faces que formam essa aresta.'
      );
    }
    edgePerm[slot] = matchIdx;
    edgeFlip[slot] = flip;
  }

  // --- Regras de paridade que todo cubo real obedece ---
  if (permutationParity(cornerPerm) !== permutationParity(edgePerm)) {
    throw new Error(
      'Esse conjunto de cores forma um cubo fisicamente impossivel (a paridade de pecas trocadas ' +
        'nao bate). Isso costuma acontecer quando duas celulas ficaram trocadas entre si em fotos ' +
        'diferentes. Revise com atencao as 6 fotos, principalmente as bordas entre faces vizinhas.'
    );
  }

  if (cornerTwist.reduce((a, b) => a + b, 0) % 3 !== 0) {
    throw new Error(
      'Um dos cantinhos do cubo esta com a cor girada de um jeito impossivel (a soma das ' +
        'orientacoes dos cantos nao fecha). Normalmente e uma cor de canto lida errada, ou uma foto ' +
        'tirada com a face tombada/girada errado. Revise as fotos das faces vizinhas a esse cantinho.'
    );
  }

  if (edgeFlip.reduce((a, b) => a + b, 0) % 2 !== 0) {
    throw new Error(
      'Uma das arestas do cubo esta com a cor invertida de um jeito impossivel (a soma das ' +
        'orientacoes das arestas nao fecha). Normalmente e uma cor de aresta lida errada entre duas ' +
        'faces vizinhas. Revise essas fotos.'
    );
  }
}

async function solveCube(faces) {
  await ensureSolverInitialized();

   const faceletString = buildFaceletString(faces);
  validateFaceletString(faceletString);

  // Cor fisica real detectada em cada face (ex: { U: 'white', R: 'red', ... }),
  // usada pelo frontend pra pintar o cubo 3D com as cores certas do usuario.
  const faceToColor = {};
  for (const face of FACE_ORDER) {
    faceToColor[face] = faces[face][4];
  }

  let cube;
  try {
    cube = Cube.fromString(faceletString);
  } catch (err) {
    throw new Error('Estado do cubo invalido: ' + err.message);
  }

  if (typeof cube.isSolved === 'function' && cube.isSolved()) {
    return { faceletString, moves: [], steps: [], alreadySolved: true };
  }

  let solutionString;
  try {
    solutionString = cube.solve();
  } catch (err) {
    throw new Error(
      'Nao foi possivel resolver esse estado de cubo. Isso geralmente significa que ' +
        'uma ou mais cores foram lidas/marcadas errado. Revise as 6 faces e tente novamente. ' +
        'Detalhe tecnico: ' + err.message
    );
  }

  const moves = solutionString.trim().split(/\s+/).filter(Boolean);

  // Reconstroi o estado do cubo (string de 54 caracteres) ANTES de cada
  // movimento, aplicando os movimentos um a um a partir do estado escaneado.
  // Usado pelo frontend pra animar o cubo 3D mostrando as cores reais
  // mudando de posicao junto com o cubo fisico.
  const trackCube = Cube.fromString(faceletString);
  const beforeStates = [faceletString];
  for (const move of moves) {
    trackCube.move(move);
    beforeStates.push(trackCube.asString());
  }

  const steps = moves.map((move, i) => ({
    index: i + 1,
    move,
    description: translateMove(move),
    beforeState: beforeStates[i],
  }));

  return { faceletString, moves, steps, faceToColor, alreadySolved: false };
}

module.exports = { solveCube, buildFaceletString, FACE_ORDER, FACE_NAMES_PT };