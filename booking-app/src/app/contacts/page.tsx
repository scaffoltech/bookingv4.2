'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useContactCompat } from '@/hooks/compat/useContactCompat';
import { useQuoteCompat } from '@/hooks/compat/useQuoteCompat';
import { Contact, TravelQuote } from '@/types';
import { Search } from 'lucide-react';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

const AVATARS = [
  'bg-indigo-100 text-indigo-700',
  'bg-pink-100 text-pink-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-purple-100 text-purple-700',
];

const THUMBS = [
  'from-blue-500 to-indigo-600',
  'from-teal-500 to-emerald-600',
  'from-orange-400 to-rose-500',
  'from-purple-500 to-fuchsia-600',
];

const initials = (c: Contact) =>
  `${c.firstName?.[0] ?? c.name?.[0] ?? '?'}${c.lastName?.[0] ?? ''}`.toUpperCase();

const avatarCls = (c: Contact) =>
  AVATARS[(c.id.charCodeAt(0) + c.id.charCodeAt(c.id.length - 1)) % AVATARS.length];

function quoteDates(q: TravelQuote) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = new Date(q.travelDates.start);
  const e = new Date(q.travelDates.end);
  if (isNaN(s.getTime())) return 'dates pending';
  return `${s.toLocaleDateString('en-US', opts)}–${e.toLocaleDateString('en-US', opts)}`;
}

function prefChips(c: Contact): string[] {
  const p = c.preferences;
  if (!p) return [];
  const chips: string[] = [];
  (p.preferredAirlines ?? []).forEach((a) => chips.push(`✈ ${a}`));
  if (p.seatPreference) chips.push(`💺 ${p.seatPreference} seat`);
  (p.hotelPreference ?? []).forEach((h) => chips.push(`🏨 ${h}`));
  if (p.budgetRange) chips.push(`Budget ${fmt(p.budgetRange.min)}–${fmt(p.budgetRange.max)}`);
  return chips;
}

