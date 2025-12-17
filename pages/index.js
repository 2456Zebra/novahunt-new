'use client'; // If using TypeScript/Next.js 13+ with client components

import { useState } from 'react';

export default function Home() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const params = new URLSearchParams({
        first_name: firstName,
        last_name: lastName,
        domain,
      });
      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'No email found');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Search failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">NovaHunt.ai - Email Finder</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Domain (e.g., example.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Find Email'}
          </button>
        </form>

        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
        {result && (
          <div className="mt-6 p-4 bg-green-50 rounded">
            <p><strong>Email:</strong> {result.email}</p>
            <p><strong>Confidence:</strong> {result.score}%</p>
            {result.sources && <p><strong>Sources:</strong> {result.sources.length}</p>}
            <p><strong>Type:</strong> {result.type}</p>
          </div>
        )}
      </div>
    </div>
  );
}
