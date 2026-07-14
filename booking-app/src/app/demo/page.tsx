'use client';

import { useEffect, useState } from 'react';
import { useQuoteCompat } from '@/hooks/compat/useQuoteCompat';
import { useContactCompat } from '@/hooks/compat/useContactCompat';
import { ModernButton } from '@/components/ui/modern-button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { ExternalLink, Eye } from 'lucide-react';

export default function DemoPage() {
  const { quotes, generatePreviewLink } = useQuoteCompat();
  const { contacts } = useContactCompat();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  const handlePreviewQuote = async (quoteId: string) => {
    const previewLink = await generatePreviewLink(quoteId);
    if (previewLink) {
      window.open(previewLink, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Client Quote System
            <span className="text-gradient block">Demo</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Experience how your clients view travel quotes, request changes, and make payments online
          </p>
        </div>

        {quotes.length === 0 ? (
          <ModernCard variant="elevated" className="p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Quotes Available</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create a quote using the quote wizard to see the client view demo in action.
            </p>
            <ModernButton asChild size="lg">
              <a href="/quote-wizard">Create Your First Quote</a>
            </ModernButton>
          </ModernCard>
        ) : (
          <div className="space-y-8">
            <ModernCard variant="default" className="p-6">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">🚀 Demo Instructions</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Click <strong>&quot;Preview Client View&quot;</strong> on any quote below to experience the client portal.
                This includes quote details, messaging system, and secure payment functionality.
              </p>
            </ModernCard>

            <div className="grid gap-6">
              {quotes.map((quote) => {
                const contact = contacts.find(c => c.id === quote.contactId);
                return (
                  <ModernCard key={quote.id} variant="elevated" className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {quote.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          Client: {contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown'}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Status: {quote.status}</span>
                          <span>Items: {quote.items.length}</span>
                          <span>Total: ${quote.totalCost.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <ModernButton
                          onClick={() => handlePreviewQuote(quote.id)}
                          className="flex items-center space-x-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Preview Client View</span>
                        </ModernButton>
                        <ModernButton
                          variant="outline"
                          onClick={async () => {
                            const link = await generatePreviewLink(quote.id);
                            if (link) {
                              navigator.clipboard.writeText(link);
                              alert('Link copied to clipboard!');
                            }
                          }}
                          className="flex items-center space-x-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Copy Client Link</span>
                        </ModernButton>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Client Features:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>✓ View detailed itinerary</div>
                        <div>✓ See pricing breakdown</div>
                        <div>✓ Message travel agent</div>
                        <div>✓ Request changes</div>
                        <div>✓ Accept/decline quotes</div>
                        <div>✓ Online payment</div>
                        <div>✓ Mobile responsive</div>
                        <div>✓ Secure access</div>
                      </div>
                    </div>
                  </ModernCard>
                );
              })}
            </div>

            <ModernCard variant="default" className="p-6">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">How It Works:</h3>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p><strong>1. Create Quote:</strong> Use the quote wizard to create a detailed travel quote</p>
                <p><strong>2. Send to Client:</strong> Generate a secure link and send it to your client</p>
                <p><strong>3. Client Reviews:</strong> Client views quote details, pricing, and itinerary</p>
                <p><strong>4. Client Actions:</strong> Client can accept, request changes, or make payment</p>
                <p><strong>5. Communication:</strong> Built-in messaging system for questions and changes</p>
              </div>
            </ModernCard>
          </div>
        )}
      </div>
    </div>
  );
}