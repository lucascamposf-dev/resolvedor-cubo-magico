import React, { useEffect, useRef, useState } from 'react';

const MIN_SIZE = 60;
const OUTPUT_SIDE = 720; // lado do quadrado exportado, antes do downscaleImage()

// Recorta exatamente a area (em px, no espaco de exibicao do <img>) que o
// usuario posicionou sobre a foto original, devolvendo um dataURL quadrado.
// Isso garante que a IA e o classificador local analisem sempre a MESMA
// grade 3x3, alinhada de verdade com o cubo na foto (em vez de assumir um
// recorte fixo de 80% do centro, que falha quando o cubo nao preenche o
// quadro).
function cropToDataUrl(imgEl, box, displayRect) {
  const scaleX = imgEl.naturalWidth / displayRect.width;
  const scaleY = imgEl.naturalHeight / displayRect.height;
  const sx = box.x * scaleX;
  const sy = box.y * scaleY;
  const sSide = box.size * scaleX;

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIDE;
  canvas.height = OUTPUT_SIDE;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgEl, sx, sy, sSide, sSide, 0, 0, OUTPUT_SIDE, OUTPUT_SIDE);
  return canvas.toDataURL('image/jpeg', 0.92);
}

function clampBox(next, rect) {
  const maxSize = Math.min(rect.width, rect.height);
  const size = Math.max(MIN_SIZE, Math.min(next.size, maxSize));
  const x = Math.max(0, Math.min(next.x, rect.width - size));
  const y = Math.max(0, Math.min(next.y, rect.height - size));
  return { x, y, size };
}

export default function FaceCrop({ image, label, onConfirm, onCancel }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [box, setBox] = useState(null);

  // Sempre que a foto muda (nova captura), reseta o quadro de recorte pro
  // padrao centralizado em vez de manter a posicao da foto anterior.
  useEffect(() => {
    setBox(null);
  }, [image]);

  function handleImgLoad() {
    const rect = containerRef.current.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height) * 0.62;
    setBox({ x: (rect.width - size) / 2, y: (rect.height - size) / 2, size });
  }

  function startDrag(e, mode) {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startBox: box };
  }

  function onPointerMove(e) {
    if (!dragRef.current || !box) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { mode, startX, startY, startBox } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const next =
      mode === 'move'
        ? { x: startBox.x + dx, y: startBox.y + dy, size: startBox.size }
        : { x: startBox.x, y: startBox.y, size: startBox.size + Math.max(dx, dy) };

    setBox(clampBox(next, rect));
  }

  function endDrag(e) {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  function handleConfirm() {
    if (!box || !imgRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    onConfirm(cropToDataUrl(imgRef.current, box, rect));
  }

  return (
    <div className="face-crop">
      <h3>Ajuste o recorte: {label}</h3>
      <p className="instruction">
        Arraste o quadro pra cima da grade 3x3 do cubo (as linhas ajudam a alinhar com os
        9 quadradinhos) e puxe o cantinho pra ajustar o tamanho. So o que ficar dentro do
        quadro e usado na leitura das cores.
      </p>

      <div className="face-crop-container" ref={containerRef}>
        <img
          ref={imgRef}
          src={image}
          alt={`Foto da face ${label} para recorte`}
          className="face-crop-image"
          onLoad={handleImgLoad}
          draggable={false}
        />
        {box && (
          <div
            className="face-crop-box"
            style={{ left: box.x, top: box.y, width: box.size, height: box.size }}
            onPointerDown={(e) => startDrag(e, 'move')}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
          >
            <div className="face-crop-grid">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="face-crop-cell" />
              ))}
            </div>
            <div
              className="face-crop-handle"
              onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'resize'); }}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
            />
          </div>
        )}
      </div>

      <div className="review-actions">
        <button type="button" className="btn" onClick={onCancel}>Tirar outra foto</button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={!box}>
          Usar este recorte
        </button>
      </div>
    </div>
  );
}