'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { ItineraryChat } from '@/components/chat/ItineraryChat';
import { useQuoteCompat } from '@/hooks/compat/useQuoteCompat';
import { TravelItem } from '@/types';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

const DAY_GRADIENTS = [
  'from-sky-500 to-indigo-600',
  'from-teal-500 to-emerald-600',
  'from-orange-400 to-rose-500',
  'from-purple-500 to-fuchsia-600',
  'from-cyan-500 to-blue-600',
  'from-amber-400 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-lime-500 to-green-600',
];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function itemTime(item: TravelItem) {
  const d = new Date(item.startDate);
  if (isNaN(d.getTime()) || (d.getHours() === 0 && d.getMinutes() === 0)) return '—';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
}

const TYPE_LABEL: Record<string, string> = {
  flight: 'Flight ✈',
  hotel: 'Stay 🏨',
  activity: 'Activity 🌴',
  transfer: 'Transfer 🚐',
};

function DayItinerary() {
  const router = useRouter();
  const { currentQuote: quote } = useQuoteCompat();
  const [selectedDay, setSelectedDay] = useState(0);

  const days = useMemo(() => {
    if (!quote?.travelDates) return [];
    const items = quote.items ?? [];
    const start = new Date(quote.travelDates.start);
    const end = new Date(quote.travelDates.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    const out: { date: Date; items: TravelItem[] }[] = [];
    // ponytail: cap at 14 days — longer trips scroll horizontally anyway
    for (let d = new Date(start); d <= end && out.length < 14; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      out.push({
        date,
        items: items
          .filter((it) => sameDay(new Date(it.startDate), date))
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
      });
    }
    return out;
  }, [quote]);

  useEffect(() => {
    if (selectedDay >= days.length) setSelectedDay(0);
  }, [days.length, selectedDay]);

  if (!quote || !quote.travelDates) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="rounded-[14px] border-2 border-dashed border-gray-200 bg-white px-12 py-11 text-center text-gray-500">
          <div className="font-semibold text-gray-700">New trip</div>
          <div className="mt-1 max-w-[280px] text-[13px]">
            Start with the agent — tell it who&rsquo;s traveling and where, and the itinerary
            builds here day by day.
          </div>
        </div>
      </div>
    );
  }

  const items = quote.items ?? [];
  const sel = days[selectedDay] ?? days[0];
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const daySubtotal = sel ? sel.items.reduce((s, i) => s + i.price * i.quantity, 0) : 0;
  const dateOpts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  const startStr = new Date(quote.travelDates.start).toLocaleDateString('en-US', dateOpts);
  const endStr = new Date(quote.travelDates.end).toLocaleDateString('en-US', dateOpts);

  return (
    <div className="flex min-w-[340px] flex-1 flex-col overflow-y-auto bg-gray-50">
      {/* Trip header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-7 pt-5">
        <div>
          <div className="text-[11px] font-semibold tracking-[.12em] text-gray-500">
            {(quote.customerName ?? '').toUpperCase()} · {(quote.title ?? '').toUpperCase()}
          </div>
          <div className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">
            {startStr} – {endStr}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-xl font-bold text-gray-900">{fmt(total)}</div>
          </div>
          <button
            onClick={() => router.push(`/quotes/${quote.id}`)}
            className="h-[42px] cursor-pointer rounded-xl bg-gray-900 px-[18px] text-[13px] font-semibold text-white transition-colors hover:bg-gray-800"
          >
            Open quote →
          </button>
        </div>
      </div>

      {/* Week strip */}
      {days.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-7 pt-4">
          {days.map((d, i) => {
            const selected = i === selectedDay;
            const filled = d.items.length > 0;
            const summary = filled ? d.items[0].name : 'Open';
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className={`min-w-[86px] flex-1 cursor-pointer rounded-xl px-3 py-2.5 text-left ${
                  selected
                    ? 'border border-gray-900 bg-gray-900 shadow-[0_6px_16px_rgba(17,24,39,.25)]'
                    : filled
                      ? 'border border-gray-200 bg-white'
                      : 'border border-dashed border-gray-300 bg-white'
                }`}
              >
                <div className={`whitespace-nowrap text-[11px] font-semibold ${selected ? 'text-gray-400' : 'text-gray-500'}`}>
                  {d.date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}{' '}
                  {d.date.getDate()}
                </div>
                <div
                  className={`mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs ${
                    selected ? 'font-semibold text-white' : filled ? 'font-semibold text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {summary}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Day focus */}
      {sel && (
        <div className="flex min-h-[260px] flex-1 flex-col gap-4 px-7 pb-5 pt-4 lg:flex-row">
          {/* Day hero */}
          <div
            className={`relative min-h-[240px] flex-[1.1] overflow-hidden rounded-2xl bg-gradient-to-br ${DAY_GRADIENTS[selectedDay % DAY_GRADIENTS.length]}`}
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-b from-transparent via-gray-900/60 to-gray-900/20" />
            <div className="pointer-events-none absolute bottom-4 left-5 text-white [text-shadow:0_2px_10px_rgba(0,0,0,.4)]">
              <div className="text-[11px] font-bold tracking-[.1em] opacity-90">
                DAY {selectedDay + 1} ·{' '}
                {sel.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
              </div>
              <div className="text-2xl font-bold tracking-tight">
                {sel.items[0]?.name ?? 'Open day'}
              </div>
            </div>
          </div>

          {/* Day items */}
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            {sel.items.map((it) => (
              <div
                key={it.id}
                className="flex items-start gap-3 rounded-[14px] border border-gray-200 bg-white px-4 py-3"
              >
                <div className="w-12 shrink-0 pt-0.5 text-xs font-bold text-gray-500">
                  {itemTime(it)}
                </div>
                <div className="min-w-0 flex-1 leading-snug">
                  <div className="truncate text-[13px] font-semibold text-gray-900">{it.name}</div>
                  <div className="truncate text-xs text-gray-500">
                    {TYPE_LABEL[it.type] ?? it.type}
                    {it.quantity > 1 ? ` · ×${it.quantity}` : ''}
                  </div>
                </div>
                <div className="shrink-0 text-[13px] font-bold text-gray-900">
                  {it.price > 0 ? fmt(it.price * it.quantity) : 'incl.'}
                </div>
              </div>
            ))}
            {sel.items.length === 0 && (
              <div className="rounded-[14px] border-2 border-dashed border-gray-300 px-4 py-6 text-center text-[13px] text-gray-400">
                Open day — ask the agent for ideas
              </div>
            )}
            <div className="flex items-center gap-3 rounded-[14px] border-2 border-dashed border-gray-300 px-4 py-3 text-gray-500">
              <div className="flex-1 text-[13px]">✦ Ask the agent to fill or reshuffle this day</div>
            </div>
            <div className="mt-auto flex items-center justify-between rounded-[14px] border border-gray-200 bg-white px-4 py-3">
              <div className="text-xs text-gray-500">Day {selectedDay + 1} subtotal</div>
              <div className="font-bold text-gray-900">{daySubtotal ? fmt(daySubtotal) : '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssistantPage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <ProtectedRoute>
      <MainLayout>
        {hydrated && (
          <div className="flex h-screen min-h-0">
            <div className="flex min-w-[320px] flex-[0_1_400px] flex-col">
              <ItineraryChat />
            </div>
            <DayItinerary />
          </div>
        )}
      </MainLayout>
    </ProtectedRoute>
  );
}
