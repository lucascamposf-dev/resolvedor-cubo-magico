import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COLOR_HEX } from '../constants';

// ---------------------------------------------------------------------------
// Mapeamento de cor: continua IDENTICO ao que ja estava validado.
// ---------------------------------------------------------------------------

const AXIS_MAP = {
  U: { axis: 'y', layer: 1 },
  D: { axis: 'y', layer: -1 },
  R: { axis: 'x', layer: 1 },
  L: { axis: 'x', layer: -1 },
  F: { axis: 'z', layer: 1 },
  B: { axis: 'z', layer: -1 },
};

// Offset de cada face dentro da string de 54 caracteres do cubejs (ordem U R F D L B).
const FACE_OFFSET = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };

function stickerIndex(face, x, y, z) {
  switch (face) {
    case 'U': return FACE_OFFSET.U + (z + 1) * 3 + (x + 1);
    case 'D': return FACE_OFFSET.D + (1 - z) * 3 + (x + 1);
    case 'F': return FACE_OFFSET.F + (1 - y) * 3 + (x + 1);
    case 'B': return FACE_OFFSET.B + (1 - y) * 3 + (1 - x);
    case 'R': return FACE_OFFSET.R + (1 - y) * 3 + (1 - z);
    case 'L': return FACE_OFFSET.L + (1 - y) * 3 + (z + 1);
    default: return -1;
  }
}

function stickerColorHex(faceletStr, faceToColor, face, x, y, z) {
  if (!faceletStr || !faceToColor) return '#555555';
  const idx = stickerIndex(face, x, y, z);
  const letter = faceletStr[idx];
  const colorName = faceToColor[letter];
  return COLOR_HEX[colorName] || '#555555';
}

const ROTATION_SIGN = { x: 1, y: 1, z: 1 };

function getTargetAngleRad(move) {
  const { axis, layer } = AXIS_MAP[move[0]];
  const base = (layer > 0 ? -1 : 1) * ROTATION_SIGN[axis] * (Math.PI / 2);
  if (move.endsWith('2')) return base * 2;
  if (move.endsWith("'")) return -base;
  return base;
}

const POS = [-1, 0, 1];
const SPACING = 1.02;
const CUBIE_SIZE = 0.94;
const PLASTIC_COLOR = 0x161616;

// BoxGeometry no three.js cria os materiais na ordem [+x, -x, +y, -y, +z, -z],
// que bate exatamente com [R, L, U, D, F, B].
const FACE_ORDER = ['R', 'L', 'U', 'D', 'F', 'B'];

function isOuterFace(face, x, y, z) {
  return (
    (face === 'R' && x === 1) ||
    (face === 'L' && x === -1) ||
    (face === 'U' && y === 1) ||
    (face === 'D' && y === -1) ||
    (face === 'F' && z === 1) ||
    (face === 'B' && z === -1)
  );
}

function buildCubies() {
  const list = [];
  for (const x of POS) for (const y of POS) for (const z of POS) {
    if (x === 0 && y === 0 && z === 0) continue; // cubinho invisivel do centro
    list.push({ x, y, z, id: `${x}${y}${z}` });
  }
  return list;
}

const DEFAULT_ORBIT = { rx: -18, ry: 22 };

