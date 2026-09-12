"use client";

import { useMutation, useQuery } from "convex/react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { monthLabel, parseAmount, today } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { Field, HoldButton, Sheet, useRun } from "./ui";

export type PayTarget = {
  tenantId: Id<"tenants">;
  name: string;
  amount: number;
  month: string;
};

export default function PaymentSheet({ target, onClose }: { target: PayTarget; onClose: () => void }) {
  const { workspace, money, startMonth } = useWorkspace();
  const add = useMutation(api.payments.add);
  const { run } = useRun();
  const [amount, setAmount] = useState(target.amount > 0 ? String(target.amount) : "");
  const [month, setMonth] = useState(target.month);
  const [paidOn, setPaidOn] = useState(today());
  const [note, setNote] = useState("");

  // What's already on the books for this tenant in the chosen month, so the
  // same rent can't be recorded twice — whatever month is picked.
  const status = useQuery(api.payments.monthStatus, { tenantId: target.tenantId, month });

  const value = parseAmount(amount);
  const wellFormed = /^\d{4}-\d{2}$/.test(month);
  const overpay = !!status && !status.blocked && value > status.remaining;
  const monthError = !wellFormed
    ? "Pick the month this payment is for."
    : (status?.blocked ?? null);
  const amountError = overpay
    ? status.remaining > 0
      ? `Only ${money(status.remaining)} is left for this month.`
      : "This month is already paid in full."
    : undefined;
  const valid = value > 0 && wellFormed && !monthError && !overpay && !!status;

  const save = async () => {
    const ok = await run(async () => {
      await add({ tenantId: target.tenantId, amount: value, month, paidOn: paidOn || today(), note });
      return true;
    }, "Payment recorded");
    if (ok) setTimeout(onClose, 650);
    return !!ok;
  };

  return (
    <Sheet
      title={`Payment · ${target.name}`}
      onClose={onClose}
      footer={
        <HoldButton
          label={valid ? `Hold to record ${money(value)}` : "Hold to record payment"}
          doneLabel="Payment recorded"
          disabled={!valid}
          onComplete={save}
        />
      }
    >
      {status && !status.blocked && (
        <div className={`pay-status${status.remaining === 0 ? " done" : ""}`}>
          {status.remaining === 0 ? <CircleCheck size={17} /> : <CircleAlert size={17} />}
          <span>
            {status.remaining === 0
              ? `${monthLabel(month)} is fully paid — ${money(status.paid)} of ${money(status.rent)}.`
              : status.paid > 0
                ? `${money(status.paid)} of ${money(status.rent)} already recorded for ${monthLabel(month)} · ${money(status.remaining)} left.`
                : `Nothing recorded yet for ${monthLabel(month)} · rent is ${money(status.rent)}.`}
          </span>
        </div>
      )}

      <Field label="Amount received" required error={amountError}>
        <div className="input-wrap">
          <span>{workspace.currency}</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </div>
      </Field>
      {status && !status.blocked && status.remaining > 0 && value !== status.remaining && (
        <div className="chips">
          <button type="button" className="chip" onClick={() => setAmount(String(status.remaining))}>
            Pay the full {money(status.remaining)}
          </button>
        </div>
      )}
      <div className="grid-2">
        <Field label="For month" required error={monthError ?? undefined}>
          <input
            className="input"
            type="month"
            min={startMonth}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
        <Field label="Paid on">
          <input className="input" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </Field>
      </div>
      <Field label="Note">
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Paid in cash"
        />
      </Field>
    </Sheet>
  );
}
