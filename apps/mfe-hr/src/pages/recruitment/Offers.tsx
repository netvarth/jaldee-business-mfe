import { useEffect, useMemo, useState } from "react";
import { DataTable, Badge, Button, ErrorState, EmptyState } from "@jaldee/design-system";
import { useOffers, useApplications } from "../../services/useRecruitmentData";
import RecruitmentLayout from "./RecruitmentLayout";
import { ConvertToEmployeeModal } from "./ConvertToEmployeeModal";
import { NewOfferModal } from "./NewOfferModal";
import { OfferDetailsModal } from "./OfferDetailsModal";
import { RecruitmentMobileCard, RecruitmentViewToggle, useRecruitmentResponsiveViewMode } from "./recruitmentResponsive";
import type { ColumnDef } from "@jaldee/design-system";
import type { Offer } from "../../types";

function isStatus(offer: Offer, status: string) {
  return String(offer.status).toUpperCase() === status.toUpperCase();
}

export default function Offers() {
  const { data, loading, error, updateStatus, create } = useOffers();
  const { data: applications, hire, reload: loadApplications } = useApplications({ autoload: false });

  const [converting, setConverting] = useState<Offer | null>(null);
  const [viewing, setViewing] = useState<Offer | null>(null);
  const [newOfferOpen, setNewOfferOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useRecruitmentResponsiveViewMode();

  useEffect(() => {
    if (!newOfferOpen && !converting && !viewing) return;
    void loadApplications();
  }, [converting, loadApplications, newOfferOpen, viewing]);

  const candidateFor = useMemo(() => {
    return (offer: Offer) => {
      const application = applications.find((item) => item.id === offer.applicationId);
      const applicationId = application?.id ?? offer.applicationId;
      const candidate = application?.candidate ?? null;
      return { candidate, applicationId };
    };
  }, [applications]);

  const candidateName = (offer: Offer) => candidateFor(offer).candidate?.name ?? "-";
  const offerStatusVariant = (status?: string) => {
    const value = String(status ?? "").toUpperCase();
    if (value === "ACCEPTED") return "success";
    if (value === "DECLINED") return "danger";
    if (value === "SENT") return "warning";
    return "neutral";
  };
  const salaryLabel = (offer: Offer) =>
    offer.offeredSalary ? `${offer.currency || "Rs"} ${Number(offer.offeredSalary).toLocaleString()}` : "-";

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
      render: (row) => salaryLabel(row),
    },
    {
      header: "Joining",
      key: "joiningDate",
      render: (row) => (row.joiningDate ? new Date(String(row.joiningDate)).toLocaleDateString() : "-"),
    },
    {
      header: "Valid Until",
      key: "validUntil",
      render: (row) => (row.validUntil ? new Date(String(row.validUntil)).toLocaleDateString() : "-"),
    },
    {
      header: "Status",
      key: "status",
      render: (row) => <Badge variant={offerStatusVariant(row.status)}>{String(row.status || "-")}</Badge>,
    },
    {
      header: "",
      key: "id",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          <Button variant="outline" size="sm" className="whitespace-nowrap" data-testid={`hr-recruitment-offer-view-${row.id}`} onClick={() => setViewing(row)}>
            View
          </Button>
          {isStatus(row, "SENT") && (
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              data-testid={`hr-recruitment-offer-accept-${row.id}`}
              loading={busyId === row.id}
              onClick={() => handleAccept(row)}
            >
              Accept
            </Button>
          )}
          {isStatus(row, "ACCEPTED") && (
            <Button
              variant="primary"
              size="sm"
              className="whitespace-nowrap"
              data-testid={`hr-recruitment-offer-convert-${row.id}`}
              onClick={() => setConverting(row)}
            >
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
      <div>
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="text-sm text-gray-500">Manage active, accepted, and declined offers.</div>
            <div className="flex w-full items-center justify-between gap-3 flex-wrap md:w-auto md:flex-row md:items-center">
              <Button variant="primary" data-testid="hr-recruitment-new-offer" onClick={() => setNewOfferOpen(true)}>
                + New Offer
              </Button>
              <div className="ml-auto shrink-0">
                <RecruitmentViewToggle
                  value={viewMode}
                  onChange={setViewMode}
                  tableTestId="hr-recruitment-offers-view-table"
                  cardsTestId="hr-recruitment-offers-view-cards"
                />
              </div>
            </div>
          </div>

          <div className="p-0">
            {!loading && data.length === 0 ? (
              <div className="py-12">
                <EmptyState title="No Offers" description="Create an offer for a candidate to see it here." />
              </div>
            ) : viewMode === "cards" ? (
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {data.map((offer) => (
                  <RecruitmentMobileCard
                    key={offer.id}
                    title={candidateName(offer)}
                    rows={[
                      { label: "Role", value: offer.designation || "-" },
                      { label: "Salary", value: salaryLabel(offer) },
                      { label: "Joining", value: offer.joiningDate ? new Date(String(offer.joiningDate)).toLocaleDateString() : "-" },
                      { label: "Valid Until", value: offer.validUntil ? new Date(String(offer.validUntil)).toLocaleDateString() : "-" },
                      { label: "Status", value: <Badge variant={offerStatusVariant(offer.status)}>{String(offer.status || "-")}</Badge> },
                    ]}
                    footer={
                      <>
                        <Button variant="outline" size="sm" data-testid={`hr-recruitment-offer-card-view-${offer.id}`} onClick={() => setViewing(offer)}>
                          View
                        </Button>
                        {isStatus(offer, "SENT") ? (
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`hr-recruitment-offer-card-accept-${offer.id}`}
                            loading={busyId === offer.id}
                            onClick={() => handleAccept(offer)}
                          >
                            Accept
                          </Button>
                        ) : null}
                        {isStatus(offer, "ACCEPTED") ? (
                          <Button
                            variant="primary"
                            size="sm"
                            data-testid={`hr-recruitment-offer-card-convert-${offer.id}`}
                            onClick={() => setConverting(offer)}
                          >
                            Convert
                          </Button>
                        ) : null}
                      </>
                    }
                  />
                ))}
              </div>
            ) : (
              <DataTable data={data} columns={columns} loading={loading} />
            )}
          </div>
        </div>
      </div>

      {converting ? (
        <ConvertToEmployeeModal
          key={converting.id}
          isOpen
          onClose={() => setConverting(null)}
          offer={converting}
          candidate={resolved.candidate}
          applicationId={resolved.applicationId}
          onConvert={hire}
        />
      ) : null}

      {newOfferOpen ? (
        <NewOfferModal
          isOpen
          onClose={() => setNewOfferOpen(false)}
          applications={applications}
          onSave={create}
        />
      ) : null}

      {viewing ? (
        <OfferDetailsModal
          key={viewing.id}
          isOpen
          onClose={() => setViewing(null)}
          offer={viewing}
          candidate={candidateFor(viewing).candidate}
          onConvert={isStatus(viewing, "ACCEPTED") ? () => setConverting(viewing) : undefined}
        />
      ) : null}
    </RecruitmentLayout>
  );
}
