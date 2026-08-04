import React, { useState, useEffect } from "react";
import { Button, Input } from "@jaldee/design-system";

export interface AddEditItemModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  inputLabel?: string;
  initialValue?: string;
  placeholder?: string;
  onSubmit: (val: string) => void;
  onClose: () => void;
}

export function AddEditItemModal({
  isOpen,
  title,
  subtitle,
  inputLabel = "Item Name",
  initialValue = "",
  placeholder = "Enter text...",
  onSubmit,
  onClose,
}: AddEditItemModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      onClose();
    }
  };

  return (
    <div className="sg-modal-overlay">
      <div className="sg-modal-backdrop" onClick={onClose} />
      <div className="sg-modal-content" style={{ maxWidth: 500 }}>
        <h5 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 700 }}>{title}</h5>
        {subtitle && (
          <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#64748B" }}>
            {subtitle}
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <Input
            label={inputLabel}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            fullWidth
            autoFocus
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={!value.trim()}>
              Save Item
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
