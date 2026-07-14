'use client';

// Redesign preview: "Finance & Settings" from the Claude Design project.
// ponytail: self-contained demo data + local state; wire to stores once the
// redesign shell lands and the finance-store refactor (in flight) settles.

import { useState } from 'react';

type Role = 'agent' | 'admin';
type Screen = 'finance' | 'settings';

const SPLIT = 0.5; // agent share of margin

const fmt = (n: number) => '$' + n.toLocaleString('en-US');

interface LedgerRow { ref: string; trip: string; total: number; margin: number; paid: boolean }
interface AgentData {
  name: string; initials: string; avBg: string; avC: string; title: string;
  revenue: number; quotes: number; bars: number[]; ledger: LedgerRow[];
}

const AGENTS: Record<string, AgentData> = {
  dana: {
    name: 'Dana Reyes', initials: 'DR', avBg: 'bg-indigo-100', avC: 'text-indigo-700', title: 'Senior agent', revenue: 42310, quotes: 9,
    bars: [1810, 2140, 2620, 1930, 2260, 2540],
    ledger: [
      { ref: 'RTC-1043', trip: 'Smith · Maui · 7 nights', total: 8675, margin: 1041, paid: false },
      { ref: 'RTC-1041', trip: 'Tanaka · Kyoto · 6 nights', total: 11120, margin: 1334, paid: true },
      { ref: 'RTC-1036', trip: 'Alvarez · Cabo · 5 nights', total: 7900, margin: 948, paid: true },
      { ref: 'RTC-1029', trip: 'Byrne · Paris · 4 nights', total: 5400, margin: 648, paid: true },
      { ref: 'RTC-1027', trip: 'Osei · Tokyo · 8 nights', total: 9215, margin: 1106, paid: true },
    ],
  },
  kai: {
    name: 'Kai Nakamura', initials: 'KN', avBg: 'bg-pink-100', avC: 'text-pink-700', title: 'Agent', revenue: 35880, quotes: 7,
    bars: [1420, 1660, 1580, 1740, 1980, 2150],
    ledger: [
      { ref: 'RTC-1042', trip: 'Weiss · Rome · 6 nights', total: 10200, margin: 1224, paid: false },
      { ref: 'RTC-1037', trip: 'Cole · Bali · 9 nights', total: 12480, margin: 1498, paid: true },
      { ref: 'RTC-1031', trip: 'Diaz · Oaxaca · 4 nights', total: 4600, margin: 552, paid: true },
    ],
  },
  priya: {
    name: 'Priya Shah', initials: 'PS', avBg: 'bg-green-100', avC: 'text-green-700', title: 'Agent', revenue: 28640, quotes: 6,
    bars: [980, 1240, 1410, 1350, 1520, 1720],
    ledger: [
      { ref: 'RTC-1039', trip: 'Ito · Queenstown · 7 nights', total: 9840, margin: 1181, paid: false },
      { ref: 'RTC-1033', trip: 'Fox · Lisbon · 5 nights', total: 6200, margin: 744, paid: true },
      { ref: 'RTC-1028', trip: 'Nair · Dubai · 4 nights', total: 7300, margin: 876, paid: true },
    ],
  },
  tom: {
    name: 'Tom Okafor', initials: 'TO', avBg: 'bg-amber-100', avC: 'text-amber-700', title: 'Agent · part-time', revenue: 21620, quotes: 5,
    bars: [640, 890, 1050, 980, 1160, 1300],
    ledger: [
      { ref: 'RTC-1040', trip: 'Hale · Banff · 5 nights', total: 6900, margin: 828, paid: false },
      { ref: 'RTC-1034', trip: 'Kim · Seoul · 6 nights', total: 8100, margin: 972, paid: true },
    ],
  },
};

