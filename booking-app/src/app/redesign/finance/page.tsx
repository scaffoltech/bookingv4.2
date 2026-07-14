'use client';

// Redesign preview: "Finance & Settings" from the Claude Design project,
// wired to Supabase. RLS scopes every query to the signed-in user's org.
// ponytail: permissions matrix is read-only (no permissions table exists);
// payout schedule is static (not stored); margin shows '—' until
// booking_items rows exist.

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = getSupabaseBrowserClient();

type Screen = 'finance' | 'settings';

const fmt = (n: number) =>
  '$' + Math.round(n).toLocaleString('en-US');

interface Booking {
  id: string; user_id: string; booking_reference: string | null;
  total_amount: number | null; payment_status: string | null;
  status: string | null; created_at: string; quote_id: string | null; contact_id: string | null;
}
interface Commission {
  id: string; user_id: string; booking_id: string | null;
  commission_amount: number | null; commission_rate: number | null;
  status: string | null; paid_at: string | null; created_at: string;
}
interface Membership {
  id: string; user_id: string | null; role: string; status: string;
  invited_email: string | null;
}
interface DbUser { id: string; full_name: string | null; email: string | null }
interface Settings {
  id: string; default_markup_percentage: number | null;
  email_notifications: boolean | null; payment_reminders: boolean | null;
  booking_notifications: boolean | null; stripe_connect_account_id: string | null;
}
interface BookingItem { booking_id: string; client_price: number | null; supplier_cost: number | null; agent_markup: number | null }

interface Data {
  userId: string;
  self: DbUser | null;
  orgName: string;
  myRole: string; // 'owner' | 'admin' | 'agent'
  memberships: Membership[];
  users: Record<string, DbUser>;
  bookings: Booking[];
  commissions: Commission[];
  settings: Settings | null;
  marginByBooking: Record<string, number>;
  quoteTitles: Record<string, string>;
  contactNames: Record<string, string>;
}

const PERM_DEFS = [
  { label: 'View own finances', sub: 'Commission ledger and payouts', agent: true },
  { label: 'View team finances', sub: 'All agents’ revenue and margins', agent: false },
  { label: 'Edit commission rates', sub: 'Markup and split percentages', agent: false },
  { label: 'Manage team & roles', sub: 'Invite, remove, change roles', agent: false },
  { label: 'Send quotes to clients', sub: 'Without admin approval', agent: true },
];

const NOTIF_DEFS = [
  { key: 'email_notifications', label: 'Email notifications' },
  { key: 'payment_reminders', label: 'Payment reminders' },
  { key: 'booking_notifications', label: 'Booking notifications' },
] as const;

const AV_COLORS = [
  ['bg-indigo-100', 'text-indigo-700'], ['bg-pink-100', 'text-pink-700'],
  ['bg-green-100', 'text-green-700'], ['bg-amber-100', 'text-amber-700'],
  ['bg-orange-100', 'text-orange-700'], ['bg-sky-100', 'text-sky-700'],
];
const avColor = (seed: string) => AV_COLORS[
  seed.split('').reduce((x, c) => x + c.charCodeAt(0), 0) % AV_COLORS.length
];
const initials = (name: string) =>
  name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

