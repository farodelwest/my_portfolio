import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// === CONFIG ===
const FONT = "Helvetica, 'Helvetica Neue', sans-serif";
const COLOR = "#ffffff";

// === SEZIONE GUIDE (debug layout) ===
function Guides() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {/* CENTRALE VERTICALE */}
      <div style={{
        position: "absolute",
        top: 0,
        left: "50%",
        width: "1px",
        height: "100%",
        background: "rgba(255, 0, 0, 0.4)",
      }}/>

      {/* MARGINI LATERALI */}
      <div style={{
        position: "absolute",
        top: 0,
        left: "2vw",
        width: "1px",
        height: "100%",
        background: "rgba(0, 255, 255, 0.3)",
      }}/>
      <div style={{
        position: "absolute",
        top: 0,
        right: "2vw",
        width: "1px",
        height: "100%",
        background: "rgba(0, 255, 255, 0.3)",
      }}/>

      {/* MARGINI SUPERIORE/INFERIORE */}
      <div style={{
        position: "absolute",
        top: "2vh",
        left: 0,
        width: "100%",
        height: "1px",
        background: "rgba(255, 255, 0, 0.4)",
      }}/>
      <div style={{
        position: "absolute",
        bottom: "2vh",
        left: 0,
        width: "100%",
        height: "1px",
        background: "rgba(255, 255, 0, 0.4)",
      }}/>

      {/* CENTRALE ORIZZONTALE */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: 0,
        width: "100%",
        height: "1px",
        background: "rgba(0, 255, 0, 0.4)",
      }}/>
    </div>
  );
}

