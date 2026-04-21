import { Alert, Button, Dialog, DialogFooter, EmptyState, PageHeader, Popover, PopoverSection, SectionCard } from "@jaldee/design-system";
import { useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useChangeLeadStatus, useLeadByUid, useLeadStages, useProviderUsers } from "../queries/leads";
import { formatDate, fullName, mapLeadStatusLabel, unwrapList, unwrapPayload } from "../utils";
import { ModulePlaceholder, StatusBadge } from "./shared";

function readTemplateFields(templateValue: any, prefix = ""): Array<{ title: string; value: string }> {
  if (!templateValue || typeof templateValue !== "object") {
    return [];
  }

  return Object.entries(templateValue).flatMap(([key, value]) => {
    const title = prefix || prettifyKey(key);

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return readTemplateFields(value, "");
    }

    if (Array.isArray(value)) {
      return [{ title, value: value.length > 0 ? value.join(", ") : "-" }];
    }

    return [{ title, value: value === null || value === undefined || value === "" ? "-" : String(value) }];
  });
}

function prettifyKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function getInitials(value: string) {
  return value.trim().charAt(0).toUpperCase() || "L";
}

function getStatusActions(status: string) {
  const normalized = String(status ?? "").toUpperCase();

  if (normalized === "ACTIVE") {
    return [
      "Reject Lead",
      "Convert Lead",
      "Convert to Member",
    ];
  }

  if (normalized === "NO_RESPONSE" || normalized === "REJECTED") {
    return ["Make It Active"];
  }

  return [];
}

