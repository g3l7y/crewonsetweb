import { useEffect, useRef, useState } from "react";

import {
  canAdvancePartnershipStatus,
  partnershipStatusColors,
  type PartnershipStatus,
} from "@/lib/demo/store";

const statusOptions: PartnershipStatus[] = ["New", "Pending", "Approved", "On-going", "Done", "Declined"];

const statusStyles: Record<PartnershipStatus, string> = {
  New: "bg-white/10",
  Pending: "bg-[#c96a2d]/15",
  Approved: "bg-[#d9a514]/15",
  "On-going": "bg-[#3a7bd5]/15",
  Done: "bg-[#2d9d8f]/15",
  Declined: "bg-coral/15",
};

export function PartnershipStatusDropdown({
  value,
  onChange,
  className = "",
  ariaLabel,
  enforceForwardOnly = false,
}: {
  value: PartnershipStatus;
  onChange: (value: PartnershipStatus) => void;
  className?: string;
  ariaLabel?: string;
  enforceForwardOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        className={`admin-partnership-status-select inline-flex min-w-[8.5rem] items-center justify-between gap-3 rounded px-2.5 py-1.5 text-[10px] font-black uppercase outline-none transition focus:ring-2 focus:ring-coral/40 ${statusStyles[value]}`}
        data-status={value}
        style={{ color: value === "New" ? "#fefaef" : partnershipStatusColors[value] }}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {value}
        <span
          aria-hidden="true"
          className={`admin-partnership-status-chevron ${open ? "is-open" : ""}`}
        />
      </button>

      {open && (
        <div
          className="admin-partnership-status-menu absolute right-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded border border-white/15 bg-[#101923] p-1 shadow-xl"
          role="listbox"
          aria-label="Partnership status"
        >
          {statusOptions.map((status) => {
            const disabled = enforceForwardOnly && !canAdvancePartnershipStatus(value, status);

            return (
              <button
                key={status}
                type="button"
                role="option"
                aria-selected={value === status}
                aria-disabled={disabled}
                disabled={disabled}
                data-status={status}
                className={`admin-partnership-status-option block w-full whitespace-nowrap rounded px-2.5 py-2 text-left text-[10px] font-black uppercase transition ${disabled ? "cursor-not-allowed opacity-40" : "hover:bg-white/10"}`}
                style={{ color: status === "New" ? "#fefaef" : partnershipStatusColors[status] }}
                onClick={() => {
                  onChange(status);
                  setOpen(false);
                }}
              >
                {status}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
