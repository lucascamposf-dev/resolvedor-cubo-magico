import React from 'react';
import { COLOR_OPTIONS, COLOR_HEX } from '../constants';

const CENTER_INDEX = 4; // posicao central da grade 3x3 (fixa: define a face U/R/F/D/L/B)

// Mostra as 9 cores lidas de uma face como uma grade 3x3. Clicar em um
// quadrado avanca para a proxima cor da paleta, permitindo corrigir
// facilmente qualquer erro de leitura da IA antes de resolver o cubo.
// O quadrado CENTRAL fica travado: e ele que define qual face e qual
// (U/R/F/D/L/B), entao nao pode ser editado depois de capturado.
export default function ColorGrid({ colors, onChange, flaggedIndexes }) {
  if (!colors) return null;
  const flagged = new Set(flaggedIndexes || []);

  function cycleColor(index) {
    if (index === CENTER_INDEX) return; // centro e fixo, nao muda

    const currentIdx = COLOR_OPTIONS.findIndex((c) => c.value === colors[index]);
    const nextIdx = (currentIdx + 1) % COLOR_OPTIONS.length;
    const next = [...colors];
    next[index] = COLOR_OPTIONS[nextIdx].value;
    onChange(next, index);
  }

  return (
    <div className="color-grid">
      {colors.map((color, i) => (
        <button
          key={i}
          type="button"
          className={[
            'color-cell',
            i === CENTER_INDEX ? 'color-cell-center' : '',
            flagged.has(i) ? 'color-cell-flagged' : '',
          ].filter(Boolean).join(' ')}
          style={{ backgroundColor: COLOR_HEX[color] || '#ccc' }}
          title={
            i === CENTER_INDEX
              ? 'Cor central fixa (define a face)'
              : flagged.has(i)
              ? 'A IA e a checagem local discordaram aqui — confira com atencao'
              : 'Clique para corrigir a cor'
          }
          onClick={() => cycleColor(i)}
        />
      ))}
    </div>
  );
}