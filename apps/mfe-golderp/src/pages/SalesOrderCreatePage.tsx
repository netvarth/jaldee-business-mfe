import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogFooter,
  EmptyState,
  Input,
  PageHeader,
  RadioGroup,
  SectionCard,
  Select,
  Textarea,
} from "@jaldee/design-system";
import { customerService, inventoryService, masterDataService, salesService } from "@/services";
import type {
  ChargeType,
  JewelleryTag,
  Metal,
  MetalPurity,
  OrderType,
  ProviderCustomer,
  ProviderCustomerRef,
  ProviderUserTitle,
} from "@/lib/gold-erp-types";
import { formatCurrency } from "@/lib/gold-erp-utils";

interface SalesLineDraft {
  id: string;
  selectedTagInput: string;
  tagUid: string;
  tagNumber: string;
  itemCode: string;
  itemName: string;
  grossWt: string;
  netWt: string;
  sellingPrice: string;
  discountOnLine: string;
}

interface CustomerCreateDraft {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  secondaryPhoneNo: string;
  whatsApp: string;
  telegram: string;
  gender: string;
  dob: string;
  ageYears: string;
  ageMonths: string;
  ageDays: string;
  address: string;
}

interface NoticeState {
  variant: "success" | "warning" | "danger" | "info";
  title: string;
  message: string;
}

const createCustomerDraft = (): CustomerCreateDraft => ({
  title: "",
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  secondaryPhoneNo: "",
  whatsApp: "",
  telegram: "",
  gender: "",
  dob: "",
  ageYears: "0",
  ageMonths: "0",
  ageDays: "0",
  address: "",
});

const getCustomerDisplayName = (customer: ProviderCustomer | ProviderCustomerRef | null | undefined) =>
  customer?.name || [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim() || "";

const getCustomerPhone = (customer: ProviderCustomer | ProviderCustomerRef | null | undefined) =>
  customer?.phoneNo || ("userProfile" in (customer || {}) ? (customer as any).userProfile?.primaryMobileNo : "") || "";

const createSalesLine = (): SalesLineDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  selectedTagInput: "",
  tagUid: "",
  tagNumber: "",
  itemCode: "",
  itemName: "",
  grossWt: "",
  netWt: "",
  sellingPrice: "",
  discountOnLine: "0",
});

const buildSalesLineFromTag = (tag: JewelleryTag): SalesLineDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  selectedTagInput: tag.tagNumber || tag.barcode || tag.tagUid,
  tagUid: tag.tagUid,
  tagNumber: tag.tagNumber || tag.barcode || "",
  itemCode: tag.itemCode || "",
  itemName: tag.itemName || "",
  grossWt: String(tag.grossWt || tag.grossWeight || ""),
  netWt: String(tag.netWt || tag.netWeight || ""),
  sellingPrice: String(tag.sellingPrice || ""),
  discountOnLine: "0",
});

function normalizeLookupValue(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .toLowerCase();
}

function compactLookupValue(value: string | number | null | undefined) {
  return normalizeLookupValue(value).replace(/[^a-z0-9]/g, "");
}

