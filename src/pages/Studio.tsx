import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Mic,
  Square,
  RotateCcw,
  Upload as UploadIcon,
  FileAudio,
  Sparkles,
  Music2,
  Download,
  Disc3,
  Film,
  Guitar,
  Users,
  Radio,
  ArrowDownCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { blobToMp3Blob } from "@/lib/mp3Encode";
import { downloadBlob } from "@/lib/utils";
import { sessionStore } from "@/lib/sessionStore";

const VARIANT_ICONS: Record<FusionVariantKey, typeof Disc3> = {
  studio: Disc3,
  cinematic: Film,
  acoustic: Guitar,
  duet: Users,
  lofi: Radio,
  pitchdown: ArrowDownCircle,
};

const SETTINGS_STORAGE_KEY = "swarfusion_studio_settings";

type PersistedSettings = {
  voiceVolumePct: number;
  musicVolumePct: number;
  autoBalanceVocal: boolean;
  separationModel: "demucs" | "skip";
  quality: "high" | "lossless" | "standard";
  variantMode: "all" | "top3" | "custom";
  customVariants: FusionVariantKey[];
  languages: string[];
};

const DEFAULT_SETTINGS: PersistedSettings = {
  voiceVolumePct: 75,
  musicVolumePct: 65,
  autoBalanceVocal: true,
  separationModel: "demucs",
  quality: "high",
  variantMode: "all",
  customVariants: ["studio", "cinematic", "acoustic"],
  languages: [],
};

/**
 * Loads previously-saved Studio settings (sliders, quality, variant
 * selection, languages) so a refresh doesn't reset them to defaults.
 *
 * This deliberately only covers settings, not the actual voice
 * recording/uploaded track file — those are Blobs/Files, which can't be
 * meaningfully persisted through localStorage (size limits, not
 * serializable) without a real backend, which this app intentionally
 * doesn't have. So a refresh still clears your recording/upload, but your
 * dialed-in settings will be waiting for you next time.
 */
function loadSavedSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StepTitle({ step, accent, children }: { step: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="step-badge"
        style={{ background: `${accent}1f`, borderColor: `${accent}59`, color: accent }}
      >
        {step}
      </span>
      <span className="text-base font-semibold text-white/90 tracking-tight">{children}</span>
    </div>
  );
}

