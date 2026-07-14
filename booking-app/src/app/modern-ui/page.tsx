"use client"

import { ModernCard, ModernCardHeader, ModernCardTitle, ModernCardContent } from "@/components/ui/modern-card"
import { ModernButton } from "@/components/ui/modern-button"
import { AnimatedBorder } from "@/components/ui/animated-border"
import { Marquee } from "@/components/ui/marquee"
import { Badge } from "@/components/ui/badge"
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle"
import { Star, Heart, Zap, Globe, Calendar, Users } from "lucide-react"

export default function ModernUIPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Modern UI Components
            </h1>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero Section */}
        <section className="text-center py-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Clean, Modern UI Components
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Built with Tailwind CSS v3, avoiding glass and skeuomorphic effects
          </p>
          <div className="flex gap-4 justify-center">
            <ModernButton variant="primary" size="lg">
              Get Started
            </ModernButton>
            <ModernButton variant="outline" size="lg">
              Learn More
            </ModernButton>
          </div>
        </section>

        {/* Modern Cards Section */}
        <section>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Modern Cards
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ModernCard variant="default">
              <ModernCardHeader>
                <ModernCardTitle>Default Card</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                Clean and minimal design with subtle shadows and proper contrast.
              </ModernCardContent>
            </ModernCard>

            <ModernCard variant="elevated">
              <ModernCardHeader>
                <ModernCardTitle>Elevated Card</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                Enhanced shadow with hover effects for interactive elements.
              </ModernCardContent>
            </ModernCard>

            <ModernCard variant="outline">
              <ModernCardHeader>
                <ModernCardTitle>Outline Card</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                Clean border design with transparent background and hover states.
              </ModernCardContent>
            </ModernCard>
          </div>
        </section>

        {/* Modern Buttons Section */}
        <section>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Modern Buttons
          </h3>
          <div className="flex flex-wrap gap-4">
            <ModernButton variant="primary">Primary</ModernButton>
            <ModernButton variant="secondary">Secondary</ModernButton>
            <ModernButton variant="outline">Outline</ModernButton>
            <ModernButton variant="ghost">Ghost</ModernButton>
            <ModernButton variant="destructive">Destructive</ModernButton>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <ModernButton variant="primary" size="sm">Small</ModernButton>
            <ModernButton variant="primary" size="md">Medium</ModernButton>
            <ModernButton variant="primary" size="lg">Large</ModernButton>
          </div>
        </section>

        {/* Animated Border Section */}
        <section>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Animated Border
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatedBorder className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Featured Content
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                This card has an animated gradient border that continuously flows around the edges.
              </p>
            </AnimatedBorder>

            <AnimatedBorder
              colorFrom="#10b981"
              colorTo="#3b82f6"
              duration={4}
              className="p-6"
            >
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Custom Colors
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Different gradient colors and animation speed for variety.
              </p>
            </AnimatedBorder>
          </div>
        </section>

        {/* Marquee Section */}
        <section>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Marquee Components
          </h3>

          <div className="space-y-8">
            {/* Icon Marquee */}
            <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Technology Stack
              </h4>
              <Marquee speed="slow" className="[mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
                <div className="flex items-center gap-8 text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Globe className="h-6 w-6" />
                    <span>Next.js</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-6 w-6" />
                    <span>React</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-6 w-6" />
                    <span>TypeScript</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-6 w-6" />
                    <span>Tailwind CSS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-6 w-6" />
                    <span>Radix UI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    <span>Zustand</span>
                  </div>
                </div>
              </Marquee>
            </div>

            {/* Reverse Marquee */}
            <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Features (Reverse)
              </h4>
              <Marquee reverse pauseOnHover className="[mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
                <div className="flex gap-8">
                  <Badge className="px-3 py-1 text-sm whitespace-nowrap">
                    Dark Mode Support
                  </Badge>
                  <Badge variant="success" className="px-3 py-1 text-sm whitespace-nowrap">
                    Responsive Design
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1 text-sm whitespace-nowrap">
                    Modern Components
                  </Badge>
                  <Badge variant="warning" className="px-3 py-1 text-sm whitespace-nowrap">
                    Clean Design
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1 text-sm whitespace-nowrap">
                    No Glass Effects
                  </Badge>
                </div>
              </Marquee>
            </div>
          </div>
        </section>

        {/* Design Principles */}
        <section>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Design Principles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModernCard variant="ghost">
              <ModernCardContent className="text-center py-8">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Clean & Minimal
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No glass effects or unnecessary visual clutter
                </p>
              </ModernCardContent>
            </ModernCard>

            <ModernCard variant="ghost">
              <ModernCardContent className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Accessible
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Proper contrast and focus states
                </p>
              </ModernCardContent>
            </ModernCard>

            <ModernCard variant="ghost">
              <ModernCardContent className="text-center py-8">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Star className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Modern
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Contemporary flat design principles
                </p>
              </ModernCardContent>
            </ModernCard>

            <ModernCard variant="ghost">
              <ModernCardContent className="text-center py-8">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Consistent
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Unified design system across components
                </p>
              </ModernCardContent>
            </ModernCard>
          </div>
        </section>
      </div>
    </div>
  )
}