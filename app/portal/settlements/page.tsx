"use client";

/**
 * COD — cash the captains collected for this partner, and what has been paid
 * back.
 *
 * Only delivered orders appear as outstanding. An order still being carried has
 * collected nothing, and showing it as money owed would mean the figure never
 * came down.
 *
 * Settling is an operator action, so there is nothing to press here. This screen
 * is the partner's side of the ledger: what is owed, which orders make it up,
 * and the record of each payment.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, inr, istDate, istDay } from "@/lib/api";
import { Card, Empty, ErrorNote, SectionTitle, Spinner } from "@/components/ui";

type Outstanding = {
  id: string;
  trackingNumber: string;
  codAmount: number;
  dropName?: string | null;
  deliveredAt: string | null;
};

type Settlement = {
  id: string;
  amount: number;
  orderCount: number;
  method: string;
  reference?: string | null;
  note?: string | null;
  settledAt: string | null;
};

type Ledger = {
  outstanding: Outstanding[];
  outstandingTotal: number;
  settlements: Settlement[];
  settledTotal: number;
};

const METHOD: Record<string, string> = {
  bank: "Bank transfer",
  upi: "UPI",
  cash: "Cash",
  wallet: "Added to wallet",
};

export default function SettlementsPage() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<Ledger>("/partner/cod")
      .then(setLedger)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load your COD ledger")
      );
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!ledger) return <Spinner label="Loading your COD ledger…" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Cash collected for you</h1>
        <p className="text-sm text-muted">
          Money your captains collected from customers, and what we have paid
          back.
        </p>
      </div>

      <Card className={ledger.outstandingTotal > 0 ? "border-warn/40 bg-warn-soft/40" : ""}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Owed to you
        </p>
        <p
          className={`tnum mt-1 text-4xl font-black ${
            ledger.outstandingTotal > 0 ? "text-warn" : "text-ink"
          }`}
        >
          {inr(ledger.outstandingTotal)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {ledger.outstanding.length === 0
            ? "Nothing outstanding."
            : `From ${ledger.outstanding.length} delivered order${
                ledger.outstanding.length === 1 ? "" : "s"
              }. Paid back on your agreed cycle.`}
        </p>
      </Card>

      <section>
        <SectionTitle>Orders making up that total</SectionTitle>
        {ledger.outstanding.length === 0 ? (
          <Empty
            title="All settled"
            hint="Cash collected on your delivered orders has been paid back in full."
          />
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {ledger.outstanding.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/portal/orders/${o.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {o.trackingNumber}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {o.dropName || "—"}
                      </p>
                      <p className="text-xs text-faint">
                        Delivered {istDate(o.deliveredAt)}
                      </p>
                    </div>
                    <p className="tnum shrink-0 text-sm font-bold text-warn">
                      {inr(o.codAmount)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <SectionTitle
          action={
            ledger.settlements.length > 0 ? (
              <span className="tnum text-xs font-semibold text-muted">
                {inr(ledger.settledTotal)} paid back
              </span>
            ) : null
          }
        >
          Payments to you
        </SectionTitle>
        {ledger.settlements.length === 0 ? (
          <Empty
            title="No payments yet"
            hint="Each time we pay back collected cash, it will be recorded here with its reference."
          />
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {ledger.settlements.map((s) => (
                <li key={s.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">
                        {METHOD[s.method] ?? s.method}
                      </p>
                      <p className="text-xs text-muted">
                        {s.orderCount} order{s.orderCount === 1 ? "" : "s"}
                        {s.reference ? ` · ref ${s.reference}` : ""}
                      </p>
                      <p className="text-xs text-faint">{istDay(s.settledAt)}</p>
                      {s.note ? (
                        <p className="mt-0.5 text-xs text-muted">{s.note}</p>
                      ) : null}
                    </div>
                    <p className="tnum shrink-0 text-sm font-bold text-ok">
                      + {inr(s.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
