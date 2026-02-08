import AppHeader from './AppHeader'

export default function PlaceholderPage({ title }) {
  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="panel">
          <h2>{title} page placeholder</h2>
          <p>This route is protected and ready for incremental migration from the legacy app.</p>
        </section>
      </main>
    </>
  )
}
