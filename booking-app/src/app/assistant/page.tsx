'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { ItineraryChat } from '@/components/chat/ItineraryChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuoteStore } from '@/store/quote-store';

function ItineraryPreview() {
  const quote = useQuoteStore((s) => s.currentQuote);

  if (!quote) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full min-h-[480px] text-gray-500">
          <p>The itinerary will appear here as you chat.</p>
        </CardContent>
      </Card>
    );
  }

  const total = quote.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const fmt = (d: Date | string) => new Date(d).toLocaleDateString();

  return (
    <Card className="h-[calc(100vh-16rem)] min-h-[480px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{quote.title}</span>
          <Badge variant="secondary">{quote.status}</Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          {quote.customerName} · {fmt(quote.travelDates.start)} – {fmt(quote.travelDates.end)}
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {quote.items.length === 0 && <p className="text-gray-500 text-sm">No items yet.</p>}
        {quote.items.map((item) => (
          <div key={item.id} className="flex items-start justify-between border rounded-lg p-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge>{item.type}</Badge>
                <span className="font-medium">{item.name}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {fmt(item.startDate)}
                {item.endDate ? ` – ${fmt(item.endDate)}` : ''}
                {item.quantity > 1 ? ` · ×${item.quantity}` : ''}
              </p>
            </div>
            <span className="font-medium whitespace-nowrap">${(item.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
      </CardContent>
      <div className="border-t p-4 flex justify-between font-semibold">
        <span>Total</span>
        <span>${total.toLocaleString()}</span>
      </div>
    </Card>
  );
}

export default function AssistantPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Assistant</h1>
            <p className="text-gray-600">Chat to build a client itinerary — hotels, flights, and your negotiated rates.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ItineraryChat />
            <ItineraryPreview />
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
