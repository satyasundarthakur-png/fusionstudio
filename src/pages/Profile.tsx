import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LanguageTags from "@/components/LanguageTags";
import { supabase, getProfile, updateProfile, signOut, type Profile as ProfileType } from "@/lib/supabase";

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) {
        navigate({ to: "/login" });
        return;
      }
      const p = await getProfile(user.id);
      if (p) {
        setProfile(p);
        setDisplayName(p.display_name ?? "");
        setLanguages(p.languages ?? []);
      }
    });
  }, [navigate]);

  const toggleLanguage = (tag: string) => {
    setLanguages((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    await updateProfile(profile.id, { display_name: displayName, languages });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  if (!profile) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center text-white/50">Loading profile…</div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="font-logo text-2xl">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron/15 text-saffron">
              <Music2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-white/50">Total fusions created</p>
              <p className="text-xl font-semibold">{profile.total_fusions}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Preferred languages / styles</Label>
            <LanguageTags selected={languages} onToggle={toggleLanguage} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
