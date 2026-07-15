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
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const cleanupTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      // Ask the browser's own audio pipeline to do noise cleanup before we
      // ever see the signal — every modern browser (Chrome, Firefox,
      // Safari, Edge) ships real DSP for this, it's just off by default
      // unless requested. Costs nothing, no library, no processing time.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext: AudioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // A gentle high-pass filter below typical vocal range cuts mic
      // rumble, handling noise, and breath "pops" that the browser's
      // built-in noiseSuppression doesn't fully catch (it targets steady
      // background hiss/hum, not low-frequency thumps). 80Hz sits below
      // essentially all singing voices, so vocals are unaffected.
      const filter = audioContext.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 80;
      filter.Q.value = 0.7;
      source.connect(filter);
      filterRef.current = filter;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      filter.connect(analyser);
      analyserRef.current = analyser;

      // Record the *filtered* signal, not the raw mic stream — routing
      // through a MediaStreamAudioDestinationNode lets the high-pass
      // filter actually affect what MediaRecorder captures, not just the
      // live waveform visualization.
      const dest = audioContext.createMediaStreamDestination();
      filter.connect(dest);
      destRef.current = dest;

      const recorder = new MediaRecorder(dest.stream);
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
    filterRef.current?.disconnect();
    destRef.current?.disconnect();
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

  /** Use an uploaded pre-recorded voice file instead of recording live. */
  const setUploadedAudio = useCallback((file: File) => {
    setError(null);
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setElapsedSec(0);
    setState("stopped");
  }, []);

  useEffect(() => {
    return () => {
      cleanupTimer();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      sourceRef.current?.disconnect();
      filterRef.current?.disconnect();
      destRef.current?.disconnect();
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
    setUploadedAudio,
  };
}