async function loadData(userId: string): Promise<Data> {
  const [self, org, memberships, users, bookings, commissions, settings, items, quotes, contacts] = await Promise.all([
    supabase.from('users').select('id,full_name,email').eq('id', userId).maybeSingle(),
    supabase.from('organizations').select('name').limit(1).maybeSingle(),
    supabase.from('org_memberships').select('id,user_id,role,status,invited_email'),
    supabase.from('users').select('id,full_name,email'),
    supabase.from('bookings').select('id,user_id,booking_reference,total_amount,payment_status,status,created_at,quote_id,contact_id'),
    supabase.from('commissions').select('id,user_id,booking_id,commission_amount,commission_rate,status,paid_at,created_at'),
    supabase.from('settings').select('id,default_markup_percentage,email_notifications,payment_reminders,booking_notifications,stripe_connect_account_id').eq('user_id', userId).maybeSingle(),
    supabase.from('booking_items').select('booking_id,client_price,supplier_cost,agent_markup'),
    supabase.from('quotes').select('id,title'),
    supabase.from('contacts').select('id,first_name,last_name'),
  ]);

  const userMap: Record<string, DbUser> = {};
  (users.data ?? []).forEach(u => { userMap[u.id] = u; });

  const marginByBooking: Record<string, number> = {};
  ((items.data ?? []) as BookingItem[]).forEach(i => {
    const m = i.client_price != null && i.supplier_cost != null
      ? i.client_price - i.supplier_cost
      : i.agent_markup ?? 0;
    marginByBooking[i.booking_id] = (marginByBooking[i.booking_id] ?? 0) + m;
  });

  const quoteTitles: Record<string, string> = {};
  (quotes.data ?? []).forEach(q => { if (q.title) quoteTitles[q.id] = q.title; });
  const contactNames: Record<string, string> = {};
  (contacts.data ?? []).forEach(c => { contactNames[c.id] = [c.first_name, c.last_name].filter(Boolean).join(' '); });

  const myMembership = (memberships.data ?? []).find(m => m.user_id === userId);

  return {
    userId,
    self: self.data,
    orgName: org.data?.name ?? 'Your agency',
    myRole: myMembership?.role ?? 'agent',
    memberships: (memberships.data ?? []) as Membership[],
    users: userMap,
    bookings: (bookings.data ?? []) as Booking[],
    commissions: (commissions.data ?? []) as Commission[],
    settings: settings.data as Settings | null,
    marginByBooking,
    quoteTitles,
    contactNames,
  };
}

function Toggle({ on, onClick, disabled }: { on: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`h-[21px] w-9 flex-shrink-0 rounded-full p-[2.5px] transition-colors ${on ? 'bg-blue-600' : 'bg-gray-300'} ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
    >
      <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[15px]' : ''}`} />
    </div>
  );
}

