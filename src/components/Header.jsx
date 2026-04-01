export default function Header() {
  return (
    <header className="header-section">
      {/* Background Effects */}
      <div className="header-bg-effects">
        <div className="header-gradient-orb header-gradient-orb-1" />
        <div className="header-gradient-orb header-gradient-orb-2" />
        <div className="header-grid-overlay" />
      </div>

      <div className="header-content">
        {/* Badge */}
        <div className="header-badge">
          <span className="header-badge-dot" />
          <span>Interactive CFG Simplification</span>
        </div>

        {/* Title */}
        <h1 className="header-title">
          CFG
          <span className="header-title-accent">Simplifier</span>
        </h1>

        {/* Subtitle */}
        <p className="header-subtitle">
          Visualize the step-by-step simplification of context-free grammars
          through an interactive, animated pipeline.
        </p>
      </div>
    </header>
  );
}
