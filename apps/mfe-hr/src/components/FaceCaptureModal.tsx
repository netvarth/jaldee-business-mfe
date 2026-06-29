import { useEffect, useRef, useState } from "react";
import { Loader2, Camera, X, ScanFace } from "lucide-react";
import { loadFaceModels, getDescriptor } from "../lib/face";
import { Dialog } from "@jaldee/design-system";

type Status = "loading" | "ready" | "capturing" | "error";

/**
 * Webcam face-capture modal. Loads the face-api models + camera, lets the user
 * snap their face, computes a 128-float descriptor and hands it back via
 * onCapture. Used for both enrollment (store the descriptor) and verification
 * (compare against a stored one — comparison is done by the caller).
 */
export default function FaceCaptureModal({
  title, subtitle, busy, onCapture, onClose,
}: {
  title: string;
  subtitle?: string;
  busy?: boolean;
  onCapture: (descriptor: number[], selfieDataUrl?: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadFaceModels();
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 360 } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
        setStatus("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start the camera. Grant camera permission and retry.");
        setStatus("error");
      }
    })();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capture = async () => {
    if (!videoRef.current) return;
    setStatus("capturing");
    setError("");
    try {
      const desc = await getDescriptor(videoRef.current);
      if (!desc) { setError("No face detected — center your face in the frame and try again."); setStatus("ready"); return; }
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 480;
      canvas.height = videoRef.current.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      await onCapture(Array.from(desc), canvas.toDataURL("image/jpeg", 0.82));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed."); setStatus("ready");
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      testId="hr-face-capture-modal"
      hideHeader
      contentClassName="max-w-[460px] p-0 overflow-hidden"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--primary-light)", color: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center" }}><ScanFace size={18} /></div>
          <div><div style={{ fontSize: 16, fontWeight: 800, color: "var(--dark-text)" }}>{title}</div>{subtitle && <div style={{ fontSize: 12, color: "var(--light-text)" }}>{subtitle}</div>}</div>
        </div>
        <button id="hr-face-capture-close" data-testid="hr-face-capture-close" onClick={onClose} aria-label="Close face capture modal" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
      </div>

      <div style={{ padding: 22 }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "#0f172a", borderRadius: 14, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <video id="hr-face-capture-video" data-testid="hr-face-capture-video" ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
          {status === "loading" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "white", background: "rgba(15,23,42,0.6)", fontSize: 13 }}><Loader2 size={18} className="animate-spin" /> Loading camera & models…</div>}
          {status === "capturing" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "white", background: "rgba(15,23,42,0.45)", fontSize: 13 }}><Loader2 size={18} className="animate-spin" /> Scanning face…</div>}
        </div>

        {error && <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger-color)", borderRadius: 10, fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button id="hr-face-capture-cancel" data-testid="hr-face-capture-cancel" onClick={onClose} style={{ flex: 1, height: 46, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button id="hr-face-capture-submit" data-testid="hr-face-capture-submit" onClick={capture} disabled={status !== "ready" || busy} style={{ flex: 2, height: 46, borderRadius: 12, border: "none", background: "var(--primary-color)", color: "white", fontWeight: 800, cursor: status === "ready" && !busy ? "pointer" : "not-allowed", opacity: status === "ready" && !busy ? 1 : 0.6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {busy || status === "capturing" ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />} Capture
          </button>
        </div>
      </div>
    </Dialog>
  );
}
