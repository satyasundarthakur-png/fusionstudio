import Groq from "groq-sdk";

const apiKey = import.meta.env.VITE_GROQ_API_KEY as string;

const groq = new Groq({
  apiKey: apiKey ?? "",
  dangerouslyAllowBrowser: true,
});

export type CoachingContext = {
  songName: string;
  languages: string[];
  variantNames: string[];
  voiceVolume: number;
  musicVolume: number;
};

/**
 * Calls Groq (openai/gpt-oss-120b) to produce 3 vocal coaching tips based on
 * the metadata of a completed fusion session: pitch accuracy, breath
 * control, and emotional delivery.
 */
export async function getCoachingTips(
  ctx: CoachingContext
): Promise<string[]> {
  const prompt = `You are an expert Indian classical and playback vocal coach.
A singer just recorded a vocal fusion over the track "${ctx.songName}".
Languages/styles involved: ${ctx.languages.join(", ") || "Hindi/Filmi"}.
Fusion variants generated: ${ctx.variantNames.join(", ")}.
Voice volume was mixed at ${ctx.voiceVolume}% and music at ${ctx.musicVolume}%.

Give exactly 3 short, specific, encouraging coaching tips as plain bullet lines,
one each covering: (1) pitch accuracy / sur, (2) breath control / saans, and
(3) emotional delivery / bhaav. Keep each tip under 25 words. Do not add
headings, numbering beyond a leading "- ", or any other commentary.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const tips = text
      .split("\n")
      .map((line) => line.replace(/^[-•\d.\s]+/, "").trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);

    if (tips.length === 3) return tips;
    throw new Error("Unexpected Groq response shape");
  } catch (err) {
    console.error("getCoachingTips error", err);
    return [
      "Focus on hitting the sthayi (base octave) cleanly before attempting taans — record a few practice takes at slower tempo.",
      "Support long phrases from the diaphragm; take a controlled breath at natural lyric pauses rather than mid-word.",
      "Let the bhaav of the lyric guide dynamics — soften on longing lines, open up on the antara for emotional contrast.",
    ];
  }
}
