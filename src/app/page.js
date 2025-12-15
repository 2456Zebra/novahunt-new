import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
      <h1 className="text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900">
        NovaHunt.ai
      </h1>
      <p className="text-xl md:text-3xl text-gray-600 text-center max-w-4xl mb-16">
        Find business emails instantly. Enter a company domain and get professional contacts.
      </p>

      <div className="w-full max-w-lg mb-16">
        <input
          type="text"
          placeholder="Enter domain, e.g. coca-cola.com"
          className="w-full px-8 py-5 text-xl border border-gray-300 rounded-xl mb-6 focus:outline-none focus:border-blue-600 shadow-md"
        />
        <button className="w-full py-5 bg-blue-600 text-white rounded-xl font-bold text-2xl hover:bg-blue-700 transition shadow-lg">
          Search
        </button>
      </div>

      <Link href="/checkout">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-8 px-16 rounded-2xl text-3xl transition shadow-2xl">
          Get Started — Choose Your Plan
        </button>
      </Link>

      <p className="mt-16 text-gray-500 text-xl">
        Already have an account? <Link href="/account" className="text-blue-600 underline hover:text-blue-700 font-bold">Sign in</Link>
      </p>
    </main>
  );
}
