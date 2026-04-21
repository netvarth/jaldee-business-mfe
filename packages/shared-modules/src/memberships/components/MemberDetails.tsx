import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Button,
  DataTable,
  Dialog,
  DialogFooter,
  EmptyState,
  PageHeader,
  Select,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  QuestionnaireForm,
  type QuestionnaireDefinition,
  type QuestionnaireFormState,
} from "../../questionnaire";
import {
  useAddNewServiceType,
  useAllMemberServices,
  useAllMemberServicesCount,
  useAllMemberSubscriptions,
  useAllMemberSubscriptionsCount,
  useChangeMemberSubscriptionStatus,
  useMemberDetailsByUid,
  useMemberServiceQuestionaire,
  useMemberTypes,
  useSubmitQuestionnaire,
} from "../queries/memberships";

interface MemberDetailsProps {
  memberId: string;
}

type SubscriptionRow = {
  uid: string;
  name: string;
  subscriptionType: string;
  amount: string;
  validFrom: string;
  validTo: string;
  status: string;
};

type ServiceRow = {
  uid: string;
  name: string;
  createdDate: string;
};

function unwrapPayload<T>(value: T): any {
  const maybeWrapped = value as any;

  if (maybeWrapped?.data?.data !== undefined) {
    return maybeWrapped.data.data;
  }

  if (maybeWrapped?.data !== undefined) {
    return maybeWrapped.data;
  }

  return maybeWrapped;
}

function unwrapList(value: unknown): any[] {
  const payload = unwrapPayload(value);
  return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
}

function unwrapCount(value: unknown) {
  return Number(unwrapPayload(value)) || 0;
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getInitial(name: unknown) {
  const value = String(name ?? "").trim();
  return value ? value.charAt(0).toUpperCase() : "M";
}

function getMemberStatusLabel(status: string) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "ACTIVE" || normalized === "ENABLED") return "Active";
  if (normalized === "INACTIVE" || normalized === "DISABLED") return "Inactive";
  return status || "Pending";
}

function getMemberStatusTone(status: string) {
  const normalized = getMemberStatusLabel(status);
  if (normalized === "Active") return "bg-emerald-100 text-emerald-800";
  if (normalized === "Inactive") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-800";
}

function getSubscriptionStatusLabel(status: string) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "ACTIVE" || normalized === "ENABLED") return "Active";
  if (normalized === "INACTIVE" || normalized === "DISABLED") return "Inactive";
  if (normalized === "PENDING") return "Pending";
  return status || "Pending";
}

function getSubscriptionStatusOptions(status: string) {
  const current = getSubscriptionStatusLabel(status);
  if (current === "Active") return [{ value: "Inactive", label: "Inactive" }];
  if (current === "Pending") {
    return [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ];
  }
  return [{ value: "Active", label: "Active" }];
}

function renderInfo(label: string, value: ReactNode) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}:</span>
      <span className="text-right text-sm text-slate-900">{value}</span>
    </div>
  );
}

function toSubscriptionRows(data: unknown): SubscriptionRow[] {
  return unwrapList(data).map((subscription: any, index: number) => ({
    uid: String(subscription.uid ?? subscription.id ?? index),
    name: String(
      subscription.subscriptionName ??
        subscription.memberSubscriptionType?.name ??
        subscription.name ??
        `Subscription ${index + 1}`
    ),
    subscriptionType: String(
      subscription.subscriptionType ??
        subscription.txnType ??
        subscription.transactionType ??
        "Renewal"
    ),
    amount: String(
      subscription.subscriptionAmountDue ??
        subscription.amount ??
        subscription.subscriptionAmount ??
        0
    ),
    validFrom: formatDate(subscription.validFrom ?? subscription.startDate ?? subscription.createdDate),
    validTo: formatDate(subscription.validTo ?? subscription.expiryDate ?? subscription.endDate),
    status: String(subscription.status ?? subscription.memberStatus ?? "Pending"),
  }));
}

function toServiceRows(data: unknown): ServiceRow[] {
  return unwrapList(data).map((service: any, index: number) => ({
    uid: String(service.uid ?? service.id ?? index),
    name: String(service.serviceName ?? service.name ?? `Service ${index + 1}`),
    createdDate: formatDate(service.createdDate ?? service.createdAt),
  }));
}

function TableSection({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="m-0 text-[18px] font-semibold text-slate-900">{title}</h2>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {children}
      </div>
    </section>
  );
}

