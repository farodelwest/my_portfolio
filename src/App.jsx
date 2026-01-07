// App.jsx
import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { TextureLoader } from "three";
import { motion, AnimatePresence } from "framer-motion";

const FONT = "Helvetica, 'Helvetica Neue', sans-serif";
const COLOR = "#ffffff";

// ===============================
//   MOBILE DETECTION
// ===============================
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.matchMedia(`(max-width: ${breakpoint}px)`).matches);
    };

    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);

    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [breakpoint]);

  return isMobile;
}

// ===============================
//   FLOATING IMAGES 3D
// ===============================
function FloatingImages3D({
  images = [],
  freq = 0,
  bpm = 0,
  pulse = 0,
  isMobile,
}) {
  if (images.length === 1) return null;

  const validImages = useMemo(() => {
    const imgs = images.filter((p) => typeof p === "string" && p.length > 0);
    return isMobile ? imgs.slice(0, 2) : imgs;
  }, [images, isMobile]);

  if (validImages.length === 0) return null;

  const textures = useLoader(TextureLoader, validImages);
  const group = useRef();

  const baseHeight = isMobile ? 2.4 : 3.2;

  const planes = useMemo(() => {
    return textures.map((tex) => {
      const img = tex.image;
      const w = img?.naturalWidth || img?.width || 1000;
      const h = img?.naturalHeight || img?.height || 1000;
      const aspect = w / h || 1;
      return { width: baseHeight * aspect, height: baseHeight };
    });
  }, [textures, baseHeight]);

  const positions = useMemo(() => {
    const spread = isMobile ? 3.2 : 4.7;
    return textures.map((_, i) => ({
      x: i % 2 === 0 ? -spread : spread,
      y: (Math.random() - 0.5) * 1.5,
      z: -0.25,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [textures, isMobile]);

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
          (isMobile ? 0.05 : 0.08);

        arr[j] = x0;
        arr[j + 1] = y0;
        arr[j + 2] =
          z0 + coneShape + centerRipple + edgeRipple + pulseAmount;
      }

      posAttr.needsUpdate = true;
    });
  });

  return (
    <group ref={group}>
      {textures.map((tex, i) => (
        <mesh key={i} position={[positions[i].x, positions[i].y, positions[i].z]}>
          <planeGeometry
            args={[
              planes[i].width,
              planes[i].height,
              isMobile ? 50 : 90,
              isMobile ? 50 : 90,
            ]}
          />
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

// ===============================
//   CYMATIC SPHERE
// ===============================
function CymaticSphere({
  mode,
  color,
  positionX,
  splitProgress,
  hoverFreq,
  hoverBpm,
  id,
  hasClicked,
  contactsT, // 👈 transizione sfera ↔ onda (0→1→0)
}) {
  const mesh = useRef();

  const geometry = useMemo(() => new THREE.SphereGeometry(0.5, 220, 220), [id]);
  const positionAttr = geometry.attributes.position;
  const originalPos = useMemo(() => positionAttr.array.slice(), []);
  const count = positionAttr.count;

  const state = useRef({ freqR: 5, freqA: 7, amp: 0.15, scale: 1 });
  const hover = useRef({ f: 0, b: 0 });

  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 5.1 * (1.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;

        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;

          vec3 col = uColor;
          gl_FragColor = vec4(col, 1.0 - d * 2.0);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
  }, [color]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;
    const cT = contactsT ?? 0; // 0 = solo sfera, 1 = solo onda

    // ORIENTAMENTO BASE
    if (mesh.current) {
      if (mode === 3 || cT > 0.0001) {
        // durante tutta la morph verso/da CONTACTS tieni frontale
mesh.current.rotation.copy(mesh.current.rotation);
      } else {
        mesh.current.rotation.set(1.5, 0, 0);
      }
      
    }

    if (mesh.current) {
  // ORIENTAMENTO DI DEFAULT (vale per TUTTO)
mesh.current.rotation.copy(mesh.current.rotation);

  // SOLO ABOUT modifica l’orientamento
  if (mode === 1 && cT === 0) {
    mesh.current.rotation.set(1.5, positionX < 0 ? 0 : 0, 0);
  }
}

    // -------------------------------------------------
    // SCALA: piccola finché non clicchi, poi animazione
    // -------------------------------------------------
    const SMALL_SCALE = 0.23;

    if (mesh.current) {
      if (!window.__sphereInitialized && !hasClicked) {
        mesh.current.scale.setScalar(SMALL_SCALE);

        if (mode === 0) {
          mesh.current.position.x = 0;
          mesh.current.position.y =
            Math.sin(t * 1.5) * 0.05 +
            Math.cos(t * 2.3) * 0.03;

          mesh.current.rotation.z = Math.sin(t * 0.9) * 0.3;
        }
      } else if (!window.__sphereInitialized && hasClicked) {
        if (mesh.current.userData.scaleStart === undefined) {
          mesh.current.userData.scaleStart = t;
        }
        const elapsed = t - mesh.current.userData.scaleStart;
        const dur = 1.1;
        const p = Math.min(elapsed / dur, 1);
        const easedScale = 0.5 - 0.5 * Math.cos(Math.PI * p);
        const targetScale = state.current.scale || 1;

        const scale = SMALL_SCALE + (targetScale - SMALL_SCALE) * easedScale;
        mesh.current.scale.setScalar(scale);

        if (p >= 1) {
          window.__sphereInitialized = true;
        }
      } else if (window.__sphereInitialized) {
        mesh.current.scale.setScalar(state.current.scale);
      }
    }

    // -------------------------------
    // PARAMETRI DI DEFORMAZIONE
    // -------------------------------
    hover.current.f += (hoverFreq - hover.current.f) * 0.05;
    hover.current.b += (hoverBpm - hover.current.b) * 0.05;

    const target = [
      { r: 1, a: 3, amp: 0.2, s: 1.5 },
      { r: 0.2, a: 6, amp: 0.4, s: 1 },
      { r: 3, a: 1, amp: 0.35, s: 8 },
      { r: 20, a: 1, amp: 0.9, s: 4 },
    ][mode];

    const s = state.current;
    s.freqR += (target.r - s.freqR) * 0.02;
    s.freqA += (target.a - s.freqA) * 0.02;
    s.amp   += (target.amp - s.amp) * 0.05;
    s.scale += (target.s - s.scale) * 0.04;

    const pos = positionAttr.array;
    const freqMod = 1 + hover.current.f * 0.003;
    const bpm = hover.current.b > 0 ? hover.current.b / 60 : 1;
    const pulseValue = Math.sin(t * bpm * Math.PI * 2) * 0.15;

    const stereoSide = positionX < 0 ? -1 : 1;

    // ============================================
    // LOOP PRINCIPALE DEI PUNTI
    // ============================================
    for (let i = 0, j = 0; i < count; i++, j += 3) {
      const x0 = originalPos[j];
      const y0 = originalPos[j + 1];
      const z0 = originalPos[j + 2];

      const r = Math.hypot(x0, y0, z0);
      const invR = r > 1e-6 ? 1.0 / r : 0.0;

      const theta = Math.atan2(y0, x0);
      const phi = Math.acos(z0 * invR);

      let sx, sy, sz;

      // -------------------------
      // TARGET ONDA (per CONTACTS)
      // -------------------------
      let waveX = 0;
      let waveY = 0;
      let waveZ = 0;

      // calcolo l'onda se sono in CONTACTS OPPURE sto ancora morfando (cT > 0)
      if (mode === 3 || cT > 0.0001) {
        const u = i / count; // 0 → 1 lungo la "linea" dell'onda

        // piccolo "respiro" dell'onda
        const breath = 0.9 + 0.1 * Math.sin(t * 0.6);

        const waveWidth  = 3.2;
        const waveHeight = 0.65 * breath;
        const speed      = 2.0;

        // fase leggermente diversa L/R per effetto stereo
        const phase = u * Math.PI * 2.0 + t * speed + stereoSide * 1.5;

        let X = (u - 0.5) * waveWidth;
        const baseY = Math.sin(phase) * waveHeight;
        let Y = baseY;
        let Z = 0.0;

        // envelope centro / estremità (pulito → polveroso)
        const du = u - 0.5;
        const edge = Math.min(Math.abs(du) * 2.0, 1.0); // 0 centro, 1 bordi

        const dustFactor   = edge * edge;        // 0 al centro, cresce ai bordi
        const centerFactor = 1.0 - dustFactor;   // 1 al centro, scende ai bordi

        const lineFactor = 0.5 + 0.5 * centerFactor;
        Y = baseY * lineFactor;

        // glitch leggero ovunque
        const grain =
          Math.sin(t * 4.0 + u * 35.0 + stereoSide * 2.3) * 0.02 +
          (Math.random() - 0.5) * 0.003;

        // pulviscolo più forte ai bordi
        const dustAmt = 0.9 * dustFactor;
        const dustX = (Math.random() - 0.5) * 0.3 * dustAmt;
        const dustY = (Math.random() - 0.5) * 0.8 * dustAmt;
        const dustZ = (Math.random() - 0.5) * 0.6 * dustAmt;

        X += grain * 0.4 + dustX;
        Y += grain * 0.9 + dustY;
        Z += grain * 0.2 + dustZ;

        waveX = X;
        waveY = Z;
        waveZ = Y;
      }

      // ======================================
      //  MODI NORMALI (DEFORMAZIONI ORIGINALI)
      // ======================================
      const wave =
        (Math.sin(s.freqR * r * freqMod - t * 1.2) *
          Math.cos(s.freqA * theta * freqMod + t * 0.8) *
          Math.cos(s.freqA * phi * freqMod - t * 0.6) +
          Math.sin(t * 2.5 + r * 5.0) * 0.05) *
        s.amp;

      sx = x0 * invR * (2 + wave * 4 + pulseValue);
      sy = y0 * invR * (2 + wave * 4 + pulseValue);
      sz = z0 * invR * (2 + wave * 4 + pulseValue);

      const n =
        Math.sin(t * 0.7 + x0 * 1.2 + y0 * 0.8 + z0 * 0.5) * 0.02 +
        Math.cos(t * 0.4 + x0 * 0.5 - y0 * 1.1 + z0 * 0.3) * 0.02;

      sx += n * 0.4;
      sy += n * 0.4;
      sz += n * 0.6;

      {
        const tBlob = 1.0;
        const base = tBlob * tBlob * 1.2;
        const pushDir = Math.sign(positionX) || 1;

        const liquidX = Math.sin(t * 2.8 + y0 * 4.5 + z0 * 3.5) * base * 0.9;
        const liquidY = Math.sin(t * 3.2 + x0 * 3.5) * base * 0.7;
        const liquidZ =
          Math.cos(t * 3.8 + x0 * 4.0 + y0 * 2.5) * base * 1.1;

        const glitch = (Math.sin(t * 18 + r * 30) * 0.5 + 0.5) * 0.5;
        const glitchX = glitch * (Math.random() - 0.5) * 0.9;
        const glitchY = glitch * (Math.random() - 0.5) * 0.7;
        const glitchZ = glitch * (Math.random() - 0.5) * 1.2;

        const fuse = Math.sin(t * 1.2 + r * 3.0) * 0.4;

        sx -= pushDir * (liquidX * 0.5 + glitchX + fuse * 0.3);
        sy += pushDir * (liquidY * 0.4 + glitchY + fuse * 0.2);
        sz += pushDir * (liquidZ * 0.5 + glitchZ + fuse * 0.5);
      }

      if (splitProgress > 0.25) {
        const p = (splitProgress - 0.25) / 0.75;
        const chaos = Math.pow(p, 1.4);

        sx *= 1 + chaos * 0.35;
        sy *= 1 + chaos * 0.35;
        sz *= 1 + chaos * 0.35;
      }

      // ------------------------------
      // MORPH SFERA ↔ ONDA (CONTACTS)
      // ------------------------------
      if (mode === 3 || cT > 0.0001) {
        const k = Math.max(0, Math.min(1, cT));
        sx = sx * (1 - k) + waveX * k;
        sy = sy * (1 - k) + waveY * k;
        sz = sz * (1 - k) + waveZ * k;
      }

      pos[j]     = sx;
      pos[j + 1] = sy;
      pos[j + 2] = sz;
    }

    positionAttr.needsUpdate = true;

    // ==================================================
    // POSITION (SPOSTAMENTO DELLE SFERE/ONDE)
    // ==================================================
    const easedSplit = ease(splitProgress);

    if (!mesh.current) return;

    if (mode === 3 || cT > 0.0001) {
      // durante tutto il tempo in cui cT>0, uso la posizione delle onde
      const contactsYOffset = 0;
      const contactsXTarget = positionX < 0 ? -0.0 : 0.0;

      const startX = positionX * easedSplit;
      const x = THREE.MathUtils.lerp(startX, contactsXTarget, cT);
      const y = THREE.MathUtils.lerp(0, contactsYOffset, cT);

      mesh.current.position.x = x;
      mesh.current.position.y = y;
    } else if (!window.__sphereInitialized && mode === 0) {
      mesh.current.position.x = 0;
    } else {
      mesh.current.position.x = positionX * easedSplit;
      // y per gli altri mode resta 0
    }
  });

  return <points ref={mesh} geometry={geometry} material={mat} />;
}

// ===============================
//   UI — HEADER, TESTI, MENU
// ===============================
function AnimatedName({ mode, onClick, isMobile }) {
  const [expanded, setExpanded] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [floatY, setFloatY] = useState(0);

  useEffect(() => {
    let frame;
    let start = null;
    if (mode === 2) {
      const animate = (time) => {
        if (!start) start = time;
        const t = (time - start) / 1000;
        setFloatY(Math.sin(t * 1.2) * 1.2);
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  useEffect(() => {
    let timer;
    if (mode === 0) {
      if (firstLoad) {
        setExpanded(false);
        timer = setTimeout(() => {
          setExpanded(true);
          setFirstLoad(false);
        }, 1000);
      } else {
        setExpanded(true);
      }
    } else if (mode === 1) {
      timer = setTimeout(() => setExpanded(false), 150);
    } else if (mode === 2) {
      setExpanded("full");
    } else {
      setExpanded(false);
    }
    return () => clearTimeout(timer);
  }, [mode, firstLoad]);

  const matteoSpacing =
    expanded === "full"
      ? isMobile ? "6vh" : "14.3vh"
      : expanded
      ? "1.2em"
      : "0.15em";

  const fariselliSpacing =
    expanded === "full"
      ? isMobile ? "4vh" : "8.57vh"
      : expanded
      ? "1.2em"
      : "0.15em";

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        top: isMobile
          ? "4vh"
          : `calc(3vh + ${mode === 2 ? floatY : 0}vh)`,
        left: "51.2%",
        transform: "translateX(-50%) translateZ(0)",
        color: "#ffffff",
        fontFamily: FONT,
        fontSize: isMobile ? "1.4rem" : "2rem",
        fontWeight: 300,
        lineHeight: "0.3em",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 9,
        cursor: "pointer",
        userSelect: "none",
        transition: "top 0.6s ease-out",
        filter: mode === 2 ? "url(#global-warp)" : "none",
      }}
    >
      {/* MATTEO */}
      <div
        style={{
          display: "inline-block",
          marginBottom: isMobile ? "0.4em" : "0.6em",
          transform:
            expanded === "full"
              ? "translateX(3vw)"
              : expanded
              ? "translateX(0)"
              : "translateX(-9vw)",
          transition: "transform 1s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <span
          style={{
            letterSpacing: matteoSpacing,
            whiteSpace: "nowrap",
            transition:
              "letter-spacing 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          M A T T E O
        </span>
      </div>

      {/* FARISELLI */}
      <div
        style={{
          display: "inline-block",
          transform:
            expanded === "full"
              ? "translateX(2.3vh)"
              : expanded
              ? "translateX(0)"
              : "translateX(10vw)",
          transition: "transform 1s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <span
          style={{
            letterSpacing: fariselliSpacing,
            whiteSpace: "nowrap",
            transition:
              "letter-spacing 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          F A R I S E L L I
        </span>
      </div>
    </div>
  );
}

function AboutText({ visible, isMobile }) {
  const variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { delay: 1, duration: 0.2 },
    },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key="about-text"
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: "absolute",
            top: "50%",
            left: "52%",
            transform: "translate(-52%, -50%)",
            width: isMobile ? "85vw" : "clamp(300px, 60vw, 600px)",
            color: "#ffffff",
            fontFamily: "Helvetica Neue, sans-serif",
            fontWeight: 200,
            fontSize: isMobile ? "0.95rem" : "1rem",
            letterSpacing: "0.04em",
            lineHeight: isMobile ? "1.55em" : "1.65em",
            textAlign: "center",
            zIndex: 8,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >

          <p style={{ marginBottom: "1.4em" }}>
            I’m a designer and musician from Bologna working across product, visual and sound-based practices. My background in design intersects with a deep interest in acoustics and perception, leading me to develop systems that respond to light, movement, noise and human presence.
          </p>

          <p style={{ marginBottom: "1.4em" }}>
            I think of my work as a way to listen to reality and subtly alter it, while observing how people experience the environments they inhabit. I’m particularly interested in how space influences perception, how sound can shift attention, and how interaction becomes a form of dialogue.
          </p>

          <p>
            From this research emerge responsive devices, wearable instruments and visual systems that translate environmental conditions into new forms of experience, inviting people to sense — and renegotiate — their connection with what surrounds them.
          </p>

        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ContactsText({ visible, isMobile }) {
  const variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { delay: 1, duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  return (
    <AnimatePresence mode="wait">
      {visible && (
        isMobile ? (
          // =========================
          // MOBILE LAYOUT (STACK)
          // =========================
          <motion.div
            key="contacts-mobile"
            variants={variants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: "absolute",
              top: "55%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "85vw",
              color: "#ffffff",
              fontFamily: "Helvetica Neue, sans-serif",
              fontWeight: 200,
              fontSize: "0.95rem",
              letterSpacing: "0.04em",
              lineHeight: "1.8em",
              textAlign: "center",
              userSelect: "none",
              zIndex: 8,
            }}
          >
            <div style={{ marginBottom: "1.6em" }}>
              Contact me for collaborations in product and graphic design,
              exhibitions, live sets and events or just to share an idea.
            </div>

            <div style={{ marginBottom: "0.6em" }}>
              +39 349 059 5551
            </div>

            <a
              href="mailto:matteo.fariselli@hotmail.com"
              style={{
                color: "#ffffff",
                textDecoration: "none",
                display: "block",
                marginBottom: "1em",
              }}
            >
              matteo.fariselli@hotmail.com
            </a>

            <a
              href="https://www.linkedin.com/in/matteo-fariselli"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                opacity: 0.85,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="2"
                  y="2"
                  width="20"
                  height="20"
                  rx="2"
                  ry="2"
                  fill="rgba(255,255,255,0.15)"
                />
                <path d="M8 11v5" />
                <path d="M8 8h.01" />
                <path d="M12 16v-5a2 2 0 0 1 4 0v5" />
              </svg>
            </a>
          </motion.div>
        ) : (
          // =========================
          // DESKTOP LAYOUT (ORIGINALE)
          // =========================
          <>
            <motion.div
              key="contacts-left"
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                position: "absolute",
                top: "50%",
                left: "2%",
                transform: "translateY(-50%)",
                color: "#ffffff",
                fontFamily: "Helvetica Neue, sans-serif",
                fontWeight: 200,
                fontSize: "0.95rem",
                letterSpacing: "0.04em",
                lineHeight: "1.7em",
                textAlign: "left",
                width: "260px",
                userSelect: "none",
                zIndex: 8,
              }}
            >
              Contact me for collaborations in products and graphics design,
              exhibitions, live sets and events or just to share an idea.
            </motion.div>

            <motion.div
              key="contacts-right"
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                position: "absolute",
                top: "50%",
                left: "90.7%",
                transform: "translate(-50%, -50%)",
                color: "#ffffff",
                fontFamily: "Helvetica Neue, sans-serif",
                fontWeight: 200,
                fontSize: "1rem",
                letterSpacing: "0.04em",
                lineHeight: "2em",
                textAlign: "right",
                zIndex: 8,
                userSelect: "none",
              }}
            >
              <div>+39 349 059 5551</div>

              <a
                href="mailto:matteo.fariselli@hotmail.com"
                style={{
                  color: "#ffffff",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                matteo.fariselli@hotmail.com
              </a>

              <a
                href="https://www.linkedin.com/in/matteo-fariselli"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: "0.8em",
                  opacity: 0.8,
                  transition: "opacity 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.8)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect
                    x="2"
                    y="2"
                    width="20"
                    height="20"
                    rx="2"
                    ry="2"
                    fill="rgba(255,255,255,0.15)"
                  />
                  <path d="M8 11v5" />
                  <path d="M8 8h.01" />
                  <path d="M12 16v-5a2 2 0 0 1 4 0v5" />
                </svg>
              </a>
            </motion.div>
          </>
        )
      )}
    </AnimatePresence>
  );
}

function downloadFile(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function ProjectTypes({ visible, onHover, onBgChange, isMobile }) {
  const productImages = Object.keys(
    import.meta.glob("/public/images/productdesign/*.webp", { eager: true })
  ).map((p) => p.replace("/public", ""));

  const graphicImages = Object.keys(
    import.meta.glob("/public/images/graphicdesign/*.webp", { eager: true })
  ).map((p) => p.replace("/public", ""));

  const soundImages = Object.keys(
    import.meta.glob("/public/images/sounddesign/*.webp", { eager: true })
  ).map((p) => p.replace("/public", ""));

  const texts = [
    { label: "Product Design", freq: 900, bpm: 70, images: productImages },
    { label: "Graphic Design", freq: 450, bpm: 110, images: graphicImages },
    { label: "Sound Design", freq: 180, bpm: 160, images: soundImages },
  ];

  const activate = (t) => {
    onHover(t.freq, t.bpm);
    if (t.images.length > 0) {
      const shuffled = [...t.images].sort(() => 0.5 - Math.random());
      onBgChange(shuffled.slice(0, 2));
    }
  };

  const deactivate = () => {
    onHover(0, 0);
    onBgChange([]);
  };

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          style={{
            alignItems: "center",
            position: "absolute",
            top: isMobile ? "45%" : "38%",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "3rem" : "5rem",
            zIndex: 8,
          }}
        >
          {texts.map((t) => (
            <div
              key={t.label}
              onClick={() => activate(t)}
              onMouseEnter={!isMobile ? () => activate(t) : undefined}
              onMouseLeave={!isMobile ? deactivate : undefined}
              style={{
                color: "#fff",
                fontFamily: "Helvetica, sans-serif",
                fontWeight: 150,
                fontSize: "0.9rem",
                letterSpacing: "0.25em",
                cursor: "pointer",
              }}
            >
              {t.label}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ===============================
//   APP PRINCIPALE
// ===============================
// ===============================
//   APP PRINCIPALE
// ===============================
export default function App() {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState(0);
  const [showTypes, setShowTypes] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [split, setSplit] = useState(false);
  const [splitProgress, setSplitProgress] = useState(0);
  const [hoverFreq, setHoverFreq] = useState(0);
  const [hoverBpm, setHoverBpm] = useState(0);
  const [bgImages, setBgImages] = useState([]);

  const [hasClicked, setHasClicked] = useState(false);
  const [contactsT, setContactsT] = useState(0); // morph sfera ↔ onda

  const prevModeRef = useRef(mode); // 👈 per capire se stiamo entrando/uscendo da CONTACTS

  const sphereColor = "#ffffff"; // sempre bianco

const left = isMobile ? -2.2 : -5.5;
const right = isMobile ? 2.2 : 5.5;

  const sections = [
    { label: "About", mode: 1 },
    { label: "Works", mode: 2 },
    { label: "Contacts", mode: 3 },
  ];

  const click = (s) => {
    setMode(s.mode);
    setShowTypes(s.label === "Works");
    setShowAbout(s.label === "About");
    setSplit(s.label === "About");
    if (s.label !== "Works") setBgImages([]);
  };

  // Animazione split (About)
  useEffect(() => {
    let start;
    const duration = 1500;
    const easeSplit = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

    const animate = (time) => {
      if (!start) start = time;
      const p = Math.min((time - start) / duration, 1);
      setSplitProgress(split ? easeSplit(p) : 1 - easeSplit(p));
      if (p < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [split]);

  // Animazione warp filter SVG
  useEffect(() => {
    let frame;
    let t0 = null;
    const filter = document.getElementById("global-warp");
    if (!filter) return;

    const turb = filter.querySelector("feTurbulence");
    const disp = filter.querySelector("feDisplacementMap");

    const animate = (time) => {
      if (!t0) t0 = time;
      const t = (time - t0) / 0.1;
      const seed = (Math.sin(t * 0.5) + Math.cos(t * 0.4)) * 0.5 + 0.5;

      if (mode === 0 || mode === 2) {
        turb.setAttribute(
          "baseFrequency",
          `${30 + seed * 30} ${30 + seed * 50}`
        );
        disp.setAttribute("scale", `${10 + seed * 20}`);
      } else {
        disp.setAttribute("scale", "0");
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  // Animazione morph sfera ↔ onda quando entri/esci da CONTACTS
  useEffect(() => {
    let frame;
    let start = null;
    const duration = 900; // ms
    const ease01 = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

    const from = prevModeRef.current;
    const to = mode;

    // Entrata in CONTACTS: 0 → 1
    if (to === 3 && from !== 3) {
      const animateUp = (time) => {
        if (!start) start = time;
        const p = Math.min((time - start) / duration, 1);
        const eased = ease01(p);
        setContactsT(eased);
        if (p < 1) {
          frame = requestAnimationFrame(animateUp);
        }
      };
      frame = requestAnimationFrame(animateUp);
    }
    // Uscita da CONTACTS: 1 → 0
    else if (from === 3 && to !== 3) {
      const animateDown = (time) => {
        if (!start) start = time;
        const p = Math.min((time - start) / duration, 1);
        const eased = ease01(p);
        setContactsT(1 - eased);
        if (p < 1) {
          frame = requestAnimationFrame(animateDown);
        }
      };
      frame = requestAnimationFrame(animateDown);
    }
    // altri casi: se non siamo in CONTACTS, forziamo 0
    else if (to !== 3) {
      setContactsT(0);
    }

    prevModeRef.current = mode;

    return () => cancelAnimationFrame(frame);
  }, [mode]);

  return (
    <div
      onClick={() => {
        if (!hasClicked) {
          setHasClicked(true);
        }
      }}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000000ff",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Filtro SVG */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <filter id="global-warp">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01 0.02"
            numOctaves="2"
            result="warp"
          />
          <feDisplacementMap in2="warp" in="SourceGraphic" scale="0" />
        </filter>
      </svg>

      {/* HEADER */}
      <AnimatedName
        mode={mode}
        onClick={() => {
          setSplit(false);
          setShowTypes(false);
          setShowAbout(false);
          setMode(0);
          setBgImages([]);
        }}
      />

      {/* PAYOFF (HOME) */}
      {mode === 0 && (
        <>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              width: "50%",
              transform: "translateY(-50%)",
              textAlign: "center",
              color: COLOR,
              fontFamily: FONT,
              fontWeight: 200,
              fontSize: "2.6rem",
              letterSpacing: "0.28em",
              mixBlendMode: "difference",
              zIndex: 3,
              userSelect: "none",
              visibility: "hidden",
              animation: "showLater 0s forwards",
              animationDelay: "1.9s",
              filter: "url(#global-warp)",
            }}
          >
            MY WALL
          </div>
          <div
            style={{
              position: "absolute",
              top: "50%",
              right: 0,
              width: "50%",
              transform: "translateY(-50%)",
              textAlign: "center",
              color: COLOR,
              fontFamily: FONT,
              fontWeight: 200,
              fontSize: "2.6rem",
              letterSpacing: "0.28em",
              mixBlendMode: "difference",
              zIndex: 3,
              userSelect: "none",
              visibility: "hidden",
              animation: "showLater 0s forwards",
              animationDelay: "1.9s",
              filter: "url(#global-warp)",
            }}
          >
            OF SOUND
          </div>
        </>
      )}

      {/* CANVAS */}
      <Canvas
  camera={{
    position: isMobile ? [0, 0, 10.5] : [0, 0, 8],
    fov: isMobile ? 65 : 55,
  }}
>

        <ambientLight intensity={0.9} />
        <directionalLight intensity={0.7} position={[3, 5, 6]} />

        {bgImages.length > 0 && (
          <FloatingImages3D
  images={bgImages}
  freq={hoverFreq}
  bpm={hoverBpm}
  pulse={window.lastPulse || 0}
  isMobile={isMobile}
/>

        )}

        <CymaticSphere
  id="left"
  mode={mode}
  color={sphereColor}
  positionX={left}
  splitProgress={splitProgress}
  hoverFreq={hoverFreq}
  hoverBpm={hoverBpm}
  hasClicked={hasClicked}
  contactsT={contactsT}
  isMobile={isMobile}
/>

<CymaticSphere
  id="right"
  mode={mode}
  color={sphereColor}
  positionX={right}
  splitProgress={splitProgress}
  hoverFreq={hoverFreq}
  hoverBpm={hoverBpm}
  hasClicked={hasClicked}
  contactsT={contactsT}
  isMobile={isMobile}
/>

      </Canvas>

      <ProjectTypes
  visible={showTypes}
  onHover={(f, b) => {
    setHoverFreq(f);
    setHoverBpm(b);
  }}
  onBgChange={(arr) => setBgImages(arr)}
  isMobile={isMobile}
/>


      <AboutText visible={showAbout} />
      <ContactsText visible={mode === 3} />

      {/* MENU */}
      <div
        style={{
          position: "absolute",
          bottom: isMobile
  ? "calc(2vh + env(safe-area-inset-bottom))"
  : "2vh",
          left: 0,
          width: "100vw",
          color: COLOR,
          fontWeight: 100,
          fontSize: isMobile ? "0.85rem" : "1rem",
          letterSpacing: "0.15em",
          fontFamily: FONT,
          zIndex: 9,
        }}
      >
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            click(sections[0]);
          }}
          style={{
            position: "absolute",
            left: "2vw",
            bottom: "calc(2vh - 1.2em)",
            textDecoration: "none",
            color: COLOR,
            opacity: 0.6,
            cursor: "pointer",
            transition: "opacity 0.3s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
        >
          ABOUT
        </a>

        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            click(sections[1]);
          }}
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "calc(2vh - 1.2em)",
            textDecoration: "none",
            color: COLOR,
            opacity: 0.6,
            cursor: "pointer",
            transition: "opacity 0.3s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
        >
          WORKS
        </a>

        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            click(sections[2]);
          }}
          style={{
            position: "absolute",
            right: "2vw",
            bottom: "calc(2vh - 1.2em)",
            textDecoration: "none",
            color: COLOR,
            opacity: 0.6,
            cursor: "pointer",
            transition: "opacity 0.3s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
        >
          CONTACTS
        </a>
      </div>
    </div>
  );
}
