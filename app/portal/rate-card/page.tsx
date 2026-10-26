"use client";

/**
 * The rate card for the partner's city.
 *
 * Read-only on purpose, and it shows the real slabs rather than a "starting
 * from" figure — the partner should be able to work out the fee for a delivery
 * before placing it, and check the one they were charged afterwards.
 *
 * An absent card is reported as absent. There is no fallback to another city's
 * prices, here or in the backend.
 */

import { useEffect, useState } from "react";
import { apiRequest, getStoredPartner, inr } from "@/lib/api";
import { Card, ErrorNote, SectionTitle, Spinner } from "@/components/ui";

type RateCard = {
  city: string;
  slabs: { upToKm: number; fee: number }[];
  foodFlatFee?: number | null;
  foodUpToKm?: number | null;
};

export default function RateCardPage() {
  const partner = getStoredPartner();
  const [data, setData] = useState<{ city: string; card: RateCard | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ city: string; card: RateCard | null }>("/partner/rate-card")
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load your rate card")
      );
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Spinner label="Loading your rate card…" />;

  const city = data.city || partner?.city || "your city";
  const card = data.card;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Rate card</h1>
        <p className="text-sm text-muted">Your agreed delivery prices in {city}.</p>
      </div>

      {!card ? (
        <Card>
          <p className="text-sm font-semibold text-ink">
            No rate card is set for {city} yet.
          </p>
          <p className="mt-1 text-sm text-muted">
            Orders cannot be priced until one is in place. Please contact your
            account manager.
          </p>
        </Card>
      ) : (
        <>
          <Card padded={false}>
            <div className="border-b border-line px-4 py-3">
              <SectionTitle>By distance</SectionTitle>
              <p className="-mt-2 text-xs text-muted">
                The fee is the slab your measured distance falls into.
              </p>
            </div>
            <ul className="divide-y divide-line">
              {card.slabs.map((s, i) => {
                const lower = i === 0 ? 0 : card.slabs[i - 1].upToKm;
                return (
                  <li
                    key={s.upToKm}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="tnum text-sm text-ink">
                      {lower} – {s.upToKm} km
                    </span>
                    <span className="tnum text-base font-bold text-ink">
                      {inr(s.fee)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {card.foodFlatFee != null && card.foodUpToKm != null ? (
            <Card>
              <SectionTitle>Food orders</SectionTitle>
              <div className="flex items-center justify-between gap-3">
                <span className="tnum text-sm text-ink">
                  Up to {card.foodUpToKm} km
                </span>
                <span className="tnum text-base font-bold text-ink">
                  {inr(card.foodFlatFee)} flat
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">
                Beyond {card.foodUpToKm} km, food orders are priced on the distance
                slabs above.
              </p>
            </Card>
          ) : null}

          <Card>
            <SectionTitle>Good to know</SectionTitle>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                Distance is the driving distance from Google Maps, measured
                pickup to drop.
              </li>
              <li>
                A delivery beyond the last slab cannot be priced from this card —
                you will be told rather than charged a guess.
              </li>
              <li>
                The fee leaves your wallet when you confirm, and comes back in
                full if you cancel before pickup.
              </li>
              <li>
                Cash the captain collects for you is settled separately and is
                never part of this fee.
              </li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
