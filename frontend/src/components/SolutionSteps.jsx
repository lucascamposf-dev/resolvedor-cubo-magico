import React, { useState } from 'react';
import MiniCube3D from './MiniCube3D';

function MoveArrow({ direction }) {
  const arrow = (
    <>
      <path d="M 50 12 A 38 38 0 1 1 15 40" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <polygon points="15,40 8,22 30,28" fill="currentColor" />
    </>
  );

  if (direction === '180') {
    return (
      <svg className="move-arrow move-arrow-180" viewBox="0 0 100 100" aria-hidden="true">
        <g>{arrow}</g>
        <g transform="rotate(180 50 50)">{arrow}</g>
      </svg>
    );
  }

  return (
    <svg className={`move-arrow move-arrow-${direction}`} viewBox="0 0 100 100" aria-hidden="true">
      {arrow}
    </svg>
  );
}

export default function SolutionSteps({ steps, faces, faceToColor, onRestart }) {
  const [current, setCurrent] = useState(0);

  if (steps.length === 0) {
    return (
      <div className="solution">
        <h2>O cubo ja esta resolvido! 🎉</h2>
        <button className="btn" onClick={onRestart}>Escanear outro cubo</button>
      </div>
    );
  }

  const step = steps[current];
  const isLast = current === steps.length - 1;
  const faceImage = faces?.[step.move[0]]?.image;
  const direction = step.move.endsWith('2') ? '180' : step.move.endsWith("'") ? 'ccw' : 'cw';

  return (
    <div className="solution">
      <h2>Solucao: {steps.length} movimentos</h2>

      <div className="step-card">
        <div className="step-count">Passo {step.index} de {steps.length}</div>
        <div className="step-move">{step.move}</div>

        <MiniCube3D move={step.move} faceletStr={step.beforeState} faceToColor={faceToColor} />
        <div className="step-description">{step.description}</div>
      </div>

      <div className="step-nav">
        <button className="btn" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          ← Anterior
        </button>
        <button
          className="btn btn-primary"
          disabled={isLast}
          onClick={() => setCurrent((c) => c + 1)}
        >
          Proximo →
        </button>
      </div>

      <details className="all-moves">
        <summary>Ver todos os movimentos</summary>
        <ol>
          {steps.map((s) => (
            <li key={s.index} className={s.index === step.index ? 'active' : ''}>
              <strong>{s.move}</strong> — {s.description}
            </li>
          ))}
        </ol>
      </details>

      <button className="btn" onClick={onRestart}>Escanear outro cubo</button>
    </div>
  );
}