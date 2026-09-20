import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  canAdvanceReportStatus,
  reportStatusColors,
  type BugStatus,
  type PlayerReportStatus,
} from "@/lib/demo/store";

type ReportStatus = BugStatus | PlayerReportStatus;

const statusOptions: ReportStatus[] = ["New", "Investigating", "Resolved"];

const statusStyles: Record<ReportStatus, string> = {
  New: "bg-[#d9a514]/15",
  Investigating: "bg-[#c96a2d]/15",
  Resolved: "bg-[#2d9d8f]/15",
};

export function ReportStatusDropdown({
  value,
  onChange,
  enforceForwardOnly = false,
}: {
  value: ReportStatus;
  onChange: (value: ReportStatus) => void;
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
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        className={`admin-status-select inline-flex min-w-[8.5rem] items-center justify-between gap-3 rounded px-2.5 py-1.5 text-[10px] font-black uppercase outline-none transition focus:ring-2 focus:ring-coral/40 ${statusStyles[value]}`}
        data-status={value}
        style={{ color: reportStatusColors[value] }}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {value}
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="admin-status-menu absolute right-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded border border-white/15 bg-[#101923] p-1 shadow-xl"
          role="listbox"
          aria-label="Report status"
        >
          {statusOptions.map((status) => {
            const disabled = enforceForwardOnly && !canAdvanceReportStatus(value, status);

            return (
              <button
                key={status}
                type="button"
                role="option"
                aria-selected={value === status}
                aria-disabled={disabled}
                disabled={disabled}
                data-status={status}
                className={`admin-status-option block w-full whitespace-nowrap rounded px-2.5 py-2 text-left text-[10px] font-black uppercase transition ${disabled ? "cursor-not-allowed opacity-40" : "hover:bg-white/10"}`}
                style={{ color: reportStatusColors[status] }}
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
