'use client';

import { useQuoteCompat } from '@/hooks/compat/useQuoteCompat';
import { useInvoiceCompat } from '@/hooks/compat/useInvoiceCompat';
import { formatCurrency } from '@/lib/utils';
import { FileText, Send, CheckCircle, XCircle, DollarSign, TrendingUp, Briefcase } from 'lucide-react';

export function QuoteStats() {
  const { getQuotesStats } = useQuoteCompat();
  const { getTotalRevenue } = useInvoiceCompat();
  const stats = getQuotesStats();

  // Get actual revenue from paid invoices instead of accepted quotes
  const actualRevenue = getTotalRevenue();

  // Quote status cards (row 1)
  const quoteStatusCards = [
    {
      title: 'Total Quotes',
      value: stats.totalQuotes.toLocaleString(),
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'All quotes created',
    },
    {
      title: 'Sent Quotes',
      value: stats.sentQuotes.toLocaleString(),
      icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Awaiting response',
    },
    {
      title: 'Accepted Quotes',
      value: stats.acceptedQuotes.toLocaleString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Confirmed bookings',
    },
    {
      title: 'Rejected Quotes',
      value: stats.rejectedQuotes.toLocaleString(),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Declined proposals',
    },
  ];

  // Financial metrics cards (row 2)
  const financialCards = [
    {
      title: 'Actual Revenue',
      value: formatCurrency(actualRevenue),
      icon: DollarSign,
      gradient: 'from-emerald-500 to-green-600',
      description: 'From paid invoices',
      isFinancial: true,
    },
    {
      title: 'Pipeline Value',
      value: formatCurrency(stats.totalRevenue),
      icon: Briefcase,
      gradient: 'from-purple-500 to-indigo-600',
      description: 'From accepted quotes',
      isFinancial: true,
    },
    {
      title: 'Average Quote Value',
      value: formatCurrency(stats.averageQuoteValue),
      icon: TrendingUp,
      gradient: 'from-blue-500 to-cyan-600',
      description: 'Across all quotes',
      isFinancial: true,
    },
    {
      title: 'Draft Quotes',
      value: stats.draftQuotes.toLocaleString(),
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      description: 'Work in progress',
    },
  ];

  // Calculate conversion rate
  const conversionRate = stats.totalQuotes > 0 
    ? ((stats.acceptedQuotes / (stats.sentQuotes + stats.acceptedQuotes + stats.rejectedQuotes)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Quote Status Cards - Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quoteStatusCards.map((stat) => (
          <div
            key={stat.title}
            className={`bg-white rounded-xl p-6 border-2 ${stat.borderColor} hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm font-semibold text-gray-700 mt-1">{stat.title}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Metrics Cards - Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {financialCards.map((stat) => (
          <div
            key={stat.title}
            className={`${
              stat.isFinancial
                ? `bg-gradient-to-br ${stat.gradient} text-white`
                : `bg-white border-2 ${stat.borderColor}`
            } rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${
                stat.isFinancial ? 'bg-white/20' : stat.bgColor
              }`}>
                <stat.icon className={`w-6 h-6 ${
                  stat.isFinancial ? 'text-white' : stat.color
                }`} />
              </div>
            </div>
            <div className="mt-4">
              <p className={`text-3xl font-bold ${
                stat.isFinancial ? 'text-white' : 'text-gray-900'
              }`}>{stat.value}</p>
              <p className={`text-sm font-semibold mt-1 ${
                stat.isFinancial ? 'text-white/90' : 'text-gray-700'
              }`}>{stat.title}</p>
              <p className={`text-xs mt-1 ${
                stat.isFinancial ? 'text-white/70' : 'text-gray-500'
              }`}>{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Insights */}
      {stats.totalQuotes > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Conversion Rate */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Conversion Rate</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-blue-800">
                  {conversionRate.toFixed(1)}%
                </span>
                <p className="text-sm text-blue-600 mt-1">
                  {stats.acceptedQuotes} of {stats.sentQuotes + stats.acceptedQuotes + stats.rejectedQuotes} sent quotes
                </p>
              </div>
            </div>

            {/* Pipeline Status */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-amber-900">Pipeline</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-amber-800">
                  {stats.draftQuotes + stats.sentQuotes}
                </span>
                <p className="text-sm text-amber-600 mt-1">
                  Active quotes in pipeline
                </p>
              </div>
            </div>

            {/* Success Ratio */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">Success Rate</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-green-800">
                  {stats.totalQuotes > 0 ? ((stats.acceptedQuotes / stats.totalQuotes) * 100).toFixed(1) : 0}%
                </span>
                <p className="text-sm text-green-600 mt-1">
                  Overall acceptance rate
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.totalQuotes === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No quotes yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first quote to start tracking your business metrics.
          </p>
        </div>
      )}
    </div>
  );
}