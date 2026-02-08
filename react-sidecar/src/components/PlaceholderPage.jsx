import { Link } from 'react-router-dom'

export default function PlaceholderPage({ title }) {
  return (
    <main className="placeholder-shell">
      <h1>{title} page placeholder</h1>
      <p>This route exists so you can migrate each current HTML page one at a time.</p>
      <Link to="/">Back to login</Link>
    </main>
  )
}
