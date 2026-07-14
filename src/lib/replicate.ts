const REPLICATE_API_BASE = "https://api.replicate.com/v1/predictions";

// cjwbw/demucs — vocal/instrument stem separation model on Replicate
const DEMUCS_VERSION =
  "cjwbw/demucs:e5a92c9f8f8f1f3f4c4c4b1d3f0d1e4c8c4e2f1a3b2c1d0e9f8a7b6c5d4e3f2a";

export type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: Record<string, string> | string[] | null;
  error: string | null;
};

function authHeaders() {
  const token = import.meta.env.VITE_REPLICATE_API_TOKEN as string;
  return {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Kicks off a Demucs prediction on Replicate for the given track URL and
 * polls until it succeeds/fails, returning the instrumental ("no_vocals")
 * stem URL.
 */
export async function separateVocals(
  trackUrl: string,
  onProgress?: (status: string) => void
): Promise<{ noVocalsUrl: string; vocalsUrl: string | null }> {
  onProgress?.("starting");

  const createRes = await fetch(REPLICATE_API_BASE, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      version: DEMUCS_VERSION,
      input: {
        audio: trackUrl,
        stem: "vocals",
        output_format: "mp3",
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Replicate create prediction failed: ${errText}`);
  }

  let prediction: ReplicatePrediction = await createRes.json();

  const started = Date.now();
  const timeoutMs = 5 * 60 * 1000;

  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled"
  ) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Replicate prediction timed out after 5 minutes");
    }
    onProgress?.(prediction.status);
    await new Promise((r) => setTimeout(r, 2500));

    const pollRes = await fetch(`${REPLICATE_API_BASE}/${prediction.id}`, {
      headers: authHeaders(),
    });
    if (!pollRes.ok) {
      throw new Error(`Replicate poll failed: ${await pollRes.text()}`);
    }
    prediction = await pollRes.json();
  }

  if (prediction.status !== "succeeded") {
    throw new Error(
      `Replicate prediction ended with status "${prediction.status}": ${
        prediction.error ?? "unknown error"
      }`
    );
  }

  onProgress?.("succeeded");

  const output = prediction.output;
  let noVocalsUrl: string | undefined;
  let vocalsUrl: string | null = null;

  if (output && !Array.isArray(output)) {
    noVocalsUrl = output.no_vocals ?? output.accompaniment ?? output.other;
    vocalsUrl = output.vocals ?? null;
  } else if (Array.isArray(output)) {
    noVocalsUrl = output[0];
    vocalsUrl = output[1] ?? null;
  }

  if (!noVocalsUrl) {
    throw new Error("Replicate output did not include a no_vocals stem URL");
  }

  return { noVocalsUrl, vocalsUrl };
}
