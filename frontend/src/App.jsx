import React, { useState } from 'react';
import { FACE_STEPS, COLOR_LABEL_PT } from './constants';
import { analyzeFace, solveCubeRequest } from './api';
import { classifyFaceLocally } from './colorClassifier';
import FaceCapture from './components/FaceCapture';
import FaceCrop from './components/FaceCrop';
import ColorGrid from './components/ColorGrid';
import SolutionSteps from './components/SolutionSteps';

const EMPTY_FACES = {};
const CENTER_INDEX = 4; // posicao central de uma face 3x3 lida esquerda->direita, cima->baixo

export default function App() {
  const [phase, setPhase] = useState('capture'); // capture | review | solving | result
  const [stepIndex, setStepIndex] = useState(0);
  const [faces, setFaces] = useState(EMPTY_FACES); // { U: {image, colors}, ... } (so faces JA confirmadas)
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [solution, setSolution] = useState(null);

  // Foto recem-tirada, ainda sem recorte confirmado. Enquanto isso nao e
  // null, mostramos a tela de recorte antes de mandar pra analise de cor.
  const [rawPhoto, setRawPhoto] = useState(null);

  // Resultado de uma foto que ainda nao foi confirmado pelo usuario.
  // { image, colors, centerColor, duplicateOfLabel }
  const [pending, setPending] = useState(null);

  const currentFaceDef = FACE_STEPS[stepIndex];

  function findDuplicateCenter(centerColor) {
    for (const step of FACE_STEPS) {
      const existing = faces[step.key];
      if (existing && existing.colors[CENTER_INDEX] === centerColor) {
        return step.label;
      }
    }
    return null;
  }

  // Primeiro passo apos tirar a foto: so guarda a imagem crua e abre a tela
  // de recorte. A analise de cor (IA + checagem local) so roda depois que o
  // usuario confirma o recorte, em handleCropConfirm.
  function handleCapture(dataUrl) {
    setError(null);
    setRawPhoto(dataUrl);
  }

  function handleCropCancel() {
    setRawPhoto(null);
  }

  async function handleCropConfirm(croppedDataUrl) {
    setRawPhoto(null);
    await analyzeAndSetPending(croppedDataUrl);
  }

  async function analyzeAndSetPending(dataUrl) {
    setError(null);
    setAnalyzing(true);
    try {
      const [colors, localColors] = await Promise.all([
        analyzeFace(dataUrl),
       // segunda opinião local, best-effort: se falhar, so nao compara
        classifyFaceLocally(dataUrl).catch(() => null),
      ]);
      const centerColor = colors[CENTER_INDEX];
      const duplicateOfLabel = findDuplicateCenter(centerColor);
      const mismatchIndexes = localColors
        ? colors.map((c, i) => (c !== localColors[i] ? i : -1)).filter((i) => i !== -1)
       : [];
      setPending({ image: dataUrl, colors, centerColor, duplicateOfLabel, mismatchIndexes });
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function handleRetakePending() {
    setPending(null);
  }

  function handleConfirmPending() {
    if (!pending) return;
    setFaces((prev) => ({
      ...prev,
      [currentFaceDef.key]: {
        image: pending.image,
        colors: pending.colors,
        // Guardamos quais posicoes a IA e o classificador local discordaram,
        // para poder destacar essas celulas na tela de revisao final. Sem
        // isso, o aviso desaparece depois de confirmar a foto e uma cor
        // errada pode passar batido ate a hora de resolver o cubo.
        flaggedIndexes: pending.mismatchIndexes || [],
      },
    }));
    setPending(null);
    if (stepIndex < FACE_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setPhase('review');
    }
  }

  function updateFaceColors(faceKey, newColors, correctedIndex) {
    setFaces((prev) => {
      const prevFace = prev[faceKey] || {};
      // Se o usuario corrigiu manualmente uma celula que estava marcada como
      // divergente, ela deixa de precisar do aviso vermelho.
      const flaggedIndexes = (prevFace.flaggedIndexes || []).filter((i) => i !== correctedIndex);
      return { ...prev, [faceKey]: { ...prevFace, colors: newColors, flaggedIndexes } };
    });
  }

  async function handleSolve() {
    setError(null);
    setPhase('solving');
    try {
      const faceColorsOnly = Object.fromEntries(
        Object.entries(faces).map(([key, val]) => [key, val.colors])
      );
      const result = await solveCubeRequest(faceColorsOnly);
      setSolution(result);
      setPhase('result');
    } catch (err) {
      setError(err.message);
      setPhase('review');
    }
  }

  function handleRestart() {
    setFaces(EMPTY_FACES);
    setSolution(null);
    setError(null);
    setStepIndex(0);
    setPending(null);
    setRawPhoto(null);
    setPhase('capture');
  }

  return (
    <div className="app">
      <header>
        <h1>🧩 Resolvedor de Cubo Magico</h1>
        <p className="subtitle">Fotografe as 6 faces e receba o passo a passo da solucao</p>
      </header>

      {error && (
        <div className="error-banner">
          <strong>Ops:</strong> {error}
        </div>
      )}

      {phase === 'capture' && !rawPhoto && !pending && (
        <>
          <div className="progress">
            Face {stepIndex + 1} de {FACE_STEPS.length}
          </div>
          <FaceCapture
            label={currentFaceDef.label}
            instruction={currentFaceDef.instruction}
            diagram={currentFaceDef.diagram}
            edges={currentFaceDef.edges}
            previewUrl={faces[currentFaceDef.key]?.image}
            onCapture={handleCapture}
            disabled={analyzing}
          />
          {analyzing && <p className="analyzing">Analisando cores com a IA...</p>}
        </>
      )}

      {phase === 'capture' && rawPhoto && (
        <FaceCrop
          image={rawPhoto}
          label={currentFaceDef.label}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {phase === 'capture' && !rawPhoto && pending && (
        <div className="confirm-card">
          <h3>Confirme a foto: {currentFaceDef.label}</h3>
          <img className="preview" src={pending.image} alt="Foto tirada" />

          <div className="detected-center">
            Cor central detectada:{' '}
            <span className={`color-tag color-${pending.centerColor}`}>
              {COLOR_LABEL_PT[pending.centerColor] || pending.centerColor}
            </span>
          </div>

          {pending.duplicateOfLabel ? (
            <div className="error-banner">
              <strong>Atencao:</strong> essa foto tem o mesmo centro ({COLOR_LABEL_PT[pending.centerColor]}) da
              face <strong>{pending.duplicateOfLabel}</strong>, que voce ja fotografou. Provavelmente e a
              mesma face de novo ou o cubo foi virado errado. Tire a foto de novo seguindo a instrucao acima.
            </div>
          ) : (
            <p className="instruction">
              Confira: essa e realmente a face <strong>{currentFaceDef.label}</strong> do cubo, com o centro{' '}
              {COLOR_LABEL_PT[pending.centerColor]}? Se estiver certo, confirme. Se nao, tire de novo.
            </p>
          )}

          {pending.mismatchIndexes.length > 0 && (
            <div className="error-banner">
              <strong>Atencao:</strong> a checagem local de cor discordou da IA em{' '}
              {pending.mismatchIndexes.length}{' '}
              {pending.mismatchIndexes.length === 1 ? 'posicao' : 'posicoes'} desta foto.
              Confira com atencao essas celulas na tela de revisao antes de resolver.
              </div>
               )}
          <div className="review-actions">
            <button className="btn" onClick={handleRetakePending}>Tirar outra foto</button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmPending}
              disabled={!!pending.duplicateOfLabel}
            >
              Confirmar e continuar
            </button>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="review">
          <h2>Confira as cores lidas</h2>
          <p className="instruction">
            Se alguma cor estiver errada, clique no quadradinho para trocar. A ordem de leitura
            e sempre esquerda→direita, cima→baixo.
          </p>
          {FACE_STEPS.some((f) => faces[f.key]?.flaggedIndexes?.length > 0) && (
            <div className="error-banner">
              <strong>Atencao:</strong> as celulas com borda vermelha abaixo tiveram leitura
              divergente entre a IA e a checagem local. Confira essas com atencao redobrada antes
              de resolver — sao as que mais provavelmente estao erradas.
            </div>
          )}
          <div className="faces-grid">
            {FACE_STEPS.map((f) => (
              <div key={f.key} className="face-review-card">
                <h4>{f.label}</h4>
                <img src={faces[f.key]?.image} alt={`Face ${f.label}`} className="thumb" />
                <ColorGrid
                  colors={faces[f.key]?.colors}
                  flaggedIndexes={faces[f.key]?.flaggedIndexes}
                  onChange={(newColors) => updateFaceColors(f.key, newColors)}
                />
              </div>
            ))}
          </div>
          <div className="review-actions">
            <button className="btn" onClick={handleRestart}>Recomecar</button>
            <button className="btn btn-primary" onClick={handleSolve}>Resolver cubo</button>
          </div>
        </div>
      )}

      {phase === 'solving' && <p className="analyzing">Calculando a solucao...</p>}

      {phase === 'result' && solution && (
        <SolutionSteps steps={solution.steps} faces={faces} faceToColor={solution.faceToColor} onRestart={handleRestart} />
      )}
    </div>
  );
}