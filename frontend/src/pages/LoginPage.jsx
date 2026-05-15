export default function LoginPage() {
  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">A</div>
          <div>
            <p className="eyebrow">Compliance co-pilot</p>
            <h1>Asta</h1>
          </div>
        </div>

        <nav className="topnav" aria-label="Primary navigation">
          <a href="/">Back to landing</a>
        </nav>
      </header>

      <main className="auth-container">
        <div className="auth-panel">
          <h2>Sign in to Asta</h2>
          <p className="text-muted">Enter your credentials to access your compliance dashboard</p>

          <form className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="button button-primary" style={{ width: '100%' }}>
              Sign in
            </button>
          </form>

          <p className="text-center">
            Don't have an account? <a href="/">Contact us to get started</a>
          </p>
        </div>
      </main>
    </div>
  );
}
