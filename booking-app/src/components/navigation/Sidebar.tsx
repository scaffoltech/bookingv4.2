'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSettingsStore } from '@/store/settings-store';
import { useSidebarStore } from '@/store/sidebar-store';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Plus,
  LogOut,
  Sparkles,
  Menu,
  X,
  TrendingUp,
  Settings,
  ClipboardList,
  Upload,
} from 'lucide-react';

const navItems = [
  { href: '/quotes', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assistant', label: 'Trip Builder', icon: Sparkles, isAI: true },
  { href: '/quote-wizard', label: 'Quote Wizard', icon: Plus },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/timeline', label: 'Timeline', icon: Calendar },
  { href: '/admin/finances', label: 'Finances', icon: TrendingUp },
  { href: '/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/admin/rates', label: 'Rate Upload', icon: Upload },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

function Rail({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile: user, signOut: logout } = useAuth();
  const companyName = useSettingsStore((s) => s.settings.companyName);

  const initials = (user?.full_name || 'Agent')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isActive = (href: string) =>
    href === '/quotes' ? pathname === '/quotes' : pathname?.startsWith(href);

  return (
    <div className="flex h-full flex-col bg-gray-900 text-gray-200">
      {/* Logo */}
      <Link
        href="/quotes"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-5 py-[18px]"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-[13px] text-white">
          ✦
        </div>
        <span className="text-[15px] font-bold text-white">BookingGPT</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 py-2.5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors ${
                active
                  ? 'bg-gray-800 font-semibold text-white'
                  : 'font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {item.isAI && (
                <span className="ml-auto rounded-full border border-gray-700 px-1.5 py-px text-[10px] font-bold tracking-wider text-purple-300">
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="mt-auto flex items-center gap-2.5 border-t border-gray-800 px-5 py-4">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-gray-700 text-[11px] font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-xs font-semibold text-white">
            {user?.full_name || user?.email || 'Agent'}
          </div>
          <div className="truncate text-[11px] text-gray-500">{companyName}</div>
        </div>
        <button
          onClick={() => {
            logout();
            router.push('/');
          }}
          title="Sign Out"
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-200"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { mobileMenuOpen, setMobileMenuOpen } = useSidebarStore();

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="fixed left-4 top-4 z-50 rounded-lg border border-gray-200 bg-white p-2 shadow-md lg:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? (
          <X className="h-5 w-5 text-gray-600" />
        ) : (
          <Menu className="h-5 w-5 text-gray-600" />
        )}
      </button>

      {/* Desktop rail */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[220px] lg:block">
        <Rail />
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[220px]">
            <Rail onNavigate={() => setMobileMenuOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
