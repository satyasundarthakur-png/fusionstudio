# SwarFusion 🎙️

**Swar milaake, sur banaaye.** Record or upload your voice, sing over any track, and get studio-quality vocal fusions — entirely in your browser, no backend, no account required.

Live app: **https://fusionstudio.lovable.app**

---

## What it does

1. **Record your voice** live (mic) or **upload a pre-recorded clip**.
2. **Upload a music track** (MP3/WAV/FLAC/M4A).
3. AI (Demucs, running fully client-side) **separates the instrumental** from the track.
4. Your voice is mixed over the isolated instrumental with adjustable volume, pitch alignment, and effects.
5. Get **6 fusion variants** (Studio, Cinematic, Acoustic, Duet, Lo-fi, Pitch-shifted) plus AI-generated vocal coaching tips (via Groq).
6. Export a PDF session summary or download any variant.

Everything — recording, vocal separation, mixing, effects — runs **in the browser**. No files are uploaded to a server; nothing is stored anywhere once you close the tab.

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | React + TypeScript + Vite |
| Routing | `@tanstack/react-router` |
| Styling | Tailwind CSS v4 (custom saffron/magenta/teal theme) |
| Audio engine | Web Audio API, Tone.js (effects), custom pitch detection |
| Vocal separation | [`demucs-web`](https://github.com/timcsy/demucs-web) — HTDemucs exported to ONNX (~172MB), run via `onnxruntime-web` (WebGPU with WASM fallback) |
| AI coaching tips | Groq SDK (LLM-generated feedback on the mix) |
| PDF export | `jspdf` |
| Access control | Single shared password gate (no accounts/backend) |

There is **no backend**. All state lives in-memory for the browser tab (`sessionStore.ts`) and disappears on refresh — recording, upload, and fusion are a single-session workflow.

---

## Project structure

```
src/
├── App.tsx                 # Router, nav bar, theme toggle, password-gated layout
├── components/
│   ├── PasswordGate.tsx    # Site-wide password lock screen
│   ├── ProcessingPipeline.tsx
│   ├── FusionCard.tsx      # Result variant player + download
│   ├── Waveform.tsx        # Live recording waveform visualizer
│   ├── EffectChips.tsx     # Voice effect preset picker
│   ├── VoiceCoach.tsx      # AI coaching tips display
│   └── ui/                 # Small design-system primitives (Button, Card, Select, etc.)
├── hooks/
│   ├── useVoiceRecorder.ts # Mic recording + upload-a-pre-recorded-clip support
│   └── useAudioMixer.ts    # Orchestrates separation → align → mix → effects pipeline
├── lib/
│   ├── demucsLocal.ts      # In-browser Demucs vocal separation (onnxruntime-web)
│   ├── audioEngine.ts      # Mixing, pitch detection/shifting, WAV encoding
│   ├── groq.ts             # AI coaching tip generation
│   └── sessionStore.ts     # In-memory Studio → Processing → Results state
├── pages/
│   ├── Home.tsx            # Landing page
│   ├── Studio.tsx          # Record/upload voice + track, configure fusion
│   ├── Processing.tsx      # Live pipeline progress
│   └── Results.tsx         # Generated variants, PDF export
└── types/demucs-web.d.ts   # Hand-written types (upstream package ships none)
```

---

## Access

The app is protected by a single shared password rather than individual accounts (set in `src/components/PasswordGate.tsx`). Anyone with the password can use the Studio; nothing is user-specific since there's no backend to attach accounts to.

---

## Vocal separation: how it works, and its limits

Vocal/instrumental separation runs the [HTDemucs](https://github.com/facebookresearch/demucs) model **entirely client-side** via `onnxruntime-web`:

- Model: `timcsy/demucs-web-onnx` (~172MB), downloaded once and cached by the browser.
- Runs on **WebGPU** where available (fast), falling back to **WASM** on CPU (slower).
- Session is created with `enableCpuMemArena: false` / `enableMemPattern: false` to reduce peak memory and avoid `std::bad_alloc` on memory-constrained devices.
- A full track is processed in ~8-second overlapping chunks rather than one giant pass, keeping memory use roughly constant regardless of song length.
- A 15-minute timeout guards against effectively-hung separation on very slow devices.

**Graceful fallback:** if separation fails or times out (common on low-memory devices/older browsers without WebGPU), the app automatically falls back to mixing your voice directly over the original, un-separated track — instead of crashing. A visible amber notice explains this happened, both during processing and on the final Results page.

You can also manually pick **"Skip separation"** in Studio's Fusion Settings to always use this faster, lighter path.

---

## Theming

The app ships with a **dark mode** (default) and a **light/day mode**, toggled via the sun/moon icon in the nav bar. The choice persists across visits (`localStorage`).

Implementation note: since the app has no design-token abstraction, light mode is implemented as a set of CSS overrides in `src/styles.css` (scoped under `html.light`) that remap the existing dark-mode Tailwind utility classes (`text-white/NN`, `bg-white/[…]`, `border-white/…`) to WCAG AA–compliant dark-on-light equivalents, rather than proportionally mirroring opacity values (which looks right on dark backgrounds but fails contrast on light ones). Key colors were verified against the WCAG relative-luminance contrast formula:

| Tier | Color | Contrast vs. `#f7f2e8` background |
|---|---|---|
| Primary text | `#111111` | ~16.9:1 |
| Secondary text | `#2b2b2b` | ~12.7:1 |
| Muted text | `#4b4b4b` | ~7.8:1 |
| Saffron accent/headings | `#8a5410` | ~5.6:1 |

All exceed the WCAG AA minimum of 4.5:1 for normal text.

---

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build (tsc + vite build)
```

No environment variables are required for the app to run, except:

- `VITE_GROQ_API_KEY` — needed for AI vocal coaching tips (Processing/Results). Without it, the rest of the app still works; coaching tips just won't generate.

There is no Supabase, database, or backend of any kind to configure.

---

## Known limitations

- **No persistence.** Refreshing the page loses your current recording/upload/results — there's no accounts system or storage backend by design.
- **Vocal separation speed/success depends heavily on the device's browser and hardware.** WebGPU-capable browsers (recent Chrome/Edge) are dramatically faster than WASM-only fallback (Safari, older browsers, low-end devices).
- **Single shared password**, not per-user accounts — anyone with the password has full access.
