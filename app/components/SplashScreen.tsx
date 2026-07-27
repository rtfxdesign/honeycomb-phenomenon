"use client";

import { useState } from "react";

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

  if (!visible) return null;

  return (
    <div className={`splash-screen ${fading ? "splash-fading" : ""}`}>
      {/* Autoplaying Background Video */}
      <video
        className="splash-video"
        src="/splash-video.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Dark overlay to ensure button is readable if needed, or just let video shine */}
      <div className="splash-video-overlay" />

      {/* Content */}
      <div className="splash-content splash-video-content">
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
