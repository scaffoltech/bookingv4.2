'use client';

import { useEffect, useState } from 'react';
import { useQuoteCompat } from '@/hooks/compat/useQuoteCompat';
import { useAuth } from '@/components/auth/AuthProvider';

export default function DebugPage() {
  const { quotes, getQuotesByStatus } = useQuoteCompat();
  const { user, profile, org, loading } = useAuth();
  const isAuthenticated = !loading && !!user;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Debug Information</h1>

      {/* Authentication Status */}
      <div className="mb-8 p-6 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Authentication Status</h2>
        <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        <p><strong>User:</strong> {user ? user.email : 'None'}</p>
        <p><strong>Profile:</strong> {profile ? JSON.stringify(profile, null, 2) : 'None'}</p>
        <p><strong>Org:</strong> {org ? `${org.name} (${org.id})` : 'None'}</p>
      </div>

      {/* Quote Store Data */}
      <div className="mb-8 p-6 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Quote Store Data</h2>
        <p><strong>Total Quotes:</strong> {quotes.length}</p>
        <p><strong>Draft Quotes:</strong> {getQuotesByStatus('draft').length}</p>
        <p><strong>Sent Quotes:</strong> {getQuotesByStatus('sent').length}</p>
        <p><strong>Accepted Quotes:</strong> {getQuotesByStatus('accepted').length}</p>
        <p><strong>Rejected Quotes:</strong> {getQuotesByStatus('rejected').length}</p>
      </div>

      {/* Local Storage Data */}
      <div className="mb-8 p-6 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Local Storage Data</h2>
        <p><strong>Quote Store Key:</strong> {typeof window !== 'undefined' ? (localStorage.getItem('quote-store') ? 'Found' : 'Not found') : 'Server-side'}</p>
        <p><strong>Auth Store Key:</strong> {typeof window !== 'undefined' ? (localStorage.getItem('auth-storage') ? 'Found' : 'Not found') : 'Server-side'}</p>

        {typeof window !== 'undefined' && localStorage.getItem('quote-store') && (
          <div className="mt-4">
            <h3 className="font-bold">Quote Store Content (first 500 chars):</h3>
            <pre className="text-sm bg-white p-2 rounded mt-2 overflow-x-auto">
              {localStorage.getItem('quote-store')?.substring(0, 500)}...
            </pre>
          </div>
        )}
      </div>

      {/* Individual Quotes */}
      {quotes.length > 0 && (
        <div className="mb-8 p-6 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Individual Quotes</h2>
          {quotes.slice(0, 5).map((quote, index) => (
            <div key={quote.id} className="mb-4 p-4 bg-white rounded">
              <p><strong>Quote {index + 1}:</strong></p>
              <p><strong>ID:</strong> {quote.id}</p>
              <p><strong>Title:</strong> {quote.title}</p>
              <p><strong>Status:</strong> {quote.status}</p>
              <p><strong>Total Cost:</strong> ${quote.totalCost}</p>
              <p><strong>Contact ID:</strong> {quote.contactId}</p>
              <p><strong>Created:</strong> {new Date(quote.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}