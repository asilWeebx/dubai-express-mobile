"use client";

import { useEffect, useRef } from "react";

/*
 * Dialogs can stack (a lightbox over the product page, the map over the
 * checkout), so only the topmost one reacts to keys, and the body stays
 * locked until the last one closes.
 */
let bodyLockCount = 0;
let bodyPrevOverflow = "";
const dialogStack: object[] = [];

function lockBody() {
  if (bodyLockCount++ === 0) {
    bodyPrevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}

function unlockBody() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) document.body.style.overflow = bodyPrevOverflow;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Escape to close, Tab kept inside, body scroll locked, and focus handed back
 * to whatever opened the dialog. Attach the returned ref to the dialog root.
 */
export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    const token = {};
    dialogStack.push(token);
    lockBody();

    const focusable = () => [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const focusTimer = requestAnimationFrame(() => (focusable()[0] ?? ref.current)?.focus());

    const onKey = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== token) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        ref.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", onKey);
      const index = dialogStack.indexOf(token);
      if (index >= 0) dialogStack.splice(index, 1);
      unlockBody();
      if (returnTo && document.contains(returnTo)) returnTo.focus();
    };
  }, [open]);

  return ref;
}
