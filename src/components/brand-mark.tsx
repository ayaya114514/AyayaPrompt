import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#0f172a" />
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="14"
        fill="none"
        stroke="#334155"
        strokeWidth="2"
      />
      <path
        d="M12 48 28 15l13 33M19.5 36.5h15"
        fill="none"
        stroke="#f8fafc"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m42 29 10 9-10 9"
        fill="none"
        stroke="#a78bfa"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
