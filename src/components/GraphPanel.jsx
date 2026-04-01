import React, { useEffect, useRef, useCallback } from 'react';
import { Network } from 'vis-network';

/**
 * GraphPanel — vis-network canvas with vibrant colorful nodes. No edge labels.
 */
export default function GraphPanel({ stepResult, previousStepResult }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  // ── Vibrant Colorful Palette ──
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
    DEFAULT_EDGE: '#475569'
  };

  const buildElements = useCallback(
    (grammar, changes = [], metadata = {}) => {
      const nodes = new Map();
      const edges = [];
      const addedKeys = new Set(
        changes
          .filter((c) => c.type === 'added')
          .map((c) => c.production.lhs + '→' + c.production.rhs.join(' '))
      );

      const nullableSet = metadata.nullableSet || new Set();
      const nonGenerating = metadata.nonGenerating || new Set();
      const nonReachable = metadata.nonReachable || new Set();

      const allSymbols = new Set();
      for (const p of grammar.productions) {
        allSymbols.add(p.lhs);
        for (const s of p.rhs) {
          if (s !== 'ε') allSymbols.add(s);
        }
      }
      for (const c of changes) {
        allSymbols.add(c.production.lhs);
        for (const s of c.production.rhs) {
          if (s !== 'ε') allSymbols.add(s);
        }
      }

      for (const sym of allSymbols) {
        const isVar = /^[A-Z][A-Z0-9]*$/.test(sym);
        let bgColor = isVar ? COLORS.VARIABLE : COLORS.TERMINAL;
        let borderColor = isVar ? '#3B82F6' : '#10B981';
        let borderWidth = 1;
        let opacity = 1.0;
        let isRemoved = false;
        let fontColor = '#000000';

        if (sym === grammar.start) {
          borderWidth = 4;
          borderColor = '#000000';
          bgColor = COLORS.START;
          fontColor = '#000000';
        }

        if (nullableSet.has(sym)) {
          bgColor = COLORS.NULLABLE;
          borderColor = '#F59E0B';
        } else if (nonGenerating.has(sym)) {
          bgColor = COLORS.REMOVED;
          borderColor = '#DC2626';
          isRemoved = true;
          opacity = 0.5;
          fontColor = '#FFFFFF';
        } else if (nonReachable.has(sym)) {
          bgColor = COLORS.UNREACHABLE;
          borderColor = '#6B7280';
          isRemoved = true;
          opacity = 0.5;
          fontColor = '#FFFFFF';
        }

        const isInActiveGrammar = Array.from(grammar.productions).some(p => p.lhs === sym || p.rhs.includes(sym));
        if (!isInActiveGrammar && !isRemoved) {
          bgColor = '#374151';
          opacity = 0.35;
          isRemoved = true;
          fontColor = '#9CA3AF';
        }

        nodes.set(sym, {
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
        });
      }

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
            color = '#F87171';
            dashes = true;
            width = 1.5;
          } else if (isAdded) {
            color = COLORS.ADDED;
            width = 3;
          } else if (isUnit) {
            color = COLORS.UNIT;
            width = 2.5;
          }

          // No label on edges — just show the connection
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

      for (const p of grammar.productions) {
        processRule(p, false);
      }
      for (const c of changes) {
        if (c.type === 'removed') {
          processRule(c.production, true);
        }
      }

      return {
        nodes: Array.from(nodes.values()),
        edges
      };
    },
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;

    if (!stepResult) {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
      return;
    }

    const { nodes, edges } = buildElements(
      stepResult.grammar,
      stepResult.changes,
      stepResult.metadata
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
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.3)',
          size: 12,
          x: 0,
          y: 4
        }
      },
      edges: {
        smooth: { type: 'continuous', forceDirection: 'none' }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true
      }
    };

    if (!networkRef.current) {
      networkRef.current = new Network(containerRef.current, data, options);
    } else {
      networkRef.current.setData(data);
    }
  }, [stepResult, buildElements]);

  useEffect(() => {
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, []);

  function fitToScreen() {
    if (networkRef.current) {
      networkRef.current.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
    }
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
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Graph Visualization
        </h3>
      </div>

      <div className="graph-canvas-wrapper">
        <div
          ref={containerRef}
          className="graph-canvas"
          style={{ position: 'absolute', inset: 0, outline: 'none' }}
        />

        {!stepResult && (
          <div className="graph-empty-overlay">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4E157" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2 }}>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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

      {/* Colorful Legend */}
      <div className="graph-legend">
        <div className="graph-legend-item">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D4E157', border: '2px solid #000', flexShrink: 0 }} />
          Start
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#60A5FA', flexShrink: 0 }} />
          Variable
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 10, height: 10, borderRadius: '3px', background: '#34D399', flexShrink: 0 }} />
          Terminal
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FBBF24', flexShrink: 0 }} />
          Nullable
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F87171', opacity: 0.6, flexShrink: 0 }} />
          Removed
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 16, height: 2, background: '#A78BFA', borderRadius: 1, flexShrink: 0 }} />
          Unit Rule
        </div>
        <div className="graph-legend-item">
          <span style={{ width: 16, height: 2, background: '#D4E157', borderRadius: 1, flexShrink: 0 }} />
          Added
        </div>
      </div>
    </div>
  );
}