export function LeadDetails({ leadUid }: { leadUid: string }) {
  const { basePath } = useSharedModulesContext();
  const [pendingStatusAction, setPendingStatusAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const leadQuery = useLeadByUid(leadUid);
  const leadStagesQuery = useLeadStages(leadUid);
  const usersQuery = useProviderUsers({ "status-eq": "ACTIVE" });
  const changeLeadStatusMutation = useChangeLeadStatus();
  const lead = useMemo(() => unwrapPayload(leadQuery.data), [leadQuery.data]);
  const stages = useMemo(() => unwrapList(leadStagesQuery.data), [leadStagesQuery.data]);
  const users = useMemo(() => unwrapList(usersQuery.data), [usersQuery.data]);

  const assigneeNames = useMemo(() => {
    const assignees = Array.isArray(lead?.assignees) ? lead.assignees : [];
    if (assignees.length === 0) return [];

    return assignees
      .map((assignee: any) => {
        const match = users.find((user: any) => String(user.id) === String(assignee.userId));
        return match ? `${match.firstName ?? ""} ${match.lastName ?? ""}`.trim() : assignee.userName ?? "-";
      })
      .filter(Boolean);
  }, [lead?.assignees, users]);

  const templateFields = useMemo(
    () => readTemplateFields(lead?.templateSchemaValue).filter((field) => field.title && field.value !== undefined),
    [lead?.templateSchemaValue]
  );

  if (!leadUid) {
    return (
      <ModulePlaceholder
        title="Lead not selected"
        description="Open a lead record from the list to view its details."
        backHref={`${basePath}/leads`}
      />
    );
  }

  if (leadQuery.isLoading) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="text-sm text-slate-500">Loading lead details...</div>
      </SectionCard>
    );
  }

  if (!lead) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState title="Lead details unavailable" description="The selected lead could not be loaded." />
      </SectionCard>
    );
  }

  const leadName = fullName({
    firstName: lead.consumerFirstName ?? lead.firstName,
    lastName: lead.consumerLastName ?? lead.lastName,
  });
  const phone = lead.consumerPhone ? `${lead.consumerCountryCode ?? ""} ${lead.consumerPhone}`.trim() : "-";
  const email = lead.consumerEmail ?? "-";
  const leadId = lead.referenceNo ? `#${lead.referenceNo}` : "-";
  const status = lead.internalStatus ?? lead.status;
  const statusActions = getStatusActions(status);
  const confirmMessage = pendingStatusAction
    ? `Are you sure you want to ${pendingStatusAction.toLowerCase()} this lead ?`
    : "";

  async function handleConfirmStatusAction() {
    if (!pendingStatusAction) return;

    try {
      setActionError(null);

      if (pendingStatusAction === "Reject Lead") {
        await changeLeadStatusMutation.mutateAsync({ uid: leadUid, status: "reject" });
      } else if (pendingStatusAction === "Make It Active" || pendingStatusAction === "Enable Lead") {
        await changeLeadStatusMutation.mutateAsync({ uid: leadUid, status: "active" });
      } else if (pendingStatusAction === "Convert Lead" && String(lead?.productEnum ?? "").toUpperCase() === "UNKNOWN") {
        await changeLeadStatusMutation.mutateAsync({ uid: leadUid, status: "complete", data: lead ?? {} });
      } else if (pendingStatusAction === "Convert to Member") {
        const membershipsBasePath = basePath.replace(/\/leads$/, "/memberships");
        window.location.assign(
          `${membershipsBasePath}/members/create?data=${encodeURIComponent(leadUid)}&source=lead-conversion`
        );
        return;
      } else {
        throw new Error("This action is not wired yet in the React module.");
      }

      setPendingStatusAction(null);
      await leadQuery.refetch();
    } catch (error: any) {
      setActionError(typeof error?.message === "string" ? error.message : "Unable to update lead status.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Details"
        back={{ label: "Back", href: `${basePath}/leads` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      {actionError ? <Alert variant="danger">{actionError}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="space-y-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-400 text-xl font-bold text-white">
              {getInitials(leadName)}
            </div>

            <div>
              <div className="text-2xl font-semibold leading-tight text-slate-950">{leadName}</div>
              <div className="mt-2 text-lg font-semibold text-sky-600">
                Lead Id : <span className="font-medium">{leadId}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.location.assign(`${basePath}/leads/update/${leadUid}`)}>Edit Lead Details</Button>
              {lead.consumerPhone ? (
                <Button
                  variant="secondary"
                  onClick={() => window.location.assign(`tel:${lead.consumerCountryCode ?? ""}${lead.consumerPhone}`)}
                >
                  Call
                </Button>
              ) : null}
              {lead.consumerEmail ? (
                <Button variant="secondary" onClick={() => window.location.assign(`mailto:${lead.consumerEmail}`)}>
                  Email
                </Button>
              ) : null}
            </div>

            <div>
              <div className="rounded-md bg-slate-100 px-4 py-3 text-lg font-semibold text-slate-700">Lead Info</div>
              <div className="space-y-3 px-1 py-4">
                {lead.consumerGender ? <InfoRow label="Gender" value={lead.consumerGender} /> : null}
                <InfoRow label="Phone" value={phone} />
                <InfoRow label="Email" value={email} />
                {lead.consumerAddress ? <InfoRow label="Address" value={lead.consumerAddress} /> : null}
                {lead.consumerCity ? <InfoRow label="City" value={lead.consumerCity} /> : null}
                {lead.consumerState ? <InfoRow label="State" value={lead.consumerState} /> : null}
                {lead.consumerPin ? <InfoRow label="Pincode" value={lead.consumerPin} /> : null}
                {lead.consumerCountry ? <InfoRow label="Country" value={lead.consumerCountry} /> : null}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="border-slate-200 shadow-sm">
          <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1 text-base">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">Lead Date :</span>
                  <span>{formatDate(lead.leadDate ?? lead.createdDate)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">Lead Status :</span>
                  <StatusBadge status={status} />
                </div>
              </div>
              {statusActions.length > 0 ? (
                <Popover
                  align="end"
                  trigger={<Button className="md:min-w-[180px]">Change Status</Button>}
                  contentClassName="min-w-[192px] p-2"
                >
                  <PopoverSection className="space-y-1">
                    {statusActions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setPendingStatusAction(action);
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {action}
                      </button>
                    ))}
                  </PopoverSection>
                </Popover>
              ) : null}
            </div>

            <div className="border-t border-slate-200 pt-8">
              <div className="grid gap-6 md:grid-cols-3">
                <InfoBlock label="Product/Service" value={lead.productName ?? "-"} />
                <InfoBlock label="Product Type" value={lead.productEnum ? prettifyKey(lead.productEnum) : "-"} />
                <InfoBlock label="Channel" value={lead.channelName ?? "-"} />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-8">
              <div className="space-y-3">
                <div className="text-lg font-semibold text-slate-900">Assignees</div>
                {assigneeNames.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-base text-slate-700">{assigneeNames.join(", ")}</span>
                    <Button variant="secondary">Assign</Button>
                  </div>
                ) : (
                  <Button variant="secondary">Assign</Button>
                )}
              </div>
            </div>

            {templateFields.length > 0 ? (
              <div className="border-t border-slate-200 pt-8">
                <div className="grid gap-5 md:grid-cols-2">
                  {templateFields.map((field) => (
                    <InfoBlock key={`${field.title}-${field.value}`} label={field.title} value={field.value} />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-slate-200 pt-8">
              <div className="rounded-md border border-slate-200">
                <div className="border-b border-slate-200 p-4">
                  <Button variant="secondary">Add Stage</Button>
                </div>
                <div className="p-4">
                  {leadStagesQuery.isLoading ? (
                    <div className="text-sm text-slate-500">Loading stages...</div>
                  ) : stages.length === 0 ? (
                    <div className="text-lg font-semibold text-slate-800">No Stages Created</div>
                  ) : (
                    <div className="space-y-4">
                      {stages.map((stage: any, index: number) => (
                        <div key={stage.id ?? stage.uid ?? index} className="rounded-md border border-slate-200 p-4">
                          <div className="text-base font-semibold text-slate-900">{stage.stage ?? stage.stageName ?? `Stage ${index + 1}`}</div>
                          {stage.assigneeDto?.userName ? (
                            <div className="mt-2 text-sm text-slate-600">Assignee : {stage.assigneeDto.userName}</div>
                          ) : null}
                          {stage.notes ? <div className="mt-2 text-sm text-slate-600">Remarks : {stage.notes}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <Dialog
        open={Boolean(pendingStatusAction)}
        onClose={() => setPendingStatusAction(null)}
        size="lg"
        hideHeader
        showCloseButton={false}
        contentClassName="max-w-[640px] overflow-hidden rounded-md p-0"
        bodyClassName="p-0"
      >
        <div className="px-8 py-14 text-center text-[16px] font-medium text-slate-600">
          {confirmMessage}
        </div>
        <DialogFooter>
          <div className="flex w-full justify-center gap-3 px-8 pb-6 pt-2">
            <Button
              variant="secondary"
              className="min-w-[72px]"
              onClick={() => setPendingStatusAction(null)}
              disabled={changeLeadStatusMutation.isPending}
            >
              NO
            </Button>
            <Button className="min-w-[72px]" onClick={handleConfirmStatusAction} loading={changeLeadStatusMutation.isPending}>
              YES
            </Button>
          </div>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <div className="font-semibold text-slate-800">{label}</div>
      <div className="text-right font-semibold text-slate-700">{value}</div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <div className="text-base font-semibold text-slate-900">{label}</div>
      <div className="text-sm leading-6 text-slate-700">{value}</div>
    </div>
  );
}
