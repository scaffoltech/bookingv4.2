'use client';

import { Sidebar } from '@/components/navigation/Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main Content */}
      <div className="lg:pl-[220px]">
        <div className="pl-16 lg:pl-0"> {/* padding for mobile menu button */}
          {children}
        </div>
      </div>
    </div>
  );
}