function KpiCards({ kpis }: { kpis: { label: string; value: string; sub: string; subClass: string }[] }) {
  return (
    <div className="mt-5 grid grid-cols-4 gap-3.5">
      {kpis.map(k => (
        <div key={k.label} className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="text-xs text-gray-500">{k.label}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">{k.value}</div>
          <div className={`mt-0.5 text-xs ${k.subClass}`}>{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message); else onDone();
  };
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <form onSubmit={submit} className="w-[340px] rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-bold tracking-tight">Sign in to view finances</div>
        <div className="mt-1 text-[13px] text-gray-500">This page reads live data from Supabase and needs your account session.</div>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="Email"
          className="mt-4 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-500" />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" required placeholder="Password"
          className="mt-2 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-500" />
        {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
        <button disabled={busy} type="submit"
          className="mt-4 h-10 w-full rounded-lg bg-gray-900 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default function FinanceSettingsRedesign() {
  const [screen, setScreen] = useState<Screen>('finance');
  const [drillAgent, setDrillAgent] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [authState, setAuthState] = useState<'checking' | 'anon' | 'ok'>('checking');

  const refresh = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAuthState('anon'); return; }
    setAuthState('ok');
    setData(await loadData(user.id));
  };
  useEffect(() => { refresh(); }, []);

  const isAdmin = data ? data.myRole !== 'agent' : false;

  // ---- derived finance data ----
  const derived = useMemo(() => {
    if (!data) return null;
    const commByBooking: Record<string, Commission> = {};
    data.commissions.forEach(c => { if (c.booking_id) commByBooking[c.booking_id] = c; });

    const forUser = (uid: string) => {
      const bookings = data.bookings.filter(b => b.user_id === uid);
      const comms = data.commissions.filter(c => c.user_id === uid);
      const revenue = bookings.reduce((x, b) => x + (b.total_amount ?? 0), 0);
      const commission = comms.reduce((x, c) => x + (c.commission_amount ?? 0), 0);
      const pending = comms.filter(c => c.status !== 'paid' && !c.paid_at).reduce((x, c) => x + (c.commission_amount ?? 0), 0);
      const rates = comms.map(c => c.commission_rate).filter((r): r is number => r != null);
      const avgRate = rates.length ? rates.reduce((x, r) => x + r, 0) / rates.length : null;
      return { bookings, comms, revenue, commission, pending, avgRate };
    };

    // last 6 months commission bars
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-US', { month: 'short' }) };
    });
    const barsFor = (comms: Commission[]) => months.map(m => ({
      label: m.label,
      total: comms.filter(c => {
        const d = new Date(c.created_at);
        return `${d.getFullYear()}-${d.getMonth()}` === m.key;
      }).reduce((x, c) => x + (c.commission_amount ?? 0), 0),
    }));

    const activeMembers = data.memberships.filter(m => m.status === 'active' && m.user_id);

    return { commByBooking, forUser, barsFor, activeMembers };
  }, [data]);

  // ---- mutations (optimistic) ----
  const setMemberRole = async (m: Membership, role: string) => {
    if (!data) return;
    setData({ ...data, memberships: data.memberships.map(x => x.id === m.id ? { ...x, role } : x) });
    const { error } = await supabase.from('org_memberships').update({ role }).eq('id', m.id);
    if (error) refresh();
  };

  const setNotif = async (key: typeof NOTIF_DEFS[number]['key'], on: boolean) => {
    if (!data?.settings) return;
    setData({ ...data, settings: { ...data.settings, [key]: on } });
    const { error } = await supabase.from('settings').update({ [key]: on }).eq('id', data.settings.id);
    if (error) refresh();
  };

  if (authState === 'anon') return <SignIn onDone={refresh} />;
  if (authState === 'checking' || !data || !derived) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">Loading finances…</div>;
  }

  const selfName = data.self?.full_name || data.self?.email || 'You';
  const nameOf = (uid: string | null) =>
    (uid && (data.users[uid]?.full_name || data.users[uid]?.email)) || 'Unknown';

  const finUserId = isAdmin ? drillAgent : data.userId;
  const showTeam = isAdmin && !drillAgent;
  const agg = finUserId ? derived.forUser(finUserId) : null;

  const teamAgg = derived.activeMembers.map(m => ({ m, uid: m.user_id!, ...derived.forUser(m.user_id!) }));
  const teamRevenue = teamAgg.reduce((x, a) => x + a.revenue, 0);
  const teamCommission = teamAgg.reduce((x, a) => x + a.commission, 0);
  const teamPending = teamAgg.reduce((x, a) => x + a.pending, 0);

  const markup = data.settings?.default_markup_percentage;

  const ledgerRows = (agg?.bookings ?? []).map(b => {
    const c = derived.commByBooking[b.id];
    const margin = data.marginByBooking[b.id];
    const trip = [b.quote_id && data.quoteTitles[b.quote_id], b.contact_id && data.contactNames[b.contact_id]]
      .filter(Boolean).join(' · ') || '—';
    const paid = c ? (c.status === 'paid' || !!c.paid_at) : b.payment_status === 'paid';
    return {
      id: b.id,
      ref: b.booking_reference || b.id.slice(0, 8).toUpperCase(),
      trip,
      total: b.total_amount ?? 0,
      margin,
      commission: c?.commission_amount ?? null,
      paid,
    };
  });

  const bars = agg ? derived.barsFor(agg.comms) : [];
  const maxBar = Math.max(1, ...bars.map(b => b.total));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-sm text-gray-900">
      {/* rail */}
      <div className="flex w-[220px] flex-none flex-col bg-gray-900 text-gray-200">
        <div className="flex items-center gap-2.5 px-5 py-[18px]">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-[13px] text-white">✦</div>
          <div className="text-[15px] font-bold text-white">BookingGPT</div>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2.5">
          {([{ key: 'finance', label: 'Finance', glyph: '◫' }, { key: 'settings', label: 'Settings', glyph: '⚙' }] as const).map(n => (
            <button
              key={n.key}
              onClick={() => setScreen(n.key)}
              className={`flex h-10 items-center gap-2.5 rounded-lg px-3 text-left ${screen === n.key ? 'bg-gray-800 font-semibold text-white' : 'font-medium text-gray-400 hover:bg-gray-800'}`}
            >
              <span className="inline-flex w-4 justify-center">{n.glyph}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto border-t border-gray-800 px-3 py-3.5">
          <div className="px-2 pb-2 text-[10px] font-bold tracking-widest text-gray-500">SIGNED IN AS</div>
          <div className="flex items-center gap-2.5 rounded-lg bg-gray-800 p-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-700 text-[10px] font-bold text-white">{initials(selfName)}</div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-semibold text-white">{selfName}</div>
              <div className="text-[10px] capitalize text-gray-400">{data.myRole === 'owner' ? 'Admin · owner' : data.myRole}</div>
            </div>
            <span className="text-xs text-green-400">●</span>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); setData(null); setAuthState('anon'); }}
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-[11px] text-gray-500 hover:bg-gray-800 hover:text-gray-300"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {screen === 'finance' && (
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {showTeam ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold tracking-tight">Team finances</div>
                    <div className="mt-0.5 text-[13px] text-gray-500">{data.orgName} · {teamAgg.length} member{teamAgg.length === 1 ? '' : 's'}</div>
                  </div>
                  <div className="rounded-full border border-gray-200 bg-white px-3.5 py-[7px] text-xs font-semibold text-gray-700">All time</div>
                </div>
                <KpiCards kpis={[
                  { label: 'Team revenue', value: fmt(teamRevenue), sub: `${data.bookings.length} bookings`, subClass: 'text-gray-500' },
                  { label: 'Commission earned', value: fmt(teamCommission), sub: `${data.commissions.length} entries`, subClass: 'text-gray-500' },
                  { label: 'Commission owed', value: fmt(teamPending), sub: 'unpaid', subClass: 'text-amber-700' },
                  { label: 'Active members', value: String(teamAgg.length), sub: `${data.memberships.filter(m => m.status === 'pending').length} pending invite(s)`, subClass: 'text-gray-500' },
                ]} />
                <div className="mb-2.5 mt-6 text-xs font-bold tracking-widest text-gray-500">MEMBERS</div>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="grid grid-cols-[1.6fr_1fr_90px_1fr_1fr_110px] gap-x-4 border-b border-gray-100 px-5 py-3 text-[11px] font-bold tracking-wider text-gray-500">
                    <div>MEMBER</div><div>REVENUE</div><div>BOOKINGS</div><div>PENDING</div><div>COMMISSION</div><div />
                  </div>
                  {teamAgg.map(a => {
                    const name = nameOf(a.uid);
                    const [avBg, avC] = avColor(a.uid);
                    return (
                      <div key={a.uid} onClick={() => setDrillAgent(a.uid)} className="grid cursor-pointer grid-cols-[1.6fr_1fr_90px_1fr_1fr_110px] items-center gap-x-4 border-b border-gray-100 px-5 py-3 hover:bg-gray-50">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${avBg} ${avC} text-[11px] font-bold`}>{initials(name)}</div>
                          <div className="min-w-0 leading-snug">
                            <div className="truncate text-[13px] font-semibold">{name}</div>
                            <div className="text-[11px] capitalize text-gray-500">{a.m.role}</div>
                          </div>
                        </div>
                        <div className="font-semibold">{fmt(a.revenue)}</div>
                        <div className="text-gray-700">{a.bookings.length}</div>
                        <div className="text-gray-700">{fmt(a.pending)}</div>
                        <div className="font-semibold text-green-600">{fmt(a.commission)}</div>
                        <div className="text-right text-[13px] font-semibold text-blue-600">View →</div>
                      </div>
                    );
                  })}
                  {teamAgg.length === 0 && <div className="px-5 py-8 text-center text-[13px] text-gray-400">No active members yet.</div>}
                </div>
              </>
            ) : agg && (
              <>
                {isAdmin && drillAgent && (
                  <div className="mb-4 flex items-center gap-2.5">
                    <button onClick={() => setDrillAgent(null)} className="h-[34px] rounded-[10px] border border-gray-200 bg-white px-3.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">← Team</button>
                    <span className="rounded-full bg-amber-100 px-3 py-[5px] text-xs font-semibold text-amber-700">Viewing as admin</span>
                  </div>
                )}
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold tracking-tight">{isAdmin && drillAgent ? nameOf(drillAgent) : 'Your finances'}</div>
                    <div className="mt-0.5 text-[13px] text-gray-500">
                      {agg.avgRate != null ? `Commission at ${agg.avgRate}% of booking` : data.orgName}
                    </div>
                  </div>
                  <div className="rounded-full border border-gray-200 bg-white px-3.5 py-[7px] text-xs font-semibold text-gray-700">All time</div>
                </div>
                <KpiCards kpis={[
                  { label: 'Booked revenue', value: fmt(agg.revenue), sub: `${agg.bookings.length} bookings`, subClass: 'text-gray-500' },
                  { label: isAdmin && drillAgent ? 'Commission' : 'Your commission', value: fmt(agg.commission), sub: agg.avgRate != null ? `at ${agg.avgRate}% avg rate` : '—', subClass: 'text-gray-500' },
                  { label: 'Pending payout', value: fmt(agg.pending), sub: agg.pending > 0 ? 'awaiting payout' : 'all settled', subClass: agg.pending > 0 ? 'text-amber-700' : 'text-green-600' },
                  { label: 'Paid bookings', value: String(agg.bookings.filter(b => b.payment_status === 'paid').length), sub: `of ${agg.bookings.length} total`, subClass: 'text-gray-500' },
                ]} />
                <div className="mt-3.5 grid items-stretch gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(420px,1fr))]">
                  {/* bar chart */}
                  <div className="flex flex-col rounded-xl border border-gray-200 bg-white px-5 py-[18px] shadow-sm">
                    <div className="text-xs font-bold tracking-wider text-gray-500">COMMISSION · LAST 6 MONTHS</div>
                    <div className="mt-4 flex min-h-[150px] flex-1 items-end gap-2.5">
                      {bars.map((b, i) => (
                        <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                          <div className={`text-[10px] font-bold ${i === 5 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {b.total > 0 ? '$' + (b.total / 1000).toFixed(1) + 'k' : ''}
                          </div>
                          <div className={`w-full rounded-t-md ${i === 5 ? 'bg-blue-600' : 'bg-blue-100'}`} style={{ height: Math.max(2, Math.round((b.total / maxBar) * 100)) }} />
                          <div className="text-[10px] font-semibold text-gray-500">{b.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* ledger */}
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between px-5 pb-2.5 pt-4">
                      <div className="text-xs font-bold tracking-wider text-gray-500">COMMISSION LEDGER</div>
                      {agg.avgRate != null && <div className="text-[11px] text-gray-400">{agg.avgRate}% avg rate</div>}
                    </div>
                    <div className="grid grid-cols-[minmax(120px,1.6fr)_minmax(64px,1fr)_minmax(56px,auto)_minmax(64px,auto)_minmax(70px,auto)] gap-x-3 border-b border-gray-100 px-5 py-1.5 text-[11px] font-bold tracking-wider text-gray-500">
                      <div>BOOKING</div><div>TOTAL</div><div>MARGIN</div><div>COMMISSION</div><div>STATUS</div>
                    </div>
                    {ledgerRows.map(l => (
                      <div key={l.id} className="grid grid-cols-[minmax(120px,1.6fr)_minmax(64px,1fr)_minmax(56px,auto)_minmax(64px,auto)_minmax(70px,auto)] items-center gap-x-3 border-b border-gray-100 px-5 py-[11px]">
                        <div className="min-w-0 leading-snug">
                          <div className="truncate text-[13px] font-semibold">{l.ref}</div>
                          <div className="truncate text-[11px] text-gray-500">{l.trip}</div>
                        </div>
                        <div className="text-[13px] font-semibold">{fmt(l.total)}</div>
                        <div className="text-[13px] text-gray-700">{l.margin != null ? fmt(l.margin) : '—'}</div>
                        <div className="text-[13px] font-semibold text-green-600">{l.commission != null ? fmt(l.commission) : '—'}</div>
                        <div>
                          <span className={`rounded-full px-2 py-[3px] text-[10px] font-bold ${l.paid ? 'bg-green-50 text-green-600' : 'bg-amber-100 text-amber-700'}`}>
                            {l.paid ? 'PAID' : 'PENDING'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {ledgerRows.length === 0 && <div className="px-5 py-8 text-center text-[13px] text-gray-400">No bookings yet.</div>}
                    <div className="flex items-center justify-between bg-gray-50 px-5 py-3">
                      <span className="text-xs text-gray-500">Pending payout</span>
                      <span className="font-bold">{fmt(agg.pending)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {screen === 'settings' && (
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="text-2xl font-bold tracking-tight">Settings</div>
            <div className="mt-0.5 text-[13px] text-gray-500">
              {isAdmin ? `${data.orgName} · you manage ${data.memberships.length} member(s)` : `Your account at ${data.orgName}`}
            </div>

            <div className="mt-5 grid grid-cols-[1.5fr_1fr] items-start gap-3.5">
              <div className="flex min-w-0 flex-col gap-3.5">
                {isAdmin ? (
                  <>
                    {/* team & roles */}
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between px-5 pb-3 pt-4">
                        <div className="text-xs font-bold tracking-wider text-gray-500">TEAM &amp; ROLES</div>
                        <button title="Invite flow not wired yet" className="h-8 cursor-not-allowed rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-400">＋ Invite</button>
                      </div>
                      {data.memberships.map(m => {
                        const name = m.user_id ? nameOf(m.user_id) : (m.invited_email ?? 'Invited');
                        const email = (m.user_id && data.users[m.user_id]?.email) || m.invited_email || '';
                        const [avBg, avC] = avColor(m.user_id ?? m.id);
                        const isOwner = m.role === 'owner';
                        return (
                          <div key={m.id} className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
                            <div className={`flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full ${avBg} ${avC} text-[11px] font-bold`}>{initials(name)}</div>
                            <div className="min-w-0 flex-1 leading-snug">
                              <div className="truncate text-[13px] font-semibold">{name}</div>
                              <div className="truncate text-[11px] text-gray-500">{email}{m.status === 'pending' ? ' · invite pending' : ''}</div>
                            </div>
                            {isOwner ? (
                              <span className="rounded-full bg-orange-100 px-3 py-[5px] text-[11px] font-bold text-orange-700">OWNER</span>
                            ) : (
                              <div className="flex gap-0.5 rounded-full border border-gray-200 p-[3px]">
                                {['agent', 'admin'].map(r => (
                                  <span
                                    key={r}
                                    onClick={() => setMemberRole(m, r)}
                                    className={`cursor-pointer rounded-full px-3 py-[5px] text-[11px] font-semibold capitalize ${m.role === r ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* role capabilities — read-only, no permissions table in DB */}
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="px-5 pb-3 pt-4 text-xs font-bold tracking-wider text-gray-500">WHAT EACH ROLE CAN DO</div>
                      <div className="grid grid-cols-[1fr_90px_90px] gap-x-3.5 border-b border-gray-100 px-5 pb-2 pt-1 text-[11px] font-bold tracking-wider text-gray-500">
                        <div>PERMISSION</div><div className="text-center">AGENT</div><div className="text-center">ADMIN</div>
                      </div>
                      {PERM_DEFS.map(p => (
                        <div key={p.label} className="grid grid-cols-[1fr_90px_90px] items-center gap-x-3.5 border-b border-gray-100 px-5 py-[11px]">
                          <div className="leading-snug">
                            <div className="text-[13px] font-semibold">{p.label}</div>
                            <div className="text-[11px] text-gray-500">{p.sub}</div>
                          </div>
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                            {p.agent ? <><span className="font-bold text-green-600">✓</span>yes</> : <span>—</span>}
                          </div>
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                            <span className="font-bold text-green-600">✓</span>always
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white p-[22px] shadow-sm">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[17px]">🔒</div>
                      <div className="leading-relaxed">
                        <div className="font-semibold">Team &amp; roles are managed by your admin</div>
                        <div className="text-[13px] text-gray-500">Your organization&apos;s owner controls roles and commission rates for {data.orgName}.</div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="px-5 pb-3 pt-4 text-xs font-bold tracking-wider text-gray-500">YOUR PERMISSIONS</div>
                      {PERM_DEFS.map(p => (
                        <div key={p.label} className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-[11px]">
                          <span className={`font-bold ${p.agent ? 'text-green-600' : 'text-gray-300'}`}>{p.agent ? '✓' : '—'}</span>
                          <div className={`flex-1 text-[13px] ${p.agent ? 'text-gray-700' : 'text-gray-400'}`}>{p.label}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* profile */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="px-5 pb-3 pt-4 text-xs font-bold tracking-wider text-gray-500">PROFILE</div>
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-[11px]">
                    <span className="text-[13px] text-gray-700">Name</span>
                    <span className="text-[13px] font-semibold">{data.self?.full_name ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-[11px]">
                    <span className="text-[13px] text-gray-700">Email</span>
                    <span className="text-[13px] font-semibold">{data.self?.email ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-[11px]">
                    <span className="text-[13px] text-gray-700">Role</span>
                    <span className={`rounded-full px-[11px] py-1 text-[11px] font-bold ${isAdmin ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                      {data.myRole === 'owner' ? 'ADMIN · OWNER' : data.myRole.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* right column */}
              <div className="flex min-w-0 flex-col gap-3.5">
                {isAdmin && (
                  <>
                    <div className="rounded-xl bg-gray-900 px-5 py-[18px] text-white">
                      <div className="text-xs font-bold tracking-wider text-gray-400">DEFAULT MARKUP</div>
                      <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-[32px] font-bold">{markup != null ? `${markup}%` : '—'}</span>
                        <span className="text-[13px] text-gray-400">applied to new quotes</span>
                      </div>
                      {markup != null && (
                        <>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-700">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, markup)}%` }} />
                          </div>
                          <div className="mt-1.5 flex justify-between text-[11px] text-gray-500"><span>0%</span><span>100%</span></div>
                        </>
                      )}
                    </div>
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="px-5 pb-3 pt-4 text-xs font-bold tracking-wider text-gray-500">PAYOUTS</div>
                      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-[11px]">
                        <span className="text-[13px] text-gray-700">Method</span>
                        <span className="text-[13px] font-semibold">{data.settings?.stripe_connect_account_id ? 'Stripe Connect' : 'Not connected'}</span>
                      </div>
                      <div className="flex items-center justify-between px-5 py-[11px]">
                        <span className="text-[13px] text-gray-700">Commission basis</span>
                        <span className="text-[13px] font-semibold">Paid bookings only</span>
                      </div>
                    </div>
                  </>
                )}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="px-5 pb-3 pt-4 text-xs font-bold tracking-wider text-gray-500">NOTIFICATIONS</div>
                  {NOTIF_DEFS.map(n => (
                    <div key={n.key} className="flex items-center gap-3 border-b border-gray-100 px-5 py-[11px]">
                      <div className="flex-1 text-[13px] text-gray-700">{n.label}</div>
                      <Toggle
                        on={!!data.settings?.[n.key]}
                        disabled={!data.settings}
                        onClick={() => setNotif(n.key, !data.settings?.[n.key])}
                      />
                    </div>
                  ))}
                  {!data.settings && <div className="px-5 py-3 text-[11px] text-gray-400">No settings row for this user yet.</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
