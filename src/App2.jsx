// Visual3D.jsx
import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { TextureLoader } from "three";

// === FLOATING IMAGES 3D (tele / woofer) ===
export function FloatingImages3D({ images = [], freq = 0, bpm = 0, pulse = 0 }) {
  if (images.length === 1) return null;

  const validImages = useMemo(
    () => images.filter((p) => typeof p === "string" && p.length > 0),
    [images]
  );
  if (validImages.length === 0) return null;

  const textures = useLoader(TextureLoader, validImages);
  const group = useRef();

  const baseHeight = 3.2;
  const planes = useMemo(() => {
    return textures.map((tex) => {
      const img = tex.image;
      const w = img?.naturalWidth || img?.width || 1000;
      const h = img?.naturalHeight || img?.height || 1000;
      const aspect = w / h || 1;
      return { width: baseHeight * aspect, height: baseHeight };
    });
  }, [textures]);

  const positions = useMemo(() => {
    const spread = 4.7;
    return textures.map((_, i) => ({
      x: i % 2 === 0 ? -spread : spread,
      y: (Math.random() - 0.5) * 1.5,
      z: -0.25,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [textures]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const freqNorm = freq / 900;
    const bpmNorm = bpm > 0 ? bpm / 120 : 1;

    group.current?.children.forEach((mesh, i) => {
      if (!mesh.userData.baseRotation) {
        mesh.userData.baseRotation = {
          y: positions[i].x < 0 ? 0.7 : -0.7,
          x: -0.7,
          z: positions[i].x < 0 ? 1.0 : -1.0,
        };
      }

      const wobbleY = Math.sin(t * 0.5 + positions[i].phase) * 0.1;
      const wobbleX = Math.sin(t * 0.3 + positions[i].phase * 0.6) * 0.05;
      const wobbleZ = Math.sin(t * 0.4 + positions[i].phase * 1.1) * 0.04;

      mesh.rotation.y = mesh.userData.baseRotation.y + wobbleY;
      mesh.rotation.x = mesh.userData.baseRotation.x + wobbleX;
      mesh.rotation.z = mesh.userData.baseRotation.z + wobbleZ;

      const geom = mesh.geometry;
      const posAttr = geom.attributes.position;
      if (!mesh.userData.base) mesh.userData.base = posAttr.array.slice();

      const base = mesh.userData.base;
      const arr = posAttr.array;

      for (let j = 0; j < arr.length; j += 3) {
        const x0 = base[j];
        const y0 = base[j + 1];
        const z0 = base[j + 2];

        const u = x0 / planes[i].width + 0.5;
        const v = y0 / planes[i].height + 0.5;

        const dx = u - 0.5;
        const dy = v - 0.5;
        const r = Math.sqrt(dx * dx + dy * dy);

        const coneShape = -Math.pow(r, 0.5) * -1.0;
        const centerRipple =
          Math.cos(r * Math.PI * 3.0 - t * 5.0) * (0.7 - r) * 0.5;
        const edgeRipple =
          Math.sin((r - 0.55) * Math.PI * 6.0 + t * 1.5) *
          Math.max(0.0, r - 0.55) *
          0.25;

        const pulseAmount =
          Math.sin(t * (2.0 + freqNorm * 1.5 + bpmNorm * 0.3)) *
          (1.0 - r) *
          0.08;

        arr[j] = x0;
        arr[j + 1] = y0;
        arr[j + 2] = z0 + coneShape + centerRipple + edgeRipple + pulseAmount;
      }

      posAttr.needsUpdate = true;
      geom.computeVertexNormals();
    });
  });

  return (
    <group ref={group}>
      {textures.map((tex, i) => (
        <mesh key={i} position={[positions[i].x, positions[i].y, positions[i].z]}>
          <planeGeometry args={[planes[i].width, planes[i].height, 90, 90]} />
          <meshStandardMaterial
            map={tex}
            roughness={1}
            metalness={0}
            transparent
            opacity={0.97}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// --------------------------------------------------------
//  ⭐⭐⭐  CYMATIC SPHERE COMPLETO (liquido + morph + contacts) ⭐⭐⭐
// --------------------------------------------------------

export function CymaticSphere({
  mode,
  color,
  positionX,
  splitProgress,
  hoverFreq,
  hoverBpm,
  id,
}) {
  const mesh = useRef();

  // teniamo traccia del mode precedente e se stiamo uscendo da Contacts
  const prevMode = useRef(mode);
  const isExiting = useRef(false);

  useEffect(() => {
    if (prevMode.current === 3 && mode !== 3) {
      isExiting.current = true;
    }
    if (mode === 3) {
      isExiting.current = false;
    }
    prevMode.current = mode;
  }, [mode]);

  const imageTex = useLoader(
    TextureLoader,
    "/images/contacts/Senzatitolo-1fotoort.webp"
  );

  const morph = useRef(0);

  const geometry = useMemo(
    () => new THREE.SphereGeometry(2, 300, 300),
    [id]
  );
  const positionAttr = geometry.attributes.position;
  const uvAttr = geometry.attributes.uv;
  const originalPos = useMemo(() => positionAttr.array.slice(), []);
  const count = positionAttr.count;

  const contactPositions = useRef(null);

  const getImageData = (tex) => {
    const img = tex.image;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
  };

  // ContactPositions: foto-rilievo dall'immagine
  useEffect(() => {
    if (mode !== 3) return;

    const imgData = getImageData(imageTex);
    const arr = new Float32Array(positionAttr.array.length);

    const scaleXY = 30;
    const maxDepth = 14.0;
    const minDepth = -8.0;

    const contrastBoost = 1.8;
    const luminancePower = 0;
    const edgeSharpness = 2.2;

    for (let i = 0; i < count; i++) {
      const u = uvAttr.getX(i);
      const v = uvAttr.getY(i);

      const px = Math.floor(u * imgData.width);
      const py = Math.floor((1 - v) * imgData.height);
      const idx = (py * imgData.width + px) * 4;

      const r = imgData.data[idx] / 255;
      const g = imgData.data[idx + 1] / 255;
      const b = imgData.data[idx + 2] / 255;

      let lum = r * 0.299 + g * 0.587 + b * 0.114;
      lum = Math.pow(lum, luminancePower);

      const rR = imgData.data[idx + 4] / 255 || 0;
      const rL = imgData.data[idx - 4] / 255 || 0;
      const rU = imgData.data[idx - imgData.width * 4] / 255 || 0;
      const rD = imgData.data[idx + imgData.width * 4] / 255 || 0;

      const edge =
        Math.abs(rR - rL) +
        Math.abs(rU - rD);

      const edgeNorm = Math.min(1, edge * contrastBoost);

      const importance = Math.pow(
        lum * 0.7 + edgeNorm * 0.8,
        edgeSharpness
      );

      const j = i * 3;

      arr[j] = (u - 0.5) * scaleXY;
      arr[j + 1] = (v - 0.5) * scaleXY;

      arr[j + 2] =
        minDepth * (1 - importance) +
        maxDepth * importance;
    }

    contactPositions.current = arr;
  }, [mode, imageTex, positionAttr.array.length, uvAttr, count]);

  const state = useRef({ freqR: 5, freqA: 7, amp: 0.15, scale: 1 });
  const hover = useRef({ f: 0, b: 0 });
  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

  // Shader: colore base + immagine + spectral noise (solo in Contacts)
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uMode: { value: mode },
        uImage: { value: imageTex },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 3.4 * (1.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform int uMode;
        uniform sampler2D uImage;
        uniform float uTime;

        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          vec2 u = f * f * (3.0 - 2.0 * f);

          return mix(a, b, u.x) +
                 (c - a) * u.y * (1.0 - u.x) +
                 (d - b) * u.x * u.y;
        }

        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;

          vec3 col = uColor;

          if (uMode == 3) {
            vec2 uvCentered = (vUv - 0.5) * 0.88 + 0.5;

            vec3 tex = texture2D(uImage, uvCentered).rgb;
            float lum = dot(tex, vec3(0.299, 0.587, 0.114));

            vec2 ellipse = (uvCentered - vec2(0.5)) / vec2(1.0, 0.8);
            float r = length(ellipse);
            float edgeMask = smoothstep(0.55, 0.32, r);

            float stripe = sin(uvCentered.y * 40.0 + uTime * 2.0 + lum * 6.0);
            stripe = (stripe + 1.0) * 0.5;
            stripe = pow(stripe, 2.0);

            vec2 split = vec2(
              sin(uTime * 0.7 + lum * 5.0) * 0.003,
              cos(uTime * 0.9 + lum * 4.0) * 0.003
            );

            vec3 texR = texture2D(uImage, uvCentered + split).r * vec3(1.0, 0.5, 0.5);
            vec3 texG = texture2D(uImage, uvCentered - split).g * vec3(0.5, 1.0, 0.5);
            vec3 texB = texture2D(uImage, uvCentered).b           * vec3(0.5, 0.5, 1.0);

            vec3 spectral = mix(tex, texR + texG + texB, 0.35 * stripe);

            float g = noise(uvCentered * 180.0 + uTime * 1.3) * 0.15;
            spectral += g * (lum * 0.6 + 0.1);

            float pulse = sin(uTime * 3.0 + lum * 12.0) * 0.15;
            float mixAmt = clamp(0.75 + pulse * 0.4, 0.0, 1.0);

            mixAmt *= edgeMask;
            spectral = mix(uColor, spectral, edgeMask);

            col = mix(col, spectral, mixAmt);
          }

          gl_FragColor = vec4(col, 1.0 - d * 2.0);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
  }, [color, mode, imageTex]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;

    hover.current.f += (hoverFreq - hover.current.f) * 0.05;
    hover.current.b += (hoverBpm - hover.current.b) * 0.05;

    const target = [
      { r: 1, a: 3, amp: 0.2, s: 1.5 },
      { r: 0.2, a: 6, amp: 0.4, s: 1.3 },
      { r: 3, a: 1, amp: 0.35, s: 6 },
      { r: 20, a: 1, amp: 0.9, s: 0.7 },
    ][mode];

    const s = state.current;
    s.freqR += (target.r - s.freqR) * 0.02;
    s.freqA += (target.a - s.freqA) * 0.02;
    s.amp += (target.amp - s.amp) * 0.05;
    s.scale += (target.s - s.scale) * 0.04;

    morph.current += ((mode === 3 ? 1 : 0) - morph.current) * 0.1;
    const m = Math.pow(morph.current, 1);

    if (m < 0.01 && mode !== 3) {
      isExiting.current = false;
    }

    const pos = positionAttr.array;
    const freqMod = 1 + hover.current.f * 0.003;
    const bpm = hover.current.b > 0 ? hover.current.b / 60 : 1;
    const pulseValue = Math.sin(t * bpm * Math.PI * 2) * 0.15;

    for (let i = 0, j = 0; i < count; i++, j += 3) {
      const x0 = originalPos[j];
      const y0 = originalPos[j + 1];
      const z0 = originalPos[j + 2];

      const r = Math.hypot(x0, y0, z0);
      const invR = r > 1e-6 ? 1.0 / r : 0.0;

      const theta = Math.atan2(y0, x0);
      const phi = Math.acos(z0 * invR);

      const wave =
        (Math.sin(s.freqR * r * freqMod - t * 1.2) *
          Math.cos(s.freqA * theta * freqMod + t * 0.8) *
          Math.cos(s.freqA * phi * freqMod - t * 0.6) +
          Math.sin(t * 2.5 + r * 5.0) * 0.05) *
        s.amp;

      let sx = x0 * invR * (2 + wave * 4 + pulseValue);
      let sy = y0 * invR * (2 + wave * 4 + pulseValue);
      let sz = z0 * invR * (2 + wave * 4 + pulseValue);

      const n =
        Math.sin(t * 0.7 + x0 * 1.2 + y0 * 0.8 + z0 * 0.5) * 0.02 +
        Math.cos(t * 0.4 + x0 * 0.5 - y0 * 1.1 + z0 * 0.3) * 0.02;

      const liquidFade = 1.0 - Math.pow(morph.current, 1.8);
      sx += n * liquidFade * 0.4;
      sy += n * liquidFade * 0.4;
      sz += n * liquidFade * 0.6;

      const smear =
        Math.sin(t * 2.0 + r * 3.0) *
        0.15 *
        Math.sin(morph.current * Math.PI);

      let tx = sx;
      let ty = sy;
      let tz = sz;

      if (contactPositions.current && m > 0.001) {
        const u = uvAttr.getX(i);
        const v = uvAttr.getY(i);

        const planeWidth = 30;
        const planeHeight = 30;

        const px = (u - 0.5) * planeWidth;
        const py = (v - 0.5) * planeHeight;
        const pz = contactPositions.current[j + 2];

        tx = px;
        ty = py;
        tz = pz;

        const pulseZ =
          Math.sin(t * 4.5 + x0 * 3.0 + y0 * 2.0) * (0.8 * m);
        tz += pulseZ;

        const t1 = Math.sin(t * 0.6 + x0 * 1.3 + y0 * 0.7) * 0.12;
        const t2 = Math.cos(t * 0.8 + y0 * 1.0 + z0 * 0.5) * 0.10;
        const t3 = Math.sin(t * 0.5 + z0 * 0.9 + x0 * 0.4) * 0.14;

        const drift = m * 0.22;

        tx += t1 * drift;
        ty += t2 * drift;
        tz += t3 * (drift * 1.4);
      }

      const vortexStrength = morph.current * 0.35;
      const vx = -y0 * vortexStrength * 0.04;
      const vy = x0 * vortexStrength * 0.04;

      const cloudLock = mode === 3 ? m : 0.0;
      const vortexFade = 1.0 - cloudLock;
      const smearFade = 1.0 - cloudLock;

      let explodeX = 0;
      let explodeY = 0;
      let explodeZ = 0;

      if (isExiting.current) {
        const explosion = Math.sin((1 - m) * Math.PI);
        const radialAmp = 0.6;
        const shockZ = 1.8;

        explodeX = x0 * explosion * radialAmp;
        explodeY = y0 * explosion * radialAmp;
        explodeZ = z0 * explosion * radialAmp + explosion * shockZ;
      }

      pos[j] =
        sx * (1 - m) +
        tx * m +
        vx * vortexFade +
        smear * 0.4 * smearFade +
        explodeX;

      pos[j + 1] =
        sy * (1 - m) +
        ty * m +
        vy * vortexFade +
        smear * 0.4 * smearFade +
        explodeY;

      pos[j + 2] =
        sz * (1 - m) +
        tz * m +
        smear * 0.4 * smearFade +
        explodeZ;
    }

    positionAttr.needsUpdate = true;

    const eased = ease(splitProgress);
    const rotZ = positionX < 0 ? -0.6 : 0.6;

    if (mesh.current) {
      s.scale = s.scale; // solo per chiarezza, non cambia nulla

      mesh.current.position.x = positionX * eased;
      mesh.current.scale.setScalar(s.scale + pulseValue * 0.5);

      const baseRotX = 1.58;
      const targetRotX = 1.58 + Math.PI / 2;
      const rotX =
        baseRotX * (1.0 - m) +
        targetRotX * m;

      mesh.current.rotation.set(rotX, 0.01, rotZ * eased * 1);
    }
  });

  return <points ref={mesh} geometry={geometry} material={mat} />;
}
