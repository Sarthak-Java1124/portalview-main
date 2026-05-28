"use client";

import { useToastContext, type ToastVariant } from "@/context/ToastContext";

const variantClasses: Record<ToastVariant, string> = {
  success: "border-green-500/30 bg-green-500/10 text-green-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
  info: "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

const variantIcons: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastContext();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md text-sm font-medium shadow-lg",
            variantClasses[t.variant],
          ].join(" ")}
        >
          <span className="mt-0.5 shrink-0 font-bold">
            {variantIcons[t.variant]}
          </span>
          <span className="flex-1 break-words">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="ml-2 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
