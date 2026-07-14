import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "stopped";

export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const cleanupTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext: AudioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
      setElapsedSec(0);

      cleanupTimer();
      timerRef.current = window.setInterval(() => {
        setElapsedSec((s) => s + 1);
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Microphone access was denied."
      );
      setState("idle");
    }
  }, [cleanupTimer]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    cleanupTimer();
    setState("stopped");
  }, [cleanupTimer]);

  const restart = useCallback(() => {
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsedSec(0);
    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      cleanupTimer();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => {});
    };
  }, [cleanupTimer]);

  return {
    state,
    elapsedSec,
    audioBlob,
    audioUrl,
    error,
    analyser: analyserRef.current,
    start,
    stop,
    restart,
  };
}