const MEMBERS = [
  { key: 'dana', name: 'Dana Reyes', email: 'dana@reyestravel.co', initials: 'DR', avBg: 'bg-indigo-100', avC: 'text-indigo-700' },
  { key: 'kai', name: 'Kai Nakamura', email: 'kai@reyestravel.co', initials: 'KN', avBg: 'bg-pink-100', avC: 'text-pink-700' },
  { key: 'priya', name: 'Priya Shah', email: 'priya@reyestravel.co', initials: 'PS', avBg: 'bg-green-100', avC: 'text-green-700' },
  { key: 'tom', name: 'Tom Okafor', email: 'tom@reyestravel.co', initials: 'TO', avBg: 'bg-amber-100', avC: 'text-amber-700' },
  { key: 'marco', name: 'Marco Vega', email: 'marco@reyestravel.co', initials: 'MV', avBg: 'bg-orange-100', avC: 'text-orange-700' },
];

const PERM_DEFS = [
  { key: 'ownfin', label: 'View own finances', sub: 'Commission ledger and payouts' },
  { key: 'teamfin', label: 'View team finances', sub: 'All agents’ revenue and margins' },
  { key: 'rates', label: 'Edit commission rates', sub: 'Markup and split percentages' },
  { key: 'team', label: 'Manage team & roles', sub: 'Invite, remove, change roles' },
  { key: 'send', label: 'Send quotes to clients', sub: 'Without admin approval' },
] as const;

const NOTIF_DEFS = [
  { key: 'paid', label: 'A booking gets paid' },
  { key: 'accepted', label: 'A client accepts a quote' },
  { key: 'digest', label: 'Weekly finance digest' },
] as const;

const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const marginSum = (a: AgentData) => a.ledger.reduce((x, l) => x + l.margin, 0);
const pendingComm = (a: AgentData) =>
  Math.round(a.ledger.filter(l => !l.paid).reduce((x, l) => x + l.margin, 0) * SPLIT);

