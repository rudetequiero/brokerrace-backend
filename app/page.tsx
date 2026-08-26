// Not the BrokerRace website — that's the Claude Design canvas. This is just a plain
// health-check page so visiting the bare API domain confirms the deploy worked, instead
// of a confusing 404.
export default function Home() {
  return (
    <main style={{ padding: 40, lineHeight: 1.6 }}>
      <h1>BrokerRace API</h1>
      <p>This deployment is up. It serves the backend endpoints only:</p>
      <ul>
        <li>
          <code>GET /api/leaderboard</code>
        </li>
        <li>
          <code>POST /api/companies</code>
        </li>
        <li>
          <code>POST /api/checkout</code>
        </li>
        <li>
          <code>POST /api/stripe/webhook</code>
        </li>
        <li>
          <code>POST /api/click</code>
        </li>
      </ul>
      <p>The actual site design lives in your Claude Design canvas, not here.</p>
    </main>
  );
}
