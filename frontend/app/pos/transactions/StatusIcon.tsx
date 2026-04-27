import { Transaction } from "./types";

const STATUS_CIRCLE_BG: Record<string, string> = {
  success:  "fill-emerald-100",
  voided:   "fill-gray-100",
  pending:  "fill-yellow-100",
  failed:   "fill-red-100",
};

const STATUS_CIRCLE_STROKE: Record<string, string> = {
  success:  "stroke-emerald-500",
  voided:   "stroke-gray-400",
  pending:  "stroke-yellow-500",
  failed:   "stroke-red-400",
};

export default function StatusIcon({ status }: { status: Transaction["status"] }) {
  const bg = STATUS_CIRCLE_BG[status] ?? "fill-gray-100";
  const stroke = STATUS_CIRCLE_STROKE[status] ?? "stroke-gray-400";

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" className={bg} />
      {status === "success" && (
        <polyline points="7 12 10.5 15.5 17 9" className={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {status === "voided" && (
        <>
          <line x1="8" y1="8" x2="16" y2="16" className={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="16" y1="8" x2="8" y2="16" className={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
      {status === "pending" && (
        <>
          <circle cx="12" cy="12" r="4" className={stroke} strokeWidth="2" fill="none" />
          <polyline points="12 10 12 12 13.5 13" className={stroke} strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      {status === "failed" && (
        <>
          <line x1="12" y1="8" x2="12" y2="13" className={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="16" r="0.5" className={stroke} strokeWidth="2" />
        </>
      )}
    </svg>
  );
}