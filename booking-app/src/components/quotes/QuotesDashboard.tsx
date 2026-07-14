'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuoteCompat } from '@/hooks/compat/useQuoteCompat';
import { useAuth } from '@/components/auth/AuthProvider';
import { TravelQuote } from '@/types';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

const gradients = [
  'from-blue-500 to-indigo-600',
  'from-teal-500 to-emerald-600',
  'from-orange-400 to-rose-500',
  'from-purple-500 to-fuchsia-600',
];

function nights(q: TravelQuote) {
  const s = new Date(q.travelDates.start).getTime();
  const e = new Date(q.travelDates.end).getTime();
  const n = Math.round((e - s) / 86400000);
  return n > 0 ? `${n} night${n === 1 ? '' : 's'}` : 'dates pending';
}

function dateRange(q: TravelQuote) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = new Date(q.travelDates.start);
  const e = new Date(q.travelDates.end);
  if (isNaN(s.getTime())) return 'dates pending';
  return `${s.toLocaleDateString('en-US', opts)}–${e.toLocaleDateString('en-US', opts)}`;
}

export function shortId(q: TravelQuote) {
  return '#' + q.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
}

const statusPill: Record<TravelQuote['status'], { label: string; cls: string }> = {
  draft: { label: 'DRAFT', cls: 'text-gray-500 bg-gray-100' },
  sent: { label: 'SENT', cls: 'text-blue-600 bg-blue-50' },
  accepted: { label: 'ACCEPTED', cls: 'text-green-600 bg-green-50' },
  rejected: { label: 'REJECTED', cls: 'text-red-600 bg-red-50' },
  booked: { label: 'BOOKED', cls: 'text-emerald-700 bg-emerald-100' },
  cancelled: { label: 'CANCELLED', cls: 'text-gray-500 bg-gray-100' },
};

const statusLine: Record<TravelQuote['status'], { text: string; cls: string }> = {
  draft: { text: 'Draft — continue with the agent →', cls: 'text-blue-600' },
  sent: { text: 'Sent — awaiting client', cls: 'text-gray-500' },
  accepted: { text: '✓ Accepted — docs sent', cls: 'text-green-600' },
  rejected: { text: 'Rejected', cls: 'text-red-600' },
  booked: { text: '✓ Booked — confirmed with suppliers', cls: 'text-emerald-700' },
  cancelled: { text: 'Cancelled', cls: 'text-gray-500' },
};

export function QuotesDashboard() {
  const router = useRouter();
  const { quotes } = useQuoteCompat();
  const { profile: user } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.full_name || 'there').split(' ')[0];

  const now = Date.now();
  const weekOut = now + 7 * 86400000;
  const departing = quotes.filter((q) => {
    const s = new Date(q.travelDates.start).getTime();
    return q.status === 'accepted' && s >= now && s <= weekOut;
  }).length;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const bookedThisMonth = quotes
    .filter((q) => q.status === 'accepted' && new Date(q.createdAt as unknown as string) >= monthStart)
    .reduce((a, q) => a + q.totalCost, 0);

  const inMotion = [...quotes]
    .filter((q) => q.status !== 'rejected')
    .sort((a, b) => new Date(a.travelDates.start).getTime() - new Date(b.travelDates.start).getTime())
    .slice(0, 3);

  const ledger = [...quotes]
    .sort(
      (a, b) =>
        new Date(b.createdAt as unknown as string).getTime() -
        new Date(a.createdAt as unknown as string).getTime()
    )
    .slice(0, 8);

  if (!hydrated) return null;

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-bold tracking-tight text-gray-900">
            {greeting}, {firstName}
          </div>
          <div className="mt-0.5 text-[13px] text-gray-500">
            {departing} trip{departing === 1 ? '' : 's'} departing this week ·{' '}
            {fmt(bookedThisMonth)} booked this month
          </div>
        </div>
        <Link
          href="/assistant"
          className="flex w-[360px] max-w-full cursor-pointer items-center gap-2 rounded-[14px] bg-gray-900 py-1.5 pl-[18px] pr-1.5 shadow-[0_8px_24px_rgba(17,24,39,.2)] transition-shadow hover:shadow-[0_12px_28px_rgba(17,24,39,.3)]"
        >
          <span className="flex-1 text-[13px] text-gray-400">
            Ask the agent — &ldquo;plan Maui for the Smiths&rdquo;
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-blue-600 font-bold text-white">
            ✦
          </span>
        </Link>
      </div>

      {/* Trips in motion */}
      <div className="mb-2.5 mt-6 text-xs font-bold tracking-[.08em] text-gray-500">
        TRIPS IN MOTION
      </div>
      {inMotion.length === 0 ? (
        <div className="rounded-[14px] border-2 border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
          No trips yet —{' '}
          <Link href="/assistant" className="font-semibold text-blue-600 hover:underline">
            start one with the agent ✦
          </Link>
        </div>
      ) : (
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {inMotion.map((q, i) => (
            <div
              key={q.id}
              onClick={() => router.push(`/quotes/${q.id}`)}
              className="cursor-pointer overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-[0_6px_16px_rgba(0,0,0,.1)]"
            >
              <div
                className={`relative flex h-[110px] items-center justify-center bg-gradient-to-br ${gradients[i % gradients.length]}`}
              >
                <span className="text-4xl font-bold text-white/30" aria-hidden>
                  {q.title?.charAt(0)?.toUpperCase() || '✈'}
                </span>
                <span
                  className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-[3px] text-[11px] font-bold ${
                    q.status === 'draft'
                      ? 'bg-gray-900/85 text-purple-300'
                      : q.status === 'accepted'
                        ? 'bg-gray-900/80 text-white'
                        : 'bg-white/90 text-gray-700'
                  }`}
                >
                  {q.status === 'draft' ? '✦ DRAFT' : q.status === 'accepted' ? 'CONFIRMED' : 'AWAITING CLIENT'}
                </span>
              </div>
              <div className="px-4 pb-3.5 pt-3">
                <div className="font-semibold text-gray-900">
                  {q.title} · {q.customerName}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {nights(q)} · {dateRange(q)} · {fmt(q.totalCost)}
                </div>
                <div className={`mt-1.5 text-xs font-semibold ${statusLine[q.status].cls}`}>
                  {statusLine[q.status].text}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quote ledger */}
      <div className="mb-2.5 mt-5 text-xs font-bold tracking-[.08em] text-gray-500">
        QUOTE LEDGER
      </div>
      <div className="overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-sm">
        {ledger.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-400">
            No quotes yet — they&apos;ll appear here as you build trips.
          </div>
        )}
        {ledger.map((q, i) => (
          <div
            key={q.id}
            onClick={() => router.push(`/quotes/${q.id}`)}
            className={`grid cursor-pointer grid-cols-[80px_1.3fr_1.6fr_100px_120px] items-center gap-x-4 px-5 py-3 hover:bg-gray-50 ${
              i < ledger.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="font-semibold text-gray-900">{shortId(q)}</div>
            <div className="truncate text-gray-900">{q.customerName}</div>
            <div className="truncate text-[13px] text-gray-500">
              {q.title} · {nights(q)} · {dateRange(q)}
            </div>
            <div className="font-semibold text-gray-900">{fmt(q.totalCost)}</div>
            <div>
              <span
                className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold ${statusPill[q.status].cls}`}
              >
                {statusPill[q.status].label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
