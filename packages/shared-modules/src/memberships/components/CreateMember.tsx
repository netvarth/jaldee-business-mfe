import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  FileUpload,
  Input,
  PageHeader,
  PhoneInput,
  SectionCard,
  Select,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useLeadByUid } from "../../leads/queries/leads";
import {
  useCreateMember,
  useMemberDetailsByUid,
  useMemberTemplatesByuuid,
  useMemberTypes,
  useProviderLocations,
  useTemplates,
  useUpdateMembers,
  useUploadFilesToS3,
  useVideoaudioS3Upload,
  useVideoaudioS3UploadStatusUpdate,
} from "../queries/memberships";

interface CreateMemberProps {
  source?: string;
  memberId?: string;
}

type MemberFormState = {
  salutation: string;
  firstName: string;
  lastName: string;
  memberCustomId: string;
  countryCode: string;
  phoneNo: string;
  whatsAppCountryCode: string;
  whatsAppNo: string;
  email: string;
  memberSubscriptionType: string;
  location: string;
  templateSchemaId: string;
};

type FormErrors = Partial<Record<keyof MemberFormState, string>>;

const SALUTATION_OPTIONS = [
  { value: "", label: "Select" },
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
  { value: "Dr", label: "Dr" },
];

const EMPTY_FORM: MemberFormState = {
  salutation: "",
  firstName: "",
  lastName: "",
  memberCustomId: "",
  countryCode: "+91",
  phoneNo: "",
  whatsAppCountryCode: "+91",
  whatsAppNo: "",
  email: "",
  memberSubscriptionType: "",
  location: "",
  templateSchemaId: "",
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

function trimPhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

function getFileExtension(file: File) {
  const fromMime = file.type.split("/")[1];
  if (fromMime) return fromMime;
  const fileNameParts = file.name.split(".");
  return fileNameParts.length > 1 ? fileNameParts[fileNameParts.length - 1] : "bin";
}

function readLeadUid(searchParams: URLSearchParams) {
  return (searchParams.get("data") ?? searchParams.get("leadUid") ?? "").trim();
}

function buildLeadReturnPath(basePath: string, leadUid: string) {
  if (!leadUid) return null;
  const leadsBasePath = basePath.replace(/\/memberships$/, "/leads");
  return `${leadsBasePath}/details/${encodeURIComponent(leadUid)}`;
}

export function CreateMember({ source, memberId }: CreateMemberProps) {
  const { basePath, account } = useSharedModulesContext();
  const isUpdate = source === "update" && Boolean(memberId);
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const leadUid = useMemo(() => (!isUpdate ? readLeadUid(searchParams) : ""), [isUpdate, searchParams]);
  const returnTo = useMemo(() => (!isUpdate ? buildLeadReturnPath(basePath, leadUid) : null), [basePath, isUpdate, leadUid]);
  const shouldReturnToLead = Boolean(leadUid && returnTo);
  const [form, setForm] = useState<MemberFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [leadPrefillApplied, setLeadPrefillApplied] = useState(false);

  const memberTypeFilters = useMemo(() => ({ "status-eq": "Enabled" }), []);
  const templateFilters = useMemo(
    () => ({
      "status-eq": "Enabled",
      "templateType-eq": "MEMBER",
    }),
    []
  );

  const memberDetailsQuery = useMemberDetailsByUid(memberId ?? "");
  const leadDetailsQuery = useLeadByUid(leadUid);
  const locationsQuery = useProviderLocations();
  const memberTypesQuery = useMemberTypes(memberTypeFilters);
  const templatesQuery = useTemplates(templateFilters);
  const selectedTemplateQuery = useMemberTemplatesByuuid(form.templateSchemaId);

  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMembers();
  const uploadFilesToS3Mutation = useUploadFilesToS3();
  const uploadBinaryMutation = useVideoaudioS3Upload();
  const uploadStatusMutation = useVideoaudioS3UploadStatusUpdate();

  const locations = useMemo(
    () => unwrapList(locationsQuery.data).filter((location: any) => location?.status === "ACTIVE"),
    [locationsQuery.data]
  );
  const memberTypes = useMemo(() => unwrapList(memberTypesQuery.data), [memberTypesQuery.data]);
  const templates = useMemo(() => unwrapList(templatesQuery.data), [templatesQuery.data]);
  const memberDetails = useMemo(() => unwrapPayload(memberDetailsQuery.data), [memberDetailsQuery.data]);
  const leadDetails = useMemo(() => unwrapPayload(leadDetailsQuery.data), [leadDetailsQuery.data]);
  const selectedTemplate = useMemo(
    () => unwrapPayload(selectedTemplateQuery.data),
    [selectedTemplateQuery.data]
  );
  const leadPrefillError =
    leadUid && leadDetailsQuery.isError
      ? typeof leadDetailsQuery.error?.message === "string"
        ? leadDetailsQuery.error.message
        : "Lead details could not be loaded. You can still create the member manually."
      : null;

  useEffect(() => {
    if (!memberId || !isUpdate || !memberDetails) return;

    setForm({
      salutation: String(memberDetails.salutation ?? ""),
      firstName: String(memberDetails.firstName ?? ""),
      lastName: String(memberDetails.lastName ?? ""),
      memberCustomId: String(memberDetails.memberCustomId ?? ""),
      countryCode: String(memberDetails.countryCode ?? "+91"),
      phoneNo: String(memberDetails.phoneNo ?? ""),
      whatsAppCountryCode: String(memberDetails.whatsAppNum?.countryCode ?? memberDetails.countryCode ?? "+91"),
      whatsAppNo: String(memberDetails.whatsAppNum?.number ?? ""),
      email: String(memberDetails.email ?? ""),
      memberSubscriptionType: String(memberDetails.memberSubscriptionType?.uid ?? ""),
      location: String(memberDetails.locationId ?? ""),
      templateSchemaId: String(memberDetails.templateUid ?? ""),
    });

    const existingPhoto = Array.isArray(memberDetails.photos)
      ? memberDetails.photos.find((photo: any) => photo?.s3path)
      : null;

    if (existingPhoto?.s3path) {
      setPhotoPreviewUrl(String(existingPhoto.s3path));
    }
  }, [isUpdate, memberDetails, memberId]);

  useEffect(() => {
    if (isUpdate || !leadUid || !leadDetails || leadPrefillApplied) return;

    setForm((current) => ({
      ...current,
      firstName: String(leadDetails.consumerFirstName ?? leadDetails.firstName ?? current.firstName),
      lastName: String(leadDetails.consumerLastName ?? leadDetails.lastName ?? current.lastName),
      countryCode: String(leadDetails.consumerCountryCode ?? current.countryCode),
      phoneNo: String(leadDetails.consumerPhone ?? current.phoneNo),
      email: String(leadDetails.consumerEmail ?? leadDetails.email ?? current.email),
      location: String(leadDetails.locationId ?? current.location),
    }));

    setLeadPrefillApplied(true);
  }, [isUpdate, leadDetails, leadPrefillApplied, leadUid]);

  useEffect(() => {
    if (form.location || locations.length !== 1) return;

    setForm((current) => ({
      ...current,
      location: String(locations[0].id ?? ""),
    }));
  }, [form.location, locations]);

  useEffect(() => {
    return () => {
      if (selectedPhoto && photoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl, selectedPhoto]);

  function setField<K extends keyof MemberFormState>(field: K, value: MemberFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!form.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!trimPhone(form.phoneNo)) nextErrors.phoneNo = "Phone number is required.";
    if (!form.memberSubscriptionType) nextErrors.memberSubscriptionType = "Subscription type is required.";
    if (!form.location) nextErrors.location = "Location is required.";

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function uploadPhotoIfPresent() {
    if (!selectedPhoto) return undefined;

    const fileDescriptor: any = {
      owner: account.id,
      ownerType: "Provider",
      fileName: selectedPhoto.name,
      fileSize: selectedPhoto.size / 1024 / 1024,
      caption: "",
      fileType: getFileExtension(selectedPhoto),
      action: "add",
      file: selectedPhoto,
      type: "photo",
      order: 0,
    };

    const uploadResponse = await uploadFilesToS3Mutation.mutateAsync([fileDescriptor]);
    const targets = unwrapList(uploadResponse);

    for (const target of targets) {
      await uploadBinaryMutation.mutateAsync({
        file: selectedPhoto,
        url: String(target.url),
      });
      await uploadStatusMutation.mutateAsync({
        status: "COMPLETE",
        id: String(target.driveId),
      });
      fileDescriptor.driveId = target.driveId;
    }

    return [fileDescriptor];
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    try {
      setFormError(null);
      const uploadedPhotos = await uploadPhotoIfPresent();
      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        countryCode: form.countryCode,
        phoneNo: trimPhone(form.phoneNo),
        email: form.email.trim() || undefined,
        locationId: form.location,
        memberSubscriptionType: { uid: form.memberSubscriptionType },
      };

      if (form.salutation) payload.salutation = form.salutation;
      if (form.memberCustomId.trim()) payload.memberCustomId = form.memberCustomId.trim();
      if (trimPhone(form.whatsAppNo)) {
        payload.whatsAppNum = {
          countryCode: form.whatsAppCountryCode,
          number: trimPhone(form.whatsAppNo),
        };
      }
      if (form.templateSchemaId) {
        payload.templateUid = form.templateSchemaId;
      }
      if (leadUid) {
        payload.originUid = leadUid;
      }
      if (uploadedPhotos?.length) {
        payload.photos = uploadedPhotos;
      }

      if (isUpdate && memberId) {
        await updateMemberMutation.mutateAsync({
          id: memberId,
          data: payload,
        });
      } else {
        const createdMemberResponse = await createMemberMutation.mutateAsync(payload);
        const createdMember = unwrapPayload(createdMemberResponse);
        if (shouldReturnToLead && returnTo) {
          window.location.assign(returnTo);
          return;
        }

        if (createdMember?.uid) {
          window.location.assign(`${basePath}/members/details/${createdMember.uid}`);
          return;
        }

        window.location.assign(`${basePath}/members`);
        return;
      }

      window.location.assign(`${basePath}/members`);
    } catch (error: any) {
      setFormError(
        typeof error?.message === "string"
          ? error.message
          : `Failed to ${isUpdate ? "update" : "create"} member.`
      );
    }
  }

  const busy =
    memberDetailsQuery.isLoading ||
    leadDetailsQuery.isLoading ||
    locationsQuery.isLoading ||
    memberTypesQuery.isLoading ||
    templatesQuery.isLoading ||
    createMemberMutation.isPending ||
    updateMemberMutation.isPending ||
    uploadFilesToS3Mutation.isPending ||
    uploadBinaryMutation.isPending ||
    uploadStatusMutation.isPending;

  const locationOptions = [
    { value: "", label: "Select Location", disabled: true },
    ...locations.map((location: any) => ({
      value: String(location.id),
      label: String(location.place ?? location.name ?? location.id),
    })),
  ];

  const memberTypeOptions = [
    { value: "", label: "Select Subscription Type", disabled: true },
    ...memberTypes.map((type: any) => ({
      value: String(type.uid),
      label: String(type.name ?? type.displayName ?? type.uid),
    })),
  ];

  const templateOptions = [
    { value: "", label: "Select Membership Form", disabled: false },
    ...templates.map((template: any) => ({
      value: String(template.uid),
      label: String(template.templateName ?? template.name ?? template.uid),
    })),
  ];

  return (
    <div className="space-y-8">
      {isUpdate ? (
        <div className="px-1 pt-1">
          <h1 className="m-0 text-[34px] font-semibold tracking-tight text-slate-900">Update Member</h1>
        </div>
      ) : (
        <PageHeader
          title="Create Member"
          subtitle="Capture the core member profile, membership assignment, and optional profile photo."
          back={{ label: "Back", href: `${basePath}/members` }}
          onNavigate={(href) => window.location.assign(href)}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
        />
      )}

      {formError ? (
        <Alert variant="danger" title="Unable to save member">
          {formError}
        </Alert>
      ) : null}

      {!isUpdate && leadUid ? (
        <Alert variant="info" title="Lead conversion">
          Member details were prefilled from the selected lead. Saving this member sends the lead `originUid` to the membership API and returns you to the lead.
        </Alert>
      ) : null}

      {!isUpdate && leadPrefillError ? (
        <Alert variant="warning" title="Lead prefill unavailable">
          {leadPrefillError}
        </Alert>
      ) : null}

      {selectedTemplate?.templateSchema ? (
        <Alert variant="info" title="Membership form selected">
          This template has a schema attached. The schema renderer is not wired in this React module yet, so only the template selection is saved.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_340px]">
        <SectionCard title={isUpdate ? "Member Details" : "Register Member"} className="border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Salutation"
              value={form.salutation}
              onChange={(event) => setField("salutation", event.target.value)}
              options={SALUTATION_OPTIONS}
            />
            <div className="hidden md:block" />

            <Input
              label="First Name"
              value={form.firstName}
              onChange={(event) => setField("firstName", event.target.value)}
              error={errors.firstName}
              required
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(event) => setField("lastName", event.target.value)}
              error={errors.lastName}
              required
            />

            <Input
              label="Member ID"
              value={form.memberCustomId}
              onChange={(event) => setField("memberCustomId", event.target.value)}
              hint="Optional unless your backend enforces manual member IDs."
            />

            <PhoneInput
              label="Phone"
              value={{ countryCode: form.countryCode, number: form.phoneNo }}
              onChange={(phone) => {
                setField("countryCode", phone.countryCode);
                setField("phoneNo", phone.number);
              }}
              error={errors.phoneNo}
              required
            />

            <PhoneInput
              label="WhatsApp"
              value={{ countryCode: form.whatsAppCountryCode, number: form.whatsAppNo }}
              onChange={(phone) => {
                setField("whatsAppCountryCode", phone.countryCode);
                setField("whatsAppNo", phone.number);
              }}
              numberPlaceholder="Enter WhatsApp number"
            />

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              error={errors.email}
            />

            <Select
              label="Subscription Type"
              value={form.memberSubscriptionType}
              onChange={(event) => setField("memberSubscriptionType", event.target.value)}
              options={memberTypeOptions}
              error={errors.memberSubscriptionType}
              disabled={isUpdate}
              required
            />

            <Select
              label="Location"
              value={form.location}
              onChange={(event) => setField("location", event.target.value)}
              options={locationOptions}
              error={errors.location}
              disabled={isUpdate}
              required
            />

            <Select
              label="Membership Form"
              value={form.templateSchemaId}
              onChange={(event) => setField("templateSchemaId", event.target.value)}
              options={templateOptions}
            />
          </div>

          <div className="mt-8 flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => window.location.assign(shouldReturnToLead && returnTo ? returnTo : `${basePath}/members`)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={busy}>
              {isUpdate ? "Update" : "Register"}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Photo" className="border-slate-200 shadow-sm">
          <div className="space-y-4">
            <FileUpload
              label="Profile Photo"
              accept="image/*"
              maxSize={5 * 1024 * 1024}
              onUpload={(files) => {
                const file = files[0];
                if (!file) return;

                if (photoPreviewUrl?.startsWith("blob:")) {
                  URL.revokeObjectURL(photoPreviewUrl);
                }

                setSelectedPhoto(file);
                setPhotoPreviewUrl(URL.createObjectURL(file));
              }}
            />

            {photoPreviewUrl ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <img
                    src={photoPreviewUrl}
                    alt="Member preview"
                    className="h-64 w-full object-cover"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (photoPreviewUrl?.startsWith("blob:")) {
                      URL.revokeObjectURL(photoPreviewUrl);
                    }
                    setSelectedPhoto(null);
                    setPhotoPreviewUrl(null);
                  }}
                >
                  Remove Photo
                </Button>
              </div>
            ) : (
              <p className="m-0 text-sm text-slate-500">
                Upload a square image for the member profile. The file is uploaded only when you save the form.
              </p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
