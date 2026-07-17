import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader, Button, Badge } from "@jaldee/design-system";
import { Download, Copy, Share2, Calendar, Clock, Activity } from "lucide-react";
import { useQrLinks, type QrLink } from "../../services/useQrLinks";
import { useToast } from "../../contexts/ToastContext";

export default function QrLinkDetailsPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { getById } = useQrLinks();
  const { showToast } = useToast();
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

  if (loading) {
    return <div className="p-6">Loading details...</div>;
  }

  if (!qrLink) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <PageHeader
          title="QR Link Not Found"
          back={{ label: "Back to QR Links", href: "/qrlinks" }}
          onNavigate={() => navigate("/qrlinks")}
        />
        <p className="text-slate-500">
          {error ?? "The requested QR link could not be found or you do not have permission to view it."}
        </p>
      </div>
    );
  }

  const handleCopyLink = () => {
    if (qrLink.qrLink) {
      navigator.clipboard.writeText(qrLink.qrLink);
      showToast("Link copied to clipboard!", "success");
    }
  };

  const isExpired = qrLink.expiryDate && new Date(qrLink.expiryDate) < new Date();
  const statusColor = isExpired ? "danger" : qrLink.status === "Enabled" ? "success" : "neutral";

  return (
    <div className="p-4 md:p-6 h-full max-w-5xl mx-auto flex flex-col gap-6">
      <PageHeader
        title={qrLink.name || "QR Link Details"}
        subtitle={qrLink.description || "View and share your QR code"}
        back={{ label: "Back to QR Links", href: "/qrlinks" }}
        onNavigate={() => navigate("/qrlinks")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center shadow-sm">
            <div className="aspect-square w-full max-w-[240px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center p-4 mb-6">
              <div className="text-center text-slate-400">
                <Activity size={48} className="mx-auto mb-2 opacity-20" />
                <span className="text-xs font-medium uppercase tracking-wider">QR Code Preview</span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <Button
                className="w-full"
                variant="primary"
                onClick={() => window.open(qrLink.qrLink, "_blank")}
                disabled={!qrLink.qrLink}
              >
                <Share2 size={16} className="mr-2" />
                Open Link
              </Button>
              <Button className="w-full" variant="secondary" onClick={handleCopyLink} disabled={!qrLink.qrLink}>
                <Copy size={16} className="mr-2" />
                Copy Link
              </Button>
              <Button className="w-full" variant="secondary" disabled>
                <Download size={16} className="mr-2" />
                Download PNG
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 pb-4 border-b border-slate-100">
              Configuration Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <Badge variant={statusColor as never}>{isExpired ? "Expired" : qrLink.status}</Badge>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">Type</p>
                <p className="text-sm font-semibold text-slate-800">{qrLink.type || "—"}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">Mapped Calendar</p>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">{qrLink.calendarName || qrLink.calendarUid || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">Expiry Date</p>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">
                    {qrLink.expiryDate ? new Date(qrLink.expiryDate).toLocaleDateString() : "Never expires"}
                  </p>
                </div>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-slate-400 mb-1">Description</p>
                <p className="text-sm text-slate-700">{qrLink.description || "No description provided."}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-4 border-b border-slate-100">
              Live Link
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded px-4 py-3 font-mono text-sm break-all text-slate-600">
              {qrLink.qrLink || "Not generated yet."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
