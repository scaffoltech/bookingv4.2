'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useQuoteStore } from '@/store/quote-store';
import { useRateStore } from '@/store/rate-store';
import { useContactStore } from '@/store/contact-store';
import { ChatAction } from '@/types';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  applied?: string[]; // summary of actions applied for this reply
}

export function ItineraryChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const quoteStore = useQuoteStore();
  const rates = useRateStore((s) => s.rates);
  const contacts = useContactStore((s) => s.contacts);

  const applyActions = (actions: ChatAction[]): string[] => {
    const applied: string[] = [];
    let activeQuoteId = quoteStore.currentQuote?.id ?? null;

    for (const action of actions) {
      if (action.type === 'create_quote') {
        const contactId = action.contactId ?? '';
        const id = quoteStore.addQuote({
          contactId,
          customerId: contactId,
          customerName: action.customerName,
          title: action.title,
          items: [],
          totalCost: 0,
          status: 'draft',
          travelDates: { start: new Date(action.startDate), end: new Date(action.endDate) },
        });
        activeQuoteId = id;
        const quote = quoteStore.getQuoteById(id);
        if (quote) quoteStore.setCurrentQuote(quote);
        applied.push(`Created quote "${action.title}"`);
      } else if (action.type === 'add_item') {
        if (!activeQuoteId) {
          applied.push(`Skipped "${action.item.name}" — no active quote`);
          continue;
        }
        quoteStore.addItemToQuote(activeQuoteId, action.item);
        applied.push(`Added ${action.item.type}: ${action.item.name}`);
      } else if (action.type === 'update_item') {
        if (!activeQuoteId) continue;
        quoteStore.updateItemInQuote(activeQuoteId, action.itemId, action.updates);
        applied.push('Updated an item');
      } else if (action.type === 'remove_item') {
        if (!activeQuoteId) continue;
        quoteStore.removeItemFromQuote(activeQuoteId, action.itemId);
        applied.push('Removed an item');
      }
    }
    // Refresh currentQuote so the preview pane shows new items
    if (activeQuoteId) {
      const fresh = useQuoteStore.getState().getQuoteById(activeQuoteId);
      if (fresh) quoteStore.setCurrentQuote(fresh);
    }
    return applied;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;
    setInput('');
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setPending(true);

    try {
      const quote = quoteStore.currentQuote;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          context: {
            quote: quote
              ? {
                  id: quote.id,
                  title: quote.title,
                  customerName: quote.customerName,
                  travelDates: quote.travelDates,
                  items: quote.items.map((i) => ({
                    id: i.id,
                    type: i.type,
                    name: i.name,
                    startDate: i.startDate,
                    endDate: i.endDate,
                    price: i.price,
                    quantity: i.quantity,
                  })),
                }
              : null,
            rates: rates.slice(0, 200).map((r) => ({
              id: r.id,
              type: r.type,
              name: 'propertyName' in r ? r.propertyName : 'activityName' in r ? (r as any).activityName : r.supplier,
              supplier: r.supplier,
              price: r.rate,
              startDate: r.startDate,
              endDate: r.endDate,
            })),
            contacts: contacts.slice(0, 100).map((c) => ({ id: c.id, name: c.name })),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat request failed');

      const applied = applyActions(data.actions ?? []);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message, applied }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, something went wrong: ${err instanceof Error ? err.message : 'unknown error'}` },
      ]);
    } finally {
      setPending(false);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-16rem)] min-h-[480px]">
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-16">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-blue-500" />
            <p className="font-medium">Build an itinerary by chatting</p>
            <p className="text-sm mt-1">
              Try: &ldquo;Plan a 5-day Paris trip for John Smith, Aug 1–5. Find a hotel and flights from Vancouver.&rdquo;
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[85%] whitespace-pre-wrap'
                  : 'bg-gray-100 text-gray-900 rounded-lg px-4 py-2 max-w-[85%] whitespace-pre-wrap'
              }
            >
              {m.content}
              {m.applied && m.applied.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600 space-y-0.5">
                  {m.applied.map((a, j) => (
                    <div key={j}>✓ {a}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>
      <div className="border-t p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Describe the trip, ask for hotels or flights…"
          disabled={pending}
        />
        <Button onClick={send} disabled={pending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
