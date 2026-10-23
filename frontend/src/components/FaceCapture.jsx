import React, { useRef } from 'react';
import { downscaleImage } from '../imagePrep';

function TiltDiagram({ type }) {
  if (type !== 'tilt-forward') return null;
  return (
    <svg className="tilt-diagram" viewBox="0 0 160 100" aria-hidden="true">
      <rect x="40" y="20" width="50" height="50" fill="none" stroke="var(--muted)" strokeDasharray="4 3" strokeWidth="2" />
      <text x="65" y="15" textAnchor="middle" fontSize="9" fill="var(--muted)">Cima</text>

      <path d="M 95 25 A 45 45 0 0 1 70 85" fill="none" stroke="var(--accent-2)" strokeWidth="4" strokeLinecap="round" />
      <polygon points="70,85 62,68 82,72" fill="var(--accent-2)" />

      <rect x="100" y="35" width="50" height="50" fill="none" stroke="var(--accent-2)" strokeWidth="2" />
      <text x="125" y="95" textAnchor="middle" fontSize="9" fill="var(--accent-2)">Baixo (fotografar)</text>
    </svg>
  );
}

function OrientationGuide({ edges }) {
  if (!edges) return null;
  return (
    <div className="orientation-guide">
      <div className="og-label og-top">{edges.top}</div>
      <div className="og-row">
        <div className="og-label og-left">{edges.left}</div>
        <div className="og-square" />
        <div className="og-label og-right">{edges.right}</div>
      </div>
      <div className="og-label og-bottom">{edges.bottom}</div>
    </div>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FaceCapture({ label, instruction, diagram, edges, previewUrl, onCapture, disabled }) {
  const inputRef = useRef(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const rawDataUrl = await fileToDataUrl(file);
    const dataUrl = await downscaleImage(rawDataUrl);
    onCapture(dataUrl);
    // Permite tirar a mesma foto novamente se o usuario quiser refazer.
    e.target.value = '';
  }

  return (
    <div className="face-capture">
      <h3>Face: {label}</h3>
      <p className="instruction">{instruction}</p>
      <TiltDiagram type={diagram} />
      <p className="instruction" style={{ fontSize: '0.85rem' }}>
        Antes de fotografar, confira: qual lado fica onde no enquadramento (isso importa
        para o app remontar o cubo certo).
      </p>
      <OrientationGuide edges={edges} />

{previewUrl ? (
        <img className="preview" src={previewUrl} alt={`Foto da face ${label}`} />
      ) : (
        <div className="preview preview-empty">Nenhuma foto ainda</div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleChange}
        disabled={disabled}
      />
      <button
        type="button"
        className="btn"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        {previewUrl ? 'Tirar/escolher outra foto' : 'Tirar foto / escolher imagem'}
      </button>
    </div>
  );
}
