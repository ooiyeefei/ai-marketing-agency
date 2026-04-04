"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";

interface UploadFormProps {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}

export default function UploadForm({ onSubmit, isLoading }: UploadFormProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [prompt, setPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    fileRef.current = file;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileRef.current || !prompt.trim()) return;
    const formData = new FormData();
    formData.append("image", fileRef.current);
    formData.append("prompt", prompt.trim());
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          glass-card relative cursor-pointer overflow-hidden
          transition-all duration-300 ease-out
          ${
            isDragging
              ? "border-[var(--accent)] shadow-[0_0_30px_rgba(99,102,241,0.3)] scale-[1.01]"
              : "hover:border-[var(--accent-light)] hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {preview ? (
          <div className="relative aspect-[4/3] w-full">
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-cover rounded-[1rem]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-[1rem]" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-sm text-white/80 truncate max-w-[70%]">
                {fileName}
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent-light)] border border-[var(--accent)]/30">
                Click to change
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 px-6">
            <div
              className={`
                mb-4 rounded-2xl p-4
                bg-[var(--accent)]/10 border border-[var(--accent)]/20
                transition-transform duration-300
                ${isDragging ? "scale-110" : ""}
              `}
            >
              {isDragging ? (
                <Upload className="h-8 w-8 text-[var(--accent-light)]" />
              ) : (
                <ImageIcon className="h-8 w-8 text-[var(--accent-light)]" />
              )}
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {isDragging ? "Drop your image here" : "Drag & drop your product photo"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              or click to browse -- PNG, JPG up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* Prompt Input */}
      <div className="glass-card p-4 transition-all duration-200 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-400">
          Your Brief
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your post... e.g., 'Launch post for our new spicy burger, fun and bold'"
          rows={3}
          className="w-full resize-none bg-transparent text-sm text-[var(--foreground)] placeholder:text-gray-600 focus:outline-none leading-relaxed"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !fileRef.current || !prompt.trim()}
        className={`
          group relative w-full overflow-hidden rounded-xl px-6 py-3.5
          font-semibold text-sm tracking-wide
          transition-all duration-300 ease-out
          ${
            isLoading || !fileRef.current || !prompt.trim()
              ? "bg-[var(--surface)] text-gray-500 cursor-not-allowed"
              : "bg-[var(--accent)] text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:scale-[1.01] active:scale-[0.99]"
          }
        `}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Agents are working...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
              Generate Instagram Post
            </>
          )}
        </span>
        {!isLoading && fileRef.current && prompt.trim() && (
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        )}
      </button>
    </form>
  );
}
