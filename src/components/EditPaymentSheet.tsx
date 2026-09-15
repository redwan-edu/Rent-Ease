"use client";

import { useMutation, useQuery } from "convex/react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { monthLabel, parseAmount, today } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { Field, HoldButton, Sheet, useRun } from "./ui";

export type EditablePayment = {
  _id: Id<"payments">;
  tenantId: Id<"tenants">;
  tenantName: string;
  amount: number;
  month: string;
  paidOn: string;
  note?: string;
};

/**
 * Fixes a payment already on the books — wrong amount, wrong month, wrong
 * date — or undoes it entirely. Undoing needs the same press-and-hold
 * confirmation as recording one, since it's just as easy to fat-finger.
 */
export default function EditPaymentSheet({ payment, onClose }: { payment: EditablePayment; onClose: () => void }) {
  const { workspace, money, startMonth } = useWorkspace();
  const update = useMutation(api.payments.update);
  const remove = useMutation(api.payments.remove);
  const { run, busy } = useRun();

  const [amount, setAmount] = useState(String(payment.amount));
  const [month, setMonth] = useState(payment.month);
  const [paidOn, setPaidOn] = useState(payment.paidOn);
  const [note, setNote] = useState(payment.note ?? "");

  // Same balance check as recording a payment, but this payment's own amount
  // never counts against itself, so nudging it up or down doesn't need a delete first.
  const status = useQuery(api.payments.monthStatus, {
    tenantId: payment.tenantId,
    month,
    excludePaymentId: payment._id,
  });

  const value = parseAmount(amount);
  const wellFormed = /^\d{4}-\d{2}$/.test(month);
  const overpay = !!status && !status.blocked && value > status.remaining;
  const monthError = !wellFormed ? "Pick the month this payment is for." : (status?.blocked ?? null);
  const amountError = overpay
    ? status.remaining > 0
      ? `Only ${money(status.remaining)} is left for this month.`
      : "This month is already paid in full from other payments."
    : undefined;
  const valid = value > 0 && wellFormed && !monthError && !overpay && !!status;

  const save = async () => {
    const ok = await run(async () => {
      await update({ paymentId: payment._id, amount: value, month, paidOn: paidOn || today(), note });
      return true;
    }, "Payment updated");
    if (ok) setTimeout(onClose, 650);
    return !!ok;
  };

  const undo = async () => {
    const ok = await run(async () => {
      await remove({ paymentId: payment._id });
      return true;
    }, "Payment undone");
    if (ok) setTimeout(onClose, 650);
    return !!ok;
  };

  return (
    <Sheet
      title={`Payment from ${payment.tenantName}`}
      onClose={onClose}
      footer={
        <HoldButton
          label={valid ? `Save ${money(value)}` : "Save changes"}
          doneLabel="Changes saved"
          disabled={!valid || busy}
          onComplete={save}
        />
      }
    >
      {status && !status.blocked && (
        <div className={`pay-status${status.remaining === 0 && !overpay ? " done" : ""}`}>
          {status.remaining === 0 && !overpay ? <CircleCheck size={17} /> : <CircleAlert size={17} />}
          <span>
            {status.paid > 0
              ? `${money(status.paid)} more of ${money(status.rent)} is recorded for ${monthLabel(month)} from other payments. ${money(status.remaining)} left for this one.`
              : `Nothing else recorded for ${monthLabel(month)}. Rent is ${money(status.rent)}.`}
          </span>
        </div>
      )}

      <Field label="Amount received" required error={amountError}>
        <div className="input-wrap">
          <span>{workspace.currency}</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
        </div>
      </Field>
      {status && !status.blocked && status.remaining > 0 && value !== status.remaining && (
        <div className="chips">
          <button type="button" className="chip" onClick={() => setAmount(String(status.remaining))}>
            Use full amount: {money(status.remaining)}
          </button>
        </div>
      )}
      <div className="grid-2">
        <Field label="For month" required error={monthError ?? undefined}>
          <input className="input" type="month" min={startMonth} value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <Field label="Paid on">
          <input className="input" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </Field>
      </div>
      <Field label="Note">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid in cash" />
      </Field>

      <section className="danger-zone">
        <h3>Undo this payment</h3>
        <div className="dz-part">
          <div>
            <strong>Remove it entirely</strong>
            <p>Takes {money(payment.amount)} back out of collected totals. This can&apos;t be undone.</p>
          </div>
        </div>
        <div style={{ marginTop: 4 }}>
          <HoldButton
            label="Hold to undo"
            doneLabel="Payment undone"
            tone="danger"
            disabled={busy}
            onComplete={undo}
          />
        </div>
      </section>
    </Sheet>
  );
}
