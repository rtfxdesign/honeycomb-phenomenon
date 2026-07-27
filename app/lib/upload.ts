export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * Upload a file directly to Cloudflare R2 via presigned URL with progress tracking.
 *
 * Flow:
 *   1. Requests a presigned URL from /api/get-upload-url
 *   2. Uploads the file directly to R2 (bypasses Netlify's 6 MB function / 8 MB form limit)
 *   3. Reports progress via callback for UI updates (progress bar)
 *
 * Returns the R2 object key so it can be stored with the form submission metadata.
 */
export async function uploadToR2(
  file: File | Blob,
  filename: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ key: string }> {
  // 1. Get presigned URL from our API
  const response = await fetch("/api/get-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename,
      contentType: file.type || "video/webm",
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to get upload URL");
  }

  const { uploadUrl, key } = await response.json();

  // 2. Upload directly to R2 using XHR for progress tracking
  //    (fetch() doesn't support upload progress across all browsers)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ key });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));

    // 30-minute timeout for multi-GB files
    xhr.timeout = 1800000;

    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "video/webm");
    xhr.send(file);
  });
}

/** Format bytes to human-readable string (e.g. "1.5 GB") */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}
