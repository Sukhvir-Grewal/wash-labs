import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import imageCompression from "browser-image-compression";
import { FiUpload, FiTrash2 } from "react-icons/fi";

const BUCKET_FALLBACK = "Gallery";

export default function GalleryManager() {
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState({ total: 0, done: 0 });
  const [deleting, setDeleting] = useState(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_GALLERY_BUCKET || BUCKET_FALLBACK;

  useEffect(() => {
    if (!supabase) {
      setError("Supabase credentials missing.");
      setLoading(false);
      return;
    }
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const fetchImages = async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: listError } = await supabase.storage.from(bucket).list("", {
        limit: 200,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (listError) throw listError;
      const formatted = await Promise.all(
        (data || [])
          .filter((file) => file && file.name && /\.(jpe?g|png|webp|gif)$/i.test(file.name))
          .map(async (file) => {
            const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(file.name);
            return { name: file.name, url: publicUrl?.publicUrl };
          })
      );
      setImages(formatted);
    } catch (err) {
      setError(err?.message || "Failed to load gallery");
      setImages([]);
    }
    setLoading(false);
  };

  const handleUpload = async (event) => {
    if (!supabase) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadMessage("");
    setError("");

    const prepared = [];
    for (const file of files) {
      let workingFile = file;
      try {
        if (workingFile.type === "image/heic" || workingFile.name.toLowerCase().endsWith(".heic")) {
          const heic2any = (await import("heic2any")).default;
          const converted = await heic2any({ blob: workingFile, toType: "image/jpeg", quality: 0.92 });
          const finalBlob = Array.isArray(converted) ? converted[0] : converted;
          workingFile = new File([finalBlob], workingFile.name.replace(/\.heic$/i, ".jpg"), {
            type: "image/jpeg",
          });
        }
        const compressed = await imageCompression(workingFile, {
          maxWidthOrHeight: 1920,
          maxSizeMB: 2,
          useWebWorker: true,
          initialQuality: 0.82,
        });
        const extension = ".jpg";
        const normalizedName = workingFile.name
          .replace(/\.(heic|heif|png|webp|gif)$/i, extension)
          .replace(/\s+/g, "-")
          .toLowerCase();
        prepared.push(new File([compressed], normalizedName, { type: "image/jpeg" }));
      } catch (err) {
        setError(err?.message || "Failed to process an image");
      }
    }

    if (!prepared.length) {
      setUploading(false);
      return;
    }

    setUploadProgress({ total: prepared.length, done: 0 });
    let successCount = 0;
    for (let index = 0; index < prepared.length; index += 1) {
      const file = prepared[index];
      const { error: uploadError } = await supabase.storage.from(bucket).upload(file.name, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) {
        setError(uploadError.message || "Failed to upload an image");
      } else {
        successCount += 1;
      }
      setUploadProgress({ total: prepared.length, done: index + 1 });
    }

    setUploadMessage(successCount ? `Uploaded ${successCount} image(s).` : "");
    setUploading(false);
    fetchImages();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (image) => {
    if (!supabase) return;
    setDeleting(image.name);
    setError("");
    try {
      const { error: removeError } = await supabase.storage.from(bucket).remove([image.name]);
      if (removeError) throw removeError;
      setImages((prev) => prev.filter((item) => item.name !== image.name));
    } catch (err) {
      setError(err?.message || "Failed to delete image");
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Gallery Library</h3>
          <p className="text-sm text-slate-400">Upload, curate, and maintain marketing visuals.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/20 transition disabled:opacity-50"
          >
            <FiUpload size={16} />
            {uploading ? `Uploading ${uploadProgress.done}/${uploadProgress.total}` : "Upload"}
          </button>
        </div>
      </div>
      {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
      {uploadMessage && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{uploadMessage}</div>}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">Loading gallery...</div>
      ) : images.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-12 text-center text-sm text-slate-400">
          No images uploaded yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div key={image.name} className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-lg">
              <img src={image.url} alt={image.name} className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent px-3 py-2">
                <span className="truncate text-xs text-slate-200">{image.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(image)}
                  disabled={deleting === image.name}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 text-rose-200 hover:bg-rose-500/40 transition disabled:opacity-50"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
