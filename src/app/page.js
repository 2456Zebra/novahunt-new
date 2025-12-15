import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
      <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 text-gray-900">
        NovaHunt.ai
      </h1>
      <p className="text-xl md:text-2xl text-gray-600 text-center max-w-3xl mb-12">
        Find business emails instantly. Enter a company domain and get professional contacts.
      </p>

      <div className="w-full max-w-md mb-12">
        <input
          type="text"
          placeholder="Enter domain, e.g. coca-cola.com"
          className="w-full px-6 py-4 text-lg border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-blue-600"
        />
        <button className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-xl hover:bg-blue-700 transition">
          Search
        </button>
      </div>

      <Link href="/checkout">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-12 rounded-xl text-2xl transition shadow-lg">
          Get Started — Choose Your Plan
        </button>
      </Link>

      <p className="mt-12 text-gray-500 text-lg">
        Already have an account? <Link href="/account" className="text-blue-600 underline hover:text-blue-700">Sign in</Link>
      </p>
    </main>
  );
}