function Toggle({ on, onClick, disabled }: { on: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`h-[21px] w-9 rounded-full p-[2.5px] transition-colors ${on ? 'bg-blue-600' : 'bg-gray-300'} ${disabled ? '' : 'cursor-pointer'}`}
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

export default function FinanceSettingsRedesign() {
  const [role, setRole] = useState<Role>('agent');
  const [screen, setScreen] = useState<Screen>('finance');
  const [drillAgent, setDrillAgent] = useState<string | null>(null);
  const [roles, setRoles] = useState<Record<string, Role>>({ dana: 'agent', kai: 'agent', priya: 'agent', tom: 'agent', marco: 'admin' });
  const [agentPerms, setAgentPerms] = useState<Record<string, boolean>>({ ownfin: true, teamfin: false, rates: false, team: false, send: true });
  const [notifs, setNotifs] = useState<Record<string, boolean>>({ paid: true, accepted: true, digest: false });

  const isAdmin = role === 'admin';
  const finAgentKey = isAdmin ? drillAgent : 'dana';
  const showTeam = isAdmin && !drillAgent;
  const agent = finAgentKey ? AGENTS[finAgentKey] : null;
  const splitPct = Math.round(SPLIT * 100) + '%';

  const teamRevenue = Object.values(AGENTS).reduce((x, a) => x + a.revenue, 0);
  const teamMargin = Object.values(AGENTS).reduce((x, a) => x + marginSum(a), 0);
  const teamOwed = Object.values(AGENTS).reduce((x, a) => x + pendingComm(a), 0);

  const setRoleView = (r: Role) => { setRole(r); setDrillAgent(null); };

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
          <div className="px-2 pb-2 text-[10px] font-bold tracking-widest text-gray-500">VIEWING AS</div>
          {([
            { r: 'agent' as Role, initials: 'DR', avBg: 'bg-indigo-700', name: 'Dana Reyes', sub: 'Agent' },
            { r: 'admin' as Role, initials: 'MV', avBg: 'bg-amber-700', name: 'Marco Vega', sub: 'Admin · owner' },
          ]).map(p => (
            <div key={p.r} onClick={() => setRoleView(p.r)} className={`flex cursor-pointer items-center gap-2.5 rounded-lg p-2 ${role === p.r ? 'bg-gray-800' : ''}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full ${p.avBg} text-[10px] font-bold text-white`}>{p.initials}</div>
              <div className="flex-1 leading-tight">
                <div className="text-xs font-semibold text-white">{p.name}</div>
                <div className="text-[10px] text-gray-400">{p.sub}</div>
              </div>
              {role === p.r && <span className="text-xs text-green-400">●</span>}
            </div>
          ))}
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
                    <div className="mt-0.5 text-[13px] text-gray-500">Reyes Travel Co. · 4 agents · March 2026</div>
                  </div>
                  <div className="rounded-full border border-gray-200 bg-white px-3.5 py-[7px] text-xs font-semibold text-gray-700">March 2026 ▾</div>
                </div>
                <KpiCards kpis={[
                  { label: 'Team revenue', value: fmt(teamRevenue), sub: '▲ 9% vs Feb', subClass: 'text-green-600' },
                  { label: 'Total margin', value: fmt(teamMargin), sub: '12% avg markup', subClass: 'text-gray-500' },
                  { label: 'Commission owed', value: fmt(teamOwed), sub: 'pays out Apr 1', subClass: 'text-amber-700' },
                  { label: 'Active agents', value: '4', sub: '27 quotes this month', subClass: 'text-gray-500' },
                ]} />
                <div className="mb-2.5 mt-6 text-xs font-bold tracking-widest text-gray-500">AGENTS</div>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="grid grid-cols-[1.6fr_1fr_90px_1fr_1fr_110px] gap-x-4 border-b border-gray-100 px-5 py-3 text-[11px] font-bold tracking-wider text-gray-500">
                    <div>AGENT</div><div>REVENUE</div><div>QUOTES</div><div>MARGIN</div><div>COMMISSION</div><div />
                  </div>
                  {Object.entries(AGENTS).map(([key, a]) => (
                    <div key={key} onClick={() => setDrillAgent(key)} className="grid cursor-pointer grid-cols-[1.6fr_1fr_90px_1fr_1fr_110px] items-center gap-x-4 border-b border-gray-100 px-5 py-3 hover:bg-gray-50">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${a.avBg} ${a.avC} text-[11px] font-bold`}>{a.initials}</div>
                        <div className="min-w-0 leading-snug">
                          <div className="text-[13px] font-semibold">{a.name}</div>
                          <div className="text-[11px] text-gray-500">{a.title}</div>
                        </div>
                      </div>
                      <div className="font-semibold">{fmt(a.revenue)}</div>
                      <div className="text-gray-700">{a.quotes}</div>
                      <div className="text-gray-700">{fmt(marginSum(a))}</div>
                      <div className="font-semibold text-green-600">{fmt(Math.round(marginSum(a) * SPLIT))}</div>
                      <div className="text-right text-[13px] font-semibold text-blue-600">View →</div>
                    </div>
                  ))}
                </div>
              </>
            ) : agent && (
              <>
                {isAdmin && drillAgent && (
                  <div className="mb-4 flex items-center gap-2.5">
                    <button onClick={() => setDrillAgent(null)} className="h-[34px] rounded-[10px] border border-gray-200 bg-white px-3.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">← Team</button>
                    <span className="rounded-full bg-amber-100 px-3 py-[5px] text-xs font-semibold text-amber-700">Viewing as admin</span>
                  </div>
                )}
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold tracking-tight">{isAdmin ? agent.name : 'Your finances'}</div>
                    <div className="mt-0.5 text-[13px] text-gray-500">
                      {isAdmin ? `${agent.title} · March 2026` : `Dana Reyes · commission at ${splitPct} of margin`}
                    </div>
                  </div>
                  <div className="rounded-full border border-gray-200 bg-white px-3.5 py-[7px] text-xs font-semibold text-gray-700">March 2026 ▾</div>
                </div>
                <KpiCards kpis={[
                  { label: 'Booked revenue', value: fmt(agent.revenue), sub: '▲ 12% vs Feb', subClass: 'text-green-600' },
                  { label: isAdmin ? 'Commission' : 'Your commission', value: fmt(Math.round(marginSum(agent) * SPLIT)), sub: `${splitPct} of margin`, subClass: 'text-gray-500' },
                  { label: 'Pending payout', value: fmt(pendingComm(agent)), sub: 'pays out Apr 1', subClass: 'text-gray-500' },
                  { label: 'Avg margin', value: '12.0%', sub: `${agent.quotes} quotes this month`, subClass: 'text-gray-500' },
                ]} />
                <div className="mt-3.5 grid items-stretch gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(420px,1fr))]">
                  {/* bar chart */}
                  <div className="flex flex-col rounded-xl border border-gray-200 bg-white px-5 py-[18px] shadow-sm">
                    <div className="text-xs font-bold tracking-wider text-gray-500">COMMISSION · LAST 6 MONTHS</div>
                    <div className="mt-4 flex min-h-[150px] flex-1 items-end gap-2.5">
                      {agent.bars.map((v, i) => {
                        const max = Math.max(...agent.bars);
                        return (
                          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                            <div className={`text-[10px] font-bold ${i === 5 ? 'text-gray-900' : 'text-gray-400'}`}>${(v / 1000).toFixed(1)}k</div>
                            <div className={`w-full rounded-t-md ${i === 5 ? 'bg-blue-600' : 'bg-blue-100'}`} style={{ height: Math.round((v / max) * 100) }} />
                            <div className="text-[10px] font-semibold text-gray-500">{MONTHS[i]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* ledger */}
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between px-5 pb-2.5 pt-4">
                      <div className="text-xs font-bold tracking-wider text-gray-500">COMMISSION LEDGER</div>
                      <div className="text-[11px] text-gray-400">{splitPct} of margin</div>
                    </div>
                    <div className="grid grid-cols-[minmax(120px,1.6fr)_minmax(64px,1fr)_minmax(56px,auto)_minmax(64px,auto)_minmax(70px,auto)] gap-x-3 border-b border-gray-100 px-5 py-1.5 text-[11px] font-bold tracking-wider text-gray-500">
                      <div>BOOKING</div><div>TOTAL</div><div>MARGIN</div><div>COMMISSION</div><div>STATUS</div>
                    </div>
                    {agent.ledger.map(l => (
                      <div key={l.ref} className="grid grid-cols-[minmax(120px,1.6fr)_minmax(64px,1fr)_minmax(56px,auto)_minmax(64px,auto)_minmax(70px,auto)] items-center gap-x-3 border-b border-gray-100 px-5 py-[11px]">
                        <div className="min-w-0 leading-snug">
                          <div className="text-[13px] font-semibold">{l.ref}</div>
                          <div className="truncate text-[11px] text-gray-500">{l.trip}</div>
                        </div>
                        <div className="text-[13px] font-semibold">{fmt(l.total)}</div>
                        <div className="text-[13px] text-gray-700">{fmt(l.margin)}</div>
                        <div className="text-[13px] font-semibold text-green-600">{fmt(Math.round(l.margin * SPLIT))}</div>
                        <div>
                          <span className={`rounded-full px-2 py-[3px] text-[10px] font-bold ${l.paid ? 'bg-green-50 text-green-600' : 'bg-amber-100 text-amber-700'}`}>
                            {l.paid ? 'PAID' : 'PENDING'}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-gray-50 px-5 py-3">
                      <span className="text-xs text-gray-500">Next payout · Apr 1</span>
                      <span className="font-bold">{fmt(pendingComm(agent))}</span>
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
              {isAdmin ? 'Reyes Travel Co. · you manage 5 people' : 'Your account at Reyes Travel Co.'}
            </div>

            <div className="mt-5 grid grid-cols-[1.5fr_1fr] items-start gap-3.5">
              <div className="flex min-w-0 flex-col gap-3.5">
                {isAdmin ? (
                  <>
                    {/* team & roles */}
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between px-5 pb-3 pt-4">
                        <div className="text-xs font-bold tracking-wider text-gray-500">TEAM & ROLES</div>
                        <button className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">＋ Invite</button>
                      </div>
                      {MEMBERS.map(m => (
                        <div key={m.key} className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
                          <div className={`flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full ${m.avBg} ${m.avC} text-[11px] font-bold`}>{m.initials}</div>
                          <div className="min-w-0 flex-1 leading-snug">
                            <div className="text-[13px] font-semibold">{m.name}</div>
                            <div className="text-[11px] text-gray-500">{m.email}</div>
                          </div>
                          <div className="flex gap-0.5 rounded-full border border-gray-200 p-[3px]">
                            {(['agent', 'admin'] as Role[]).map(r => (
                              <span
                                key={r}
                                onClick={() => setRoles(prev => ({ ...prev, [m.key]: r }))}
                                className={`cursor-pointer rounded-full px-3 py-[5px] text-[11px] font-semibold capitalize ${roles[m.key] === r ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* role permissions */}
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="px-5 pb-3 pt-4 text-xs font-bold tracking-wider text-gray-500">WHAT EACH ROLE CAN DO</div>
                      <div className="grid grid-cols-[1fr_90px_90px] gap-x-3.5 border-b border-gray-100 px-5 pb-2 pt-1 text-[11px] font-bold tracking-wider text-gray-500">
                        <div>PERMISSION</div><div className="text-center">AGENT</div><div className="text-center">ADMIN</div>
                      </div>
                      {PERM_DEFS.map(p => (
                        <div key={p.key} className="grid grid-cols-[1fr_90px_90px] items-center gap-x-3.5 border-b border-gray-100 px-5 py-[11px]">
                          <div className="leading-snug">
                            <div className="text-[13px] font-semibold">{p.label}</div>
                            <div className="text-[11px] text-gray-500">{p.sub}</div>
                          </div>
                          <div className="flex justify-center">
                            <Toggle on={agentPerms[p.key]} onClick={() => setAgentPerms(prev => ({ ...prev, [p.key]: !prev[p.key] }))} />
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
                        <div className="font-semibold">Team & roles are managed by your admin</div>
                        <div className="text-[13px] text-gray-500">Marco Vega controls roles, permissions and commission splits for Reyes Travel Co. Switch to the admin view (bottom-left) to see what they see.</div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="px-5 pb-3 pt-4 text-xs font-bold tracking-wider text-gray-500">YOUR PERMISSIONS</div>
                      {PERM_DEFS.map(p => (
                        <div key={p.key} className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-[11px]">
                          <span className={`font-bold ${agentPerms[p.key] ? 'text-green-600' : 'text-gray-300'}`}>{agentPerms[p.key] ? '✓' : '—'}</span>
                          <div className={`flex-1 text-[13px] ${agentPerms[p.key] ? 'text-gray-700' : 'text-gray-400'}`}>{p.label}</div>
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
                    <span className="text-[13px] font-semibold">{isAdmin ? 'Marco Vega' : 'Dana Reyes'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-[11px]">
                    <span className="text-[13px] text-gray-700">Email</span>
                    <span className="text-[13px] font-semibold">{isAdmin ? 'marco@reyestravel.co' : 'dana@reyestravel.co'}</span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-[11px]">
                    <span className="text-[13px] text-gray-700">Role</span>
                    <span className={`rounded-full px-[11px] py-1 text-[11px] font-bold ${isAdmin ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                      {isAdmin ? 'ADMIN · OWNER' : 'AGENT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* right column */}
              <div className="flex min-w-0 flex-col gap-3.5">
                {isAdmin && (
                  <>
                    <div className="rounded-xl bg-gray-900 px-5 py-[18px] text-white">
                      <div className="text-xs font-bold tracking-wider text-gray-400">COMMISSION SPLIT</div>
                      <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-[32px] font-bold">{splitPct}</span>
                        <span className="text-[13px] text-gray-400">of margin goes to the agent</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-700">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: splitPct }} />
                      </div>
                      <div className="mt-1.5 flex justify-between text-[11px] text-gray-500"><span>Agent</span><span>Agency</span></div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="px-5 pb-3 pt-4 text-xs font-bold tracking-wider text-gray-500">PAYOUTS</div>
                      {[['Schedule', 'Monthly · 1st'], ['Method', 'Stripe Connect'], ['Commission basis', 'Paid bookings only']].map(([k, v], i, arr) => (
                        <div key={k} className={`flex items-center justify-between px-5 py-[11px] ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                          <span className="text-[13px] text-gray-700">{k}</span>
                          <span className="text-[13px] font-semibold">{v}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="px-5 pb-3 pt-4 text-xs font-bold tracking-wider text-gray-500">NOTIFICATIONS</div>
                  {NOTIF_DEFS.map(n => (
                    <div key={n.key} className="flex items-center gap-3 border-b border-gray-100 px-5 py-[11px]">
                      <div className="flex-1 text-[13px] text-gray-700">{n.label}</div>
                      <Toggle on={notifs[n.key]} onClick={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key] }))} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
