import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ModernButton } from '@/components/ui/modern-button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { DarkModeToggle } from '@/components/ui/dark-mode-toggle';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  Globe,
  Star,
  CheckCircle,
  BarChart3,
  Shield,
  Headphones
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">BookingGPT</span>
              <Badge variant="secondary">v4.2</Badge>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Features</Link>
              <Link href="/quotes" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Dashboard</Link>
              <Link href="/contacts" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Contacts</Link>
              <Link href="/modern-ui" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Modern UI</Link>
              <DarkModeToggle />
              <ModernButton variant="outline" size="sm" asChild>
                <Link href="/auth/login">Sign In</Link>
              </ModernButton>
              <ModernButton variant="primary" size="sm" asChild>
                <Link href="/quote-wizard">Get Started</Link>
              </ModernButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20 dark:to-black/20"></div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2 mb-8">
              <Star className="w-4 h-4 text-yellow-300 fill-current" />
              <span className="text-white text-sm">Trusted by 500+ Travel Professionals</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Travel Booking
              <span className="block text-gradient bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 to-yellow-200">
                Reimagined
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              The complete contact-driven travel management system with intelligent quote building and visual timeline planning
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <ModernButton size="lg" className="text-lg px-8 py-4" asChild>
                <Link href="/quote-wizard">
                  <Zap className="w-5 h-5 mr-2" />
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </ModernButton>
              <ModernButton size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-lg px-8 py-4" asChild>
                <Link href="/demo">
                  <FileText className="w-5 h-5 mr-2" />
                  View Demo
                </Link>
              </ModernButton>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to
              <span className="text-gradient"> Succeed</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for modern travel professionals who demand efficiency, elegance, and results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <ModernCard variant="elevated" className="p-8 hover-lift group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Smart Contact Management</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Complete CRM with intelligent search, tagging, and relationship mapping for seamless customer management
              </p>
            </ModernCard>

            <ModernCard variant="elevated" className="p-8 hover-lift group">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Visual Timeline</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Professional calendar interface powered by react-big-calendar for intuitive itinerary visualization
              </p>
            </ModernCard>

            <ModernCard variant="elevated" className="p-8 hover-lift group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Quote Wizard</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Step-by-step intelligent quote builder with flights, hotels, activities, and automated pricing
              </p>
            </ModernCard>

            <ModernCard variant="elevated" className="p-8 hover-lift group">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Travel Items</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Color-coded management system for flights, accommodations, activities, and transfers with drag-and-drop
              </p>
            </ModernCard>
          </div>

          {/* Stats Section */}
          <ModernCard variant="elevated" className="p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">500+</div>
                <div className="text-gray-600 dark:text-gray-400">Travel Agencies</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">50k+</div>
                <div className="text-gray-600 dark:text-gray-400">Quotes Generated</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">99.9%</div>
                <div className="text-gray-600 dark:text-gray-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">4.9★</div>
                <div className="text-gray-600 dark:text-gray-400">Customer Rating</div>
              </div>
            </div>
          </ModernCard>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary relative">
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your
            <span className="block">Travel Business?</span>
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join hundreds of travel professionals already using BookingGPT to streamline their workflow
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <ModernButton size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-lg px-8 py-4" asChild>
              <Link href="/contacts">
                <Users className="w-5 h-5 mr-2" />
                Manage Contacts
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </ModernButton>
            <ModernButton size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-lg px-8 py-4" asChild>
              <Link href="/quotes">
                <BarChart3 className="w-5 h-5 mr-2" />
                Quote Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </ModernButton>
            <ModernButton size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-lg px-8 py-4" asChild>
              <Link href="/quote-wizard">
                <FileText className="w-5 h-5 mr-2" />
                Create Quote
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </ModernButton>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">BookingGPT</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                The complete contact-driven travel booking system built with modern technology for travel professionals.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="bg-gray-800 px-3 py-1 rounded-full">Next.js 15.5</span>
                <span className="bg-gray-800 px-3 py-1 rounded-full">React 19</span>
                <span className="bg-gray-800 px-3 py-1 rounded-full">TypeScript</span>
                <span className="bg-gray-800 px-3 py-1 rounded-full">Tailwind CSS</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Access</h4>
              <div className="space-y-2">
                <Link href="/quotes" className="block hover:text-white transition-colors">View Quotes</Link>
                <Link href="/timeline" className="block hover:text-white transition-colors">Timeline</Link>
                <Link href="/contacts" className="block hover:text-white transition-colors">Contacts</Link>
                <Link href="/demo" className="block hover:text-white transition-colors">Demo</Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <div className="space-y-2">
                <Link href="#" className="block hover:text-white transition-colors">Documentation</Link>
                <Link href="#" className="block hover:text-white transition-colors">Help Center</Link>
                <Link href="#" className="block hover:text-white transition-colors">Contact</Link>
                <Link href="#" className="block hover:text-white transition-colors">Status</Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-400 text-sm">
              © 2024 BookingGPT. All rights reserved.
            </p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy</Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Terms</Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
