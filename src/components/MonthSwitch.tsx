"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthKey, monthLabel, shiftMonth } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useToast } from "./ui";

/**
 * Month stepper that refuses to go back past the month this workspace joined —
 * there is no rent history before then, so an empty month would only mislead.
 * The back arrow stays tappable at the floor so it can explain itself.
 */
export default function MonthSwitch({
  month,
  onChange,
  showCurrent = false,
}: {
  month: string;
  onChange: (month: string) => void;
  /** Label the running month as "This month" (the dashboard does). */
  showCurrent?: boolean;
}) {
  const { startMonth } = useWorkspace();
  const toast = useToast();
  const atStart = month <= startMonth;
  const isCurrent = month === monthKey();
  const startLabel = monthLabel(startMonth);

  return (
    <div className="month-block">
      <div className="month-switch">
        <button
          className={`icon-btn${atStart ? " is-blocked" : ""}`}
          aria-disabled={atStart}
          onClick={() =>
            atStart
              ? toast(
                  `Tracking starts in ${startLabel} — the month you joined the app.`,
                )
              : onChange(shiftMonth(month, -1))
          }
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          {showCurrent && isCurrent
            ? `This month · ${monthLabel(month, true)}`
            : monthLabel(month)}
        </span>
        <button
          className="icon-btn"
          onClick={() => onChange(shiftMonth(month, 1))}
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
