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
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useCreateSubType,
  useMemberTypeByUid,
  useProviderLocations,
  useUpdateSubType,
} from "../queries/memberships";

interface MemberTypeFormProps {
  source?: string;
  memberTypeUid?: string;
}

type FormState = {
  name: string;
  location: string;
  subscriptionRequired: boolean;
  subscriptionAmount: string;
  subscriptionType: "ONETIME" | "RECURRING";
  renewalDuration: string;
  renewalPeriodtype: string;
  renewalsubscriptionRequired: boolean;
  renewalsubscriptionAmount: string;
  autoRenewal: boolean;
  gracePeriodIndays: string;
  sendReminder: boolean;
  allowLogin: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const DURATION_OPTIONS = [
  { value: "InYears", label: "Years" },
  { value: "InMonths", label: "Months" },
  { value: "InDays", label: "Days" },
  { value: "calendarYear", label: "Calendar Year" },
  { value: "calendarMonth", label: "Calendar Month" },
  { value: "calendarWeek", label: "Calendar Week" },
];

const EMPTY_FORM: FormState = {
  name: "",
  location: "",
  subscriptionRequired: false,
  subscriptionAmount: "0",
  subscriptionType: "ONETIME",
  renewalDuration: "1",
  renewalPeriodtype: "InYears",
  renewalsubscriptionRequired: false,
  renewalsubscriptionAmount: "0",
  autoRenewal: false,
  gracePeriodIndays: "0",
  sendReminder: false,
  allowLogin: false,
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

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function MemberTypeForm({ source, memberTypeUid }: MemberTypeFormProps) {
  const { basePath } = useSharedModulesContext();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isUpdate = source === "update" && Boolean(memberTypeUid);

  const locationsQuery = useProviderLocations();
  const memberTypeDetailsQuery = useMemberTypeByUid(memberTypeUid ?? "");
  const createMutation = useCreateSubType();
  const updateMutation = useUpdateSubType();

  const locations = useMemo(
    () => unwrapList(locationsQuery.data).filter((location: any) => String(location?.status ?? "").toUpperCase() === "ACTIVE"),
    [locationsQuery.data]
  );
  const memberTypeDetails = useMemo(
    () => unwrapPayload(memberTypeDetailsQuery.data),
    [memberTypeDetailsQuery.data]
  );

  useEffect(() => {
    if (form.location || locations.length !== 1 || isUpdate) return;

    setForm((current) => ({ ...current, location: String(locations[0].id ?? "") }));
  }, [form.location, isUpdate, locations]);

  useEffect(() => {
    if (!isUpdate || !memberTypeDetails) return;

    setForm({
      name: String(memberTypeDetails.name ?? ""),
      location: String(memberTypeDetails.location ?? memberTypeDetails.locationId ?? ""),
      subscriptionRequired: Boolean(memberTypeDetails.subscriptionRequired),
      subscriptionAmount: String(memberTypeDetails.subscriptionAmount ?? 0),
      subscriptionType: String(memberTypeDetails.subscriptionType ?? "ONETIME").toUpperCase() === "RECURRING" ? "RECURRING" : "ONETIME",
      renewalDuration: String(memberTypeDetails.renewalPeriod?.renewalDuration ?? 1),
      renewalPeriodtype: String(memberTypeDetails.renewalPeriod?.renewalPeriodtype ?? "InYears"),
      renewalsubscriptionRequired: Boolean(memberTypeDetails.renewalsubscriptionRequired),
      renewalsubscriptionAmount: String(memberTypeDetails.renewalsubscriptionAmount ?? 0),
      autoRenewal: Boolean(memberTypeDetails.autoRenewal),
      gracePeriodIndays: String(memberTypeDetails.gracePeriodIndays ?? 0),
      sendReminder: Boolean(memberTypeDetails.sendReminder),
      allowLogin: Boolean(memberTypeDetails.allowLogin),
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
    if (!form.location) nextErrors.location = "Location is required.";

    if (form.subscriptionRequired && toNumber(form.subscriptionAmount) < 0) {
      nextErrors.subscriptionAmount = "Registration fee cannot be negative.";
    }

    if (form.subscriptionType === "RECURRING") {
      if (toNumber(form.renewalDuration) <= 0) {
        nextErrors.renewalDuration = "Validity should be greater than zero.";
      }
      if (form.renewalsubscriptionRequired && toNumber(form.renewalsubscriptionAmount) < 0) {
        nextErrors.renewalsubscriptionAmount = "Renewal fee cannot be negative.";
      }
      if (toNumber(form.gracePeriodIndays) < 0) {
        nextErrors.gracePeriodIndays = "Grace period cannot be negative.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      location: form.location,
      subscriptionRequired: form.subscriptionRequired,
      subscriptionAmount: form.subscriptionRequired ? toNumber(form.subscriptionAmount) : 0,
      subscriptionType: form.subscriptionType,
      allowLogin: form.allowLogin,
      subtypeStatus: "Enabled",
      approvalType: "Automatic",
    };

    if (form.subscriptionType === "RECURRING") {
      payload.renewalPeriod = {
        renewalDuration: toNumber(form.renewalDuration) || 0,
        renewalPeriodtype: form.renewalPeriodtype,
      };
      payload.renewalsubscriptionRequired = form.renewalsubscriptionRequired;
      payload.renewalsubscriptionAmount = form.renewalsubscriptionRequired ? toNumber(form.renewalsubscriptionAmount) : 0;
      payload.isLifetime = false;
      payload.autoRenewal = form.autoRenewal;
      payload.gracePeriodIndays = toNumber(form.gracePeriodIndays) || 0;
      payload.sendReminder = form.sendReminder;
    } else {
      payload.isLifetime = true;
    }

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
    () => locations.map((item: any) => ({
      value: String(item.id ?? item.uid ?? ""),
      label: String(item.place ?? item.locationName ?? item.name ?? `Location ${item.id ?? ""}`),
    })),
    [locations]
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isLoadingInitial = isUpdate && memberTypeDetailsQuery.isLoading;
  const showRenewalInputs = form.subscriptionType === "RECURRING";

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

            <Select
              label="Location"
              value={form.location}
              onChange={(event) => setField("location", event.target.value)}
              options={locationOptions}
              placeholder="Select location"
              error={errors.location}
              disabled={isLoadingInitial || isUpdate}
              required
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
                label="Registration Fee (₹)"
                type="number"
                min="0"
                value={form.subscriptionAmount}
                onChange={(event) => setField("subscriptionAmount", event.target.value)}
                error={errors.subscriptionAmount}
                disabled={isLoadingInitial}
              />
            ) : <div />}
          </div>

          <RadioGroup
            label="Registration Type"
            name="subscriptionType"
            value={form.subscriptionType}
            onChange={(value) => setField("subscriptionType", value as FormState["subscriptionType"])}
            options={[
              { value: "ONETIME", label: "Onetime" },
              { value: "RECURRING", label: "Renewal" },
            ]}
          />

          {showRenewalInputs ? (
            <div className="space-y-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-900">Renew Membership Registration</div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Validity"
                  type="number"
                  min="1"
                  value={form.renewalDuration}
                  onChange={(event) => setField("renewalDuration", event.target.value)}
                  error={errors.renewalDuration}
                  disabled={isLoadingInitial}
                />

                <Select
                  label="Duration"
                  value={form.renewalPeriodtype}
                  onChange={(event) => setField("renewalPeriodtype", event.target.value)}
                  options={DURATION_OPTIONS}
                  disabled={isLoadingInitial}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Switch
                  label="Renewal Fee Required"
                  checked={form.renewalsubscriptionRequired}
                  onChange={(checked) => setField("renewalsubscriptionRequired", checked)}
                  disabled={isLoadingInitial}
                />

                {form.renewalsubscriptionRequired ? (
                  <Input
                    label="Renewal Fee (₹)"
                    type="number"
                    min="0"
                    value={form.renewalsubscriptionAmount}
                    onChange={(event) => setField("renewalsubscriptionAmount", event.target.value)}
                    error={errors.renewalsubscriptionAmount}
                    disabled={isLoadingInitial}
                  />
                ) : <div />}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Grace Period (In-days)"
                  type="number"
                  min="0"
                  value={form.gracePeriodIndays}
                  onChange={(event) => setField("gracePeriodIndays", event.target.value)}
                  error={errors.gracePeriodIndays}
                  disabled={isLoadingInitial}
                />

                <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          ) : null}

          <Switch
            label="Allow Login"
            checked={form.allowLogin}
            onChange={(checked) => setField("allowLogin", checked)}
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
