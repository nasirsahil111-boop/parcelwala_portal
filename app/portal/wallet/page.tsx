"use client";

/**
 * Wallet — the balance, where it went, and how to add to it.
 *
 * Top-ups are a request, not a credit. The partner pays by UPI and submits the
 * reference; Parcelwalah credits it once the payment is confirmed. The screen
 * says so plainly, because a balance that appears instantly and is reversed
 * later is worse than a balance that takes an hour to arrive.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, inr, istDate } from "@/lib/api";
import {
  Button,
  Card,
  Empty,
  ErrorNote,
  Field,
  SectionTitle,
  Spinner,
  inputCls,
} from "@/components/ui";

type Txn = {
  id: string;
  type: "debit" | "refund" | "topup" | "adjustment";
  amount: number;
  balanceAfter: number;
  orderId?: string | null;
  reason?: string | null;
  createdAt: string | null;
};

type TopupRequest = {
  id: string;
  amount: number;
  utr: string;
  status: "pending" | "approved" | "rejected";
  reason?: string | null;
  createdAt: string | null;
};

type Wallet = {
  balance: number;
  creditedThisMonth: number;
  debitedThisMonth: number;
  transactions: Txn[];
  topupRequests: TopupRequest[];
};

const QUICK = [500, 1000, 2500, 5000];

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [cheapestFee, setCheapestFee] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, d] = await Promise.all([
        apiRequest<Wallet>("/partner/wallet"),
        apiRequest<{ cheapestFee: number | null }>("/partner/dashboard"),
      ]);
      setWallet(w);
      setCheapestFee(d.cheapestFee);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your wallet");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setFormError(null);
    setSending(true);
    try {
      await apiRequest("/partner/wallet/topup-request", {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), utr: utr.trim() }),
      });
      setSent(
        `Request for ${inr(Number(amount))} sent. It will be credited once the payment is verified.`
      );
      setAmount("");
      setUtr("");
      setOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not send the request");
    } finally {
      setSending(false);
    }
  };

  if (error && !wallet) return <ErrorNote>{error}</ErrorNote>;
  if (!wallet) return <Spinner label="Loading your wallet…" />;

  // Same threshold as the dashboard, from the same place: the partner's card.
  const low = cheapestFee != null && wallet.balance < cheapestFee;
  const pending = wallet.topupRequests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-ink">Wallet</h1>

      {sent ? (
        <div className="rounded-xl border border-ok/25 bg-ok-soft px-3 py-2.5 text-sm font-medium text-ok">
          {sent}
        </div>
      ) : null}

      <Card className={low ? "border-warn/40 bg-warn-soft/40" : ""}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Available balance
        </p>
        <p className="tnum mt-1 text-4xl font-black text-ink">{inr(wallet.balance)}</p>
        {low ? (
          <p className="mt-1 text-sm font-medium text-warn">
            Below {inr(cheapestFee)}, the cheapest delivery in your city. Top up
            to keep placing orders.
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface px-3 py-2">
            <p className="text-xs text-muted">Added this month</p>
            <p className="tnum text-sm font-bold text-ok">
              + {inr(wallet.creditedThisMonth)}
            </p>
          </div>
          <div className="rounded-xl bg-surface px-3 py-2">
            <p className="text-xs text-muted">Spent this month</p>
            <p className="tnum text-sm font-bold text-ink">
              − {inr(wallet.debitedThisMonth)}
            </p>
          </div>
        </div>

        <Button onClick={() => setOpen((v) => !v)} className="mt-4 w-full">
          {open ? "Close" : "Add money"}
        </Button>
      </Card>

      {open ? (
        <Card>
          <SectionTitle>Add money</SectionTitle>
          <ol className="mb-4 space-y-1.5 text-sm text-muted">
            <li>
              <span className="font-semibold text-ink">1.</span> Pay the amount by
              UPI or bank transfer to the account your manager shared.
            </li>
            <li>
              <span className="font-semibold text-ink">2.</span> Enter the amount
              and the UPI reference (UTR) from your payment app below.
            </li>
            <li>
              <span className="font-semibold text-ink">3.</span> We verify the
              payment and credit your wallet.
            </li>
          </ol>

          <form onSubmit={submit} className="space-y-3">
            {formError ? <ErrorNote>{formError}</ErrorNote> : null}

            <div className="flex flex-wrap gap-2">
              {QUICK.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                    amount === String(a)
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line bg-white text-muted hover:bg-surface"
                  }`}
                >
                  {inr(a)}
                </button>
              ))}
            </div>

            <Field label="Amount you paid">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                placeholder="1000"
                className={inputCls}
                required
              />
            </Field>

            <Field
              label="UPI reference / UTR"
              hint="The 12-digit reference your payment app shows after a successful transfer."
            >
              <input
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. 428714905532"
                className={inputCls}
                required
              />
            </Field>

            <Button type="submit" disabled={sending} className="w-full">
              {sending ? "Sending…" : "Submit for verification"}
            </Button>
          </form>
        </Card>
      ) : null}

      {pending.length > 0 ? (
        <Card>
          <SectionTitle>Awaiting verification</SectionTitle>
          <ul className="space-y-2">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-warn-soft px-3 py-2"
              >
                <div>
                  <p className="tnum text-sm font-bold text-warn">{inr(r.amount)}</p>
                  <p className="text-xs text-warn/80">
                    UTR {r.utr} · {istDate(r.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-warn">Pending</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section>
        <SectionTitle>Passbook</SectionTitle>
        {wallet.transactions.length === 0 ? (
          <Empty
            title="Nothing yet"
            hint="Every order fee, refund and top-up will be listed here."
          />
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {wallet.transactions.map((t) => {
                const credit = t.amount > 0;
                const row = (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {LABEL[t.type] ?? t.type}
                      </p>
                      <p className="truncate text-xs text-muted">{t.reason || "—"}</p>
                      <p className="text-xs text-faint">{istDate(t.createdAt)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`tnum text-sm font-bold ${credit ? "text-ok" : "text-ink"}`}
                      >
                        {credit ? "+" : "−"} {inr(Math.abs(t.amount))}
                      </p>
                      <p className="tnum text-xs text-faint">
                        bal {inr(t.balanceAfter)}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={t.id}>
                    {t.orderId ? (
                      <Link
                        href={`/portal/orders/${t.orderId}`}
                        className="block transition hover:bg-surface"
                      >
                        {row}
                      </Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

const LABEL: Record<string, string> = {
  debit: "Order fee",
  refund: "Refund",
  topup: "Money added",
  adjustment: "Adjustment",
};
