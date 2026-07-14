import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HotelBedsClient } from '@/services/hotelbeds-client';
import { searchFlights } from '@/services/amadeus-client';
import { ChatAction, TravelItem } from '@/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_hotels',
      description: 'Search live hotel availability and prices (HotelBeds)',
      parameters: {
        type: 'object',
        properties: {
          destination: { type: 'string', description: 'City name, e.g. "Paris"' },
          checkIn: { type: 'string', description: 'YYYY-MM-DD' },
          checkOut: { type: 'string', description: 'YYYY-MM-DD' },
          adults: { type: 'number' },
        },
        required: ['destination', 'checkIn', 'checkOut'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_flights',
      description: 'Search live flight offers (Amadeus). Convert city names to IATA airport codes.',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: 'IATA code, e.g. "YVR"' },
          destination: { type: 'string', description: 'IATA code, e.g. "CDG"' },
          departureDate: { type: 'string', description: 'YYYY-MM-DD' },
          returnDate: { type: 'string', description: 'YYYY-MM-DD, omit for one-way' },
          adults: { type: 'number' },
        },
        required: ['origin', 'destination', 'departureDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_quote',
      description: 'Create a new draft quote for a client. Call this before adding items if no quote exists.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          contactId: { type: 'string', description: 'Id from the contacts list if the client matches an existing contact' },
          customerName: { type: 'string' },
          startDate: { type: 'string', description: 'Trip start YYYY-MM-DD' },
          endDate: { type: 'string', description: 'Trip end YYYY-MM-DD' },
        },
        required: ['title', 'customerName', 'startDate', 'endDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_item',
      description: 'Add an item to the itinerary',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['flight', 'hotel', 'activity', 'transfer'] },
          name: { type: 'string' },
          startDate: { type: 'string', description: 'YYYY-MM-DD' },
          endDate: { type: 'string', description: 'YYYY-MM-DD' },
          price: { type: 'number', description: 'Price per unit in USD' },
          quantity: { type: 'number' },
          supplier: { type: 'string' },
          details: { type: 'object', description: 'Extra details: location, room type, flight numbers, apiProvider (amadeus/hotelbeds) etc.' },
        },
        required: ['type', 'name', 'startDate', 'price'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_item',
      description: 'Update an existing itinerary item by id',
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string' },
          updates: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              price: { type: 'number' },
              quantity: { type: 'number' },
            },
          },
        },
        required: ['itemId', 'updates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_item',
      description: 'Remove an itinerary item by id',
      parameters: {
        type: 'object',
        properties: { itemId: { type: 'string' } },
        required: ['itemId'],
      },
    },
  },
];

const ITEM_TYPES = ['flight', 'hotel', 'activity', 'transfer'];

// Validate a mutation tool call into a ChatAction, or null if malformed
function toAction(name: string, args: Record<string, any>): ChatAction | null {
  switch (name) {
    case 'create_quote':
      if (!args.title || !args.customerName || !args.startDate || !args.endDate) return null;
      return {
        type: 'create_quote',
        title: args.title,
        contactId: args.contactId,
        customerName: args.customerName,
        startDate: args.startDate,
        endDate: args.endDate,
      };
    case 'add_item': {
      if (!ITEM_TYPES.includes(args.type) || !args.name || !args.startDate) return null;
      const price = Number(args.price);
      if (!Number.isFinite(price) || price < 0) return null;
      const item: Omit<TravelItem, 'id'> = {
        type: args.type,
        name: args.name,
        startDate: args.startDate,
        endDate: args.endDate,
        price,
        quantity: Number.isFinite(Number(args.quantity)) && Number(args.quantity) > 0 ? Number(args.quantity) : 1,
        details: typeof args.details === 'object' && args.details ? args.details : {},
        supplier: args.supplier,
        source: args.details?.apiProvider ? 'api' : 'manual',
        apiProvider: args.details?.apiProvider,
      };
      return { type: 'add_item', item };
    }
    case 'update_item':
      if (!args.itemId || typeof args.updates !== 'object' || !args.updates) return null;
      return { type: 'update_item', itemId: args.itemId, updates: args.updates };
    case 'remove_item':
      if (!args.itemId) return null;
      return { type: 'remove_item', itemId: args.itemId };
    default:
      return null;
  }
}

async function runSearchHotels(args: Record<string, any>): Promise<unknown> {
  const apiKey = process.env.HOTELBEDS_API_KEY;
  const secret = process.env.HOTELBEDS_SECRET;
  if (!apiKey || !secret) {
    return { error: 'Live hotel search not configured — use rates from the agent catalog or ask the agent for details.' };
  }
  try {
    const client = new HotelBedsClient({ apiKey, secret });
    const hotels = await client.searchSimplifiedHotels(
      args.destination,
      args.checkIn,
      args.checkOut,
      1,
      args.adults ?? 2
    );
    return hotels.slice(0, 5).map((h) => ({
      name: h.name,
      location: h.location,
      rating: h.rating,
      price: h.price,
      currency: h.currency,
      roomType: h.roomType,
    }));
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Hotel search failed' };
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI assistant not configured' }, { status: 500 });
  }

  try {
    const { messages, context } = await request.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const system = `You are an itinerary-building assistant for a professional travel agent building a quote for their client. Today is ${new Date().toISOString().slice(0, 10)}.

Current quote (null = none yet): ${JSON.stringify(context?.quote ?? null)}
Agent's rate catalog (negotiated activity/transfer/hotel rates — prefer these): ${JSON.stringify((context?.rates ?? []).slice(0, 200))}
Agent's contacts: ${JSON.stringify((context?.contacts ?? []).slice(0, 100))}

Rules:
- If no quote exists, gather the client name, trip dates and destination, then call create_quote BEFORE adding items.
- Use search_hotels / search_flights for live availability; prefer catalog rates for activities and transfers.
- Make changes with tools as the conversation progresses — don't just describe them.
- When adding items from a live search, set details.apiProvider ("hotelbeds" or "amadeus") and include key details.
- Keep replies short and professional; the reader is a travel agent, not the end client.`;

    const convo: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      ...messages.slice(-12),
    ];
    const actions: ChatAction[] = [];

    // ponytail: fixed 3-round tool loop, no streaming — add streaming if turns feel slow
    for (let round = 0; round < 3; round++) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: convo,
        tools,
        max_tokens: 1000,
      });
      const msg = completion.choices[0].message;
      convo.push(msg);

      if (!msg.tool_calls?.length) {
        return NextResponse.json({ message: msg.content ?? '', actions });
      }

      for (const call of msg.tool_calls) {
        if (call.type !== 'function') continue;
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {
          // leave args empty; validation below rejects
        }

        let result: unknown;
        if (call.function.name === 'search_hotels') {
          result = await runSearchHotels(args);
        } else if (call.function.name === 'search_flights') {
          result = await searchFlights(args as Parameters<typeof searchFlights>[0]);
        } else {
          const action = toAction(call.function.name, args);
          if (action) {
            actions.push(action);
            result = { ok: true };
          } else {
            result = { error: 'Invalid or missing arguments' };
          }
        }

        convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    return NextResponse.json({
      message: 'I made those updates — anything else to adjust?',
      actions,
    });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: 'Chat request failed' }, { status: 500 });
  }
}
