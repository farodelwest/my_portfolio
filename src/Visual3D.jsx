// UISections.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FONT = "Helvetica, 'Helvetica Neue', sans-serif";

export function AnimatedName({ mode, onClick }) {
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
        fontFamily: FONT,
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
            transition: "letter-spacing 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
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
            transition: "letter-spacing 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          F A R I S E L L I
        </span>
      </div>
    </div>
  );
}

export function AboutText({ visible }) {
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
            pointerEvents: "none",
          }}
        >
          Born in Bologna, is a product and graphic designer, graduated from
          Alma Mater Studiorum. In 2024, together with his team, he won the
          Maverx Biomedical award in collaboration with Call for Start Up for
          the project LYBRA. Blends industrial-inspired influences into his
          work, while seeking a form of communication shaped by grunge design.
          He is also an active musician and sound designer, collaborating with
          artists from the Bologna scene on both musical and graphic projects.
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ContactsText({ visible }) {
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
          key="contacts-text"
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
          <div> +39 349 059 5551</div>
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
      )}
    </AnimatePresence>
  );
}

export function ProjectTypes({ visible, onHover, onBgChange }) {
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
          }}
        >
          {texts.map((t) => (
            <div
              key={t.label}
              onMouseEnter={() => {
                onHover(t.freq, t.bpm);
                if (t.images.length > 0) {
                  const shuffled = [...t.images].sort(() => 0.5 - Math.random());
                  onBgChange(shuffled.slice(0, 2));
                }
              }}
              onMouseLeave={() => {
                onHover(0, 0);
                onBgChange([]);
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
