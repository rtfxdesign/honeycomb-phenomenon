"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MediaFile {
  key: string;
  size: number;
  lastModified: string;
}

export default function ReviewDashboard() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMedia, setActiveMedia] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/list-media")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load media list");
        return res.json();
      })
      .then((data) => {
        setFiles(data.files || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load media from R2 bucket.");
        setLoading(false);
      });
  }, []);

  const handleApprove = async (key: string) => {
    try {
      const res = await fetch("/api/approve-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });
      if (!res.ok) throw new Error("Failed to approve");
      const data = await res.json();
      
      // Update local state to reflect the new key
      setFiles(current => current.map(f => f.key === key ? { ...f, key: data.newKey } : f));
    } catch (err) {
      console.error(err);
      alert("Failed to approve media. Check console.");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isVideo = (key: string) => key.startsWith("video/");
  const isAudio = (key: string) => key.startsWith("audio/");
  const isImage = (key: string) => key.startsWith("image/");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", padding: "2rem" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "600", margin: "0 0 0.5rem 0" }}>Media Review</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>Secure archive of uploaded anomalous experiences.</p>
        </div>
        <Link href="/" style={{ padding: "0.5rem 1rem", border: "1px solid var(--line)", borderRadius: "4px", textDecoration: "none", color: "inherit" }}>
          &larr; Back to Site
        </Link>
      </header>

      {loading && <div style={{ opacity: 0.5 }}>Loading securely...</div>}
      {error && <div style={{ color: "#d9534f" }}>{error}</div>}
      
      {!loading && !error && files.length === 0 && (
        <div style={{ padding: "3rem", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "8px", opacity: 0.7 }}>
          No media uploaded yet.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {files.map((file) => {
          const viewUrl = `/api/view-media?key=${encodeURIComponent(file.key)}`;
          const isApproved = file.key.startsWith("approved/");
          
          return (
            <div key={file.key} style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "1rem", backgroundColor: isApproved ? "rgba(0, 255, 100, 0.05)" : "rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div style={{ wordBreak: "break-all", fontWeight: "500", marginRight: "1rem" }}>
                  {file.key.split('/').pop()}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {isApproved && (
                    <div style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "100px", backgroundColor: "#007067", color: "#fff", whiteSpace: "nowrap" }}>
                      Approved
                    </div>
                  )}
                  <div style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "100px", backgroundColor: "var(--line)", whiteSpace: "nowrap" }}>
                    {file.key.split('/').pop()?.split('.').pop()?.toUpperCase() || "FILE"}
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", opacity: 0.6, marginBottom: "1rem" }}>
                <span>{formatBytes(file.size)}</span>
                <span>{formatDate(file.lastModified)}</span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(isVideo(file.key) || isAudio(file.key)) ? (
                  <button 
                    onClick={() => setActiveMedia(viewUrl)}
                    style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "4px", backgroundColor: "transparent", cursor: "pointer", color: "var(--text)" }}
                  >
                    Play In-Browser
                  </button>
                ) : null}
                
                <a 
                  href={viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ flex: 1, padding: "0.5rem", textAlign: "center", border: "1px solid var(--line)", borderRadius: "4px", backgroundColor: "var(--text)", color: "var(--bg)", textDecoration: "none", display: "inline-block" }}
                >
                  Download / View
                </a>
              </div>
              
              {!isApproved && (
                <button
                  onClick={() => handleApprove(file.key)}
                  style={{ width: "100%", marginTop: "1rem", padding: "0.5rem", border: "none", borderRadius: "4px", backgroundColor: "#007067", color: "#fff", cursor: "pointer", fontWeight: "500" }}
                >
                  Approve Media
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Media Player Modal */}
      {activeMedia && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.9)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 9999, padding: "2rem"
        }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "900px", backgroundColor: "#000", borderRadius: "8px", overflow: "hidden" }}>
            <button 
              onClick={() => setActiveMedia(null)}
              style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10, background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer" }}
            >
              Close
            </button>
            <video 
              src={activeMedia} 
              controls 
              autoPlay 
              style={{ width: "100%", maxHeight: "80vh", display: "block" }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
