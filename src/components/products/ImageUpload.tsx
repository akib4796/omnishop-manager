import { useState, useRef } from "react";
import { storage, ID } from "@/integrations/appwrite";
import { useTranslation } from "react-i18next";
import { Upload, X, Loader2, Camera, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageFormat, ImageGravity } from "appwrite";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
}

// Bucket ID for product images - must match Appwrite Console
const BUCKET_ID = '6935c81800287c3bab79';

/**
 * Helper function to get optimized image URL in AVIF format
 * Uses Appwrite's image transformation API
 */
export function getOptimizedImageUrl(fileId: string, options?: {
  width?: number;
  height?: number;
  quality?: number;
}): string {
  const { width = 800, height, quality = 80 } = options || {};

  // Use getFilePreview with AVIF output format for optimal compression
  const result = storage.getFilePreview(
    BUCKET_ID,
    fileId,
    width,           // width
    height,          // height (undefined = auto)
    ImageGravity.Center, // gravity
    quality,         // quality (1-100)
    0,               // borderWidth
    '',              // borderColor
    0,               // borderRadius
    1,               // opacity
    0,               // rotation
    '',              // background
    ImageFormat.Avif // output format - AVIF for best compression
  );

  return String(result);
}

/**
 * Extract file ID from Appwrite storage URL
 */
export function extractFileIdFromUrl(url: string): string | null {
  // URL pattern: .../buckets/bucket-id/files/FILE_ID/...
  const match = url.match(/\/files\/([^\/]+)/);
  return match ? match[1] : null;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t("products.invalidImageType"));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("products.imageTooLarge"));
      return;
    }

    setUploading(true);

    try {
      // Create file in Appwrite Storage
      const response = await storage.createFile(
        BUCKET_ID,
        ID.unique(),
        file
      );

      // Get file view URL (simple, works reliably)
      const fileUrl = storage.getFileView(BUCKET_ID, response.$id);
      const url = String(fileUrl);

      setPreview(url);
      onChange(url);
      toast.success(t("products.imageUploaded"));
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(t("products.imageUploadError"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    onChange("");
  };

  const openGallery = () => {
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="relative w-32 h-32 border rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
          <img src={preview} alt="Preview" className="w-full h-full object-contain p-1" />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          {/* Upload buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openGallery}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4 mr-2" />
              )}
              {t("products.uploadImage") || "Gallery"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCamera}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              {t("products.takePhoto") || "Camera"}
            </Button>
          </div>

          {/* Preview placeholder */}
          <div className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-muted/30">
            <Upload className="h-8 w-8 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground text-center px-2">
              {t("products.noImage") || "No image"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
