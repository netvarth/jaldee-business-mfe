import { formatDisplayDate, readString } from "./invoiceFormModel";

export function createInvoiceTemplatePayload(templateName: string, { mfeProps, locationOptions, locationId, defaultLocationName, categoryOptions, categoryId, statusOptions, statusId, consumerName, consumerPhone, selectedConsumerOption, nextInvoiceRequest, invoiceNum, consumerUid, invoiceLabel, notesForCustomer, referenceNo, notesForProvider, termsConditions, items }: any) {
    const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
    const locationRecord = (mfeProps.location ?? {}) as Record<string, unknown>;
    const tenantUid = readString(accountRecord.tenantUid, accountRecord.uid, accountRecord.id);
    const businessName = readString(
      accountRecord.businessName,
      accountRecord.accountName,
      accountRecord.name
    );
    const selectedLocation = locationOptions.find((option) => option.value === locationId);
    const locationName = readString(
      selectedLocation?.label,
      locationRecord.name,
      locationRecord.place,
      defaultLocationName
    );
    const storeUid = readString(
      locationRecord.storeUid,
      locationRecord.storeId,
      accountRecord.storeUid,
      accountRecord.storeId
    );
    const storeName = readString(
      locationRecord.storeName,
      accountRecord.storeName
    );
    const departmentUid = readString(
      locationRecord.departmentUid,
      locationRecord.departmentId,
      accountRecord.departmentUid,
      accountRecord.departmentId
    );
    const departmentName = readString(
      locationRecord.departmentName,
      accountRecord.departmentName
    );
    const categoryOption = categoryOptions.find((option) => option.value === categoryId);
    const statusOption = statusOptions.find((option) => option.value === statusId);
    const userRecord = (mfeProps.user ?? {}) as Record<string, unknown>;
    const userUid = readString(userRecord.userUid, userRecord.uid, userRecord.id);
    const userName = readString(
      userRecord.userName,
      userRecord.name,
      userRecord.firstName,
      consumerName
    );
    const userPhone = readString(
      consumerPhone,
      selectedConsumerOption?.phone,
      userRecord.phone,
      userRecord.mobileNo,
      userRecord.phoneNumber
    );
    const userEmail = readString(
      selectedConsumerOption?.email,
      userRecord.email
    );
    const userCountryCode = readString(
      userRecord.countryCode,
      userRecord.userCountryCode
    );
    const businessLogo = Array.isArray(accountRecord.businessLogo)
      ? accountRecord.businessLogo
      : [];

    return {
      tenantUid: tenantUid || undefined,
      businessName: businessName || undefined,
      locationUid: nextInvoiceRequest.locationUid || undefined,
      locationName: locationName || undefined,
      storeUid: storeUid || undefined,
      storeName: storeName || undefined,
      departmentUid: departmentUid || undefined,
      departmentName: departmentName || undefined,
      sourceService: "API_GATEWAY",
      sourceUid: undefined,
      sourceNum: invoiceNum.trim() || undefined,
      feature: "BASE_CRM",
      subFeature: "BASE_CRM",
      featureModule: "BASE_CRM_CORE",
      userUid: userUid || consumerUid || undefined,
      userType: "TENANT_USER",
      userName: userName || undefined,
      userRefNo: consumerUid || undefined,
      userPhone: userPhone || undefined,
      userCountryCode: userCountryCode || undefined,
      userEmail: userEmail || undefined,
      gstNumber: readString(accountRecord.gstNumber) || undefined,
      businessLogo,
      invoiceLabel: invoiceLabel.trim() || undefined,
      description: notesForCustomer.trim() || undefined,
      referenceNo: referenceNo.trim() || undefined,
      notesForCustomer: notesForCustomer.trim() || undefined,
      notesForProvider: notesForProvider.trim() || undefined,
      termsConditions: termsConditions.trim() || undefined,
      assignedUsers: [],
      categoryId: Number(categoryId) || undefined,
      categoryName: categoryOption?.label || undefined,
      statusId: Number(statusId) || undefined,
      statusName: statusOption?.label || undefined,
      allowToUseOtherUsers: Boolean(accountRecord.allowToUseOtherUsers ?? false),
      templateName: templateName.trim(),
      uid: undefined,
      status: "Enabled",
      detailList: items.map((item) => ({
        uid: item.detailUid || undefined,
        tenantUid: tenantUid || undefined,
        locationUid: nextInvoiceRequest.locationUid || undefined,
        departmentUid: departmentUid || undefined,
        storeUid: storeUid || undefined,
        templateName: templateName.trim(),
        templateUid: undefined,
        sourceService: "API_GATEWAY",
        feature: "BASE_CRM",
        subFeature: "BASE_CRM",
        featureModule: "BASE_CRM_CORE",
        itemNature: "SINGLE_ITEM",
        parentItemId: undefined,
        parentItemUid: undefined,
        parentItemName: undefined,
        selectedAttributes: {},
        assignedUsers: [],
        itemType: item.itemType,
        itemTypeUid: item.itemUid || undefined,
        itemUid: item.itemUid || undefined,
        itemName: item.name,
        hsnCode: undefined,
        quantity: item.qty,
        processedDate: new Date(item.date).toISOString(),
        processedDateString: formatDisplayDate(item.date),
        price: item.price,
        mrp: item.price,
        taxes: [],
        taxable: true,
        taxInclude: false,
        netTotal: item.price * item.qty,
        taxTotal: item.taxAmount ?? 0,
        taxableAmount: item.afterDiscount ?? item.price * item.qty,
        netRate: item.afterDiscount ?? item.price,
        cgst: 0,
        cgstPercentage: 0,
        sgst: 0,
        sgstPercentage: 0,
        cess: 0,
        cessPercentage: 0,
        igst: 0,
        igstPercentage: 0,
        taxPercentage: 0,
      })),
    };
  }
