'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Plus,
  LogOut,
  Sparkles,
  Menu,
  X,
  TrendingUp,
  Receipt,
  CreditCard,
  DollarSign,
  PieChart,
  UserCog
} from 'lucide-react';
import { useState } from 'react';

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile: user, signOut: logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navItems = [
    {
      href: '/quotes',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: pathname === '/quotes'
    },
    {
      href: '/contacts',
      label: 'Contacts',
      icon: Users,
      active: pathname === '/contacts'
    },
    {
      href: '/timeline',
      label: 'Timeline',
      icon: Calendar,
      active: pathname === '/timeline'
    },
    {
      href: '/finances',
      label: 'Finances',
      icon: TrendingUp,
      active: pathname?.startsWith('/finances')
    },
    {
      href: '/invoices',
      label: 'Invoices',
      icon: Receipt,
      active: pathname?.startsWith('/invoices')
    },
    {
      href: '/commissions',
      label: 'Commissions',
      icon: DollarSign,
      active: pathname?.startsWith('/commissions')
    },
    {
      href: '/expenses',
      label: 'Expenses',
      icon: CreditCard,
      active: pathname?.startsWith('/expenses')
    },
    {
      href: '/team',
      label: 'Team',
      icon: UserCog,
      active: pathname?.startsWith('/team')
    },
    {
      href: '/quote-wizard',
      label: 'Create Quote',
      icon: Plus,
      active: pathname?.startsWith('/quote-wizard'),
      highlight: true
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/quotes" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">BookingGPT</span>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Pro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                  ${item.active
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                  ${item.highlight && !item.active
                    ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                    : ''
                  }
                `}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {user?.email}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-gray-600" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${item.active
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                    ${item.highlight && !item.active
                      ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                      : ''
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}

              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="text-sm text-gray-600 px-4 mb-3">
                  {user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}