"use client";

import { ReactNode } from "react";

export function ConfirmModal({
  open,
  title,
  description,
  details,
  confirmLabel,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description: string;
  details: Array<{ label: string; value: ReactNode }>;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-panel p-6 shadow-glow">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Confirm Action</div>
        <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-fog">{description}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="rounded-xl border border-white/10 bg-surface/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-fog">{detail.label}</div>
              <div className="mt-2 text-sm text-white">{detail.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-fog"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-canvas"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
