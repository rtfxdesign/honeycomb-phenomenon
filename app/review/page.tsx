"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Submission {
  submissionKey: string;
  data: {
    id: string;
    title: string;
    location: string;
    experienceYear: string;
    transcript: string;
    hashtags?: string[];
    status?: string;
  };
  mediaUrl: string | null;
  mediaType: "image" | "video" | "audio" | "unknown" | null;
  photoUrl: string | null;
  lastModified: string;
}

export default function ReviewDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMedia, setActiveMedia] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/review-queue")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load submissions");
        return res.json();
      })
      .then((data) => {
        setSubmissions(data.submissions || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load submissions from R2 bucket.");
        setLoading(false);
      });
  }, []);

  const handleApprove = async (submissionKey: string) => {
    try {
      const res = await fetch("/api/approve-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionKey })
      });
      if (!res.ok) throw new Error("Failed to approve");
      const data = await res.json();
      
      // Update local state to reflect the new key
      setSubmissions(current => current.map(sub => 
        sub.submissionKey === submissionKey 
          ? { ...sub, submissionKey: data.newSubmissionKey, data: { ...sub.data, status: "approved" } } 
          : sub
      ));
    } catch (err) {
      console.error(err);
      alert("Failed to approve submission. Check console.");
    }
  };

  const handleDelete = async (submissionKey: string) => {
    if (!confirm("Are you sure you want to permanently delete this submission?")) return;
    try {
      const res = await fetch("/api/delete-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionKey })
      });
      if (!res.ok) throw new Error("Failed to delete");
      
      // Remove from local state
      setSubmissions(current => current.filter(sub => sub.submissionKey !== submissionKey));
    } catch (err) {
      console.error(err);
      alert("Failed to delete submission. Check console.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", padding: "2rem" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "600", margin: "0 0 0.5rem 0" }}>Unified Review Dashboard</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>Secure archive of uploaded anomalous experiences (Text + Media).</p>
        </div>
        <Link href="/" style={{ padding: "0.5rem 1rem", border: "1px solid var(--line)", borderRadius: "4px", textDecoration: "none", color: "inherit" }}>
          &larr; Back to Site
        </Link>
      </header>

      {loading && <div style={{ opacity: 0.5 }}>Loading securely...</div>}
      {error && <div style={{ color: "#d9534f" }}>{error}</div>}
      
      {!loading && !error && submissions.length === 0 && (
        <div style={{ padding: "3rem", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "8px", opacity: 0.7 }}>
          No submissions pending review.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "2rem" }}>
        {submissions.map((submission) => {
          const isApproved = submission.submissionKey.startsWith("approved/");
          const { title, location, experienceYear, transcript, hashtags } = submission.data;
          
          return (
            <div key={submission.submissionKey} style={{ display: "flex", flexDirection: "column", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", backgroundColor: isApproved ? "rgba(0, 255, 100, 0.05)" : "var(--card-bg, rgba(0,0,0,0.02))" }}>
              
              {/* Header */}
              <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "600" }}>{title || "Untitled"}</h3>
                  {isApproved && (
                    <div style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "100px", backgroundColor: "#007067", color: "#fff", whiteSpace: "nowrap" }}>
                      Approved
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "0.85rem", opacity: 0.7, display: "flex", gap: "1rem" }}>
                  <span>⌖ {location || "Unknown"}</span>
                  <span>📅 {experienceYear || "Unknown"}</span>
                </div>
                <div style={{ fontSize: "0.8rem", opacity: 0.5, marginTop: "0.5rem" }}>
                  Submitted: {formatDate(submission.lastModified)}
                </div>
              </div>
              
              {/* Transcript */}
              <div style={{ padding: "1.5rem", flex: 1 }}>
                <p style={{ margin: "0 0 1rem 0", lineHeight: 1.6, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                  "{transcript}"
                </p>
                
                {hashtags && hashtags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {hashtags.map(tag => (
                      <span key={tag} style={{ backgroundColor: "var(--line)", padding: "0.2rem 0.6rem", borderRadius: "100px", fontSize: "0.75rem", opacity: 0.8 }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Media Section */}
              {(submission.mediaUrl || submission.photoUrl) && (
                <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--line)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <h4 style={{ margin: "0 0 0.8rem 0", fontSize: "0.9rem", opacity: 0.7 }}>Attached Media</h4>
                  <div style={{ display: "flex", gap: "1rem", overflowX: "auto" }}>
                    {submission.photoUrl && (
                      <div style={{ flexShrink: 0, width: "100px", height: "100px", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--line)" }}>
                        <img src={submission.photoUrl} alt="Attached photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    {submission.mediaUrl && (
                      <div style={{ flexShrink: 0, width: "160px", height: "100px", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--line)", position: "relative", backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {submission.mediaType === "video" ? (
                          <>
                            <video src={submission.mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
                            <button onClick={() => setActiveMedia(submission.mediaUrl)} style={{ position: "absolute", background: "rgba(0,0,0,0.6)", color: "white", border: "1px solid rgba(255,255,255,0.3)", padding: "0.4rem 0.8rem", borderRadius: "20px", cursor: "pointer", fontSize: "0.8rem" }}>▶ Play Video</button>
                          </>
                        ) : submission.mediaType === "audio" ? (
                          <button onClick={() => setActiveMedia(submission.mediaUrl)} style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.3)", padding: "0.4rem 0.8rem", borderRadius: "20px", cursor: "pointer", fontSize: "0.8rem" }}>▶ Play Audio</button>
                        ) : (
                          <a href={submission.mediaUrl} target="_blank" rel="noreferrer" style={{ color: "white", fontSize: "0.8rem" }}>Download Media</a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--line)", display: "flex", gap: "0.5rem", backgroundColor: "rgba(0,0,0,0.1)" }}>
                {!isApproved && (
                  <button
                    onClick={() => handleApprove(submission.submissionKey)}
                    style={{ flex: 1, padding: "0.6rem", border: "none", borderRadius: "4px", backgroundColor: "#007067", color: "#fff", cursor: "pointer", fontWeight: "500" }}
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={() => handleDelete(submission.submissionKey)}
                  style={{ flex: 1, padding: "0.6rem", border: "none", borderRadius: "4px", backgroundColor: "#d9534f", color: "#fff", cursor: "pointer", fontWeight: "500" }}
                >
                  Reject / Delete
                </button>
              </div>
              
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
