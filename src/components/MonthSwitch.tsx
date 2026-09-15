"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthKey, monthLabel, shiftMonth } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useToast } from "./ui";

/**
 * Month stepper that refuses to go back past the month this workspace joined:
 * there is no rent history before then, so an empty month would only mislead.
 * The back arrow stays tappable at the floor so it can explain itself.
 */
export default function MonthSwitch({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  const { startMonth, clampMonth } = useWorkspace();
  const toast = useToast();
  const atStart = month <= startMonth;
  const current = clampMonth(monthKey());

  return (
    <div className="month-switch">
      <button
        className={`icon-btn outline${atStart ? " is-blocked" : ""}`}
        aria-disabled={atStart}
        onClick={() =>
          atStart
            ? toast(`Tracking starts in ${monthLabel(startMonth)}, the month you joined.`)
            : onChange(shiftMonth(month, -1))
        }
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="month-label">
        <strong>{monthLabel(month)}</strong>
        {month !== current && <button onClick={() => onChange(current)}>Back to this month</button>}
      </div>
      <button className="icon-btn outline" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
