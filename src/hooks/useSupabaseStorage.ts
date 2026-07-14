import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";

export type UploadResult = {
  path: string;
  publicUrl: string | null;
  signedUrl: string | null;
};

export function useSupabaseStorage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (
      bucket: "voice" | "tracks" | "fusions",
      file: Blob | File,
      userId: string,
      filename: string
    ): Promise<UploadResult | null> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const path = `${userId}/${Date.now()}-${filename}`;
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "application/octet-stream",
          });

        if (uploadError) throw uploadError;

        setProgress(100);

        const { data: signedData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60 * 24 * 7);

        return {
          path,
          publicUrl: null,
          signedUrl: signedData?.signedUrl ?? null,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        return null;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const getSignedUrl = useCallback(
    async (
      bucket: "voice" | "tracks" | "fusions",
      path: string,
      expiresInSec = 60 * 60 * 24 * 7
    ) => {
      const { data, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresInSec);
      if (signError) {
        setError(signError.message);
        return null;
      }
      return data?.signedUrl ?? null;
    },
    []
  );

  return { upload, getSignedUrl, uploading, progress, error };
}
