import Header from '../components/Header'

export default function Home() {
  return (
    <>
      <Header />

      <main className="pt-20 text-center">
        <h1 className="text-6xl font-bold mb-8"># NovaHunt.ai</h1>
        
        <p className="text-2xl mb-12">
          Find business emails instantly. Enter a company domain and get professional contacts.
        </p>
        
        <p className="text-xl mb-8">
          Try a domain like coca-cola.com
        </p>
        
        <p className="text-2xl font-bold">
          Take us for a test drive
        </p>
      </main>
    </>
  )
}
