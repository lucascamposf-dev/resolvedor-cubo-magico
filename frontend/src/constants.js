// Ordem em que o usuario deve fotografar as faces. E importante seguir essa
// ordem girando o cubo sempre a partir da mesma posicao inicial, para que o
// app consiga remontar corretamente as 6 faces do cubo (os adesivos centrais
// nunca se movem entre si, entao a logica de solucao usa isso para descobrir
// automaticamente qual foto e qual face).
export const FACE_STEPS = [
  {
    key: 'F',
    label: 'Frente',
    instruction:
      'Escolha uma face para comecar e deixe-a virada para voce (Frente). Fotografe essa face.',
    edges: { top: 'Cima', bottom: 'Baixo', left: 'Esquerda', right: 'Direita' },
  },
  {
    key: 'U',
    label: 'Cima',
    instruction:
      'Sem girar o cubo para os lados, incline-o para tras para ver a face de Cima. Fotografe essa face.',
    edges: { top: 'Tras', bottom: 'Frente', left: 'Esquerda', right: 'Direita' },
  },
  {
    key: 'R',
    label: 'Direita',
    instruction:
      'Volte o cubo a posicao inicial (Frente na sua frente) e gire-o 90 graus para a esquerda, mostrando a face Direita. Fotografe essa face.',
    edges: { top: 'Cima', bottom: 'Baixo', left: 'Frente', right: 'Tras' },
  },
  {
    key: 'B',
    label: 'Tras',
    instruction:
      'A partir da posicao inicial, gire o cubo 180 graus (meia volta), mostrando a face de Tras. Fotografe essa face.',
    edges: { top: 'Cima', bottom: 'Baixo', left: 'Direita', right: 'Esquerda' },
  },
  {
    key: 'L',
    label: 'Esquerda',
    instruction:
      'A partir da posicao inicial, gire o cubo 90 graus para a direita, mostrando a face Esquerda. Fotografe essa face.',
    edges: { top: 'Cima', bottom: 'Baixo', left: 'Tras', right: 'Frente' },
  },
  {
    key: 'D',
    label: 'Baixo',
    instruction:
      'Volte a posicao inicial (Frente na sua frente, Cima em cima). Tombe o cubo PARA FRENTE, como se fosse derrubar a face de Cima em direcao a voce, ate a face de Baixo ficar de frente pra voce. Nao gire para os lados. A face que estava de Frente agora deve estar virada para cima. Fotografe a face de Baixo.',
    diagram: 'tilt-forward',
    edges: { top: 'Frente', bottom: 'Tras', left: 'Esquerda', right: 'Direita' },
  },
];

export const COLOR_OPTIONS = [
  { value: 'white', label: 'Branco', hex: '#f5f5f5' },
  { value: 'yellow', label: 'Amarelo', hex: '#ffd500' },
  { value: 'red', label: 'Vermelho', hex: '#e53935' },
  { value: 'orange', label: 'Laranja', hex: '#fb8c00' },
  { value: 'blue', label: 'Azul', hex: '#1e88e5' },
  { value: 'green', label: 'Verde', hex: '#43a047' },
];

export const COLOR_HEX = Object.fromEntries(COLOR_OPTIONS.map((c) => [c.value, c.hex]));
export const COLOR_LABEL_PT = Object.fromEntries(COLOR_OPTIONS.map((c) => [c.value, c.label]));
