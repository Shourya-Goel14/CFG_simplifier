import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Network } from 'vis-network';

/**
 * GraphPanel — vis-network canvas with vibrant colorful nodes.
 *
 * When a `currentFrame` is provided (during playback), it:
 *  1. Only colors symbols that have been "discovered" up to that frame
 *  2. Applies a pulsing glow border to the symbols being discovered RIGHT NOW
 *  3. Keeps undiscovered symbols in a dim/neutral state
 */
export default function GraphPanel({ stepResult, previousStepResult, currentFrame, frameIndex }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [revolving, setRevolving] = useState(false);

  const COLORS = {
    START: '#D4E157',
    TERMINAL: '#34D399',
    VARIABLE: '#60A5FA',
    NULLABLE: '#FBBF24',
    GENERATING: '#34D399',
    REMOVED: '#F87171',
    UNREACHABLE: '#9CA3AF',
    UNIT: '#A78BFA',
    ADDED: '#D4E157',
    DEFAULT_EDGE: '#475569',
    DIM: '#2A2A2A',
    DIM_BORDER: '#3A3A3A',
    PULSE: '#F59E0B',
  };

  const buildElements = useCallback(
    (grammar, changes = [], metadata = {}, frame, fIdx) => {
      const nodes = new Map();
      const edges = [];
      const isPlayback = (fIdx >= 0 && frame);
      const stepNum = stepResult?.stepNumber;

      const addedKeys = new Set(
        changes.filter(c => c.type === 'added').map(c => c.production.lhs + '→' + c.production.rhs.join(' '))
      );

      // ── Determine which symbols are "known" at this frame ──
      let knownNullable = new Set();
      let highlightNow = new Set();
      let knownUnitPairs = [];
      let highlightUnitPair = null;
      let knownGenerative = new Set();
      let knownReachable = new Set();

      const ensureSet = (s) => (s instanceof Set ? s : new Set(Array.isArray(s) ? s : []));

      if (isPlayback) {
        highlightNow = ensureSet(frame.highlights);

        if (stepNum === 1) {
          knownNullable = ensureSet(frame.discoveredSoFar);
        } else if (stepNum === 2) {
          knownUnitPairs = frame.discoveredPairsObj || [];
          highlightUnitPair = knownUnitPairs.length > 0 ? knownUnitPairs[knownUnitPairs.length - 1] : null;
        } else if (stepNum === 3) {
          if (frame.phase === 'generative') {
            knownGenerative = ensureSet(frame.discoveredSoFar);
          } else if (frame.phase === 'reachable') {
            // In reachable phase, all generative are already known
            const genTrace = metadata.generativeTrace || [];
            const allGen = new Set();
            genTrace.forEach(t => {
              const m = t.match(/Added \{([^}]+)\}/);
              if (m) m[1].split(',').map(s => s.trim()).forEach(s => allGen.add(s));
            });
            knownGenerative = allGen;
            knownReachable = ensureSet(frame.discoveredSoFar);
          }
        }
      }

      // Full final sets (used when NOT in playback)
      const fullNullable = ensureSet(metadata.nullableSet);
      const fullNonGenerating = ensureSet(metadata.nonGenerating);
      const fullNonReachable = ensureSet(metadata.nonReachable);


      // ── Collect all symbols ──
      const allSymbols = new Set();
      for (const p of grammar.productions) {
        allSymbols.add(p.lhs);
        for (const s of p.rhs) if (s !== 'ε') allSymbols.add(s);
      }
      for (const c of changes) {
        allSymbols.add(c.production.lhs);
        for (const s of c.production.rhs) if (s !== 'ε') allSymbols.add(s);
      }

      // ── Build nodes ──
      for (const sym of allSymbols) {
        const isVar = /^[A-Z][A-Z0-9]*$/.test(sym);
        let bgColor = isVar ? COLORS.VARIABLE : COLORS.TERMINAL;
        let borderColor = isVar ? '#3B82F6' : '#10B981';
        let borderWidth = 2;
        let opacity = 1.0;
        let isRemoved = false;
        let fontColor = '#000000';
        let size = undefined;

        if (sym === grammar.start) {
          borderWidth = 4;
          borderColor = '#000000';
          bgColor = COLORS.START;
        }

        if (isPlayback) {
          // ── PLAYBACK MODE: progressive discovery ──
          const isPulsing = highlightNow.has(sym);

          if (stepNum === 1) {
            if (knownNullable.has(sym)) {
              bgColor = COLORS.NULLABLE;
              borderColor = isPulsing ? '#FFFFFF' : '#F59E0B';
              borderWidth = isPulsing ? 5 : 3;
              if (isPulsing) size = 35;
            } else if (sym === grammar.start) {
              // keep start color
            } else {
              // Not yet discovered — dim
              bgColor = isVar ? COLORS.VARIABLE : COLORS.TERMINAL;
            }
          } else if (stepNum === 2) {
            // Highlight the "from" and "to" of the current unit pair
            if (isPulsing) {
              bgColor = COLORS.UNIT;
              borderColor = '#FFFFFF';
              borderWidth = 5;
              size = 35;
            }
          } else if (stepNum === 3) {
            if (frame.phase === 'generative') {
              if (knownGenerative.has(sym)) {
                bgColor = COLORS.GENERATING;
                borderColor = isPulsing ? '#FFFFFF' : '#10B981';
                borderWidth = isPulsing ? 5 : 3;
                if (isPulsing) size = 35;
              }
            } else if (frame.phase === 'reachable') {
              if (knownReachable.has(sym)) {
                bgColor = '#60A5FA';
                borderColor = isPulsing ? '#FFFFFF' : '#3B82F6';
                borderWidth = isPulsing ? 5 : 3;
                if (isPulsing) size = 35;
              } else if (knownGenerative.has(sym)) {
                bgColor = COLORS.GENERATING;
                borderColor = '#10B981';
                borderWidth = 2;
                opacity = 0.6;
              }
            }
          }
        } else {
          // ── FINAL MODE: show full result ──
          if (fullNullable.has(sym)) {
            bgColor = COLORS.NULLABLE;
            borderColor = '#F59E0B';
          } else if (fullNonGenerating.has(sym)) {
            bgColor = COLORS.REMOVED;
            borderColor = '#DC2626';
            isRemoved = true;
            opacity = 0.5;
            fontColor = '#FFFFFF';
          } else if (fullNonReachable.has(sym)) {
            bgColor = COLORS.UNREACHABLE;
            borderColor = '#6B7280';
            isRemoved = true;
            opacity = 0.5;
            fontColor = '#FFFFFF';
          }

          const isInActive = grammar.productions.some(p => p.lhs === sym || p.rhs.includes(sym));
          if (!isInActive && !isRemoved) {
            bgColor = '#374151';
            opacity = 0.35;
            isRemoved = true;
            fontColor = '#9CA3AF';
          }
        }

        const nodeOpts = {
          id: sym,
          label: sym,
          shape: isVar ? 'circle' : 'box',
          color: {
            background: bgColor,
            border: borderColor,
            highlight: { background: '#D4E157', border: '#D4E157' }
          },
          font: { color: fontColor, face: 'monospace', size: 16, bold: true },
          borderWidth,
          opacity,
          shadow: !isRemoved ? {
            enabled: true,
            color: `${bgColor}44`,
            size: 18,
            x: 0,
            y: 4
          } : false
        };
        if (size) nodeOpts.size = size;
        nodes.set(sym, nodeOpts);
      }

      // ── Build edges ──
      const seenEdges = new Set();
      let edgeId = 0;

      const processRule = (p, isRemovedRule) => {
        const key = p.lhs + '→' + p.rhs.join(' ');
        const isAdded = addedKeys.has(key);
        const isUnit = p.rhs.length === 1 && /^[A-Z][A-Z0-9]*$/.test(p.rhs[0]);

        for (const sym of new Set(p.rhs)) {
          if (sym === 'ε') continue;
          let color = COLORS.DEFAULT_EDGE;
          let dashes = false;
          let width = 1.5;

          if (isRemovedRule) {
            color = '#F87171'; dashes = true; width = 1.5;
          } else if (isAdded) {
            color = COLORS.ADDED; width = 3;
          } else if (isUnit) {
            color = COLORS.UNIT; width = 2.5;
          }

          // During playback for step 2, highlight unit pair edges
          if (isPlayback && stepNum === 2 && highlightUnitPair) {
            if (p.lhs === highlightUnitPair.from && sym === highlightUnitPair.to) {
              color = '#FFFFFF';
              width = 4;
            }
          }

          const eKey = `${p.lhs}->${sym}:${isRemovedRule}`;
          if (!seenEdges.has(eKey)) {
            seenEdges.add(eKey);
            edges.push({
              id: `e${edgeId++}`,
              from: p.lhs,
              to: sym,
              color: { color, opacity: isRemovedRule ? 0.3 : 0.8 },
              width,
              dashes,
              arrows: 'to',
            });
          }
        }
      };

      for (const p of grammar.productions) processRule(p, false);
      for (const c of changes) {
        if (c.type === 'removed') processRule(c.production, true);
      }

      return { nodes: Array.from(nodes.values()), edges };
    },
    [stepResult]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    if (!stepResult) {
      if (networkRef.current) { networkRef.current.destroy(); networkRef.current = null; }
      return;
    }

    const { nodes, edges } = buildElements(
      stepResult.grammar,
      stepResult.changes,
      stepResult.metadata,
      currentFrame,
      frameIndex,
    );

    const data = { nodes, edges };

    const options = {
      physics: {
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.3,
          springLength: 95,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.1
        },
        minVelocity: 0.75
      },
      layout: { randomSeed: 2 },
      nodes: {
        shadow: { enabled: true, color: 'rgba(0,0,0,0.3)', size: 12, x: 0, y: 4 }
      },
      edges: {
        smooth: { type: 'continuous', forceDirection: 'none' }
      },
      interaction: { hover: true, tooltipDelay: 200, zoomView: true, dragView: true }
    };

    if (!networkRef.current) {
      networkRef.current = new Network(containerRef.current, data, options);
    } else {
      networkRef.current.setData(data);

      // Only do the cinematic jolt on full step changes, NOT during frame playback
      if (frameIndex === -1) {
        setTimeout(() => {
          if (networkRef.current) {
            networkRef.current.setOptions({
              physics: { ...options.physics, centralGravity: 1.2, springLength: 150 }
            });
            networkRef.current.fit({ animation: { duration: 800, easingFunction: 'easeInOutQuart' } });
            setRevolving(true);
            setTimeout(() => setRevolving(false), 1000);
            setTimeout(() => {
              if (networkRef.current) networkRef.current.setOptions({ physics: options.physics });
            }, 600);
          }
        }, 50);
      }
    }
  }, [stepResult, buildElements, currentFrame, frameIndex]);

  useEffect(() => {
    return () => { if (networkRef.current) { networkRef.current.destroy(); networkRef.current = null; } };
  }, []);

  function fitToScreen() {
    if (networkRef.current) networkRef.current.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
  }

  function resetLayout() {
    if (networkRef.current) {
      if (networkRef.current.isPhysicsEnabled()) networkRef.current.stabilize();
      fitToScreen();
    }
  }

  return (
    <div className="graph-panel">
      <div className="graph-panel-header">
        <h3 className="graph-panel-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Graph Visualization
        </h3>
      </div>

      <div className={`graph-canvas-wrapper ${revolving ? 'graph-revolving' : ''}`}>
        <div ref={containerRef} className="graph-canvas" style={{ position: 'absolute', inset: 0, outline: 'none' }} />

        {!stepResult && (
          <div className="graph-empty-overlay">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4E157" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2 }}>
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <p style={{ fontSize: '0.82rem' }}>Grammar graph will appear here</p>
          </div>
        )}

        {stepResult && (
          <div className="graph-toolbar">
            <button className="graph-toolbar-btn" onClick={fitToScreen} title="Fit to Screen">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            </button>
            <button className="graph-toolbar-btn" onClick={resetLayout} title="Reset Layout">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="graph-legend">
        <div className="graph-legend-item">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D4E157', border: '2px solid #000', flexShrink: 0 }} />Start
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#60A5FA', flexShrink: 0 }} />Variable
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 10, height: 10, borderRadius: '3px', background: '#34D399', flexShrink: 0 }} />Terminal
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FBBF24', flexShrink: 0 }} />Nullable
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F87171', opacity: 0.6, flexShrink: 0 }} />Removed
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 16, height: 2, background: '#A78BFA', borderRadius: 1, flexShrink: 0 }} />Unit Rule
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 16, height: 2, background: '#D4E157', borderRadius: 1, flexShrink: 0 }} />Added
        </div>
      </div>
    </div>
  );
}