// === COMPONENTE NOME ANIMATO (sempre nitido, niente warp) ===
function AnimatedName({ mode, onClick }) {
  const [expanded, setExpanded] = React.useState(false);
  const [firstLoad, setFirstLoad] = React.useState(true);
  const [floatY, setFloatY] = React.useState(0);

  // Oscillazione solo in Works
  React.useEffect(() => {
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

  // Espansione lettere
  React.useEffect(() => {
    let timer;
    if (mode === 0) {
      if (firstLoad) {
        setExpanded(false);
        timer = setTimeout(() => {
          setExpanded(true);
          setFirstLoad(false);
        }, 1000);
      } else setExpanded(true);
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
    expanded === "full" ? "14.3vh" : expanded ? "1.2em" : "0.15em";
  const fariselliSpacing =
    expanded === "full" ? "8.57vh" : expanded ? "1.2em" : "0.15em";

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        top: `calc(3vh + ${mode === 2 ? floatY : 0}vh)`,
        left: "51.2%",
        transform: "translateX(-50%) translateZ(0)",
        color: "#ffffff",
        fontFamily: "Helvetica, 'Helvetica Neue', sans-serif",
        fontSize: "2rem",
        fontWeight: 300,
        lineHeight: "0.3em",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        textAlign: "center",
        gap: "0.6em",
        zIndex: 9,
        cursor: "pointer",
        userSelect: "none",
        transition: "top 0.6s ease-out",
        filter: mode === 2 ? "url(#global-warp)" : "none",
        willChange: "filter, transform",
      }}
    >
      <div
        style={{
          display: "inline-block",
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
            display: "inline-block",
            letterSpacing: matteoSpacing,
            whiteSpace: "nowrap",
            transition:
              "letter-spacing 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          M A T T E O
        </span>
      </div>

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
            display: "inline-block",
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

// === SFERA CYMATICA ===
function CymaticSphere({ mode, color, positionX, splitProgress, hoverFreq, hoverBpm, id }) {
  const mesh = useRef();
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 400, 400), [id]);
  const { position } = geometry.attributes;

  const state = useRef({ freqR: 5, freqA: 7, amp: 0.15, scale: 1 });
  const hover = useRef({ f: 0, b: 0 });

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const v = new THREE.Vector3();

    hover.current.f += (hoverFreq - hover.current.f) * 0.05;
    hover.current.b += (hoverBpm - hover.current.b) * 0.05;

    const target = [
      { r: 1, a: 1, amp: 0.7, s: 1 },
      { r: 3, a: 1, amp: 0.35, s: 4 },
      { r: 1, a: 6, amp: 0.55, s: 1 },
      { r: 20, a: 1, amp: 0.9, s: 1 },
    ][mode];

    const s = state.current;
    s.freqR += (target.r - s.freqR) * 0.02;
    s.freqA += (target.a - s.freqA) * 0.02;
    s.amp += (target.amp - s.amp) * 0.05;
    s.scale += (target.s - s.scale) * 0.04;

    const freqMod = 1 + hover.current.f * 0.003;
    const bpm = hover.current.b > 0 ? hover.current.b / 60 : 1;
    const pulse = Math.sin(t * bpm * Math.PI * 2) * 0.03;

    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i);
      const r = v.length();
      const theta = Math.atan2(v.y, v.x);
      const phi = Math.acos(v.z / r);
      const wave =
        (Math.sin(s.freqR * r * freqMod - t * 1.2) *
          Math.cos(s.freqA * theta * freqMod + t * 0.8) *
          Math.cos(s.freqA * phi * freqMod - t * 0.6) +
          Math.sin(t * 2.5 + r * 5.0) * 0.05) *
        s.amp;
      v.normalize().multiplyScalar(2.5 + wave * 4);
      position.setXYZ(i, v.x, v.y, v.z);
    }

    position.needsUpdate = true;

    const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
    const eased = ease(splitProgress);
    const deform = ease(Math.min(1, splitProgress * 1.2));
    const vertical = 1 - deform * 0.4;
    const horizontal = 1 + deform * 0.3;
    const rotZ = positionX < 0 ? -0.6 : 0.6;

    if (mesh.current) {
      mesh.current.position.x = positionX * eased;
      mesh.current.rotation.set(1.585, 0.1, rotZ * eased);
      mesh.current.scale.set(
        s.scale * horizontal + pulse,
        s.scale * vertical + pulse,
        s.scale * horizontal + pulse
      );
    }
  });

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) } },
        vertexShader: `
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 3.4 * (1.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            gl_FragColor = vec4(uColor, 1.0 - d * 2.0);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color]
  );

  return <points ref={mesh} geometry={geometry} material={mat} />;
}

// === ABOUT ===
function AboutText({ visible }) {
  const variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { delay: 1, duration: 0.2 } },
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
            width: "clamp(300px, 60vw, 600px)",
            color: "#ffffff",
            fontFamily: "Helvetica Neue, sans-serif",
            fontWeight: 200,
            fontSize: "1rem",
            letterSpacing: "0.04em",
            lineHeight: "1.65em",
            textAlign: "center",
            zIndex: 8,
            userSelect: "none",
            mixBlendMode: "difference",
            pointerEvents: "none",
          }}
        >
          Born in Bologna, is a product and graphic designer, graduated from Alma Mater Studiorum.
          In 2024, together with his team, he won the Maverx Biomedical award in collaboration with Call for Start Up for the project LYBRA.
          Blends industrial-inspired influences into his work, while seeking a form of communication shaped by grunge design.
          He is also an active musician and sound designer, collaborating with artists from the Bologna scene on both musical and graphic projects.
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// === PROJECT TYPES ===
function ProjectTypes({ visible, onHover, onColorChange }) {
  const texts = [
    { label: "Product Design", freq: 900, bpm: 70, color: "#595600ff" },
    { label: "Graphic Design", freq: 450, bpm: 110, color: "#090082ff" },
    { label: "Sound Design", freq: 180, bpm: 160, color: "#be0052ff" },
  ];

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "absolute",
            top: "38%",
            left: "45%",
            transform: "translateX(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "5rem",
            zIndex: 8,
            mixBlendMode: "difference",
          }}
        >
          {texts.map((t) => (
            <div
              key={t.label}
              onMouseEnter={() => {
                onHover(t.freq, t.bpm);
                onColorChange(t.color);
              }}
              onMouseLeave={() => {
                onHover(0, 0);
                onColorChange("#000000ff");
              }}
              style={{
                color: "#fff",
                fontFamily: "Helvetica, sans-serif",
                fontWeight: 150,
                fontSize: "0.9rem",
                letterSpacing: "0.25em",
                userSelect: "none",
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

// === APP PRINCIPALE ===
export default function App() {
  const [mode, setMode] = useState(0);
  const [showTypes, setShowTypes] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [split, setSplit] = useState(false);
  const [splitProgress, setSplitProgress] = useState(0);
  const [hoverFreq, setHoverFreq] = useState(0);
  const [hoverBpm, setHoverBpm] = useState(0);
  const [bgColor, setBgColor] = useState("#0a0a0aff");

  const [sphereColor] = useState("#ffffff");
  const left = -5.5;
  const right = 5.5;
  const sections = [
    { label: "About", mode: 1 },
    { label: "Works", mode: 2 },
    { label: "Contacts", mode: 3 },
  ];

  const click = (s) => {
    setMode(s.mode);
    setShowTypes(s.label === "Works");
    setShowAbout(s.label === "About");
    setSplit(s.label === "Works");
  };

  useEffect(() => {
    let start;
    const duration = 1500;
    const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
    const animate = (time) => {
      if (!start) start = time;
      const p = Math.min((time - start) / duration, 1);
      setSplitProgress(split ? ease(p) : 1 - ease(p));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [split]);

    // 🔹 Warp “MY WALL / OF SOUND” SOLO in home (mode === 0)
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

      // Warp attivo in home o works
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

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: bgColor,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* 🔹 Filtro SVG globale (uno solo, condiviso) */}
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

      {/* GUIDE DEBUG */}
      {/* <Guides /> */}

      {/* HEADER */}
      <AnimatedName
        mode={mode}
        onClick={() => {
          setSplit(false);
          setShowTypes(false);
          setShowAbout(false);
          setMode(0);
          setBgColor("#0a0a0aff");
        }}
      />

      {/* PAYOFF (solo in Home, con warp) */}
      {mode === 0 && (
        <>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              width: "50%",
              transform: "translateY(-50%) translateZ(0)",
              textAlign: "center",
              color: COLOR,
              fontFamily: FONT,
              fontWeight: 200,
              fontSize: "2.6rem",
              letterSpacing: "0.28em",
              mixBlendMode: "difference",
              pointerEvents: "none",
              zIndex: 3,
              userSelect: "none",
              visibility: "hidden",
              animation: "showLater 0s forwards",
              animationDelay: "1.9s",
              filter: "url(#global-warp)",
              willChange: "filter, transform",
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
              transform: "translateY(-50%) translateZ(0)",
              textAlign: "center",
              color: COLOR,
              fontFamily: FONT,
              fontWeight: 200,
              fontSize: "2.6rem",
              letterSpacing: "0.28em",
              mixBlendMode: "difference",
              pointerEvents: "none",
              zIndex: 3,
              userSelect: "none",
              visibility: "hidden",
              animation: "showLater 0s forwards",
              animationDelay: "1.9s",
              filter: "url(#global-warp)",
              willChange: "filter, transform",
            }}
          >
            OF SOUND
          </div>
        </>
      )}

      {/* CANVAS */}
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }}>
        <ambientLight intensity={0.8} />
        <CymaticSphere
          id="left"
          mode={mode}
          color={sphereColor}
          positionX={left}
          splitProgress={splitProgress}
          hoverFreq={hoverFreq}
          hoverBpm={hoverBpm}
        />
        <CymaticSphere
          id="right"
          mode={mode}
          color={sphereColor}
          positionX={right}
          splitProgress={splitProgress}
          hoverFreq={hoverFreq}
          hoverBpm={hoverBpm}
        />
      </Canvas>

      <ProjectTypes
        visible={showTypes}
        onHover={(f, b) => (setHoverFreq(f), setHoverBpm(b))}
        onColorChange={(color) => setBgColor(color)}
      />
      <AboutText visible={showAbout} />

      {/* MENU */}
      <div
        style={{
          position: "absolute",
          bottom: "2vh",
          left: 0,
          width: "100vw",
          color: COLOR,
          fontWeight: 100,
          fontSize: "1rem",
          letterSpacing: "0.15em",
          fontFamily: FONT,
          zIndex: 9,
        }}
      >
        {/* ABOUT */}
        <a
          href="#"
          onClick={(e) => (e.preventDefault(), click(sections[0]))}
          style={{
            position: "absolute",
            left: "2vw",
            bottom: "calc(2vh - 1.2em)",
            textDecoration: "none",
            color: COLOR,
            opacity: 0.6,
            cursor: "pointer",
            transition: "opacity 0.3s ease",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 1)}
          onMouseLeave={(e) => (e.target.style.opacity = 0.6)}
        >
          ABOUT
        </a>

        {/* WORKS */}
        <a
          href="#"
          onClick={(e) => (e.preventDefault(), click(sections[1]))}
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "calc(2vh - 1.2em)",
            textDecoration: "none",
            color: COLOR,
            opacity: 0.6,
            cursor: "pointer",
            transition: "opacity 0.3s ease",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 1)}
          onMouseLeave={(e) => (e.target.style.opacity = 0.6)}
        >
          WORKS
        </a>

        {/* CONTACTS */}
        <a
          href="#"
          onClick={(e) => (e.preventDefault(), click(sections[2]))}
          style={{
            position: "absolute",
            right: "2vw",
            bottom: "calc(2vh - 1.2em)",
            textDecoration: "none",
            color: COLOR,
            opacity: 0.6,
            cursor: "pointer",
            transition: "opacity 0.3s ease",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 1)}
          onMouseLeave={(e) => (e.target.style.opacity = 0.6)}
        >
          CONTACTS
        </a>
      </div>
    </div>
  );
}
