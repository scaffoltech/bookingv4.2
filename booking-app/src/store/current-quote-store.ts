import { create } from 'zustand';
import { TravelQuote } from '@/types';

// ponytail: UI-local "which quote is the wizard/chat looking at" selection.
// Not persisted — the actual quote data lives in Supabase via useQuoteCompat.
interface CurrentQuoteStore {
  currentQuote: TravelQuote | Partial<TravelQuote> | null;
  setCurrentQuote: (quote: TravelQuote | Partial<TravelQuote> | null) => void;
}

export const useCurrentQuoteStore = create<CurrentQuoteStore>((set) => ({
  currentQuote: null,
  setCurrentQuote: (quote) => set({ currentQuote: quote }),
}));