export function MemberDetails({ memberId }: MemberDetailsProps) {
  const { basePath } = useSharedModulesContext();
  const memberDetailsQuery = useMemberDetailsByUid(memberId);
  const changeSubscriptionStatusMutation = useChangeMemberSubscriptionStatus();
  const addSubscriptionMutation = useAddNewServiceType();
  const submitQuestionnaireMutation = useSubmitQuestionnaire();
  const memberTypesQuery = useMemberTypes({ "status-eq": "Enabled" });

  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [subscriptionPageSize, setSubscriptionPageSize] = useState(5);
  const [servicePage, setServicePage] = useState(1);
  const [servicePageSize, setServicePageSize] = useState(10);
  const [addSubscriptionOpen, setAddSubscriptionOpen] = useState(false);
  const [selectedSubscriptionTypeUid, setSelectedSubscriptionTypeUid] = useState("");
  const [addSubscriptionError, setAddSubscriptionError] = useState<string | null>(null);
  const [questionnaireState, setQuestionnaireState] = useState<QuestionnaireFormState | null>(null);

  const memberDetails = useMemo(() => unwrapPayload(memberDetailsQuery.data), [memberDetailsQuery.data]);
  const memberTypes = useMemo(() => unwrapList(memberTypesQuery.data), [memberTypesQuery.data]);
  const selectedSubscriptionType = useMemo(
    () => memberTypes.find((type: any) => String(type.uid) === selectedSubscriptionTypeUid),
    [memberTypes, selectedSubscriptionTypeUid]
  );
  const questionnaireQuery = useMemberServiceQuestionaire(String(selectedSubscriptionType?.id ?? ""), "WALKIN");
  const questionnaire = useMemo(
    () => unwrapPayload(questionnaireQuery.data) as QuestionnaireDefinition | null,
    [questionnaireQuery.data]
  );

  const memberInternalId = String(memberDetails?.id ?? "");

  const subscriptionsQuery = useAllMemberSubscriptions(
    memberInternalId
      ? {
          "member-eq": memberInternalId,
          from: (subscriptionPage - 1) * subscriptionPageSize,
          count: subscriptionPageSize,
        }
      : {}
  );
  const subscriptionsCountQuery = useAllMemberSubscriptionsCount(
    memberInternalId ? { "member-eq": memberInternalId } : {}
  );
  const servicesQuery = useAllMemberServices(
    memberInternalId,
    (servicePage - 1) * servicePageSize,
    servicePageSize
  );
  const servicesCountQuery = useAllMemberServicesCount(memberInternalId);

  const subscriptions = useMemo(() => toSubscriptionRows(subscriptionsQuery.data), [subscriptionsQuery.data]);
  const services = useMemo(() => toServiceRows(servicesQuery.data), [servicesQuery.data]);

  const subscriptionTotal = unwrapCount(subscriptionsCountQuery.data) || subscriptions.length;
  const servicesTotal = unwrapCount(servicesCountQuery.data) || services.length;
  const loading = memberDetailsQuery.isLoading;

  const memberName = [memberDetails?.salutation, memberDetails?.firstName, memberDetails?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const pageError = memberDetailsQuery.error;
  const subscriptionTypeOptions = [
    { value: "", label: "Select Subscription Type", disabled: true },
    ...memberTypes.map((type: any) => ({
      value: String(type.uid),
      label: String(type.name ?? type.displayName ?? type.uid),
    })),
  ];
  const hasQuestionnaire = useMemo(
    () => Array.isArray(questionnaire?.labels) && questionnaire.labels.length > 0,
    [questionnaire]
  );
  const hasFileQuestionnaireFields = useMemo(
    () =>
      Array.isArray(questionnaire?.labels) &&
      questionnaire.labels.some((item: any) => {
        const fieldType = String(item?.question?.fieldDataType ?? "");
        return fieldType === "fileUpload" || fieldType === "digitalSignature";
      }),
    [questionnaire]
  );

  const subscriptionColumns = useMemo<ColumnDef<SubscriptionRow>[]>(
    () => [
      { key: "name", header: "Name" },
      { key: "subscriptionType", header: "Subscription Type" },
      { key: "amount", header: "Amount (Rs)" },
      { key: "validFrom", header: "Valid From" },
      { key: "validTo", header: "Valid To" },
      {
        key: "status",
        header: "Status",
        render: (subscription) => {
          const currentStatus = getSubscriptionStatusLabel(subscription.status);
          const statusOptions = getSubscriptionStatusOptions(subscription.status);

          return (
            <select
              value=""
              disabled={changeSubscriptionStatusMutation.isPending}
              className="min-w-[110px] rounded-md border border-emerald-400 bg-white px-3 py-2 text-sm font-medium text-emerald-700"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const nextStatus = event.target.value;
                if (!nextStatus || nextStatus === currentStatus) return;
                changeSubscriptionStatusMutation.mutate({
                  uid: subscription.uid,
                  statusId: nextStatus,
                });
              }}
            >
              <option value="" disabled>
                {currentStatus}
              </option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (subscription) => (
          <Button
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              const nextUrl = new URL(`${window.location.origin}${basePath}/members/paymentdetails/${memberId}`);
              nextUrl.searchParams.set("subUid", subscription.uid);
              window.location.assign(nextUrl.toString());
            }}
          >
            Fee Info
          </Button>
        ),
      },
    ],
    [basePath, changeSubscriptionStatusMutation, memberId]
  );

  const serviceColumns = useMemo<ColumnDef<ServiceRow>[]>(
    () => [
      { key: "name", header: "Service Name" },
      { key: "createdDate", header: "Created Date" },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: () => <Button variant="outline">View</Button>,
      },
    ],
    []
  );

  async function handleAddSubscription() {
    if (!selectedSubscriptionTypeUid) {
      setAddSubscriptionError("Please select a subscription type.");
      return;
    }

    if (hasQuestionnaire && questionnaireState && !questionnaireState.isValid) {
      setAddSubscriptionError("Complete the required questionnaire fields before adding the subscription.");
      return;
    }

    if (hasFileQuestionnaireFields) {
      setAddSubscriptionError("This questionnaire includes file uploads. File submission is not wired into this flow yet.");
      return;
    }

    try {
      setAddSubscriptionError(null);
      const createdSubscription = await addSubscriptionMutation.mutateAsync({
        member: { uid: memberId },
        memberSubscriptionType: { uid: selectedSubscriptionTypeUid },
      });

      const createdSubscriptionPayload = unwrapPayload(createdSubscription);
      const createdSubscriptionUid = String(createdSubscriptionPayload?.uid ?? createdSubscriptionPayload?.subUid ?? "");

      if (hasQuestionnaire && questionnaireState?.payload.answerLine.length && createdSubscriptionUid) {
        await submitQuestionnaireMutation.mutateAsync({
          id: createdSubscriptionUid,
          data: questionnaireState.payload,
        });
      }

      await subscriptionsQuery.refetch();
      await subscriptionsCountQuery.refetch();
      setAddSubscriptionOpen(false);
      setSelectedSubscriptionTypeUid("");
      setSubscriptionPage(1);
      setQuestionnaireState(null);
    } catch (error: any) {
      setAddSubscriptionError(
        typeof error?.message === "string" ? error.message : "Unable to add subscription right now."
      );
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Member Details"
        back={{ label: "Back", href: `${basePath}/members` }}
        onNavigate={(href) => window.location.assign(href)}
        className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
      />

      {pageError ? (
        <Alert variant="danger" title="Unable to load member">
          The member details could not be loaded right now.
        </Alert>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 shadow-sm">
          <div className="py-8 text-sm text-slate-500">Loading member details...</div>
        </div>
      ) : memberDetails ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:w-[320px] lg:flex-none">
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-500 text-5xl font-bold text-white">
                  {getInitial(memberDetails?.firstName)}
                </div>
                <h2 className="mt-5 text-[24px] font-semibold tracking-tight text-slate-900">
                  {memberName || "Member"}
                </h2>
                {memberDetails?.id ? (
                  <p className="m-0 mt-2 text-[15px] text-slate-600">ID : {memberDetails.id}</p>
                ) : null}
                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  onClick={() => window.location.assign(`${basePath}/members/update/${memberId}`)}
                >
                  Edit Member Details
                </Button>
              </div>

              <div className="rounded-xl bg-slate-100 px-4 py-3">
                <h3 className="m-0 text-[18px] font-semibold text-slate-900">General Info</h3>
              </div>

              <div className="space-y-1">
                {renderInfo(
                  "Phone",
                  memberDetails?.phoneNo ? `${memberDetails?.countryCode ?? ""}${memberDetails.phoneNo}` : undefined
                )}
                {renderInfo(
                  "Whatsapp No",
                  memberDetails?.whatsAppNum?.number
                    ? `${memberDetails?.whatsAppNum?.countryCode ?? ""}${memberDetails.whatsAppNum.number}`
                    : undefined
                )}
                {renderInfo("Email", memberDetails?.email)}
                {renderInfo(
                  "Membership Status",
                  <span className={`inline-flex rounded-full px-3 py-1 font-semibold ${getMemberStatusTone(memberDetails?.status)}`}>
                    {getMemberStatusLabel(memberDetails?.status)}
                  </span>
                )}
                {renderInfo(
                  "Joined Date",
                  formatDate(memberDetails?.jDate ?? memberDetails?.createdDate ?? memberDetails?.dateOfJoining)
                )}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            <TableSection
              title={`Subscriptions (${subscriptionTotal})`}
              actions={(
                <>
                  <Button
                    onClick={() => {
                      setAddSubscriptionOpen(true);
                      setAddSubscriptionError(null);
                    }}
                  >
                    + Add Subscription
                  </Button>
                  <Button variant="outline">Filter</Button>
                </>
              )}
            >
              <DataTable
                data={subscriptions}
                columns={subscriptionColumns}
                getRowId={(row) => row.uid}
                loading={subscriptionsQuery.isLoading || subscriptionsCountQuery.isLoading}
                pagination={{
                  page: subscriptionPage,
                  pageSize: subscriptionPageSize,
                  total: subscriptionTotal,
                  onChange: setSubscriptionPage,
                  onPageSizeChange: setSubscriptionPageSize,
                  mode: "server",
                }}
                emptyState={(
                  <EmptyState
                    title="No subscriptions found"
                    description="Add the first subscription for this member."
                  />
                )}
              />
            </TableSection>

            <TableSection
              title="Assigned Services"
              actions={<Button>+ Assign</Button>}
            >
              <DataTable
                data={services}
                columns={serviceColumns}
                getRowId={(row) => row.uid}
                loading={servicesQuery.isLoading || servicesCountQuery.isLoading}
                pagination={{
                  page: servicePage,
                  pageSize: servicePageSize,
                  total: servicesTotal,
                  onChange: setServicePage,
                  onPageSizeChange: setServicePageSize,
                  mode: "server",
                }}
                emptyState={(
                  <EmptyState
                    title="No services found"
                    description="Assigned services will appear here for this member."
                  />
                )}
              />
            </TableSection>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 shadow-sm">
          <div className="py-8 text-sm text-slate-500">No member details found.</div>
        </div>
      )}

      <Dialog
        open={addSubscriptionOpen}
        onClose={() => {
          setAddSubscriptionOpen(false);
          setSelectedSubscriptionTypeUid("");
          setAddSubscriptionError(null);
          setQuestionnaireState(null);
        }}
        title="Add Subscription"
        description="Select a subscription type for this member."
        size="md"
      >
        <div className="space-y-4">
          {addSubscriptionError ? <Alert variant="danger">{addSubscriptionError}</Alert> : null}

          <Select
            label="Subscription Type"
            value={selectedSubscriptionTypeUid}
            onChange={(event) => {
              setSelectedSubscriptionTypeUid(event.target.value);
              setAddSubscriptionError(null);
              setQuestionnaireState(null);
            }}
            options={subscriptionTypeOptions}
          />

          {questionnaireQuery.isLoading ? <div className="text-sm text-slate-500">Loading questionnaire...</div> : null}

          {hasQuestionnaire ? (
            <div className="space-y-3 pt-2">
              {hasFileQuestionnaireFields ? (
                <Alert variant="warning" title="File upload questions need flow-specific wiring">
                  This shared questionnaire form supports file fields, but this subscription dialog does not yet upload them to storage.
                </Alert>
              ) : null}
              <QuestionnaireForm questionnaire={questionnaire} onChange={setQuestionnaireState} />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setAddSubscriptionOpen(false);
              setSelectedSubscriptionTypeUid("");
              setAddSubscriptionError(null);
              setQuestionnaireState(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddSubscription}
            loading={addSubscriptionMutation.isPending || submitQuestionnaireMutation.isPending}
            disabled={
              !selectedSubscriptionTypeUid ||
              hasFileQuestionnaireFields ||
              (hasQuestionnaire && questionnaireState !== null && !questionnaireState.isValid)
            }
          >
            Add
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
