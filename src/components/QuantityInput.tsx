"use client";

import { useState } from "react";

import { commitQuantity } from "@/lib/cart/quantity";
import { fmtQty } from "@/lib/storefront/currency";

/**
 * Keeps the text being typed locally, then applies a valid quantity on blur
 * or Enter. This lets a customer replace "1" with "10" without the item
 * disappearing while the field is temporarily empty.
 */
export function QuantityInput({
  value,
  max = Infinity,
  className,
  onCommit,
  allowDecimal = false,
  disabled = false,
}: {
  value: number;
  max?: number;
  className?: string;
  onCommit: (qty: number) => void;
  allowDecimal?: boolean;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(fmtQty(value));
  // Follow outside changes (+/− buttons, stock caps) without an effect.
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setDraft(fmtQty(value));
  }

  const commit = () => {
    const next = commitQuantity(draft, { max, allowDecimal });
    if (next == null) {
      setDraft(fmtQty(value));
      return;
    }
    setDraft(fmtQty(next));
    if (next !== value) onCommit(next);
  };

  return (
    <input
      className={className}
      type="number"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      min={allowDecimal ? "0.001" : "1"}
      max={Number.isFinite(max) ? max : undefined}
      step={allowDecimal ? "0.001" : "1"}
      aria-label="Miqdor"
      disabled={disabled}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      onBlur={commit}
    />
  );
}
