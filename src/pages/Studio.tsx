import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Mic,
  Square,
  RotateCcw,
  Upload as UploadIcon,
  FileAudio,
  Sparkles,
  Music2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Waveform from "@/components/Waveform";
import EffectChips from "@/components/EffectChips";
import LanguageTags from "@/components/LanguageTags";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { createLiveEffectMonitor, type EffectPreset, type FusionVariantKey } from "@/lib/audioEngine";
import { sessionStore } from "@/lib/sessionStore";

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StepTitle({ step, children }: { step: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="step-badge">{step}</span>
      <span className="text-base font-semibold text-white/90 tracking-tight">{children}</span>
    </div>
  );
}

export default function Studio() {
  const navigate = useNavigate();
  const recorder = useVoiceRecorder();

  const [effectPreset, setEffectPreset] = useState<EffectPreset>("clean");
  const monitorRef = useRef<ReturnType<typeof createLiveEffectMonitor> | null>(null);
  const [monitoring, setMonitoring] = useState(false);

  const [trackFile, setTrackFile] = useState<File | null>(null);
  const [trackMeta, setTrackMeta] = useState<{ name: string; sizeMB: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [voiceVolumePct, setVoiceVolumePct] = useState(75);
  const [musicVolumePct, setMusicVolumePct] = useState(65);
  const [separationModel, setSeparationModel] = useState<"demucs" | "spleeter" | "skip">("demucs");
  const [quality, setQuality] = useState<"high" | "lossless" | "standard">("high");
  const [variantMode, setVariantMode] = useState<"all" | "top3" | "custom">("all");
  const [customVariants, setCustomVariants] = useState<FusionVariantKey[]>(["studio", "cinematic", "acoustic"]);
  const [languages, setLanguages] = useState<string[]>([]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleMonitor = useCallback(async () => {
    if (monitoring) {
      monitorRef.current?.stop();
      setMonitoring(false);
      return;
    }
    const monitor = createLiveEffectMonitor(effectPreset);
    monitorRef.current = monitor;
    await monitor.start();
    setMonitoring(true);
  }, [monitoring, effectPreset]);

  const handleFile = (file: File) => {
    setTrackFile(file);
    setTrackMeta({ name: file.name, sizeMB: formatBytes(file.size) });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const toggleCustomVariant = (v: FusionVariantKey) => {
    setCustomVariants((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const toggleLanguage = (tag: string) => {
    setLanguages((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const canProceed = !!recorder.audioBlob && !!trackFile;

  const handleProceed = async () => {
    if (!recorder.audioBlob || !trackFile) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const voiceUrl = URL.createObjectURL(recorder.audioBlob);
      const trackUrl = URL.createObjectURL(trackFile);

      sessionStore.setInput({
        voiceBlob: recorder.audioBlob,
        voiceUrl,
        voicePath: null,
        trackFile,
        trackUrl,
        trackPath: null,
        trackMeta: {
          name: trackFile.name,
          sizeMB: trackFile.size / (1024 * 1024),
          durationSec: 0,
        },
        voiceVolumePct,
        musicVolumePct,
        separationModel,
        quality,
        variantMode,
        customVariants,
        languages,
      });

      navigate({ to: "/processing" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong preparing your fusion.");
    } finally {
      setSubmitting(false);
    }
  };

  const isRecording = recorder.state === "recording";

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="font-logo text-3xl mb-1.5 gradient-text-saffron w-fit">Voice Studio</h1>
        <p className="text-white/45 text-sm">
          Record over any track you upload — AI will separate the instrumental and mix your voice into studio-quality fusions.
        </p>
      </div>

      {/* Step 1 + 2 row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Record */}
        <Card className={isRecording ? "border-red-500/30 shadow-[0_0_24px_rgba(220,38,38,0.1)]" : ""}>
          <CardHeader>
            <StepTitle step="1">Record your voice</StepTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-black/30">
              <Waveform analyser={recorder.analyser} isActive={isRecording} />
            </div>

            <div className="flex items-center justify-between">
              <span
                className={`text-2xl font-mono tabular-nums ${isRecording ? "text-red-400" : "text-white/80"}`}
              >
                {formatTimer(recorder.elapsedSec)}
              </span>
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button
                    onClick={recorder.start}
                    size="sm"
                    className={recorder.state === "stopped" ? "" : ""}
                  >
                    <Mic className={`h-4 w-4 ${isRecording ? "rec-indicator" : ""}`} />
                    {recorder.state === "stopped" ? "Re-record" : "Record"}
                  </Button>
                ) : (
                  <Button onClick={recorder.stop} size="sm" variant="destructive" className="rec-indicator">
                    <Square className="h-4 w-4" /> Stop
                  </Button>
                )}
                {recorder.state === "stopped" && (
                  <Button onClick={recorder.restart} size="sm" variant="outline">
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Button>
                )}
              </div>
            </div>

            {recorder.audioUrl && (
              <audio controls src={recorder.audioUrl} className="w-full h-8 opacity-80" />
            )}
            {recorder.error && <p className="text-xs text-red-400">{recorder.error}</p>}

            <div className="space-y-2 pt-3 border-t border-white/[0.06]">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Voice effects preview</Label>
              <EffectChips value={effectPreset} onChange={setEffectPreset} />
              <Button variant="ghost" size="sm" onClick={toggleMonitor} className="text-xs mt-1">
                {monitoring ? "Stop live preview" : "Preview effect on mic"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card>
          <CardHeader>
            <StepTitle step="2">Upload a track</StepTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-xl p-10 text-center cursor-pointer drop-zone ${dragActive ? "drop-zone-active" : ""}`}
            >
              <div className="h-12 w-12 rounded-full flex items-center justify-center border border-white/10 bg-white/5">
                <UploadIcon className="h-5 w-5 text-white/40" />
              </div>
              <div>
                <p className="text-sm text-white/65 font-medium">Drop your track here</p>
                <p className="text-xs text-white/35 mt-0.5">MP3, WAV, FLAC — up to 100 MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.flac,audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>

            {trackMeta && (
              <div className="flex items-center gap-3 rounded-xl border border-saffron/20 bg-saffron/5 px-4 py-3">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-saffron/15">
                  <FileAudio className="h-4 w-4 text-saffron" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-white/90">{trackMeta.name}</p>
                  <p className="text-xs text-white/40">{trackMeta.sizeMB}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step 3 — Fusion settings */}
      <Card>
        <CardHeader>
          <StepTitle step="3">Fusion settings</StepTitle>
        </CardHeader>
        <CardContent className="space-y-7">
          {/* Volume sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-white/65 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Mic className="h-3 w-3" /> Voice volume
                </Label>
                <span className="text-saffron text-sm font-mono font-semibold">{voiceVolumePct}%</span>
              </div>
              <Slider
                value={[voiceVolumePct]}
                onValueChange={([v]) => setVoiceVolumePct(v)}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-white/65 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Music2 className="h-3 w-3" /> Music volume
                </Label>
                <span className="text-saffron text-sm font-mono font-semibold">{musicVolumePct}%</span>
              </div>
              <Slider
                value={[musicVolumePct]}
                onValueChange={([v]) => setMusicVolumePct(v)}
                max={100}
                step={1}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.05]" />

          {/* Selects */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-white/55 text-xs uppercase tracking-wider">Separation model</Label>
              <Select value={separationModel} onValueChange={(v) => setSeparationModel(v as typeof separationModel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demucs">Demucs — in-browser (recommended)</SelectItem>
                  <SelectItem value="spleeter">Spleeter 2-stem — in-browser</SelectItem>
                  <SelectItem value="skip">Skip separation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/55 text-xs uppercase tracking-wider">Output quality</Label>
              <Select value={quality} onValueChange={(v) => setQuality(v as typeof quality)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High — 320kbps MP3</SelectItem>
                  <SelectItem value="lossless">Lossless WAV</SelectItem>
                  <SelectItem value="standard">Standard — 192kbps</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/55 text-xs uppercase tracking-wider">Fusion variants</Label>
              <Select value={variantMode} onValueChange={(v) => setVariantMode(v as typeof variantMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All 6 variants</SelectItem>
                  <SelectItem value="top3">Top 3 variants</SelectItem>
                  <SelectItem value="custom">Custom selection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {variantMode === "custom" && (
            <div className="flex flex-wrap gap-2">
              {(["studio", "cinematic", "acoustic", "duet", "lofi", "pitchdown"] as FusionVariantKey[]).map((v) => (
                <button
                  key={v}
                  onClick={() => toggleCustomVariant(v)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all capitalize ${
                    customVariants.includes(v)
                      ? "bg-saffron text-midnight border-saffron shadow-glow-saffron/40"
                      : "bg-white/[0.04] text-white/60 border-white/10 hover:border-white/25 hover:text-white/80"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-white/55 text-xs uppercase tracking-wider">Song languages / styles</Label>
            <LanguageTags selected={languages} onToggle={toggleLanguage} />
          </div>
        </CardContent>
      </Card>

      {submitError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          {submitError}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button size="lg" disabled={!canProceed || submitting} onClick={handleProceed} className="gap-2 px-8">
          <Sparkles className="h-4 w-4" />
          {submitting ? "Preparing…" : "Create Fusion"}
        </Button>
      </div>
    </div>
  );
}
