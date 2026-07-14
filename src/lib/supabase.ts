import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "SwarFusion: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Profile = {
  id: string;
  display_name: string | null;
  languages: string[] | null;
  total_fusions: number;
  created_at: string;
};

export type FusionVariant = {
  name: string;
  url: string;
  /** Permanent Supabase Storage path (bucket-relative), used by the
   * retention cleanup job to delete the file after 30 days — the `url`
   * above is a signed URL that expires long before that. */
  path: string;
  effect: string;
  duration: number;
};

export type FusionSettings = {
  voice_vol: number;
  music_vol: number;
  languages: string[];
  model: string;
  quality: string;
};

export type Fusion = {
  id: string;
  user_id: string;
  voice_url: string | null;
  voice_path: string | null;
  track_url: string | null;
  track_path: string | null;
  instrumental_url: string | null;
  instrumental_path: string | null;
  variants: FusionVariant[];
  settings: FusionSettings;
  ai_tips: string[];
  created_at: string;
};

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/studio` },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("getProfile error", error);
    return null;
  }
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "display_name" | "languages">>
) {
  return supabase.from("profiles").update(updates).eq("id", userId);
}

export async function listFusions(userId: string): Promise<Fusion[]> {
  const { data, error } = await supabase
    .from("fusions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listFusions error", error);
    return [];
  }
  return (data ?? []) as Fusion[];
}

export async function saveFusion(fusion: Omit<Fusion, "id" | "created_at">) {
  return supabase.from("fusions").insert(fusion).select().single();
}
