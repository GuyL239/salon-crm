"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

interface Props {
  onResult: (text: string) => void;
  /** Called on every interim transcript tick, so the UI can show live preview */
  onInterim?: (text: string) => void;
  disabled?: boolean;
}

/* Resolve the vendor-prefixed constructor once at module level */
const SpeechRecognitionCtor =
  typeof window !== "undefined"
    ? (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null)
    : null;

export function MicButton({ onResult, onInterim, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<InstanceType<typeof SpeechRecognitionCtor> | null>(null);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  if (!SpeechRecognitionCtor) return null; // unsupported browser — render nothing

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRecognitionCtor();
    rec.lang = "he-IL";
    rec.interimResults = true;
    rec.continuous = false; // auto-stop after a pause
    recRef.current = rec;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim && onInterim) onInterim(interim);
      if (final) onResult(final);
    };

    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);

    rec.start();
    setListening(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? "עצור הקלטה" : "הכתב קולי"}
      className={[
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
        listening
          ? "bg-rose-500 text-white shadow-md shadow-rose-300 dark:shadow-rose-900/40 animate-pulse"
          : "bg-gray-100 dark:bg-indigo-800/60 text-slate-400 dark:text-indigo-300/60 hover:bg-pink-50 dark:hover:bg-pink-950/40 hover:text-pink-500 dark:hover:text-pink-400",
        disabled ? "opacity-40 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {listening
        ? <MicOff size={14} strokeWidth={2.2} />
        : <Mic    size={14} strokeWidth={2.2} />}
    </button>
  );
}
