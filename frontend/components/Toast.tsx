"use client";

import { useEffect } from "react";

type Props = {
  message: string;
  onClose: () => void;
  durationMs?: number;
  variant?: "success" | "error";
};

export default function Toast({ message, onClose, durationMs = 2600, variant = "success" }: Props) {
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(onClose, durationMs);
    return () => clearTimeout(timeout);
  }, [message, onClose, durationMs]);

  if (!message) return null;

  return (
    <div className={`toast ${variant === "error" ? "toast-error" : ""}`} role="status" aria-live={variant === "error" ? "assertive" : "polite"}>
      <span className="toast-dot" aria-hidden="true">
        {variant === "error" ? "!" : "✓"}
      </span>
      <span>{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Close notification">
        x
      </button>
    </div>
  );
}
