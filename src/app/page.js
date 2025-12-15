import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <h1 className="text-5xl md:text-6xl font-bold text-center mb-6">
        NovaHunt.ai
      </h1>
      <p className="text-xl text-gray-600 text-center max-w-2xl mb-12">
        Find business emails instantly.
      </p>

      <Link href="/checkout">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition">
          Get Started — Choose Your Plan
        </button>
      </Link>
    </main>
  );
}
