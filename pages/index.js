import Header from '../components/Header'

export default function Home() {
  return (
    <>
      <Header />

      <main className="page-root">
        <h1 className="brand">NovaHunt.ai</h1>
        <p className="lead">Find business emails instantly. Enter a company domain and get professional contacts.</p>
        
        <form className="domain-form">
          <input
            id="domainInput"
            name="domain"
            type="text"
            inputMode="url"
            placeholder="Enter domain, e.g. coca-cola.com"
            aria-label="Company domain"
            autoComplete="off"
            className=""
            defaultValue=""
          />
          <div className="hint">Try a domain (e.g. coca-cola.com) to do a quick search.</div>
          <div className="actions-row">
            <button type="submit" className="cta primary">Take us for a test drive</button>
            <a href="/checkout" role="button" className="cta primary">Choose Your Plan</a>
          </div>
        </form>

        <div className="results-wrap"></div>
      </main>
    </>
  )
}
