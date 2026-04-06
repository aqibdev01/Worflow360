"use client";

import { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Film,
  Music,
  Download,
  X,
  Maximize2,
  File,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileMetadata {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  storagePath?: string;
}

interface FileMessageCardProps {
  metadata: FileMetadata;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isImage(mimeType?: string): boolean {
  return !!mimeType && mimeType.startsWith("image/");
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(mimeType?: string, name?: string) {
  if (!mimeType && !name) return File;

  const mt = mimeType || "";
  const ext = name?.split(".").pop()?.toLowerCase() || "";

  if (mt.startsWith("video/") || ["mp4", "mov", "avi", "webm"].includes(ext))
    return Film;
  if (mt.startsWith("audio/") || ["mp3", "wav", "ogg", "flac"].includes(ext))
    return Music;
  if (
    mt.includes("spreadsheet") ||
    mt.includes("excel") ||
    ["xlsx", "xls", "csv"].includes(ext)
  )
    return FileSpreadsheet;
  if (
    mt.includes("zip") ||
    mt.includes("rar") ||
    mt.includes("tar") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  )
    return FileArchive;
  if (
    mt.includes("javascript") ||
    mt.includes("typescript") ||
    mt.includes("json") ||
    mt.includes("html") ||
    mt.includes("css") ||
    mt.includes("xml") ||
    ["js", "ts", "tsx", "jsx", "py", "go", "rs", "java", "cpp", "c", "h", "rb", "php", "sql"].includes(ext)
  )
    return FileCode;
  if (mt.includes("pdf") || mt.includes("document") || mt.includes("text"))
    return FileText;

  return File;
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function ImageLightbox({
  url,
  name,
  onClose,
}: {
  url: string;
  name: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white z-50"
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={url}
        alt={name}
        className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FileMessageCard({ metadata }: FileMessageCardProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const FileIcon = getFileIcon(metadata.mimeType, metadata.name);

  // Image preview
  if (isImage(metadata.mimeType)) {
    return (
      <>
        <div className="mt-1.5 max-w-[300px]">
          <div className="relative group rounded-lg overflow-hidden border bg-muted/20">
            <img
              src={metadata.url}
              alt={metadata.name}
              className="max-w-full h-auto rounded-lg cursor-pointer"
              style={{ maxHeight: 250 }}
              onClick={() => setShowLightbox(true)}
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-between opacity-0 group-hover:opacity-100 p-2">
              <span className="text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded truncate max-w-[200px]">
                {metadata.name}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLightbox(true);
                  }}
                  className="p-1 bg-black/50 rounded text-white hover:bg-black/70 transition-colors"
                  title="View full size"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <a
                  href={metadata.url}
                  download={metadata.name}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 bg-black/50 rounded text-white hover:bg-black/70 transition-colors"
                  title="Download"
                >
                  <Download className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
          {metadata.size && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatFileSize(metadata.size)}
            </p>
          )}
        </div>

        {showLightbox && (
          <ImageLightbox
            url={metadata.url}
            name={metadata.name}
            onClose={() => setShowLightbox(false)}
          />
        )}
      </>
    );
  }

  // Generic file card
  return (
    <div className="mt-1.5">
      <a
        href={metadata.url}
        target="_blank"
        rel="noopener noreferrer"
        download={metadata.name}
        className="group inline-flex items-center gap-3 px-3 py-2.5 bg-muted/30 hover:bg-muted/50 rounded-lg border transition-colors max-w-[350px]"
      >
        <div className="h-9 w-9 rounded-lg bg-indigo-600/10 flex items-center justify-center flex-shrink-0">
          <FileIcon className="h-4.5 w-4.5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate group-hover:text-indigo-600 transition-colors">
            {metadata.name}
          </p>
          {metadata.size && (
            <p className="text-[10px] text-muted-foreground">
              {formatFileSize(metadata.size)}
            </p>
          )}
        </div>
        <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </a>
    </div>
  );
}
