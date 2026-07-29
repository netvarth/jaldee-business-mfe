import { useEffect } from "react";
import { fetchCouponDetail, fetchDiscountDetail } from "./invoiceAdjustmentDetails";

export function useInvoiceAdjustmentDetails(context: any) {
  const { selectedDiscountId, discountDialogItem, discountOptions, setDiscountLoading, setSelectedDiscountDetail, setDiscountAmountInput, setFormError, selectedInvoiceDiscountId, showInvoiceDiscountDialog, setInvoiceDiscountLoading, setSelectedInvoiceDiscountDetail, setInvoiceDiscountAmountInput, couponOptions, selectedCouponId, showInvoiceCouponDialog, setCouponLoading, setSelectedCouponDetail } = context;
  useEffect(() => {
    let active = true;

    async function loadSelectedDiscount() {
      if (!selectedDiscountId || !discountDialogItem) {
        return;
      }

      const fallbackOption = discountOptions.find((option) => option.value === selectedDiscountId);

      setDiscountLoading(true);
      try {
        const detail = await fetchDiscountDetail(selectedDiscountId, fallbackOption);
        if (!active) {
          return;
        }
        setSelectedDiscountDetail(detail);
        if (detail.discountType.toUpperCase() !== "ONDEMAND") {
          setDiscountAmountInput(String(detail.discountValue));
        }
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("[mfe-finance] Failed to load discount detail", error);
        setFormError(error instanceof Error ? error.message : "Could not load discount details.");
      } finally {
        if (active) {
          setDiscountLoading(false);
        }
      }
    }

    void loadSelectedDiscount();
    return () => {
      active = false;
    };
  }, [selectedDiscountId, discountDialogItem, discountOptions]);

  useEffect(() => {
    let active = true;

    async function loadInvoiceDiscountDetail() {
      if (!selectedInvoiceDiscountId || !showInvoiceDiscountDialog) {
        return;
      }

      const fallbackOption = discountOptions.find((option) => option.value === selectedInvoiceDiscountId);
      setInvoiceDiscountLoading(true);
      try {
        const detail = await fetchDiscountDetail(selectedInvoiceDiscountId, fallbackOption, true);
        if (!active) {
          return;
        }
        setSelectedInvoiceDiscountDetail(detail);
        if (detail.discountType.toUpperCase() !== "ONDEMAND") {
          setInvoiceDiscountAmountInput(String(detail.discountValue));
        }
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("[mfe-finance] Failed to load invoice-level discount detail", error);
        setFormError(error instanceof Error ? error.message : "Could not load discount details.");
      } finally {
        if (active) {
          setInvoiceDiscountLoading(false);
        }
      }
    }

    void loadInvoiceDiscountDetail();
    return () => {
      active = false;
    };
  }, [discountOptions, selectedInvoiceDiscountId, showInvoiceDiscountDialog]);

  useEffect(() => {
    let active = true;

    async function loadSelectedCoupon() {
      if (!selectedCouponId || !showInvoiceCouponDialog) {
        return;
      }

      const fallbackOption = couponOptions.find((option) => option.value === selectedCouponId);
      setCouponLoading(true);
      try {
        const detail = await fetchCouponDetail(selectedCouponId, fallbackOption);
        if (!active) {
          return;
        }
        setSelectedCouponDetail(detail);
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("[mfe-finance] Failed to load coupon detail", error);
        setFormError(error instanceof Error ? error.message : "Could not load coupon details.");
      } finally {
        if (active) {
          setCouponLoading(false);
        }
      }
    }

    void loadSelectedCoupon();
    return () => {
      active = false;
    };
  }, [couponOptions, selectedCouponId, showInvoiceCouponDialog]);

}
