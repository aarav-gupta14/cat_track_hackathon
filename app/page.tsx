import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <h1>
        Déjà<span>View</span>
      </h1>
      <p className="tagline">
        Every machine remembers what happened to it, what fixed it, and what it learned, so new technicians don&apos;t
        start from zero.
      </p>
      <div className="landing-grid">
        <Link href="/glasses" className="landing-card">
          <h2>Glasses view</h2>
          <p className="muted">
            What the technician sees. Scan a machine, ask out loud, and log what you did, hands-free. Open on a phone
            or a second window.
          </p>
        </Link>
        <Link href="/dashboard" className="landing-card">
          <h2>Memory dashboard</h2>
          <p className="muted">
            The machine&apos;s memory, live: timeline, memory map, fleet insights, and every memory as it is written.
          </p>
        </Link>
      </div>
      <p className="loop">
        <b>See</b> → <b>Ask</b> → <b>Remember</b> → <b>Reason</b> → <b>Act</b> → <b>Learn</b>
      </p>    </main>
  );
}
