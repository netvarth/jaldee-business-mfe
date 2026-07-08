import { useMemo, useState } from "react";
import { DataTable, Badge, Button, ErrorState, EmptyState } from "@jaldee/design-system";
import { useOffers, useApplications, useCandidates } from "../../services/useRecruitmentData";
import RecruitmentLayout from "./RecruitmentLayout";
import { ConvertToEmployeeModal } from "./ConvertToEmployeeModal";
import { NewOfferModal } from "./NewOfferModal";
import { OfferDetailsModal } from "./OfferDetailsModal";
import type { ColumnDef } from "@jaldee/design-system";
import type { Offer, Candidate } from "../../types";

/** Case-insensitive offer status check (backend enum is UPPER, UI shows Title). */
function isStatus(offer: Offer, s: string) {
  return String(offer.status).toUpperCase() === s.toUpperCase();
}

export default function Offers() {
  const { data, loading, error, updateStatus, create } = useOffers();
  const { data: applications, hire } = useApplications();
  const { data: candidates } = useCandidates();

  const [converting, setConverting] = useState<Offer | null>(null);
  const [viewing, setViewing] = useState<Offer | null>(null);
  const [newOfferOpen, setNewOfferOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // offer.applicationId → application → candidate, for prefill.
  const candidateFor = useMemo(() => {
    return (offer: Offer): { candidate: Candidate | null; applicationId?: string } => {
      const app = applications.find((a) => a.id === offer.applicationId);
      const applicationId = app?.id ?? offer.applicationId;
      // Backend applications carry candidateUid; the UI type uses candidateId — accept either.
      const candId = app?.candidateId ?? (app as { candidateUid?: string } | undefined)?.candidateUid;
      const candidate =
        app?.candidate ??
        candidates.find((c) => c.id === candId) ??
        null;
      return { candidate, applicationId };
    };
  }, [applications, candidates]);

  const candidateName = (offer: Offer) => candidateFor(offer).candidate?.name ?? "—";

  const handleAccept = async (offer: Offer) => {
    setBusyId(offer.id);
    try {
      await updateStatus(offer.id, "ACCEPTED");
    } finally {
      setBusyId(null);
    }
  };

  const columns: ColumnDef<Offer>[] = [
    {
      header: "Candidate",
      key: "applicationId",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{candidateName(row)}</div>
          {row.designation && <div className="text-xs text-gray-500">{row.designation}</div>}
        </div>
      ),
    },
    {
      header: "Offered Salary",
      key: "offeredSalary",
      render: (row) =>
        row.offeredSalary ? `${row.currency || "₹"} ${Number(row.offeredSalary).toLocaleString()}` : "—",
    },
    {
      header: "Joining",
      key: "joiningDate",
      render: (row) => (row.joiningDate ? new Date(String(row.joiningDate)).toLocaleDateString() : "—"),
    },
    {
      header: "Valid Until",
      key: "validUntil",
      render: (row) => (row.validUntil ? new Date(String(row.validUntil)).toLocaleDateString() : "—"),
    },
    {
      header: "Status",
      key: "status",
      render: (row) => {
        const v = String(row.status);
        const variant =
          v.toUpperCase() === "ACCEPTED"
            ? "success"
            : v.toUpperCase() === "DECLINED"
            ? "danger"
            : v.toUpperCase() === "SENT"
            ? "warning"
            : "neutral";
        return <Badge variant={variant}>{v}</Badge>;
      },
    },
    {
      header: "",
      key: "id",
      align: "right",
      render: (row) => (
        <div className="flex justify-end items-center gap-2 whitespace-nowrap">
          <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => setViewing(row)}>View</Button>
          {isStatus(row, "SENT") && (
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              loading={busyId === row.id}
              onClick={() => handleAccept(row)}
            >
              Accept
            </Button>
          )}
          {isStatus(row, "ACCEPTED") && (
            <Button variant="primary" size="sm" className="whitespace-nowrap" onClick={() => setConverting(row)}>
              Convert
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <RecruitmentLayout title="Offers" subtitle="Track and manage candidate offers.">
        <ErrorState title="Failed to load Offers" description={error} />
      </RecruitmentLayout>
    );
  }

  const resolved = converting ? candidateFor(converting) : { candidate: null, applicationId: undefined };

  return (
    <RecruitmentLayout title="Offers" subtitle="Track and manage candidate offers.">
      <div className="p-8">
        <div className="rounded-xl border border-gray-200 bg-white">
          {/* Toolbar */}
          <div className="flex items-center justify-end border-b border-gray-100 px-6 py-4">
            <Button variant="primary" onClick={() => setNewOfferOpen(true)}>+ New Offer</Button>
          </div>

          {/* Table */}
          <div className="p-0">
            {!loading && data.length === 0 ? (
              <div className="py-12">
                <EmptyState title="No Offers" description="Create an offer for a candidate to see it here." />
              </div>
            ) : (
              <DataTable data={data} columns={columns} loading={loading} />
            )}
          </div>
        </div>
      </div>

      <ConvertToEmployeeModal
        key={converting?.id ?? "convert"}
        isOpen={!!converting}
        onClose={() => setConverting(null)}
        offer={converting}
        candidate={resolved.candidate}
        applicationId={resolved.applicationId}
        onConvert={hire}
      />

      <NewOfferModal
        isOpen={newOfferOpen}
        onClose={() => setNewOfferOpen(false)}
        applications={applications}
        candidates={candidates}
        onSave={create}
      />

      <OfferDetailsModal
        key={viewing?.id ?? "view"}
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        offer={viewing}
        candidate={viewing ? candidateFor(viewing).candidate : null}
        onConvert={viewing && isStatus(viewing, "ACCEPTED") ? () => setConverting(viewing) : undefined}
      />
    </RecruitmentLayout>
  );
}
