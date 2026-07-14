'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuoteCompat } from '@/hooks/compat/useQuoteCompat';
import { useContactCompat } from '@/hooks/compat/useContactCompat';
import { useSettingsStore } from '@/store/settings-store';
import { TravelItem, TravelQuote } from '@/types';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

const shortId = (id: string) => '#' + id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();

const TYPE_META: Record<string, { icon: string; bg: string; fg: string; label: string }> = {
  flight: { icon: '✈', bg: 'bg-blue-50', fg: 'text-blue-600', label: 'Flights' },
  hotel: { icon: '🏨', bg: 'bg-gray-100', fg: 'text-gray-700', label: 'Stay' },
  activity: { icon: '🌴', bg: 'bg-green-50', fg: 'text-green-600', label: 'Activities' },
  transfer: { icon: '🚐', bg: 'bg-amber-50', fg: 'text-amber-600', label: 'Transfers' },
};

const STATUS_PILL: Record<TravelQuote['status'], { label: string; cls: string }> = {
  draft: { label: 'NEW · DRAFT', cls: 'text-blue-600 bg-blue-50' },
  sent: { label: 'SENT', cls: 'text-green-600 bg-green-50' },
  accepted: { label: 'ACCEPTED', cls: 'text-green-700 bg-green-100' },
  rejected: { label: 'REJECTED', cls: 'text-red-600 bg-red-50' },
  booked: { label: 'BOOKED', cls: 'text-emerald-700 bg-emerald-100' },
  cancelled: { label: 'CANCELLED', cls: 'text-gray-600 bg-gray-100' },
};

function itemDates(it: TravelItem) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = new Date(it.startDate);
  if (isNaN(s.getTime())) return '';
  const e = it.endDate ? new Date(it.endDate) : null;
  return e && !isNaN(e.getTime()) && e.getTime() !== s.getTime()
    ? `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`
    : s.toLocaleDateString('en-US', opts);
}

function QuoteDetail({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const { getQuoteById, sendQuoteToClient } = useQuoteCompat();
  const quote = getQuoteById(quoteId);
  const { getContactById } = useContactCompat();
  const contact = quote ? getContactById(quote.contactId) : undefined;
  const defaultCommissionRate = useSettingsStore((s) => s.settings.defaultCommissionRate);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  if (!quote) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="rounded-[14px] border-2 border-dashed border-gray-200 bg-white px-12 py-11 text-center text-gray-500">
          <div className="font-semibold text-gray-700">Quote not found</div>
          <div className="mt-1 max-w-[280px] text-[13px]">
            Build a trip with the agent, then open its quote from the dashboard.
          </div>
          <button
            onClick={() => router.push('/assistant')}
            className="mt-4 h-10 cursor-pointer rounded-xl bg-gray-900 px-[18px] text-[13px] font-semibold text-white"
          >
            ✦ Open Trip Builder
          </button>
        </div>
      </div>
    );
  }

  const total = quote.totalCost;
  const rate = quote.commissionRate ?? defaultCommissionRate;
  const margin = Math.round(total * (rate / 100));
  const pill = STATUS_PILL[quote.status];
  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const dates = `${new Date(quote.travelDates.start).toLocaleDateString('en-US', dateOpts)}–${new Date(
    quote.travelDates.end
  ).toLocaleDateString('en-US', dateOpts)}`;

  const groups = (['flight', 'hotel', 'activity', 'transfer'] as const)
    .map((type) => ({ type, items: quote.items.filter((i) => i.type === type) }))
    .filter((g) => g.items.length > 0);

  const email = contact?.email || 'client email on file';
  const sent = quote.status === 'sent' || quote.status === 'accepted' || justSent;

  const handleSend = async () => {
    if (sending || sent) return;
    setSending(true);
    const ok = await sendQuoteToClient(quote.id);
    if (ok) setJustSent(true);
    setSending(false);
  };

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="text-2xl font-bold tracking-tight text-gray-900">
          Quote {shortId(quote.id)}
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${pill.cls}`}>{pill.label}</span>
        <span className="text-xs text-gray-500">
          {quote.customerName} · {quote.title} · {dates} ·{' '}
          <span className="font-semibold text-purple-600">✦ built with AI</span>
        </span>
      </div>

      <div className="mt-[18px] grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: lines + totals */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-sm">
            {groups.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-400">No items on this quote yet.</div>
            )}
            {groups.map((g) =>
              g.items.map((it, i) => {
                const meta = TYPE_META[g.type];
                return (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 border-b border-gray-100 px-[18px] py-3.5 last:border-b-0"
                  >
                    <div
                      className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] ${meta.bg} ${meta.fg}`}
                    >
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1 leading-snug">
                      <div className="truncate text-[13px] font-semibold text-gray-900">
                        {meta.label} — {it.name}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {itemDates(it)}
                        {it.quantity > 1 ? ` · ×${it.quantity}` : ''}
                        {it.supplier ? ` · ${it.supplier}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 font-bold text-gray-900">{fmt(it.price * it.quantity)}</div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-[14px] border border-gray-200 bg-white px-[18px] py-3.5 shadow-sm">
            <div className="flex justify-between text-[13px] text-gray-500">
              <span>Net cost</span>
              <span>{fmt(total - margin)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-gray-500">
              <span>Your margin · {rate}%</span>
              <span className="font-semibold text-green-600">+{fmt(margin)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2.5 text-base font-bold text-gray-900">
              <span>Client total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Right: preview + send */}
        <div className="flex min-w-0 flex-col gap-3">
          <Link
            href={`/client/${quote.id}`}
            className="overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-[104px] items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
              <span className="text-4xl font-bold text-white/30">{quote.title.charAt(0).toUpperCase()}</span>
            </div>
            <div className="px-4 pb-3.5 pt-3">
              <div className="text-xs font-bold tracking-[.06em] text-gray-500">CLIENT PREVIEW</div>
              <div className="mt-1.5 text-sm font-semibold text-gray-900">{quote.title}</div>
              <div className="mt-0.5 text-xs text-gray-500">
                Day-by-day itinerary · one tap to accept
              </div>
            </div>
          </Link>

          <div className="rounded-[14px] bg-gray-900 px-[18px] py-4 text-white">
            <div className="text-xs font-bold tracking-[.06em] text-gray-400">SEND</div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-gray-300">To {email}</div>
            {!sent ? (
              <button
                onClick={handleSend}
                disabled={sending}
                className="mt-3 h-10 w-full cursor-pointer rounded-[10px] bg-blue-600 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send quote to client'}
              </button>
            ) : (
              <div className="mt-3 flex h-10 items-center justify-center gap-2 rounded-[10px] border border-green-400/40 bg-green-600/20 text-[13px] font-semibold text-green-400">
                ✓ Sent{justSent ? ' just now' : ''}
              </div>
            )}
            <Link
              href={`/client/${quote.id}`}
              className="mt-2 flex h-10 w-full items-center justify-center rounded-[10px] border border-gray-700 text-[13px] font-semibold text-gray-200 transition-colors hover:bg-gray-800"
            >
              Open client view
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuoteDetailPage() {
  const params = useParams<{ quoteId: string }>();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <ProtectedRoute>
      <MainLayout>{hydrated && <QuoteDetail quoteId={params.quoteId} />}</MainLayout>
    </ProtectedRoute>
  );
}
