"use client";
import Image from "next/image";
import type { ReactNode, RefObject } from "react";

export function ModalDialog({
  dialogRef,
  titleId,
  descriptionId,
  closeLabel,
  onClose,
  children,
  dismissDisabled = false,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  titleId: string;
  descriptionId?: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  dismissDisabled?: boolean;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="signup-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onCancel={(event) => {
        if (dismissDisabled) event.preventDefault();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]',
          ),
        );
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      {children}
      <button
        type="button"
        aria-label={closeLabel}
        disabled={dismissDisabled}
        className="close-signup"
        onClick={() => dialogRef.current?.close()}
      >
        <Image src="/design/close.svg" width={40} height={40} alt="" />
      </button>
    </dialog>
  );
}