export default function Studio() {
  const navigate = useNavigate();
  const recorder = useVoiceRecorder();

  const handleDownloadVoiceMp3 = useCallback(async () => {
    if (!recorder.audioBlob) return;
    setDownloadingMp3(true);
    try {
      const mp3Blob = await blobToMp3Blob(recorder.audioBlob);
      downloadBlob(mp3Blob, "my-voice.mp3");
    } catch (err) {
      console.error("MP3 encoding failed", err);
    } finally {
      setDownloadingMp3(false);
    }
  }, [recorder.audioBlob]);

  const [effectPreset, setEffectPreset] = useState<EffectPreset>("clean");
  const monitorRef = useRef<ReturnType<typeof createLiveEffectMonitor> | null>(null);
  const [monitoring, setMonitoring] = useState(false);

  const [trackFile, setTrackFile] = useState<File | null>(null);
  const [trackMeta, setTrackMeta] = useState<{ name: string; sizeMB: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [voiceVolumePct, setVoiceVolumePct] = useState(() => loadSavedSettings().voiceVolumePct);
  const [musicVolumePct, setMusicVolumePct] = useState(() => loadSavedSettings().musicVolumePct);
  const [autoBalanceVocal, setAutoBalanceVocal] = useState(() => loadSavedSettings().autoBalanceVocal);
  const [downloadingMp3, setDownloadingMp3] = useState(false);
  const [separationModel, setSeparationModel] = useState<"demucs" | "skip">(() => loadSavedSettings().separationModel);
  const [quality, setQuality] = useState<"high" | "lossless" | "standard">(() => loadSavedSettings().quality);
  const [variantMode, setVariantMode] = useState<"all" | "top3" | "custom">(() => loadSavedSettings().variantMode);
  const [customVariants, setCustomVariants] = useState<FusionVariantKey[]>(() => loadSavedSettings().customVariants);
  const [languages, setLanguages] = useState<string[]>(() => loadSavedSettings().languages);

  // Auto-save settings whenever they change, so a refresh restores your
  // dial-in instead of resetting to defaults. (Your recording/uploaded
  // track itself can't be saved this way — see loadSavedSettings above.)
  useEffect(() => {
    const settings: PersistedSettings = {
      voiceVolumePct,
      musicVolumePct,
      autoBalanceVocal,
      separationModel,
      quality,
      variantMode,
      customVariants,
      languages,
    };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage can fail (private browsing, quota) — not worth surfacing
      // an error for a non-critical convenience feature.
    }
  }, [voiceVolumePct, musicVolumePct, autoBalanceVocal, separationModel, quality, variantMode, customVariants, languages]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const voiceFileInputRef = useRef<HTMLInputElement | null>(null);

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
        trackFile,
        trackUrl,
        trackMeta: {
          name: trackFile.name,
          sizeMB: trackFile.size / (1024 * 1024),
          durationSec: 0,
        },
        voiceVolumePct,
        musicVolumePct,
        autoBalanceVocal,
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
    <div className="relative max-w-5xl mx-auto px-4 py-10 space-y-6 overflow-hidden">
      {/* Ambient animated mesh, consistent with the homepage */}
      <div
        className="mesh-blob-1 pointer-events-none absolute -top-16 left-[10%] h-[320px] w-[320px] rounded-full blur-3xl -z-10"
        style={{ background: "radial-gradient(circle, rgba(239,159,39,0.10) 0%, transparent 70%)" }}
      />
      <div
        className="mesh-blob-2 pointer-events-none absolute top-32 -right-20 h-[300px] w-[300px] rounded-full blur-3xl -z-10"
        style={{ background: "radial-gradient(circle, rgba(212,83,138,0.09) 0%, transparent 70%)" }}
      />

      {/* Page header */}
      <div className="fade-up mb-2">
        <h1 className="font-logo text-3xl mb-1.5 gradient-text-saffron w-fit">Voice Studio</h1>
        <p className="text-white/45 text-sm">
          Record over any track you upload — AI will separate the instrumental and mix your voice into studio-quality fusions.
        </p>
      </div>

      {/* Tagline banner with a soundwave motif */}
      <div className="fade-up relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 flex items-center gap-3" style={{ animationDelay: "0.02s" }}>
        <svg width="56" height="24" viewBox="0 0 56 24" className="shrink-0 opacity-70">
          <path
            d="M0 12 Q7 2, 14 12 T28 12 T42 12 T56 12"
            fill="none"
            stroke="url(#tagline-wave)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="tagline-wave" x1="0" y1="0" x2="56" y2="0">
              <stop offset="0%" className="tagline-stop-1" />
              <stop offset="33%" className="tagline-stop-2" />
              <stop offset="66%" className="tagline-stop-3" />
              <stop offset="100%" className="tagline-stop-4" />
            </linearGradient>
          </defs>
        </svg>
        <p className="text-sm text-white/60 italic">
          <span className="text-white/85 font-medium not-italic">स्वर मिलाके, सुर बनाएं</span> — Swar milaake, sur banaaye.
        </p>
      </div>

      {/* Step progress indicator */}
      <div className="fade-up flex items-center justify-center gap-2 sm:gap-4 py-1" style={{ animationDelay: "0.04s" }}>
        {[
          { n: 1, label: "Record", accent: "#ef9f27" },
          { n: 2, label: "Upload", accent: "#d4538a" },
          { n: 3, label: "Fusion", accent: "#4fb8a8" },
        ].map((s, i, arr) => (
          <div key={s.n} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0"
                style={{ background: `${s.accent}20`, border: `1.5px solid ${s.accent}70`, color: s.accent }}
              >
                {s.n}
              </span>
              <span className="text-xs font-medium text-white/55 hidden sm:inline">{s.label}</span>
            </div>
            {i < arr.length - 1 && (
              <span className="h-px w-6 sm:w-10" style={{ background: `linear-gradient(90deg, ${s.accent}60, ${arr[i + 1].accent}60)` }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 + 2 row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Record */}
        <Card
          className={`fade-up ${isRecording ? "border-red-500/30 shadow-[0_0_24px_rgba(220,38,38,0.1)]" : ""}`}
          style={{ animationDelay: "0.08s" }}
        >
          <CardHeader>
            <StepTitle step="1" accent="#ef9f27">Record your voice</StepTitle>
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
                {!isRecording && (
                  <Button onClick={() => voiceFileInputRef.current?.click()} size="sm" variant="outline">
                    <UploadIcon className="h-4 w-4" /> Upload voice
                  </Button>
                )}
                {recorder.state === "stopped" && (
                  <Button onClick={recorder.restart} size="sm" variant="outline">
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Button>
                )}
                <input
                  ref={voiceFileInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.webm,.ogg,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) recorder.setUploadedAudio(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {recorder.audioUrl && (
              <div className="space-y-2">
                <audio controls src={recorder.audioUrl} className="w-full h-8 opacity-80" />
                <button
                  onClick={handleDownloadVoiceMp3}
                  disabled={downloadingMp3}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/65 hover:text-white/90 hover:border-white/25 transition-colors disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloadingMp3 ? "Encoding MP3…" : "Download as MP3"}
                </button>
              </div>
            )}
            {recorder.error && <p className="text-xs text-red-400">{recorder.error}</p>}
            <p className="text-xs text-white/30">
              Record live, or upload a pre-recorded voice clip instead.
            </p>

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
        <Card className="fade-up" style={{ animationDelay: "0.16s" }}>
          <CardHeader>
            <StepTitle step="2" accent="#d4538a">Upload a track</StepTitle>
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
      <Card className="fade-up" style={{ animationDelay: "0.24s" }}>
        <CardHeader>
          <StepTitle step="3" accent="#4fb8a8">Fusion settings</StepTitle>
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

          {/* Auto-balance toggle */}
          <label className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoBalanceVocal}
              onChange={(e) => setAutoBalanceVocal(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-saffron"
            />
            <span>
              <span className="block text-sm text-white/80 font-medium">Auto-balance vocal volume</span>
              <span className="block text-xs text-white/40 mt-0.5">
                Measures how loud your recording is compared to the track and automatically boosts a
                quiet vocal to match — applied before the sliders above, which still work as a final
                creative adjustment on top.
              </span>
            </span>
          </label>

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
              {(["studio", "cinematic", "acoustic", "duet", "lofi", "pitchdown"] as FusionVariantKey[]).map((v) => {
                const VariantIcon = VARIANT_ICONS[v];
                return (
                  <button
                    key={v}
                    data-variant={v}
                    onClick={() => toggleCustomVariant(v)}
                    className={`variant-pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all capitalize ${
                      customVariants.includes(v)
                        ? "bg-saffron text-midnight border-saffron shadow-glow-saffron/40 variant-pill-active"
                        : "bg-white/[0.04] text-white/60 border-white/10 hover:border-white/25 hover:text-white/80"
                    }`}
                  >
                    <VariantIcon className="h-3.5 w-3.5" />
                    {v}
                  </button>
                );
              })}
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
