// App.jsx
import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { FloatingImages3D, CymaticSphere } from "./Visual3D";
import {
  AnimatedName,
  AboutText,
  ContactsText,
  ProjectTypes,
} from "./UISections";

const FONT = "Helvetica, 'Helvetica Neue', sans-serif";
const COLOR = "#ffffff";

export default function App() {
  const [mode, setMode] = useState(0);
  const [showTypes, setShowTypes] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [split, setSplit] = useState(false);
  const [splitProgress, setSplitProgress] = useState(0);
  const [hoverFreq, setHoverFreq] = useState(0);
  const [hoverBpm, setHoverBpm] = useState(0);
  const [bgImages, setBgImages] = useState([]);

  const sphereColor = mode === 3 ? "#000000" : "#ffffff";

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
    setSplit(s.label === "About");
    if (s.label !== "Works") setBgImages([]);
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

  return (
    <div
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

      {/* PAYOFF */}
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
              transform: "translateY(-50%) translateZ(0)",
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
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }}>
        <ambientLight intensity={0.9} />
        <directionalLight intensity={0.7} position={[3, 5, 6]} />

        {bgImages.length > 0 && (
          <FloatingImages3D
            images={bgImages}
            freq={hoverFreq}
            bpm={hoverBpm}
            pulse={window.lastPulse || 0}
          />
        )}

        {/* Sfere */}
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
        onHover={(f, b) => {
          setHoverFreq(f);
          setHoverBpm(b);
        }}
        onBgChange={(arr) => setBgImages(arr)}
      />

      <AboutText visible={showAbout} />
      <ContactsText visible={mode === 3} />

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
            transition: "opacity 0.3s ease",
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
            transition: "opacity 0.3s ease",
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
            transition: "opacity 0.3s ease",
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