function ContactsView() {
  const router = useRouter();
  const { contacts } = useContactCompat();
  const { quotes, setCurrentQuote } = useQuoteCompat();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter(
      (c) => !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    );
  }, [contacts, query]);

  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  const contactQuotes = useMemo(
    () =>
      selected
        ? quotes
            .filter((q) => q.contactId === selected.id || q.customerId === selected.id)
            .sort(
              (a, b) =>
                new Date(b.createdAt as unknown as string).getTime() -
                new Date(a.createdAt as unknown as string).getTime()
            )
        : [],
    [quotes, selected]
  );

  const currentTrip = contactQuotes.find((q) => q.status === 'draft' || q.status === 'sent') ?? null;
  const history = contactQuotes.filter((q) => q !== currentTrip);
  const lifetime = contactQuotes
    .filter((q) => q.status === 'accepted')
    .reduce((a, q) => a + q.totalCost, 0);

  const continueTrip = () => {
    if (currentTrip) setCurrentQuote(currentTrip);
    router.push('/assistant');
  };

  const checklist = currentTrip
    ? [
        { label: 'Flights', done: currentTrip.items.some((i) => i.type === 'flight') },
        { label: 'Stay', done: currentTrip.items.some((i) => i.type === 'hotel') },
        {
          label: 'Activities',
          done: currentTrip.items.some((i) => i.type === 'activity' || i.type === 'transfer'),
        },
        { label: 'Send to client', done: currentTrip.status === 'sent' },
      ]
    : [];

  return (
    <div className="flex min-h-screen">
      {/* List pane */}
      <div className="flex w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="px-[18px] pb-3 pt-[18px]">
          <div className="text-lg font-bold tracking-tight text-gray-900">Contacts</div>
          <div className="mt-2.5 flex items-center gap-2 rounded-[10px] border border-gray-200 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients…"
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-[18px] py-6 text-[13px] text-gray-400">No contacts yet.</div>
          )}
          {filtered.map((c) => {
            const isSel = selected?.id === c.id;
            const latest = quotes.find((q) => q.contactId === c.id || q.customerId === c.id);
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-center gap-3 px-[18px] py-3 text-left hover:bg-gray-50 ${
                  isSel ? 'border-r-2 border-gray-900 bg-gray-100' : ''
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarCls(c)}`}
                >
                  {initials(c)}
                </div>
                <div className="min-w-0 flex-1 leading-snug">
                  <div className="text-[13px] font-semibold text-gray-900">{c.name}</div>
                  <div className="truncate text-xs text-gray-500">
                    {latest ? `${latest.title} · ${latest.status}` : c.email}
                  </div>
                </div>
                {latest?.status === 'draft' && (
                  <span className="shrink-0 rounded-full bg-gray-900 px-2 py-[3px] text-[10px] font-bold text-purple-300">
                    ✦ AI
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail pane */}
      {!selected ? (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
          Select a contact to see their profile.
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-white px-7 py-5">
            <div
              className={`flex h-[54px] w-[54px] items-center justify-center rounded-full text-[17px] font-bold ${avatarCls(selected)}`}
            >
              {initials(selected)}
            </div>
            <div className="min-w-[200px] flex-1 leading-snug">
              <div className="text-[21px] font-bold tracking-tight text-gray-900">{selected.name}</div>
              <div className="text-[13px] text-gray-500">
                {selected.email}
                {selected.phone ? ` · ${selected.phone}` : ''} · {contactQuotes.length} trip
                {contactQuotes.length === 1 ? '' : 's'}
                {lifetime > 0 ? ` · ${fmt(lifetime)} lifetime` : ''}
              </div>
            </div>
            <button
              onClick={continueTrip}
              className="h-10 cursor-pointer rounded-xl bg-gray-900 px-[18px] text-[13px] font-semibold text-white transition-colors hover:bg-gray-800"
            >
              ✦ {currentTrip ? 'Continue trip' : 'Start a trip'}
            </button>
          </div>

          {/* Body grid */}
          <div className="grid flex-1 content-start gap-3.5 px-7 py-[18px] lg:grid-cols-[1.5fr_1fr]">
            <div className="flex min-w-0 flex-col gap-3.5">
              {/* Preferences */}
              <div className="rounded-[14px] border border-gray-200 bg-white px-[18px] py-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold tracking-[.06em] text-gray-500">
                  PREFERENCES
                  <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold tracking-normal text-purple-300">
                    ✦ agent reads these
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {prefChips(selected).map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-gray-200 bg-white px-[13px] py-1.5 text-xs font-semibold text-gray-700"
                    >
                      {p}
                    </span>
                  ))}
                  {prefChips(selected).length === 0 && (
                    <span className="rounded-full border border-dashed border-gray-300 bg-gray-50 px-[13px] py-1.5 text-xs font-semibold text-gray-400">
                      No preferences on file yet
                    </span>
                  )}
                </div>
              </div>

              {/* Trip history */}
              <div className="rounded-[14px] border border-gray-200 bg-white px-[18px] pb-1 pt-4 shadow-sm">
                <div className="text-xs font-bold tracking-[.06em] text-gray-500">TRIP HISTORY</div>
                {history.length === 0 && (
                  <div className="py-4 text-[13px] text-gray-400">No past trips yet.</div>
                )}
                {history.map((q, i) => (
                  <div
                    key={q.id}
                    onClick={() => router.push(`/quotes/${q.id}`)}
                    className={`flex cursor-pointer items-center gap-3.5 py-3 hover:bg-gray-50 ${
                      i < history.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div
                      className={`flex h-[60px] w-24 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br ${THUMBS[i % THUMBS.length]}`}
                    >
                      <span className="text-xl font-bold text-white/40">
                        {q.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 leading-normal">
                      <div className="text-[13px] font-semibold text-gray-900">{q.title}</div>
                      <div className="text-xs text-gray-500">
                        {quoteDates(q)} · {q.status}
                      </div>
                    </div>
                    <div className="text-[13px] font-bold text-gray-900">{fmt(q.totalCost)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current trip */}
            <div className="min-w-0">
              {currentTrip ? (
                <div className="overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-sm">
                  <div className="relative flex h-[120px] items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
                    <span className="text-4xl font-bold text-white/30">
                      {currentTrip.title.charAt(0).toUpperCase()}
                    </span>
                    {currentTrip.status === 'draft' && (
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-gray-900/85 px-2.5 py-[3px] text-[10px] font-bold text-purple-300">
                        ✦ AI DRAFT
                      </span>
                    )}
                  </div>
                  <div className="px-[18px] pb-4 pt-3.5">
                    <div className="text-xs font-bold tracking-[.06em] text-gray-500">CURRENT TRIP</div>
                    <div className="mt-1 text-[17px] font-bold tracking-tight text-gray-900">
                      {currentTrip.title} · {quoteDates(currentTrip)}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {currentTrip.status === 'sent'
                        ? `Quote ${fmt(currentTrip.totalCost)} · sent`
                        : currentTrip.totalCost > 0
                          ? `Quote ${fmt(currentTrip.totalCost)} · draft`
                          : 'Building with the agent'}
                    </div>
                    <div className="mt-3 flex flex-col gap-[7px] text-xs">
                      {checklist.map((t) => (
                        <div key={t.label} className="flex items-center gap-2">
                          <span className={`w-3 text-center ${t.done ? 'text-green-600' : 'text-gray-400'}`}>
                            {t.done ? '✓' : '○'}
                          </span>
                          <span className={t.done ? 'text-gray-700' : 'text-gray-400'}>{t.label}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={continueTrip}
                      className="mt-3.5 h-10 w-full cursor-pointer rounded-[10px] bg-blue-600 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      ✦ Continue in Trip Builder
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[14px] border-2 border-dashed border-gray-300 bg-white px-6 py-8 text-center text-[13px] text-gray-400">
                  No active trip —{' '}
                  <button onClick={continueTrip} className="font-semibold text-blue-600 hover:underline">
                    start one with the agent ✦
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContactsPage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <ProtectedRoute>
      <MainLayout>{hydrated && <ContactsView />}</MainLayout>
    </ProtectedRoute>
  );
}
