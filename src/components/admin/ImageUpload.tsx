"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, X, Loader2, Image as ImageIcon, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getToken } from "@/lib/api/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.hunykho.com";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  max?: number;
  single?: boolean;
  className?: string;
}

export function ImageUpload({ value, onChange, folder = "products", max = 10, single = false, className }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = single ? 1 : max - value.length;
    if (remaining <= 0) {
      toast.error(`Máximo ${max} ${max === 1 ? "imagen" : "imágenes"}`);
      return;
    }
    const toUpload = fileArray.slice(0, remaining);
    setIsUploading(true);

    try {
      const newUrls: string[] = [];
      for (const file of toUpload) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const token = getToken();
        const res = await fetch(`${API_URL}/api/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Error al subir ${file.name}`);
        }

        const data = await res.json();
        newUrls.push(data.url);
      }

      if (single) {
        onChange(newUrls.slice(0, 1));
      } else {
        onChange([...value, ...newUrls]);
      }
      toast.success(`${newUrls.length} ${newUrls.length === 1 ? "imagen subida" : "imágenes subidas"}`);
    } catch (err: any) {
      toast.error(err.message || "Error al subir imagen");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [value, onChange, folder, max, single]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    try {
      new URL(url);
      if (single) onChange([url]);
      else onChange([...value, url]);
      setUrlInput("");
    } catch {
      toast.error("URL inválida");
    }
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const isVideo = (url: string) => /\.(mp4|webm|ogg)$/i.test(url) || url.includes("video");

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
            mode === "upload" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <Upload className="h-3.5 w-3.5" /> Subir archivo
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
            mode === "url" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <Link2 className="h-3.5 w-3.5" /> Pegar URL
        </button>
      </div>

      {mode === "upload" ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
            isUploading ? "opacity-50 cursor-wait" : "hover:border-primary hover:bg-primary/5"
          )}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
          ) : (
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          )}
          <p className="text-sm mt-2 font-medium">{isUploading ? "Subiendo..." : "Arrastra o haz clic"}</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF, WebP, MP4 (máx. 10MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            multiple={!single}
            className="hidden"
            onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); }}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
          />
          <Button type="button" size="icon" onClick={addUrl}>
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Preview Grid */}
      {value.length > 0 && (
        <div className={cn("grid gap-3", single ? "grid-cols-1" : "grid-cols-2 md:grid-cols-4")}>
          {value.map((url, index) => (
            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
              {isVideo(url) ? (
                <video src={url} className="object-cover w-full h-full" muted />
              ) : (
                <img src={url} alt={`Imagen ${index + 1}`} className="object-cover w-full h-full" />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
              {index === 0 && !single && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-0.5 text-center font-medium">
                  Principal
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && mode === "upload" && (
        <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground">
          <ImageIcon className="h-5 w-5 mr-2" />
          <span className="text-sm">Sin imágenes</span>
        </div>
      )}
    </div>
  );
}
