import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader, Button, Badge, QRCodeSVG } from "@jaldee/design-system";
import { Download, Copy, Share2, Activity } from "lucide-react";
import { useQrLinks, type QrLink } from "../../services/useQrLinks";
import { useToast } from "../../contexts/ToastContext";
import { useModal } from "../../contexts/ModalContext";
import ShareQrModal from "./ShareQrModal";

export default function QrLinkDetailsPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { getById } = useQrLinks();
  const { showToast } = useToast();
  const { openModal } = useModal();
  const [qrLink, setQrLink] = useState<QrLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setError("Missing QR link id.");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getById(uid)
      .then((data) => {
        if (active) {
          setQrLink(data);
        }
      })
      .catch((loadError) => {
        if (active) {
          setQrLink(null);
          setError(loadError instanceof Error ? loadError.message : "Failed to load QR link details.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [getById, uid]);

  const handleCopyLink = () => {
    if (qrLink?.qrLink) {
      navigator.clipboard.writeText(qrLink.qrLink);
      showToast("Link copied to clipboard!", "success");
    }
  };

  const handleDownloadQr = () => {
    if (!qrLink?.qrLink) return;
    const svg = document.querySelector(".qr-code-svg-container svg");
    if (!svg) return;
    
    // Create canvas to draw the SVG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const a = document.createElement("a");
        a.download = `qr-link-${qrLink.name || qrLink.uid}.png`;
        a.href = canvas.toDataURL("image/png");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading details...</div>;
  }

  if (error || !qrLink) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <PageHeader
          title="QR Link Not Found"
          back={{ label: "Back to QR Links", href: "/qr-links" }}
          onNavigate={() => navigate("/qr-links")}
        />
        <p className="text-slate-500">
          {error ?? "The requested QR link could not be found or you do not have permission to view it."}
        </p>
      </div>
    );
  }

  const isExpired = qrLink.expiryDate && new Date(qrLink.expiryDate) < new Date();
  const displayStatus = isExpired ? "Expired" : qrLink.status === "Enabled" ? "Active" : "Inactive";
  const statusColor = isExpired ? "danger" : qrLink.status === "Enabled" ? "success" : "neutral";

  return (
    <main className="flex h-full flex-col overflow-y-auto bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-2 md:px-8 md:py-3 shadow-sm">
        <PageHeader
          title={qrLink.name || "QR Link Details"}
          subtitle={qrLink.description || "View and share your QR code"}
          back={{ label: "Back to QR Links", href: "/qr-links" }}
          onNavigate={() => navigate("/qr-links")}
          variant="navigation"
          className="mb-0 !mx-0 !shadow-none !bg-transparent !p-0"
          actions={
            <>
              <Button variant="secondary" onClick={() => window.open(qrLink.qrLink, "_blank")} disabled={!qrLink.qrLink}>
                Preview QR Link
              </Button>
              <Button variant="primary" onClick={() => navigate(`/qr-links/${qrLink.uid}/edit`)}>
                Edit QR Link
              </Button>
            </>
          }
        />
      </div>

      <div className="flex w-full flex-col p-4 md:p-6 lg:p-8 gap-6 max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col items-center justify-start bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-slate-500 font-medium self-start mb-4">QR</p>

            <div className="qr-code-svg-container aspect-square w-full max-w-[260px] bg-slate-50 rounded-lg flex items-center justify-center p-4 mb-6">
              {qrLink.qrLink ? (
                <QRCodeSVG value={qrLink.qrLink} size={220} level="M" />
              ) : (
                <div className="text-center text-slate-400">
                  <Activity size={48} className="mx-auto mb-2 opacity-20" />
                  <span className="text-xs font-medium uppercase tracking-wider">No Link Generated</span>
                </div>
              )}
            </div>

            {qrLink.qrLink && (
              <div className="w-full bg-slate-50 border border-slate-100 rounded-md px-3 py-2 mb-6 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-600 truncate font-mono" title={qrLink.qrLink}>
                  {qrLink.qrLink}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                  title="Copy Link"
                >
                  <Copy size={16} />
                </button>
              </div>
            )}

            <div className="w-full flex flex-wrap gap-3">
              <Button
                className="flex-1 min-w-[80px] flex items-center gap-2 justify-center"
                variant="secondary"
                disabled={!qrLink.qrLink}
                onClick={() => openModal(<ShareQrModal qrLinkName={qrLink.name} />)}
              >
                <Share2 size={16} /> Share
              </Button>
              <Button className="flex-1 min-w-[80px] flex items-center gap-2 justify-center" variant="secondary" onClick={handleDownloadQr} disabled={!qrLink.qrLink}>
                <Download size={16} /> Download
              </Button>
            </div>
          </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Configuration Details
              </h3>
              <Badge variant={statusColor as never}>{displayStatus}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-y-6 max-w-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-indigo-900 mb-1">Type</p>
                  <div className="inline-flex w-full items-center px-3 py-1.5 rounded-md border border-slate-200 text-sm text-slate-600 bg-white">
                    {qrLink.type || "—"}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-900 mb-1">Expiry Date</p>
                  <div className="inline-flex w-full items-center px-3 py-1.5 rounded-md border border-slate-200 text-sm text-slate-600 bg-white">
                    {qrLink.expiryDate ? new Date(qrLink.expiryDate).toLocaleDateString() : "No expiry date"}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-indigo-900 mb-1">Mapped Calendar</p>
                <div className="inline-flex items-center px-3 py-1.5 rounded-md border border-slate-200 text-sm text-slate-600 bg-white">
                  {qrLink.calendarName || qrLink.calendarUid || "—"}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-indigo-900 mb-1">Schedule</p>
                <div className="inline-flex items-center px-3 py-1.5 rounded-md border border-slate-200 text-sm text-slate-600 bg-white">
                  {qrLink.rawSchedules?.map(s => s.scheduleName).filter(Boolean).join(", ") || "—"}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-indigo-900 mb-1">Time Window</p>
                <div className="inline-flex items-center px-3 py-1.5 rounded-md border border-slate-200 text-sm text-slate-600 bg-white">
                  {qrLink.rawTimeWindows?.map(t => t.timeWindowName).filter(Boolean).join(", ") || "—"}
                </div>
              </div>
              
              {(qrLink.service && qrLink.service.length > 0) && (
                <div>
                  <p className="text-sm font-semibold text-indigo-900 mb-2">Services & Staff</p>
                  <div className="flex flex-col gap-2">
                    {qrLink.service.map((svc, idx) => (
                      <div key={idx} className="px-3 py-2 rounded-md border border-slate-200 bg-white">
                        <div className="text-sm font-medium text-slate-800">
                          {svc.serviceName || svc.serviceUid}
                        </div>
                        {svc.users && svc.users.length > 0 && (
                          <div className="text-xs text-slate-500 mt-1">
                            Assigned to: {svc.users.map(u => u.userName || u.userUid).filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}