function extractLookupCandidates(rawInput: string) {
  const cleaned = normalizeLookupValue(rawInput);
  if (!cleaned) {
    return [];
  }

  const head = cleaned.split(" - ")[0];
  return Array.from(new Set([cleaned, head].filter(Boolean)));
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function SalesOrderCreatePage() {
  const navigate = useNavigate();
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [allTags, setAllTags] = useState<JewelleryTag[]>([]);
  const [metals, setMetals] = useState<Metal[]>([]);
  const [purities, setPurities] = useState<MetalPurity[]>([]);

  const [orderNumber, setOrderNumber] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("WALK_IN");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<ProviderCustomer | null>(null);
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);
  const [isCreateCustomerDialogOpen, setIsCreateCustomerDialogOpen] = useState(false);
  const [customerCreateDraft, setCustomerCreateDraft] = useState<CustomerCreateDraft>(createCustomerDraft());
  const [userTitles, setUserTitles] = useState<ProviderUserTitle[]>([]);
  const [matchedCustomers, setMatchedCustomers] = useState<ProviderCustomer[]>([]);

  const [orderDate, setOrderDate] = useState(getTodayInputValue());
  const [notes, setNotes] = useState("");
  const [salesLines, setSalesLines] = useState<SalesLineDraft[]>([createSalesLine()]);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("NONE");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [selectedMetalUid, setSelectedMetalUid] = useState("");
  const [selectedPurityUid, setSelectedPurityUid] = useState("");
  const [oldGoldGrossWt, setOldGoldGrossWt] = useState("");
  const [oldGoldNetWt, setOldGoldNetWt] = useState("");
  const [rateApplied, setRateApplied] = useState("");
  const [exchangeValue, setExchangeValue] = useState("");
  const [discountType, setDiscountType] = useState<ChargeType | "NONE">("NONE");
  const [discountValue, setDiscountValue] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [scannerStatus, setScannerStatus] = useState<"ready" | "capturing">("ready");

  const scanBufferRef = useRef("");
  const lastScanKeyAtRef = useRef(0);
  const scannerResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingDependencies(true);

    void Promise.all([
      inventoryService.getTags(),
      masterDataService.getMetals(),
      masterDataService.getPurities(),
      customerService.getUserTitles(),
    ])
      .then(([loadedTags, loadedMetals, loadedPurities, loadedTitles]) => {
        if (cancelled) return;
        setAllTags(Array.isArray(loadedTags) ? loadedTags : []);
        setMetals(Array.isArray(loadedMetals) ? loadedMetals : []);
        setPurities(Array.isArray(loadedPurities) ? loadedPurities : []);
        setUserTitles(Array.isArray(loadedTitles) ? loadedTitles : []);
        setNotice(null);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setAllTags([]);
        setMetals([]);
        setPurities([]);
        setUserTitles([]);
        setNotice({
          variant: "danger",
          title: "Could not load sales dependencies",
          message: loadError instanceof Error ? loadError.message : "Failed to load dependencies.",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDependencies(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const trimmedName = customerName.trim();
    if (!trimmedName || (selectedCustomer && getCustomerDisplayName(selectedCustomer) === trimmedName)) {
      setMatchedCustomers([]);
      return;
    }

    const timer = setTimeout(() => {
      const firstName = trimmedName.split(/\s+/)[0];
      customerService.getCustomers({
        firstName,
        countryCode: "91",
        status: "ACTIVE",
        from: 0,
        count: 10
      })
      .then((res) => {
        setMatchedCustomers(res || []);
      })
      .catch((err) => {
        console.error("Error searching customers:", err);
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [customerName, selectedCustomer]);

  const handleCustomerNameChange = (value: string) => {
    setCustomerName(value);
    setSelectedCustomer(null);
    setCustomerPhone("");
    setCustomerEmail("");
    setIsCustomerMenuOpen(Boolean(value.trim()));
  };

  const handleSelectCustomer = (customer: ProviderCustomer) => {
    setSelectedCustomer(customer);
    setCustomerName(getCustomerDisplayName(customer));
    setCustomerPhone(getCustomerPhone(customer));
    setCustomerEmail(customer.email || customer.userProfile?.email || "");
    setIsCustomerMenuOpen(false);
  };

  const openCreateCustomerDialog = () => {
    const baseName = selectedCustomer ? "" : customerName.trim();
    const baseEmail = selectedCustomer ? "" : customerEmail.trim();
    const basePhone = selectedCustomer ? "" : customerPhone.trim();
    const { firstName, lastName } = splitCustomerName(baseName);
    setCustomerCreateDraft({
      ...createCustomerDraft(),
      firstName,
      lastName,
      email: baseEmail,
      mobile: basePhone,
      whatsApp: basePhone,
      telegram: basePhone,
    });
    setIsCreateCustomerDialogOpen(true);
    setIsCustomerMenuOpen(false);
  };

  const updateCustomerCreateDraft = (field: keyof CustomerCreateDraft, value: string) => {
    setCustomerCreateDraft((current) => ({ ...current, [field]: value }));
  };

  const handleCreateCustomerSubmit = async () => {
    const firstName = customerCreateDraft.firstName.trim();
    const lastName = customerCreateDraft.lastName.trim();
    const phoneNo = customerCreateDraft.mobile.trim();
    const email = customerCreateDraft.email.trim();

    try {
      const createdCustomer = await customerService.createCustomer({
        title: customerCreateDraft.title || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        countryCode: phoneNo ? "91" : undefined,
        phoneNo: phoneNo || undefined,
        secondaryCountryCode: customerCreateDraft.secondaryPhoneNo.trim() ? "91" : undefined,
        secondaryPhoneNo: customerCreateDraft.secondaryPhoneNo.trim() || undefined,
        whatsAppNum:
          customerCreateDraft.whatsApp.trim() || phoneNo
            ? {
                countryCode: "91",
                number: customerCreateDraft.whatsApp.trim() || phoneNo,
              }
            : undefined,
        telegramNum:
          customerCreateDraft.telegram.trim() || phoneNo
            ? {
                countryCode: "91",
                number: customerCreateDraft.telegram.trim() || phoneNo,
              }
            : undefined,
        gender: customerCreateDraft.gender || undefined,
        dob: customerCreateDraft.dob || undefined,
        address: customerCreateDraft.address.trim() || undefined,
        age: {
          year: Number(customerCreateDraft.ageYears) || 0,
          month: Number(customerCreateDraft.ageMonths) || 0,
          day: Number(customerCreateDraft.ageDays) || 0,
        },
      });

      const normalizedCustomer = createdCustomer.id
        ? await customerService.getCustomerDetails(createdCustomer.id)
        : ({ ...createdCustomer, name: [firstName, lastName].filter(Boolean).join(" ") } as ProviderCustomer);

      const hydratedCustomer: ProviderCustomer = {
        ...normalizedCustomer,
        title: normalizedCustomer.title || customerCreateDraft.title || undefined,
        firstName: normalizedCustomer.firstName || normalizedCustomer.userProfile?.firstName || firstName || undefined,
        lastName: normalizedCustomer.lastName || normalizedCustomer.userProfile?.lastName || lastName || undefined,
        phoneNo: normalizedCustomer.phoneNo || normalizedCustomer.userProfile?.primaryMobileNo || phoneNo || undefined,
        countryCode: normalizedCustomer.countryCode || normalizedCustomer.userProfile?.countryCode || (phoneNo ? "91" : undefined),
        email: normalizedCustomer.email || normalizedCustomer.userProfile?.email || email || undefined,
        name:
          getCustomerDisplayName(normalizedCustomer) ||
          [firstName, lastName].filter(Boolean).join(" ").trim() ||
          undefined,
      };

      handleSelectCustomer(hydratedCustomer);
      setIsCreateCustomerDialogOpen(false);
      setNotice({
        variant: "success",
        title: "Customer created",
        message: `Created and selected customer ${hydratedCustomer.name || ""}.`
      });
    } catch (error: any) {
      setNotice({
        variant: "danger",
        title: "Failed to create customer",
        message: error.message || "An error occurred during customer creation."
      });
    }
  };

  const splitCustomerName = (name: string) => {
    const normalized = name.trim().replace(/\s+/g, " ");
    if (!normalized) {
      return { firstName: "", lastName: "" };
    }

    const [firstName, ...rest] = normalized.split(" ");
    return {
      firstName,
      lastName: rest.join(" "),
    };
  };

  const buildWalkInCustomerPayload = (): ProviderCustomerRef => {
    const normalizedPhone = customerPhone.trim();
    const normalizedName = customerName.trim();
    const { firstName, lastName } = splitCustomerName(normalizedName);

    return {
      id: 0,
      name: normalizedName,
      firstName,
      lastName: lastName || undefined,
      phoneNo: normalizedPhone,
      countryCode: "91",
      email: customerEmail.trim() || undefined,
    };
  };

  const buildCustomerPayload = async (): Promise<ProviderCustomerRef> => {
    const normalizedPhone = customerPhone.trim();
    const normalizedName = customerName.trim();
    const normalizedEmail = customerEmail.trim();

    const matchedCustomer = selectedCustomer || matchedCustomers.find((customer) => {
      const customerPhoneValue = customer.phoneNo || customer.userProfile?.primaryMobileNo || "";
      const customerNameValue = customer.name || `${customer.firstName || ""} ${customer.lastName || ""}`.trim();

      if (normalizedPhone && customerPhoneValue === normalizedPhone) {
        return true;
      }

      if (!normalizedPhone && normalizedName && customerNameValue.toLowerCase() === normalizedName.toLowerCase()) {
        return true;
      }

      return false;
    }) || matchedCustomers[0];

    if (matchedCustomer?.id) {
      return customerService.getCustomerDetails(matchedCustomer.id);
    }

    if (!normalizedPhone) {
      return buildWalkInCustomerPayload();
    }

    const { firstName, lastName } = splitCustomerName(normalizedName);
    const createdCustomer = await customerService.createCustomer({
      firstName: firstName || normalizedName,
      lastName: lastName || undefined,
      phoneNo: normalizedPhone,
      countryCode: "91",
      email: normalizedEmail || undefined,
    });

    if (createdCustomer?.id) {
      return customerService.getCustomerDetails(createdCustomer.id);
    }

    return {
      ...createdCustomer,
      name: createdCustomer.name || normalizedName,
      phoneNo: createdCustomer.phoneNo || normalizedPhone,
      countryCode: createdCustomer.countryCode || "91",
      email: createdCustomer.email ?? normalizedEmail ?? undefined,
    };
  };

  const inStockTags = useMemo(
    () => allTags.filter((tag) => (tag.status || "DRAFT") === "IN_STOCK"),
    [allTags],
  );

  const availablePurities = useMemo(
    () => purities.filter((purity) => !selectedMetalUid || purity.metalUid === selectedMetalUid),
    [purities, selectedMetalUid],
  );

  const selectedMetal = useMemo(
    () => metals.find((metal) => metal.metalUid === selectedMetalUid),
    [metals, selectedMetalUid],
  );

  const selectedPurity = useMemo(
    () => purities.find((purity) => purity.purityUid === selectedPurityUid),
    [purities, selectedPurityUid],
  );

  const selectedTagUids = useMemo(
    () => salesLines.map((line) => line.tagUid).filter(Boolean),
    [salesLines],
  );

  const findTagFromInput = (rawInput: string, tagsToSearch = inStockTags) => {
    const candidates = extractLookupCandidates(rawInput);
    if (!candidates.length) {
      return null;
    }

    const compactCandidates = candidates.map((candidate) => compactLookupValue(candidate));

    return (
      tagsToSearch.find((tag) => {
        const values = [tag.tagUid, tag.tagNumber, tag.barcode, tag.itemCode].filter(Boolean);
        return values.some((value) => {
          const normalizedValue = normalizeLookupValue(value);
          const compactValue = compactLookupValue(value);
          return (
            candidates.includes(normalizedValue) ||
            compactCandidates.includes(compactValue) ||
            candidates.some((candidate) => normalizedValue.includes(candidate) || candidate.includes(normalizedValue)) ||
            compactCandidates.some((candidate) => compactValue.includes(candidate) || candidate.includes(compactValue))
          );
        });
      }) || null
    );
  };

  const updateSalesLine = (lineId: string, field: keyof SalesLineDraft, value: string) => {
    setSalesLines((currentLines) =>
      currentLines.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)),
    );
  };

  const handleSelectTag = (lineId: string, tagInput: string) => {
    const selectedTag = findTagFromInput(tagInput);
    setSalesLines((currentLines) =>
      currentLines.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        if (!selectedTag) {
          return {
            ...line,
            selectedTagInput: tagInput,
            tagUid: "",
            tagNumber: "",
            itemCode: "",
            itemName: "",
            grossWt: "",
            netWt: "",
            sellingPrice: "",
            discountOnLine: "0",
          };
        }

        return {
          ...line,
          ...buildSalesLineFromTag(selectedTag),
          id: line.id,
        };
      }),
    );
  };

  const handleScannedTag = (rawInput: string) => {
    const matchedTag = findTagFromInput(rawInput, allTags);
    const selectedTag = matchedTag && inStockTags.some((tag) => tag.tagUid === matchedTag.tagUid)
      ? matchedTag
      : null;

    if (!selectedTag) {
      setNotice({
        variant: "warning",
        title: "Scanner input not usable",
        message: matchedTag
          ? `Tag ${matchedTag.tagNumber || matchedTag.tagUid} is not currently in stock.`
          : "Scanned tag was not found in inventory.",
      });
      return;
    }

    if (selectedTagUids.includes(selectedTag.tagUid)) {
      setNotice({
        variant: "warning",
        title: "Duplicate tag",
        message: "This tag is already added to the sales order.",
      });
      return;
    }

    setSalesLines((currentLines) => {
      const emptyLineIndex = currentLines.findIndex((line) => !line.tagUid && !line.selectedTagInput.trim());
      if (emptyLineIndex >= 0) {
        return currentLines.map((line, index) =>
          index === emptyLineIndex
            ? { ...line, ...buildSalesLineFromTag(selectedTag), id: line.id }
            : line,
        );
      }

      return [...currentLines, buildSalesLineFromTag(selectedTag)];
    });

    setNotice({
      variant: "success",
      title: "Tag added",
      message: `Added tag ${selectedTag.tagNumber || selectedTag.barcode || selectedTag.tagUid}.`,
    });
  };

  useEffect(() => {
    const clearScannerTimer = () => {
      if (scannerResetTimerRef.current !== null) {
        window.clearTimeout(scannerResetTimerRef.current);
        scannerResetTimerRef.current = null;
      }
    };

    const scheduleScannerReady = () => {
      clearScannerTimer();
      scannerResetTimerRef.current = window.setTimeout(() => {
        setScannerStatus("ready");
      }, 250);
    };

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTextAreaTarget = Boolean(target && target instanceof HTMLTextAreaElement);
      const isSelectTarget = Boolean(target && target instanceof HTMLSelectElement);
      const isContentEditableTarget = Boolean(target?.isContentEditable);
      const isInputTarget = Boolean(target && target instanceof HTMLInputElement);
      const isEditableTarget = isInputTarget || isTextAreaTarget || isSelectTarget || isContentEditableTarget;

      if (event.key === "Escape") {
        scanBufferRef.current = "";
        setScannerStatus("ready");
        clearScannerTimer();
        return;
      }

      if (event.key === "Enter") {
        const scannedValue = scanBufferRef.current.trim();
        const inputValue = isInputTarget ? target.value : "";
        const candidateValue = inputValue || scannedValue;
        scanBufferRef.current = "";
        setScannerStatus("ready");
        clearScannerTimer();
        if (!candidateValue || isTextAreaTarget || isSelectTarget || isContentEditableTarget) {
          return;
        }
        event.preventDefault();
        handleScannedTag(candidateValue);
        return;
      }

      if (isTextAreaTarget || isSelectTarget || isContentEditableTarget || event.key.length !== 1) {
        return;
      }

      const now = Date.now();
      const delta = now - lastScanKeyAtRef.current;
      if (delta > 150) {
        scanBufferRef.current = "";
      }
      const isScannerLike = delta <= 60 || scanBufferRef.current.length > 0;
      lastScanKeyAtRef.current = now;

      if (!isScannerLike) {
        return;
      }

      if (isEditableTarget) {
        event.preventDefault();
      }

      setScannerStatus("capturing");
      scanBufferRef.current += event.key;
      scheduleScannerReady();
    };

    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      clearScannerTimer();
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [allTags, inStockTags, selectedTagUids]);

  const addSalesLine = () => {
    setSalesLines((currentLines) => [...currentLines, createSalesLine()]);
  };

  const removeSalesLine = (lineId: string) => {
    setSalesLines((currentLines) =>
      currentLines.length === 1 ? currentLines : currentLines.filter((line) => line.id !== lineId),
    );
  };

  const lineTotals = useMemo(
    () =>
      salesLines.map((line) => {
        const sellingPrice = Number(line.sellingPrice) || 0;
        const discountOnLine = Number(line.discountOnLine) || 0;
        return Math.max(sellingPrice - discountOnLine, 0);
      }),
    [salesLines],
  );

  const totalAmount = useMemo(
    () => lineTotals.reduce((sum, value) => sum + value, 0),
    [lineTotals],
  );
  const advancePaid = Number(advanceAmount) || 0;
  const oldGoldDeduction = Number(exchangeValue) || 0;
  const headerDiscountAmount = Number(discountAmount) || 0;
  const balanceDue = Math.max(totalAmount - advancePaid - oldGoldDeduction - headerDiscountAmount, 0);

  const resetForm = () => {
    setOrderNumber("");
    setOrderType("WALK_IN");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setSelectedCustomer(null);
    setIsCustomerMenuOpen(false);
    setIsCreateCustomerDialogOpen(false);
    setCustomerCreateDraft(createCustomerDraft());
    setOrderDate(getTodayInputValue());
    setNotes("");
    setSalesLines([createSalesLine()]);
    setAdvanceAmount("");
    setPaymentMode("NONE");
    setReferenceNumber("");
    setSelectedMetalUid("");
    setSelectedPurityUid("");
    setOldGoldGrossWt("");
    setOldGoldNetWt("");
    setRateApplied("");
    setExchangeValue("");
    setDiscountType("NONE");
    setDiscountValue("");
    setDiscountAmount("");
    setDiscountReason("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!orderNumber.trim() || !customerName.trim() || !customerPhone.trim() || !orderDate) {
      setNotice({
        variant: "danger",
        title: "Missing required fields",
        message: "Order number, customer name, customer phone, and order date are required.",
      });
      return;
    }

    const normalizedLines = salesLines.map((line, index) => ({
      tagUid: line.tagUid,
      grossWt: Number(line.grossWt) || 0,
      netWt: Number(line.netWt) || 0,
      sellingPrice: Number(line.sellingPrice) || 0,
      discountOnLine: Number(line.discountOnLine) || 0,
      finalPrice: lineTotals[index],
    }));

    const hasInvalidLine = normalizedLines.some((line) => !line.tagUid || line.sellingPrice <= 0);
    if (!normalizedLines.length || hasInvalidLine) {
      setNotice({
        variant: "danger",
        title: "Invalid sale lines",
        message: "Each sale line needs a selected tag and a selling price greater than zero.",
      });
      return;
    }

    const hasAdvanceInput = Boolean(advanceAmount || paymentMode !== "NONE" || referenceNumber);
    if (hasAdvanceInput && (advancePaid <= 0 || paymentMode === "NONE")) {
      setNotice({
        variant: "danger",
        title: "Advance section incomplete",
        message: "Advance amount and payment mode are required when advance payment is used.",
      });
      return;
    }

    if (advancePaid >= totalAmount && totalAmount > 0) {
      setNotice({
        variant: "danger",
        title: "Advance amount too high",
        message: "Advance amount must be less than the total amount.",
      });
      return;
    }

    const hasOldGoldInput = Boolean(selectedMetalUid || selectedPurityUid || oldGoldGrossWt || oldGoldNetWt || rateApplied || exchangeValue);
    if (
      hasOldGoldInput &&
      (!selectedMetal || !selectedPurity || Number(oldGoldGrossWt) <= 0 || Number(oldGoldNetWt) <= 0 || Number(rateApplied) <= 0 || Number(exchangeValue) <= 0)
    ) {
      setNotice({
        variant: "danger",
        title: "Metal exchange section incomplete",
        message: "Complete all exchange fields when using old gold exchange.",
      });
      return;
    }

    const hasDiscountInput = Boolean(discountType !== "NONE" || discountValue || discountAmount || discountReason);
    if (hasDiscountInput && (discountType === "NONE" || Number(discountValue) <= 0 || Number(discountAmount) <= 0)) {
      setNotice({
        variant: "danger",
        title: "Discount section incomplete",
        message: "Choose a discount type and provide both discount value and discount amount.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const customer = await buildCustomerPayload();
      const resolvedCustomerName =
        customer.name ||
        [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
        customerName.trim();
      const resolvedCustomerPhone = customer.phoneNo || customerPhone.trim();
      const resolvedCustomerEmail = customer.email ?? customerEmail.trim() ?? undefined;

      const order = await salesService.createSalesOrder({
        orderNumber: orderNumber.trim(),
        orderType,
        providerConsumerId: typeof customer.id === "number" ? customer.id : undefined,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        customerEmail: resolvedCustomerEmail ?? null,
        customer,
        orderDate,
        totalAmount,
        discountAmount: headerDiscountAmount || undefined,
        oldGoldDeduction: oldGoldDeduction || undefined,
        advancePaid: advancePaid || undefined,
        balanceDue,
        status: "DRAFT",
        notes: notes.trim() || undefined,
        lines: normalizedLines,
      });

      if (hasAdvanceInput) {
        await salesService.addAdvance(order.orderUid, {
          amount: advancePaid,
          paymentMode,
          referenceNumber: referenceNumber.trim() || undefined,
          paymentDate: orderDate,
        });
      }

      if (hasOldGoldInput && selectedMetal && selectedPurity) {
        await salesService.addOldGold(order.orderUid, {
          metalType: selectedMetal.name,
          purityLabel: selectedPurity.label,
          grossWt: Number(oldGoldGrossWt),
          netWt: Number(oldGoldNetWt),
          rateApplied: Number(rateApplied),
          exchangeValue: Number(exchangeValue),
        });
      }

      if (hasDiscountInput) {
        await salesService.addDiscount(order.orderUid, {
          discountType: discountType as ChargeType,
          discountValue: Number(discountValue),
          discountAmount: headerDiscountAmount,
          reason: discountReason.trim() || undefined,
        });
      }

      resetForm();
      navigate("..", { relative: "path" });
    } catch (submitError: unknown) {
      setNotice({
        variant: "danger",
        title: "Failed to create sales order",
        message: submitError instanceof Error ? submitError.message : "The sales order could not be created.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sales-order-create-page min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
        <PageHeader
          title="New Sales Order"
          subtitle="Create the order first, then attach optional advance, metal exchange, and discount."
          back={{ label: "Back to Sales", href: ".." }}
          onNavigate={(href) => navigate(href, { relative: "path" })}
        />

        {notice ? (
          <Alert variant={notice.variant} title={notice.title} dismissible onDismiss={() => setNotice(null)}>
            {notice.message}
          </Alert>
        ) : null}

        <SectionCard>
          <form onSubmit={handleSubmit} className="sales-order-form space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Input label="Order Number *" required value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} />
              <Select
                label="Order Type"
                value={orderType}
                onChange={(event) => setOrderType(event.target.value as OrderType)}
                options={[
                  { label: "Walk In", value: "WALK_IN" },
                  { label: "Advance", value: "ADVANCE" },
                  { label: "Online", value: "ONLINE" },
                ]}
              />
              <div className="relative md:col-span-2 xl:col-span-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Customer Name *"
                      required
                      value={customerName}
                      onChange={(event) => handleCustomerNameChange(event.target.value)}
                      onFocus={() => setIsCustomerMenuOpen(Boolean(customerName.trim()))}
                      onBlur={() => {
                        setTimeout(() => setIsCustomerMenuOpen(false), 200);
                      }}
                      placeholder="Search customer by name"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openCreateCustomerDialog}
                    className="h-10"
                    title="Create customer"
                  >
                    + New Customer
                  </Button>
                </div>

                {isCustomerMenuOpen && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 border border-slate-200">
                    {matchedCustomers.length > 0 ? (
                      matchedCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="flex w-full flex-col px-4 py-2 text-left hover:bg-slate-100 transition-colors"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleSelectCustomer(customer);
                          }}
                        >
                          <span className="font-medium text-slate-900 text-sm">
                            {getCustomerDisplayName(customer)}
                          </span>
                          <span className="text-xs text-slate-500">
                            ID: {customer.id} | Phone: {getCustomerPhone(customer) || "-"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500 flex flex-col gap-2">
                        <div>No customers found.</div>
                        <button
                          type="button"
                          className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium text-left"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            openCreateCustomerDialog();
                          }}
                        >
                          Create new customer "{customerName}"
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Input label="Customer Phone *" required value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
              <Input label="Customer Email" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
              <Input label="Order Date" type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} />
              <div className="md:col-span-2 xl:col-span-3">
                <Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
            </div>

            <SectionCard
              title="Sale Lines"
              actions={
                <Badge variant={scannerStatus === "capturing" ? "warning" : "info"}>
                  Scanner {scannerStatus === "capturing" ? "capturing" : "ready"}
                </Badge>
              }
            >
              <div className="space-y-3">
                <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                  <p>Scan a tag while the page is focused, or add one manually from available in-stock tags.</p>
                  <p>Fast scanner input followed by Enter will add the tag directly.</p>
                </div>

                {isLoadingDependencies ? (
                  <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-secondary)]">
                    Loading inventory and master data...
                  </div>
                ) : salesLines.length === 0 ? (
                  <EmptyState title="No sale lines" description="Add at least one in-stock tag to continue." />
                ) : (
                  salesLines.map((line, index) => {
                    const availableTags = inStockTags.filter(
                      (tag) => !selectedTagUids.includes(tag.tagUid) || tag.tagUid === line.tagUid,
                    );
                    const finalPrice = lineTotals[index];

                    return (
                      <div key={line.id} className="space-y-3 rounded-xl border border-[var(--color-border)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[var(--color-text-primary)]">Tag Line {index + 1}</div>
                            <div className="text-xs text-[var(--color-text-secondary)]">
                              {line.itemName || "Select an inventory tag to populate the sale line."}
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeSalesLine(line.id)} disabled={salesLines.length === 1}>
                            Remove
                          </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <div className="md:col-span-2 xl:col-span-3">
                            <Input
                              label="Select Tag"
                              list={`sales-tags-${line.id}`}
                              value={line.selectedTagInput}
                              onChange={(event) => handleSelectTag(line.id, event.target.value)}
                              placeholder="Search by tag UID, number, barcode, or item code"
                            />
                            <datalist id={`sales-tags-${line.id}`}>
                              {availableTags.map((tag) => (
                                <option key={tag.tagUid} value={tag.tagUid}>
                                  {(tag.tagNumber || tag.barcode || tag.tagUid)} - {tag.itemName}
                                </option>
                              ))}
                            </datalist>
                          </div>
                          <Input label="Tag UID *" value={line.tagUid} readOnly />
                          <Input label="Tag Number" value={line.tagNumber} readOnly />
                          <Input label="Item Code" value={line.itemCode} readOnly />
                          <Input label="Item Name" value={line.itemName} readOnly />
                          <Input label="Gross Wt (g)" value={line.grossWt} readOnly />
                          <Input label="Net Wt (g)" value={line.netWt} readOnly />
                          <Input
                            label="Selling Price (Rs) *"
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.sellingPrice}
                            onChange={(event) => updateSalesLine(line.id, "sellingPrice", event.target.value)}
                            required
                          />
                          <Input
                            label="Discount on Line (Rs)"
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.discountOnLine}
                            onChange={(event) => updateSalesLine(line.id, "discountOnLine", event.target.value)}
                          />
                          <Input label="Final Price (Rs)" value={finalPrice ? finalPrice.toFixed(2) : "0.00"} readOnly />
                        </div>
                      </div>
                    );
                  })
                )}

                <div className="flex justify-start">
                  <Button type="button" variant="outline" size="sm" onClick={addSalesLine}>
                    Add Tag
                  </Button>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Optional: Advance Payment">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Input
                  label="Advance Amount (Rs)"
                  type="number"
                  min="0"
                  step="0.01"
                  max={totalAmount > 0 ? String(Math.max(totalAmount - 0.01, 0)) : undefined}
                  value={advanceAmount}
                  onChange={(event) => setAdvanceAmount(event.target.value)}
                />
                <Select
                  label="Payment Mode"
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value)}
                  options={[
                    { label: "None", value: "NONE" },
                    { label: "Cash", value: "CASH" },
                    { label: "UPI", value: "UPI" },
                    { label: "NEFT", value: "NEFT" },
                    { label: "Card", value: "CARD" },
                  ]}
                />
                <Input label="Reference Number" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} />
              </div>
            </SectionCard>

            <SectionCard title="Optional: Metal Exchange">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Select
                  label="Metal Type"
                  value={selectedMetalUid}
                  onChange={(event) => {
                    setSelectedMetalUid(event.target.value);
                    setSelectedPurityUid("");
                  }}
                  options={[
                    { label: "Select metal", value: "" },
                    ...metals.map((metal) => ({ label: metal.name, value: metal.metalUid })),
                  ]}
                />
                <Select
                  label="Purity Label"
                  value={selectedPurityUid}
                  onChange={(event) => setSelectedPurityUid(event.target.value)}
                  disabled={!selectedMetalUid}
                  options={[
                    { label: "Select purity", value: "" },
                    ...availablePurities.map((purity) => ({ label: purity.label, value: purity.purityUid })),
                  ]}
                />
                <Input label="Gross Wt (g)" type="number" min="0" step="0.001" value={oldGoldGrossWt} onChange={(event) => setOldGoldGrossWt(event.target.value)} />
                <Input label="Net Wt (g)" type="number" min="0" step="0.001" value={oldGoldNetWt} onChange={(event) => setOldGoldNetWt(event.target.value)} />
                <Input label="Rate Applied (Rs/g)" type="number" min="0" step="0.01" value={rateApplied} onChange={(event) => setRateApplied(event.target.value)} />
                <Input label="Exchange Value (Rs)" type="number" min="0" step="0.01" value={exchangeValue} onChange={(event) => setExchangeValue(event.target.value)} />
              </div>
            </SectionCard>

            <SectionCard title="Optional: Discount">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Select
                  label="Discount Type"
                  value={discountType}
                  onChange={(event) => setDiscountType(event.target.value as ChargeType | "NONE")}
                  options={[
                    { label: "None", value: "NONE" },
                    { label: "Flat", value: "FLAT" },
                    { label: "Per Gram", value: "PER_GRAM" },
                    { label: "Percentage", value: "PERCENTAGE" },
                  ]}
                />
                <Input label="Discount Value" type="number" min="0" step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
                <Input label="Discount Amount (Rs)" type="number" min="0" step="0.01" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} />
                <Input label="Reason" value={discountReason} onChange={(event) => setDiscountReason(event.target.value)} />
              </div>
            </SectionCard>

            <SectionCard title="Order Summary">
              <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                <SummaryItem label="Line Total" value={formatCurrency(totalAmount)} />
                <SummaryItem label="Advance Paid" value={formatCurrency(advancePaid)} />
                <SummaryItem label="Exchange Deduction" value={formatCurrency(oldGoldDeduction)} />
                <SummaryItem label="Header Discount" value={formatCurrency(headerDiscountAmount)} />
                <div className="md:col-span-2 xl:col-span-3">
                  <div className="text-xs text-[var(--color-text-secondary)]">Balance Due</div>
                  <div className="text-lg font-semibold text-[var(--color-text-primary)]">{formatCurrency(balanceDue)}</div>
                </div>
              </div>
            </SectionCard>

            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-3">
              <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoadingDependencies}>
                {isSubmitting ? "Creating..." : "Create Sales Order"}
              </Button>
            </div>
          </form>
        </SectionCard>
      </div>

      <Dialog
        open={isCreateCustomerDialogOpen}
        onClose={() => setIsCreateCustomerDialogOpen(false)}
        title="Create New Customer"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Title"
              value={customerCreateDraft.title}
              onChange={(e) => updateCustomerCreateDraft("title", e.target.value)}
              options={[
                { label: "Select Title", value: "" },
                ...userTitles.map((title) => {
                  const titleValue = title.name || "";
                  const titleLabel = title.displayName || title.name || "";
                  return { label: titleLabel, value: titleValue };
                }).filter((o) => o.value),
              ]}
            />
            <Input
              label="First Name"
              value={customerCreateDraft.firstName}
              onChange={(e) => updateCustomerCreateDraft("firstName", e.target.value)}
              placeholder="First Name"
              required
            />
            <Input
              label="Last Name"
              value={customerCreateDraft.lastName}
              onChange={(e) => updateCustomerCreateDraft("lastName", e.target.value)}
              placeholder="Last Name"
            />
            <Input
              label="Email"
              type="email"
              value={customerCreateDraft.email}
              onChange={(e) => updateCustomerCreateDraft("email", e.target.value)}
              placeholder="Email (user@xyz.com)"
            />
            <Input
              label="Mobile Number"
              value={customerCreateDraft.mobile}
              onChange={(e) => updateCustomerCreateDraft("mobile", e.target.value)}
              placeholder="Mobile Number"
              required
            />
            <Input
              label="Secondary Phone"
              value={customerCreateDraft.secondaryPhoneNo}
              onChange={(e) => updateCustomerCreateDraft("secondaryPhoneNo", e.target.value)}
              placeholder="Secondary Phone"
            />
            <Input
              label="WhatsApp Number"
              value={customerCreateDraft.whatsApp}
              onChange={(e) => updateCustomerCreateDraft("whatsApp", e.target.value)}
              placeholder="WhatsApp Number"
            />
            <Input
              label="Telegram Number"
              value={customerCreateDraft.telegram}
              onChange={(e) => updateCustomerCreateDraft("telegram", e.target.value)}
              placeholder="Telegram Number"
            />
          </div>

          <RadioGroup
            label="Gender"
            name="customer-gender"
            value={customerCreateDraft.gender}
            onChange={(val) => updateCustomerCreateDraft("gender", val)}
            options={[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
              { label: "Others", value: "other" },
            ]}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Date of Birth"
              type="date"
              value={customerCreateDraft.dob}
              onChange={(e) => updateCustomerCreateDraft("dob", e.target.value)}
            />
            <div className="grid gap-2 grid-cols-3">
              <Input
                label="Age (Years)"
                type="number"
                min="0"
                value={customerCreateDraft.ageYears}
                onChange={(e) => updateCustomerCreateDraft("ageYears", e.target.value)}
              />
              <Input
                label="Age (Months)"
                type="number"
                min="0"
                value={customerCreateDraft.ageMonths}
                onChange={(e) => updateCustomerCreateDraft("ageMonths", e.target.value)}
              />
              <Input
                label="Age (Days)"
                type="number"
                min="0"
                value={customerCreateDraft.ageDays}
                onChange={(e) => updateCustomerCreateDraft("ageDays", e.target.value)}
              />
            </div>
          </div>

          <Textarea
            label="Address"
            rows={3}
            value={customerCreateDraft.address}
            onChange={(e) => updateCustomerCreateDraft("address", e.target.value)}
            placeholder="Enter Customer Address"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsCreateCustomerDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreateCustomerSubmit}>
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--color-text-secondary)]">{label}</div>
      <div className="text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
