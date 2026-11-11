type DateRangeFilterProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
};

const dateInputClassName = "h-11 w-full min-w-0 rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none [color-scheme:dark] focus:border-coral";
const dateLabelClassName = "mb-1 block text-[10px] font-black uppercase tracking-wider !text-white/40";

export function DateRangeFilter({ from, to, onFromChange, onToChange, className = "" }: DateRangeFilterProps) {
  return (
    <div className={`grid min-w-0 grid-cols-2 gap-3 sm:col-span-2 xl:col-span-2 ${className}`}>
      <label className="block min-w-0">
        <span className={dateLabelClassName}>Date from</span>
        <input
          aria-label="Date from"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => onFromChange(event.target.value)}
          className={dateInputClassName}
        />
      </label>
      <label className="block min-w-0">
        <span className={dateLabelClassName}>Date to</span>
        <input
          aria-label="Date to"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(event) => onToChange(event.target.value)}
          className={dateInputClassName}
        />
      </label>
    </div>
  );
}

/** Compare calendar filters using the same local date shown in admin tables. */
export function matchesDateRange(value: string, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!value) return false;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const key = dateOnly
    ? value
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return (!from || key >= from) && (!to || key <= to);
}
