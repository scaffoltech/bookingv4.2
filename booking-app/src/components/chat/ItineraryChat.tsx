'use client';

import { useRef, useState } from 'react';
import { useQuoteCompat } from '@/hooks/compat/useQuoteCompat';
import { useRateStore } from '@/store/rate-store';
import { useContactCompat } from '@/hooks/compat/useContactCompat';
import { ChatAction } from '@/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  applied?: string[]; // summary of actions applied for this reply
}

const STARTER_CHIPS = [
  'Plan a 5-day Paris trip for a couple, hotel + flights',
  'Find a beach hotel from my rate list',
];

export function ItineraryChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const quoteStore = useQuoteCompat();
  const rates = useRateStore((s) => s.rates);
  const { contacts } = useContactCompat();

  const applyActions = async (actions: ChatAction[]): Promise<string[]> => {
    const applied: string[] = [];
    let activeQuoteId = quoteStore.currentQuote?.id ?? null;

    for (const action of actions) {
      if (action.type === 'create_quote') {
        const contactId = action.contactId ?? '';
        const id = await quoteStore.addQuote({
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
        applied.push(`quotes.create → "${action.title}"`);
      } else if (action.type === 'add_item') {
        if (!activeQuoteId) {
          applied.push(`skipped "${action.item.name}" — no active quote`);
          continue;
        }
        await quoteStore.addItemToQuote(activeQuoteId, action.item);
        applied.push(`itinerary.add → ${action.item.type}: ${action.item.name}`);
      } else if (action.type === 'update_item') {
        if (!activeQuoteId) continue;
        await quoteStore.updateItemInQuote(activeQuoteId, action.itemId, action.updates);
        applied.push('itinerary.update → item updated');
      } else if (action.type === 'remove_item') {
        if (!activeQuoteId) continue;
        await quoteStore.removeItemFromQuote(activeQuoteId, action.itemId);
        applied.push('itinerary.remove → item removed');
      }
    }
    // ponytail: React Query's cache updates asynchronously after the awaited
    // mutations above, so `quoteStore.quotes` here can still be one render
    // behind. setCurrentQuote(id) as an id-only pointer would need every
    // consumer to re-resolve it; instead just resolve what we have — the
    // itinerary pane re-reads getQuoteById each render, so it self-corrects
    // once the invalidated query refetches.
    if (activeQuoteId) {
      const fresh = quoteStore.getQuoteById(activeQuoteId);
      if (fresh) quoteStore.setCurrentQuote(fresh);
    }
    return applied;
  };

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || pending) return;
    setInput('');
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setPending(true);
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));

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
                  items: (quote.items ?? []).map((i) => ({
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

      const applied = await applyActions(data.actions ?? []);
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
    <div className="flex h-full flex-col bg-gray-900 text-gray-200">
      {/* Dock header */}
      <div className="flex items-center gap-2.5 px-5 pb-3 pt-[18px]">
        <div className="text-[15px] font-bold tracking-tight text-white">Trip Builder</div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className={`h-1.5 w-1.5 rounded-full ${pending ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
          agent {pending ? 'working' : 'live'}
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-2 text-[13px]">
        {messages.length === 0 && (
          <div className="mt-6 leading-relaxed text-gray-400">
            Tell me who&rsquo;s traveling and where, and I&rsquo;ll build the trip day by day —
            flights, stay, activities, then a client-ready quote.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i}>
            {m.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[84%] whitespace-pre-wrap rounded-[14px] rounded-br-[4px] bg-blue-600 px-3 py-2 leading-relaxed text-white">
                  {m.content}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {m.applied && m.applied.length > 0 && (
                  <div className="flex flex-col gap-1 border-l-2 border-gray-800 pl-3 text-xs">
                    {m.applied.map((a, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="font-mono text-gray-400">{a}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="max-w-[94%] whitespace-pre-wrap leading-relaxed text-gray-300">
                  {m.content}
                </div>
              </div>
            )}
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-1 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500 [animation-delay:300ms]" />
          </div>
        )}
      </div>

      {/* Chips + input */}
      <div className="flex flex-col gap-2.5 px-5 pb-[18px] pt-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {STARTER_CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                className="h-[34px] cursor-pointer rounded-full border border-gray-700 bg-gray-800 px-3.5 text-xs font-semibold text-gray-300 transition-colors hover:border-blue-400 hover:text-white"
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-[14px] border border-gray-700 bg-gray-800 py-1.5 pl-4 pr-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Message the agent…"
            disabled={pending}
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-white outline-none placeholder:text-gray-500"
          />
          <button
            onClick={() => send()}
            disabled={pending || !input.trim()}
            className="h-9 w-9 shrink-0 cursor-pointer rounded-[10px] bg-blue-600 font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
