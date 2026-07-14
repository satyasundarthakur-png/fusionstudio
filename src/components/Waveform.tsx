import { useEffect, useRef } from "react";

type WaveformProps = {
  analyser: AnalyserNode | null;
  isActive: boolean;
  className?: string;
};

/** Renders a live amber waveform on a canvas from a Web Audio AnalyserNode. */
export default function Waveform({ analyser, isActive, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const bufferLength = analyser ? analyser.fftSize : 2048;
    const dataArray = new Uint8Array(bufferLength);

    function drawIdle() {
      const rect = canvas!.getBoundingClientRect();
      ctx!.clearRect(0, 0, rect.width, rect.height);
      ctx!.strokeStyle = "rgba(239,159,39,0.35)";
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(0, rect.height / 2);
      ctx!.lineTo(rect.width, rect.height / 2);
      ctx!.stroke();
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const rect = canvas!.getBoundingClientRect();

      if (!analyser || !isActive) {
        drawIdle();
        return;
      }

      analyser.getByteTimeDomainData(dataArray);
      ctx!.clearRect(0, 0, rect.width, rect.height);
      ctx!.lineWidth = 2;
      ctx!.strokeStyle = "#ef9f27";
      ctx!.beginPath();

      const sliceWidth = rect.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * rect.height) / 2;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
        x += sliceWidth;
      }
      ctx!.lineTo(rect.width, rect.height / 2);
      ctx!.stroke();
    }

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "w-full h-24 rounded-lg bg-black/30"}
    />
  );
}
