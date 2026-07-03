import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Input,
  PageHeader,
  RadioGroup,
  SectionCard,
  Select,
  Switch,
  Textarea,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useCreateSubType,
  useMemberTypeByUid,
  useProviderLocations,
  useTemplates,
  useUpdateSubType,
} from "../queries/memberships";
import {
  normalizeMembershipLocations,
  unwrapList,
  unwrapPayload,
} from "./serviceShared";

interface MemberTypeFormProps {
  source?: string;
  memberTypeUid?: string;
}

type FormState = {
  name: string;
  displayName: string;
  description: string;
  approvalType: "Manual" | "Automatic";
  allowLogin: boolean;
  status: "Enabled" | "Disabled";
  templateUid: string;
  locationId: string;
  lifetime: boolean;
  renewalPeriodType: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  renewalPeriodValue: string;
  subscriptionRequired: boolean;
  subscriptionType: "ONLINE_SUBSCRIPTION" | "OFFLINE_SUBSCRIPTION";
  subscriptionAmount: string;
  invoiceable: boolean;
  gracePeriodInDays: string;
  renewalSubscriptionRequired: boolean;
  renewalSubscriptionAmount: string;
  autoRenewal: boolean;
  sendReminder: boolean;
  remarks: string;
  labels: Record<string, string>;
  renewalInDays: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const APPROVAL_OPTIONS = [
  { value: "Automatic", label: "Automatic" },
  { value: "Manual", label: "Manual" },
];

const STATUS_OPTIONS = [
  { value: "Enabled", label: "Enabled" },
  { value: "Disabled", label: "Disabled" },
];

const RENEWAL_PERIOD_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

const SUBSCRIPTION_MODE_OPTIONS = [
  { value: "ONLINE_SUBSCRIPTION", label: "Online Subscription" },
  { value: "OFFLINE_SUBSCRIPTION", label: "Offline Subscription" },
];

const EMPTY_FORM: FormState = {
  name: "",
  displayName: "",
  description: "",
  approvalType: "Manual",
  allowLogin: false,
  status: "Disabled",
  templateUid: "",
  locationId: "",
  lifetime: true,
  renewalPeriodType: "DAILY",
  renewalPeriodValue: "1",
  subscriptionRequired: false,
  subscriptionType: "ONLINE_SUBSCRIPTION",
  subscriptionAmount: "0",
  invoiceable: true,
  gracePeriodInDays: "0",
  renewalSubscriptionRequired: false,
  renewalSubscriptionAmount: "0",
  autoRenewal: false,
  sendReminder: false,
  remarks: "",
  labels: {},
  renewalInDays: "0",
};

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLocationId(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function toLocationPayloadValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? trimmed : parsed;
}

function getMemberTypeLocationValue(location: any) {
  const preferredValue =
    location?.locationId ??
    location?.id ??
    location?.uid ??
    location?.locationUid ??
    location?.encId;

  return preferredValue === undefined || preferredValue === null ? "" : String(preferredValue).trim();
}

function getMemberTypeLocationLabel(location: any) {
  return String(
    location?.place ??
      location?.locationName ??
      location?.name ??
      location?.branchName ??
      location?.displayName ??
      ""
  ).trim();
}

function normalizeStatus(value: unknown): FormState["status"] {
  return String(value ?? "").trim().toUpperCase() === "ENABLED" ? "Enabled" : "Disabled";
}

function normalizeApprovalType(value: unknown): FormState["approvalType"] {
  return String(value ?? "").trim().toUpperCase() === "AUTOMATIC" ? "Automatic" : "Manual";
}

function normalizeSubscriptionType(value: unknown): FormState["subscriptionType"] {
  return String(value ?? "").trim().toUpperCase() === "OFFLINE_SUBSCRIPTION"
    ? "OFFLINE_SUBSCRIPTION"
    : "ONLINE_SUBSCRIPTION";
}

function normalizeRenewalPeriodType(value: unknown): FormState["renewalPeriodType"] {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (
    normalized === "DAILY" ||
    normalized === "WEEKLY" ||
    normalized === "MONTHLY" ||
    normalized === "YEARLY"
  ) {
    return normalized;
  }

  if (normalized === "INDAYS") return "DAILY";
  if (normalized === "INMONTHS" || normalized === "CALENDARMONTH") return "MONTHLY";
  if (normalized === "INYEARS" || normalized === "CALENDARYEAR") return "YEARLY";
  if (normalized === "CALENDARWEEK") return "WEEKLY";

  return "DAILY";
}

export function MemberTypeForm({ source, memberTypeUid }: MemberTypeFormProps) {
  const { availableLocations, basePath } = useSharedModulesContext();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isUpdate = source === "update" && Boolean(memberTypeUid);

  const hasContextLocations = Array.isArray(availableLocations);
  const locationsQuery = useProviderLocations({}, !hasContextLocations);
  const templatesQuery = useTemplates({ "status-eq": "Enabled" });
  const memberTypeDetailsQuery = useMemberTypeByUid(memberTypeUid ?? "");
  const createMutation = useCreateSubType();
  const updateMutation = useUpdateSubType();

  const locations = useMemo(
    () => normalizeMembershipLocations(hasContextLocations ? availableLocations : locationsQuery.data),
    [availableLocations, hasContextLocations, locationsQuery.data]
  );
  const templates = useMemo(() => unwrapList(templatesQuery.data), [templatesQuery.data]);
  const memberTypeDetails = useMemo(
    () => unwrapPayload(memberTypeDetailsQuery.data),
    [memberTypeDetailsQuery.data]
  );

  useEffect(() => {
    if (form.locationId || locations.length !== 1 || isUpdate) return;

    setForm((current) => ({ ...current, locationId: getMemberTypeLocationValue(locations[0]) }));
  }, [form.locationId, isUpdate, locations]);

  useEffect(() => {
    if (!isUpdate || !memberTypeDetails) return;

    const renewalPeriodValue =
      memberTypeDetails.renewalPeriodValue ??
      memberTypeDetails.renewalPeriod?.renewalDuration ??
      memberTypeDetails.renewalInDays ??
      1;

    setForm({
      name: String(memberTypeDetails.name ?? ""),
      displayName: String(memberTypeDetails.displayName ?? memberTypeDetails.name ?? ""),
      description: String(memberTypeDetails.description ?? ""),
      approvalType: normalizeApprovalType(memberTypeDetails.approvalType),
      allowLogin: Boolean(memberTypeDetails.allowLogin),
      status: normalizeStatus(memberTypeDetails.status ?? memberTypeDetails.subtypeStatus),
      templateUid: String(memberTypeDetails.templateUid ?? ""),
      locationId: normalizeLocationId(memberTypeDetails.locationId ?? memberTypeDetails.location),
      lifetime: Boolean(
        memberTypeDetails.lifetime ??
        memberTypeDetails.isLifetime ??
        !memberTypeDetails.renewalPeriod
      ),
      renewalPeriodType: normalizeRenewalPeriodType(
        memberTypeDetails.renewalPeriodType ?? memberTypeDetails.renewalPeriod?.renewalPeriodtype
      ),
      renewalPeriodValue: String(renewalPeriodValue),
      subscriptionRequired: Boolean(memberTypeDetails.subscriptionRequired),
      subscriptionType: normalizeSubscriptionType(memberTypeDetails.subscriptionType),
      subscriptionAmount: String(memberTypeDetails.subscriptionAmount ?? 0),
      invoiceable: Boolean(
        memberTypeDetails.invoiceable === undefined ? true : memberTypeDetails.invoiceable
      ),
      gracePeriodInDays: String(
        memberTypeDetails.gracePeriodInDays ??
        memberTypeDetails.gracePeriodIndays ??
        0
      ),
      renewalSubscriptionRequired: Boolean(
        memberTypeDetails.renewalSubscriptionRequired ??
        memberTypeDetails.renewalsubscriptionRequired
      ),
      renewalSubscriptionAmount: String(
        memberTypeDetails.renewalSubscriptionAmount ??
        memberTypeDetails.renewalsubscriptionAmount ??
        0
      ),
      autoRenewal: Boolean(memberTypeDetails.autoRenewal),
      sendReminder: Boolean(memberTypeDetails.sendReminder),
      remarks: String(memberTypeDetails.remarks ?? ""),
      labels:
        memberTypeDetails.labels && typeof memberTypeDetails.labels === "object"
          ? memberTypeDetails.labels
          : {},
      renewalInDays: String(memberTypeDetails.renewalInDays ?? 0),
    });
  }, [isUpdate, memberTypeDetails]);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.name.trim()) nextErrors.name = "Subscription name is required.";
    if (!form.displayName.trim()) nextErrors.displayName = "Display name is required.";
    if (!form.locationId) nextErrors.locationId = "Location is required.";

    if (form.subscriptionRequired && toNumber(form.subscriptionAmount) < 0) {
      nextErrors.subscriptionAmount = "Registration fee cannot be negative.";
    }

    if (!form.lifetime) {
      if (toNumber(form.renewalPeriodValue) <= 0) {
        nextErrors.renewalPeriodValue = "Renewal period should be greater than zero.";
      }
      if (form.renewalSubscriptionRequired && toNumber(form.renewalSubscriptionAmount) < 0) {
        nextErrors.renewalSubscriptionAmount = "Renewal fee cannot be negative.";
      }
      if (toNumber(form.gracePeriodInDays) < 0) {
        nextErrors.gracePeriodInDays = "Grace period cannot be negative.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      displayName: form.displayName.trim(),
      description: form.description.trim() || undefined,
      approvalType: form.approvalType,
      allowLogin: form.allowLogin,
      status: form.status,
      templateUid: form.templateUid || undefined,
      labels: form.labels,
      locationId: toLocationPayloadValue(form.locationId),
      lifetime: form.lifetime,
      subscriptionRequired: form.subscriptionRequired,
      subscriptionType: form.subscriptionType,
      subscriptionAmount: form.subscriptionRequired ? toNumber(form.subscriptionAmount) : 0,
      invoiceable: form.invoiceable,
      gracePeriodInDays: form.lifetime ? 0 : toNumber(form.gracePeriodInDays),
      renewalSubscriptionRequired: form.lifetime ? false : form.renewalSubscriptionRequired,
      renewalSubscriptionAmount:
        !form.lifetime && form.renewalSubscriptionRequired ? toNumber(form.renewalSubscriptionAmount) : 0,
      autoRenewal: form.lifetime ? false : form.autoRenewal,
      sendReminder: form.lifetime ? false : form.sendReminder,
      remarks: form.remarks.trim() || undefined,
      renewalPeriodType: form.lifetime ? undefined : form.renewalPeriodType,
      renewalPeriodValue: form.lifetime ? 0 : toNumber(form.renewalPeriodValue),
      renewalInDays: toNumber(form.renewalInDays) || 0,
    };

    try {
      setFormError(null);

      if (isUpdate && memberTypeUid) {
        await updateMutation.mutateAsync({ id: memberTypeUid, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      window.location.assign(`${basePath}/memberType`);
    } catch (error: any) {
      setFormError(
        typeof error?.message === "string"
          ? error.message
          : isUpdate
            ? "Unable to update the subscription type."
            : "Unable to create the subscription type."
      );
    }
  }

  const locationOptions = useMemo(
    () =>
      locations.map((location: any) => ({
        value: getMemberTypeLocationValue(location),
        label: getMemberTypeLocationLabel(location),
      })),
    [locations]
  );
  const templateOptions = useMemo(
    () => [
      { value: "", label: "Select template" },
      ...templates.map((template: any) => ({
        value: String(template.uid ?? ""),
        label: String(template.templateName ?? template.name ?? template.uid ?? "Unnamed template"),
      })),
    ],
    [templates]
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isLoadingInitial = isUpdate && memberTypeDetailsQuery.isLoading;
  const showRenewalInputs = !form.lifetime;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isUpdate ? "Update Subscription Type" : "Create Subscription Type"}
        back={{ label: "Back", href: `${basePath}/memberType` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-6 md:max-w-4xl">
          {formError ? <Alert variant="danger">{formError}</Alert> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Subscription Name"
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              error={errors.name}
              disabled={isLoadingInitial}
              required
            />

            <Input
              label="Display Name"
              value={form.displayName}
              onChange={(event) => setField("displayName", event.target.value)}
              error={errors.displayName}
              disabled={isLoadingInitial}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Location"
              value={form.locationId}
              onChange={(event) => setField("locationId", event.target.value)}
              options={locationOptions}
              placeholder="Select location"
              error={errors.locationId}
              disabled={isLoadingInitial || isUpdate}
              required
            />

            <Select
              label="Template"
              value={form.templateUid}
              onChange={(event) => setField("templateUid", event.target.value)}
              options={templateOptions}
              disabled={isLoadingInitial}
            />
          </div>

          <Textarea
            label="Description"
            rows={4}
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
            disabled={isLoadingInitial}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Approval Type"
              value={form.approvalType}
              onChange={(event) => setField("approvalType", event.target.value as FormState["approvalType"])}
              options={APPROVAL_OPTIONS}
              disabled={isLoadingInitial}
            />

            <Select
              label="Status"
              value={form.status}
              onChange={(event) => setField("status", event.target.value as FormState["status"])}
              options={STATUS_OPTIONS}
              disabled={isLoadingInitial}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Switch
              label="Fee Required"
              checked={form.subscriptionRequired}
              onChange={(checked) => setField("subscriptionRequired", checked)}
              disabled={isLoadingInitial}
            />

            {form.subscriptionRequired ? (
              <Input
                label="Registration Fee (Rs)"
                type="number"
                min="0"
                value={form.subscriptionAmount}
                onChange={(event) => setField("subscriptionAmount", event.target.value)}
                error={errors.subscriptionAmount}
                disabled={isLoadingInitial}
              />
            ) : <div />}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Subscription Mode"
              value={form.subscriptionType}
              onChange={(event) => setField("subscriptionType", event.target.value as FormState["subscriptionType"])}
              options={SUBSCRIPTION_MODE_OPTIONS}
              disabled={isLoadingInitial}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Switch
                label="Invoiceable"
                checked={form.invoiceable}
                onChange={(checked) => setField("invoiceable", checked)}
                disabled={isLoadingInitial}
              />
              <Switch
                label="Allow Login"
                checked={form.allowLogin}
                onChange={(checked) => setField("allowLogin", checked)}
                disabled={isLoadingInitial}
              />
            </div>
          </div>

          <RadioGroup
            label="Membership Duration"
            name="membershipDuration"
            value={form.lifetime ? "LIFETIME" : "RENEWAL"}
            onChange={(value) => setField("lifetime", value === "LIFETIME")}
            options={[
              { value: "LIFETIME", label: "Lifetime" },
              { value: "RENEWAL", label: "Renewal" },
            ]}
          />

          {showRenewalInputs ? (
            <div className="space-y-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-900">Renewal Settings</div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Renewal Period Value"
                  type="number"
                  min="1"
                  value={form.renewalPeriodValue}
                  onChange={(event) => setField("renewalPeriodValue", event.target.value)}
                  error={errors.renewalPeriodValue}
                  disabled={isLoadingInitial}
                />

                <Select
                  label="Renewal Period Type"
                  value={form.renewalPeriodType}
                  onChange={(event) => setField("renewalPeriodType", event.target.value as FormState["renewalPeriodType"])}
                  options={RENEWAL_PERIOD_OPTIONS}
                  disabled={isLoadingInitial}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Switch
                  label="Renewal Fee Required"
                  checked={form.renewalSubscriptionRequired}
                  onChange={(checked) => setField("renewalSubscriptionRequired", checked)}
                  disabled={isLoadingInitial}
                />

                {form.renewalSubscriptionRequired ? (
                  <Input
                    label="Renewal Fee (Rs)"
                    type="number"
                    min="0"
                    value={form.renewalSubscriptionAmount}
                    onChange={(event) => setField("renewalSubscriptionAmount", event.target.value)}
                    error={errors.renewalSubscriptionAmount}
                    disabled={isLoadingInitial}
                  />
                ) : <div />}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Grace Period (Days)"
                  type="number"
                  min="0"
                  value={form.gracePeriodInDays}
                  onChange={(event) => setField("gracePeriodInDays", event.target.value)}
                  error={errors.gracePeriodInDays}
                  disabled={isLoadingInitial}
                />

                <Input
                  label="Renewal In Days"
                  type="number"
                  min="0"
                  value={form.renewalInDays}
                  onChange={(event) => setField("renewalInDays", event.target.value)}
                  disabled={isLoadingInitial}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Switch
                  label="Auto Renewal"
                  checked={form.autoRenewal}
                  onChange={(checked) => setField("autoRenewal", checked)}
                  disabled={isLoadingInitial}
                />
                <Switch
                  label="Send Reminder"
                  checked={form.sendReminder}
                  onChange={(checked) => setField("sendReminder", checked)}
                  disabled={isLoadingInitial}
                />
              </div>
            </div>
          ) : null}

          <Textarea
            label="Remarks"
            rows={4}
            value={form.remarks}
            onChange={(event) => setField("remarks", event.target.value)}
            disabled={isLoadingInitial}
          />

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => window.location.assign(`${basePath}/memberType`)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              {isUpdate ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
