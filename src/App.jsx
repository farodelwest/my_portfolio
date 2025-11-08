import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion } from "framer-motion";
import * as THREE from "three";

// === SFERA CYMATICA ===
function CymaticSphere({ targetMode, color }) {
  const meshRef = useRef();
  const geometry = new THREE.SphereGeometry(2.5, 128, 128);
  const positions = geometry.attributes.position;
  const current = useRef({ freqRadial: 5, freqAngular: 7 });

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const vertex = new THREE.Vector3();

    const modes = [
      { freqRadial: 5, freqAngular: 7 }, // neutra
      { freqRadial: 8, freqAngular: 5 }, // product
      { freqRadial: 6, freqAngular: 10 }, // graphic
      { freqRadial: 9, freqAngular: 9 }, // sound
    ];
    const target = modes[targetMode];

    current.current.freqRadial +=
      (target.freqRadial - current.current.freqRadial) * 0.02;
    current.current.freqAngular +=
      (target.freqAngular - current.current.freqAngular) * 0.02;

    const { freqRadial, freqAngular } = current.current;
    const amp = 0.15 + Math.sin(t * 0.3) * 0.03;

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);

      const r = vertex.length();
      const theta = Math.atan2(vertex.y, vertex.x);
      const phi = Math.acos(vertex.z / r);

      const radialWave = Math.sin(freqRadial * r - t * 1.2);
      const angularWave = Math.cos(freqAngular * theta + t * 0.8);
      const polarWave = Math.cos(freqAngular * phi - t * 0.6);

      const wave = radialWave * angularWave * polarWave * amp;
      vertex.normalize().multiplyScalar(2.5 + wave);

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    positions.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef}>
      <primitive object={geometry} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  );
}

// === STRUTTURA PRINCIPALE ===
export default function App() {
  const [mode, setMode] = useState(0);
  const [isLightMode, setIsLightMode] = useState(false);

  // Colori dinamici in base alla modalità
  const bgColor = isLightMode ? "white" : "black";
  const textColor = isLightMode ? "black" : "white";
  const sphereColor = isLightMode ? "#000000" : "#e0e0e0";

  const sections = [
    { label: "About", file: "/pdfs/product_design.pdf", mode: 1 },
    { label: "Works", file: "/pdfs/graphic_design.pdf", mode: 2 },
    { label: "Contacts", file: "/pdfs/sound_design.pdf", mode: 3 },
  ];

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
        transition: "background 0.6s ease",
      }}
    >
      {/* SWITCH ALTO SINISTRA */}
      <div
        onClick={() => setIsLightMode((prev) => !prev)}
        style={{
          position: "absolute",
          top: "4vh",
          left: "4vw",
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          border: `2px solid ${textColor}`,
          background: isLightMode ? textColor : "transparent",
          cursor: "pointer",
          transition: "all 0.4s ease",
          zIndex: 5,
        }}
        title={isLightMode ? "Dark Mode" : "Light Mode"}
      />

      {/* NOME CENTRATO IN ALTO */}
      <h1
        style={{
          position: "absolute",
          top: "2vh",
          width: "100%",
          textAlign: "center",
          color: textColor,
          fontSize: "1.8rem",
          fontWeight: "600",
          fontFamily: "Helvetica, 'Helvetica Neue', sans-serif",
          letterSpacing: "0.25em",
          zIndex: 2,
          margin: 0,
          transition: "color 0.6s ease",
        }}
      >
        MATTEO FARISELLI
      </h1>

      {/* CANVAS CYMATICA */}
      <Canvas
        camera={{
          position: [0, 5, 0], // sopra la sfera
          fov: 75,
          near: 0.1,
          far: 100,
          up: [0, 0, -1],
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0);
        }}
      >
        <ambientLight intensity={0.6} />
        <CymaticSphere targetMode={mode} color={sphereColor} />
      </Canvas>

      {/* MENU SEZIONI PDF */}
      <div
        style={{
          position: "absolute",
          bottom: "2vh",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: "550px",
          color: textColor,
          fontSize: "1.2rem",
          letterSpacing: "0.15em",
          zIndex: 3,
          transition: "color 0.6s ease",
        }}
      >
        {sections.map((section, i) => (
          <motion.a
            key={i}
            href={section.file}
            download
            style={{
              color: textColor,
              textDecoration: "none",
              opacity: 0.6,
              transition: "color 0.6s ease, opacity 0.3s ease",
            }}
            whileHover={{
              opacity: 1,
              scale: 1.05,
              textShadow: `0px 0px 8px ${textColor}`,
            }}
            transition={{ duration: 0.3 }}
            onMouseEnter={() => setMode(section.mode)}
            onMouseLeave={() => setMode(0)}
          >
            {section.label.toUpperCase()}
          </motion.a>
        ))}
      </div>
    </div>
  );
}
