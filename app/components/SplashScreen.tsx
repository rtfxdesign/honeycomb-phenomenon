"use client";

import { useEffect, useState } from "react";

const FACES = [
  { src: "/faces/face-1.png", left: "28%", top: "28%", delay: "0.3s" },
  { src: "/faces/face-2.png", left: "55%", top: "22%", delay: "0.6s" },
  { src: "/faces/face-3.png", left: "72%", top: "35%", delay: "0.9s" },
  { src: "/faces/face-4.png", left: "40%", top: "52%", delay: "1.2s" },
  { src: "/faces/face-5.png", left: "62%", top: "60%", delay: "0.5s" },
];

export default function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  const handleEnter = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      onEnter();
    }, 900);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelector(".splash-glow")?.classList.add("splash-glow-active");
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className={`splash-screen ${fading ? "splash-fading" : ""}`}>
      {/* Background image */}
      <div className="splash-bg" />

      {/* Dark overlay for text readability */}
      <div className="splash-overlay" />

      {/* Animated glow layer */}
      <div className="splash-glow" />

      {/* Face portraits positioned over honeycomb cells */}
      <div className="splash-faces">
        {FACES.map((face, i) => (
          <div
            key={i}
            className="splash-face"
            style={{
              left: face.left,
              top: face.top,
              animationDelay: face.delay,
            }}
          >
            <img src={face.src} alt="" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="splash-content">
        <div className="splash-brand-mark">
          <i /><i /><i />
        </div>
        <h1 className="splash-title">
          Project<br />
          <em>Honeycomb</em>
        </h1>
        <button className="splash-enter" onClick={handleEnter}>
          <span>Enter the Archive</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
