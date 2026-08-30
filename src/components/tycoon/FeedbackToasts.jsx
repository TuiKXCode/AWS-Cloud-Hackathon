/**
 * Score feedback that floats up over the floor. Driven by ttl in the reducer, so toasts
 * clear themselves without any timers in the view layer.
 */
// React is imported explicitly even though the automatic JSX runtime does not need
// it: that way this file renders under either runtime, so a toolchain that falls
// back to the classic transform cannot break it with "React is not defined".
import React from 'react';

export default function FeedbackToasts({ toasts }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute right-2 top-2 z-[2000] flex flex-col items-end gap-1"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <span
          key={toast.id}
          className={`animate-float-up rounded-full px-2 py-0.5 text-[10px] font-bold shadow sm:text-xs ${
            toast.kind === 'good'
              ? 'bg-emerald-500 text-white'
              : toast.kind === 'bad'
                ? 'bg-rose-600 text-white'
                : 'bg-stone-700 text-stone-100'
          }`}
        >
          {toast.text}
        </span>
      ))}
    </div>
  );
}
