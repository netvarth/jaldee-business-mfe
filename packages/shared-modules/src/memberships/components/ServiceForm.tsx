import { useEffect, useMemo, useState } from "react";
import {
  Button,
  FileUpload,
  Input,
  PageHeader,
  SectionCard,
  Select,
  Textarea,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useCreateService,
  useProviderLocations,
  useServiceByUid,
  useServiceTypes,
  useUpdateService,
  useUploadFilesToS3,
  useVideoaudioS3Upload,
  useVideoaudioS3UploadStatusUpdate,
} from "../queries/memberships";
import { getFileExtension, getServiceImageUrl, toInputDate, unwrapList, unwrapPayload } from "./serviceShared";

interface ServiceFormProps {
  source?: string;
  serviceUid?: string;
}

type ServiceFormState = {
  serviceName: string;
  description: string;
  validityStartDate: string;
  validityEndDate: string;
  remarks: string;
  location: string;
  serviceCategory: string;
};

type FormErrors = Partial<Record<keyof ServiceFormState, string>>;

const EMPTY_FORM: ServiceFormState = {
  serviceName: "",
  description: "",
  validityStartDate: "",
  validityEndDate: "",
  remarks: "",
  location: "",
  serviceCategory: "",
};

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}

export function ServiceForm({ source, serviceUid }: ServiceFormProps) {
  const { account, basePath } = useSharedModulesContext();
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const isUpdate = source === "update" && Boolean(serviceUid);

  const locationsQuery = useProviderLocations();
  const serviceTypesQuery = useServiceTypes({ "status-eq": "Enabled" });
  const serviceDetailsQuery = useServiceByUid(serviceUid ?? "");

  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const uploadFilesToS3Mutation = useUploadFilesToS3();
  const uploadBinaryMutation = useVideoaudioS3Upload();
  const uploadStatusMutation = useVideoaudioS3UploadStatusUpdate();

  const locations = useMemo(
    () => unwrapList(locationsQuery.data).filter((location: any) => String(location?.status ?? "").toUpperCase() === "ACTIVE"),
    [locationsQuery.data]
  );
  const serviceTypes = useMemo(() => unwrapList(serviceTypesQuery.data), [serviceTypesQuery.data]);
  const serviceDetails = useMemo(() => unwrapPayload(serviceDetailsQuery.data), [serviceDetailsQuery.data]);

  useEffect(() => {
    if (!isUpdate || !serviceDetails) return;

    setForm({
      serviceName: String(serviceDetails.serviceName ?? serviceDetails.name ?? ""),
      description: String(serviceDetails.description ?? ""),
      validityStartDate: toInputDate(serviceDetails.validityStartDate ?? serviceDetails.validFrom ?? serviceDetails.startDate),
      validityEndDate: toInputDate(serviceDetails.validityEndDate ?? serviceDetails.validTo ?? serviceDetails.endDate),
      remarks: String(serviceDetails.remarks ?? ""),
      location: String(serviceDetails.location?.id ?? serviceDetails.locationId ?? serviceDetails.location ?? ""),
      serviceCategory: String(serviceDetails.serviceCategory?.uid ?? serviceDetails.serviceCategoryId ?? ""),
    });

    const existingImageUrl = getServiceImageUrl(serviceDetails);
    if (existingImageUrl) {
      setImagePreviewUrl(existingImageUrl);
    }
  }, [isUpdate, serviceDetails]);

  useEffect(() => {
    if (form.location || locations.length !== 1) return;

    setForm((current) => ({ ...current, location: String(locations[0].id ?? "") }));
  }, [form.location, locations]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  function setField<K extends keyof ServiceFormState>(field: K, value: ServiceFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.serviceName.trim()) nextErrors.serviceName = "Service name is required.";
    if (!form.validityStartDate) nextErrors.validityStartDate = "Validity start date is required.";
    if (!form.validityEndDate) nextErrors.validityEndDate = "Validity end date is required.";
    if (!form.location) nextErrors.location = "Location is required.";
    if (!form.serviceCategory) nextErrors.serviceCategory = "Service type is required.";

    if (
      form.validityStartDate &&
      form.validityEndDate &&
      new Date(form.validityEndDate).getTime() < new Date(form.validityStartDate).getTime()
    ) {
      nextErrors.validityEndDate = "Validity end date must be after the start date.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function uploadImageIfPresent() {
    if (!selectedImage) return undefined;

    const fileDescriptor: any = {
      owner: account.id,
      ownerType: "Provider",
      fileName: selectedImage.name,
      fileSize: selectedImage.size / 1024 / 1024,
      caption: "",
      fileType: getFileExtension(selectedImage),
      action: "add",
      file: selectedImage,
      type: "serviceImage",
      order: 0,
    };

    const uploadResponse = await uploadFilesToS3Mutation.mutateAsync([fileDescriptor]);
    const targets = unwrapList(uploadResponse);

    for (const target of targets) {
      await uploadBinaryMutation.mutateAsync({
        file: selectedImage,
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

      const uploadedImages = await uploadImageIfPresent();
      const payload: Record<string, unknown> = {
        serviceName: form.serviceName.trim(),
        description: form.description.trim() || undefined,
        validityStartDate: form.validityStartDate,
        validityEndDate: form.validityEndDate,
        remarks: form.remarks.trim() || undefined,
        location: form.location,
        serviceCategory: {
          uid: form.serviceCategory,
        },
      };

      if (uploadedImages?.length) {
        payload.serviceImage = uploadedImages;
      }

      if (isUpdate && serviceUid) {
        await updateServiceMutation.mutateAsync({ id: serviceUid, data: payload });
      } else {
        await createServiceMutation.mutateAsync(payload);
      }

      window.location.assign(`${basePath}/service`);
    } catch (error: any) {
      setFormError(
        typeof error?.message === "string"
          ? error.message
          : isUpdate
            ? "Unable to update the service."
            : "Unable to create the service."
      );
    }
  }

  const serviceTypeOptions = useMemo(
    () => serviceTypes.map((item: any) => ({
      value: String(item.uid ?? item.id ?? ""),
      label: String(item.categoryName ?? item.name ?? "Unnamed"),
    })),
    [serviceTypes]
  );

  const locationOptions = useMemo(
    () => locations.map((item: any) => ({
      value: String(item.id ?? item.uid ?? ""),
      label: String(item.place ?? item.locationName ?? item.name ?? `Location ${item.id ?? ""}`),
    })),
    [locations]
  );

  const isSubmitting = createServiceMutation.isPending || updateServiceMutation.isPending;
  const isLoadingInitial = isUpdate && serviceDetailsQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isUpdate ? "Update Membership Service" : "Create Membership Service"}
        back={{ label: "Back", href: `${basePath}/service` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-6">
          {formError ? <ErrorBanner message={formError} /> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Service Name"
              value={form.serviceName}
              onChange={(event) => setField("serviceName", event.target.value)}
              error={errors.serviceName}
              disabled={isLoadingInitial}
            />
            <Select
              label="Service Type"
              value={form.serviceCategory}
              onChange={(event) => setField("serviceCategory", event.target.value)}
              options={serviceTypeOptions}
              placeholder="Select service type"
              error={errors.serviceCategory}
              disabled={isLoadingInitial}
            />
            <Input
              label="Validity Start Date"
              type="date"
              value={form.validityStartDate}
              onChange={(event) => setField("validityStartDate", event.target.value)}
              error={errors.validityStartDate}
              disabled={isLoadingInitial}
            />
            <Input
              label="Validity End Date"
              type="date"
              value={form.validityEndDate}
              onChange={(event) => setField("validityEndDate", event.target.value)}
              error={errors.validityEndDate}
              disabled={isLoadingInitial}
            />
            <Select
              label="Location"
              value={form.location}
              onChange={(event) => setField("location", event.target.value)}
              options={locationOptions}
              placeholder="Select location"
              error={errors.location}
              disabled={isLoadingInitial}
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-medium text-slate-900">Service Image</div>
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt=""
                  className="mt-3 h-24 w-24 rounded-xl border border-slate-200 object-cover"
                />
              ) : (
                <div className="mt-3 text-sm text-slate-500">No image selected.</div>
              )}
            </div>
          </div>

          <Textarea
            label="Description"
            rows={4}
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
            disabled={isLoadingInitial}
          />

          <Textarea
            label="Remarks"
            rows={3}
            value={form.remarks}
            onChange={(event) => setField("remarks", event.target.value)}
            disabled={isLoadingInitial}
          />

          <FileUpload
            label="Upload Service Image"
            accept="image/*"
            onUpload={(files) => {
              const file = files[0] ?? null;
              setSelectedImage(file);
              setFormError(null);

              if (imagePreviewUrl?.startsWith("blob:")) {
                URL.revokeObjectURL(imagePreviewUrl);
              }

              setImagePreviewUrl(file ? URL.createObjectURL(file) : null);
            }}
          />

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => window.location.assign(`${basePath}/service`)}>
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