export default function MiniCube3D({ move, faceletStr, faceToColor }) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);
  const cubies = useMemo(buildCubies, []);
  const orbitRef = useRef(DEFAULT_ORBIT);

  // --- Setup da cena (uma vez so) -----------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const rig = new THREE.Group();
    scene.add(rig);
    const cubeGroup = new THREE.Group();
    rig.add(cubeGroup);

    // Material SEM luz (MeshBasicMaterial): a cor mostrada e sempre exatamente
    // a cor lida do cubo, em qualquer angulo — nao existe face "escurecida"
    // por causa da posicao da luz, como acontecia com MeshLambertMaterial.
    const meshes = {};
    cubies.forEach((c) => {
      const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
      const materials = FACE_ORDER.map((face) => {
        const outer = isOuterFace(face, c.x, c.y, c.z);
        return new THREE.MeshBasicMaterial({ color: outer ? 0x555555 : PLASTIC_COLOR });
      });
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.position.set(c.x * SPACING, c.y * SPACING, c.z * SPACING);
      mesh.userData = { x: c.x, y: c.y, z: c.z };
      cubeGroup.add(mesh);
      meshes[c.id] = mesh;
    });

    // --- Arrastar para orbitar ---
    let dragging = null;
    function applyOrbit() {
      rig.rotation.order = 'YXZ';
      rig.rotation.x = THREE.MathUtils.degToRad(orbitRef.current.rx);
      rig.rotation.y = THREE.MathUtils.degToRad(orbitRef.current.ry);
    }
    applyOrbit();

    function onPointerDown(e) {
      dragging = { startX: e.clientX, startY: e.clientY, start: { ...orbitRef.current } };
      renderer.domElement.setPointerCapture?.(e.pointerId);
    }
    function onPointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      orbitRef.current = {
        ry: dragging.start.ry + dx * 0.5,
        rx: Math.max(-85, Math.min(85, dragging.start.rx - dy * 0.5)),
      };
      applyOrbit();
    }
    function onPointerUp(e) {
      dragging = null;
      renderer.domElement.releasePointerCapture?.(e.pointerId);
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // --- Resize responsivo ---
    const resizeObserver = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(mount);

    // --- Loop de render ---
    let rafId;
    function renderLoop() {
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(renderLoop);
    }
    renderLoop();

    stateRef.current = { scene, camera, renderer, cubeGroup, meshes, applyOrbit, pivot: null };

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      Object.values(meshes).forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.forEach((m) => m.dispose());
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      stateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cubies]);

  // --- A cada passo: reseta pose canonica, repinta cores, anima o movimento ---
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return undefined;

    // 1) SEMPRE reseta todas as 27 pecas pra grade alinhada nos eixos, sem
    //    nenhuma rotacao residual, ANTES de pintar/animar este passo. Isso e
    //    o que impede o cubo de "deformar": mesmo que o passo anterior tenha
    //    sido interrompido no meio de uma animacao (usuario clicou rapido
    //    demais em "Proximo"), aqui a peca volta pro lugar certo — nenhuma
    //    rotacao parcial fica presa nem se acumula entre passos.
    Object.values(st.meshes).forEach((mesh) => {
      if (mesh.parent !== st.cubeGroup) st.cubeGroup.attach(mesh);
      const { x, y, z } = mesh.userData;
      mesh.position.set(x * SPACING, y * SPACING, z * SPACING);
      mesh.rotation.set(0, 0, 0);
      mesh.quaternion.identity();
    });
    if (st.pivot) {
      st.cubeGroup.remove(st.pivot);
      st.pivot = null;
    }

    // 2) Repinta as cores a partir do estado ATUAL (faceletStr = beforeState
    //    deste passo), sempre com base na posicao canonica que acabamos de
    //    garantir acima — a cor nunca "escorrega" pra face errada porque a
    //    peca nunca fica com uma rotacao acumulada de passos anteriores.
    Object.values(st.meshes).forEach((mesh) => {
      const { x, y, z } = mesh.userData;
      mesh.material.forEach((mat, i) => {
        const face = FACE_ORDER[i];
        if (!isOuterFace(face, x, y, z)) return;
        mat.color.set(stickerColorHex(faceletStr, faceToColor, face, x, y, z));
      });
    });

    if (!move) return undefined;

    // 3) Anima so a camada do movimento atual, sempre partindo da pose
    //    canonica garantida no passo 1.
    const { axis, layer } = AXIS_MAP[move[0]];
    const targetAngle = getTargetAngleRad(move);

    const pivot = new THREE.Group();
    st.cubeGroup.add(pivot);
    st.pivot = pivot;

    const affected = Object.values(st.meshes).filter((mesh) => mesh.userData[axis] === layer);
    affected.forEach((mesh) => pivot.attach(mesh));

    let rafId;
    let start;
    const DURATION = 700;

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    }

    function tick(ts) {
      if (start === undefined) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / DURATION, 1);
      pivot.rotation[axis] = easeInOut(t) * targetAngle;
      if (t < 1) rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      // Nao precisa devolver os cubinhos com cuidado aqui: o proximo passo
      // (ou a desmontagem do componente) sempre reseta tudo pra pose
      // canonica no bloco 1 acima, entao uma rotacao parcial interrompida
      // nunca fica "presa" nem se acumula.
    };
  }, [move, faceletStr, faceToColor]);

  function resetOrbit() {
    orbitRef.current = DEFAULT_ORBIT;
    stateRef.current?.applyOrbit();
  }

  return (
    <div className="mini-cube-wrap">
      <div ref={mountRef} className="mini-cube-canvas-mount" style={{ width: '100%', height: '260px', touchAction: 'none' }} />
      <div className="mini-cube-hint">
        <span>🔄 Arraste para ver os outros lados</span>
        <button type="button" className="mini-cube-reset" onClick={resetOrbit}>
          Resetar vista
        </button>
      </div>
    </div>
  );
}