import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Mic,
  Square,
  RotateCcw,
  Upload as UploadIcon,
  FileAudio,
  Sparkles,
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
import { supabase } from "@/lib/supabase";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Studio() {
  const navigate = useNavigate();
  const recorder = useVoiceRecorder();
  const { upload } = useSupabaseStorage();

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
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        navigate({ to: "/login" });
        return;
      }

      const voiceUpload = await upload("voice", recorder.audioBlob, user.id, "voice.webm");
      const trackUpload = await upload("tracks", trackFile, user.id, trackFile.name);

      if (!voiceUpload?.signedUrl || !trackUpload?.signedUrl) {
        throw new Error("Could not upload voice or track file to Supabase Storage.");
      }

      sessionStore.setInput({
        voiceBlob: recorder.audioBlob,
        voiceUrl: voiceUpload.signedUrl,
        voicePath: voiceUpload.path,
        trackFile,
        trackUrl: trackUpload.signedUrl,
        trackPath: trackUpload.path,
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="font-logo text-3xl mb-1">Voice Studio</h1>
        <p className="text-white/50">
          Record over "Kesariya," a Rabindra Sangeet piece, or any track you upload below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Record your voice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Waveform analyser={recorder.analyser} isActive={recorder.state === "recording"} />

            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold tabular-nums">
                {formatTimer(recorder.elapsedSec)}
              </span>
              <div className="flex gap-2">
                {recorder.state !== "recording" ? (
                  <Button onClick={recorder.start} size="sm">
                    <Mic className="h-4 w-4" /> {recorder.state === "stopped" ? "Re-record" : "Record"}
                  </Button>
                ) : (
                  <Button onClick={recorder.stop} size="sm" variant="destructive">
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
              <audio controls src={recorder.audioUrl} className="w-full" />
            )}
            {recorder.error && <p className="text-sm text-red-400">{recorder.error}</p>}

            <div className="space-y-2 pt-2 border-t border-white/10">
              <Label>Voice effects preview</Label>
              <EffectChips value={effectPreset} onChange={setEffectPreset} />
              <Button variant="ghost" size="sm" onClick={toggleMonitor}>
                {monitoring ? "Stop live preview" : "Preview effect on mic"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Upload a track</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragActive ? "border-saffron bg-saffron/5" : "border-white/15 hover:border-white/30"
              }`}
            >
              <UploadIcon className="h-8 w-8 text-white/40" />
              <p className="text-sm text-white/60">
                Drag & drop your MP3, WAV, or FLAC — up to 100MB
              </p>
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
              <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                <FileAudio className="h-5 w-5 text-saffron shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{trackMeta.name}</p>
                  <p className="text-xs text-white/40">{trackMeta.sizeMB}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>3. Fusion settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Voice volume — {voiceVolumePct}%</Label>
              <Slider
                value={[voiceVolumePct]}
                onValueChange={([v]) => setVoiceVolumePct(v)}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Music volume — {musicVolumePct}%</Label>
              <Slider
                value={[musicVolumePct]}
                onValueChange={([v]) => setMusicVolumePct(v)}
                max={100}
                step={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Vocal separation model</Label>
              <Select value={separationModel} onValueChange={(v) => setSeparationModel(v as typeof separationModel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demucs">Demucs — in-browser, free (recommended)</SelectItem>
                  <SelectItem value="spleeter">Spleeter 2-stem — in-browser, free</SelectItem>
                  <SelectItem value="skip">Skip separation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Output quality</Label>
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
              <Label>Fusion variants</Label>
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
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                    customVariants.includes(v)
                      ? "bg-saffron text-midnight border-saffron"
                      : "bg-white/5 text-white/70 border-white/15"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Song languages / styles</Label>
            <LanguageTags selected={languages} onToggle={toggleLanguage} />
          </div>
        </CardContent>
      </Card>

      {submitError && <p className="text-sm text-red-400">{submitError}</p>}

      <div className="flex justify-end">
        <Button size="lg" disabled={!canProceed || submitting} onClick={handleProceed}>
          <Sparkles className="h-4 w-4" />
          {submitting ? "Preparing…" : "Create Fusion"}
        </Button>
      </div>
    </div>
  );
}
