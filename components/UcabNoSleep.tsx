"use client";
import { useEffect, useRef, useState } from "react";
import NoSleep from "nosleep.js";

export default function NoSleepComponent() {
  const [isActive, setIsActive] = useState(false);
  const noSleepRef = useRef<NoSleep | null>(null);

  useEffect(() => {
    // Inițializare pe client
    noSleepRef.current = new NoSleep();

    return () => {
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };
  }, []);

  const toggleNoSleep = () => {
    if (!noSleepRef.current) return;

    if (!isActive) {
      noSleepRef.current.enable();
      setIsActive(true);
    } else {
      noSleepRef.current.disable();
      setIsActive(false);
    }
  };

  return (
    <button
      onClick={toggleNoSleep}
      style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        zIndex: 9999,
        fontSize: "10px",
        padding: "5px 10px",
        borderRadius: "20px",
        backgroundColor: isActive ? "#22c55e" : "#e2e8f0",
        color: isActive ? "#ffffff" : "#64748b",
        border: "none",
        cursor: "pointer",
        opacity: 0.8
      }}
    >
      {isActive ? "AWAKE ON" : "KEEP AWAKE"}
    </button>
  );
}
