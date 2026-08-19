// Honeycomb design-system components used by the site, extracted from the
// Claude Design project bundle (HoneycombDesignSystem_ea61b4). Styles live in
// globals.css under the "design system" section.

import React from 'react';

const CELLS = [[2, 0], [4, 0], [3, 1], [5, 1], [0, 2], [2, 2], [4, 2], [6, 2], [1, 3], [3, 3], [5, 3], [0, 4], [2, 4], [4, 4], [1, 5], [5, 5]];
const HS = 17.3205;
const D = CELLS.map(([c, r]) => {
  const x = c * 30, y = r * HS;
  return `M${x + 20} ${y}L${x + 10} ${(y + HS).toFixed(2)}L${x - 10} ${(y + HS).toFixed(2)}L${x - 20} ${y}L${x - 10} ${(y - HS).toFixed(2)}L${x + 10} ${(y - HS).toFixed(2)}Z`;
}).join('');

export function HoneycombMark({ variant = 'white', height = 40, wordmark = true, style, ...rest }) {
  const color = variant === 'gold' ? 'var(--hc-gold,#E3A444)' : 'var(--hc-white,#FFFFFF)';
  const text = variant === 'gold' ? 'var(--text-on-cream,#241609)' : 'var(--hc-white,#FFFFFF)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.55, ...style }} {...rest}>
      <svg viewBox="-23 -21 226 130" fill="none" style={{ height, display: 'block' }}
           aria-label="Honeycomb Connected Field mark">
        <path d={D} stroke={color} strokeWidth="2.1" strokeLinejoin="round" />
      </svg>
      {wordmark && (
        <span style={{
          fontFamily: 'var(--font-display,serif)', fontWeight: 600,
          letterSpacing: 'var(--tracking-wordmark,0.08em)', fontSize: height * 0.34,
          color: text, lineHeight: 1,
        }}>
          HONEYCOMB
        </span>
      )}
    </span>
  );
}

export function Input({ label, hint, invalid, style, ...rest }) {
  return (
    <label className={`hc-field${invalid ? ' hc-field-invalid' : ''}`} style={style}>
      {label && <span className="hc-field-label">{label}</span>}
      <input className="hc-input" aria-invalid={invalid || undefined} {...rest} />
      {hint && <span className="hc-field-hint">{hint}</span>}
    </label>
  );
}

export function Button({ variant = 'primary', size = 'md', children, ...rest }) {
  return (
    <button className={`hc-btn hc-btn-${variant} hc-btn-${size}`} {...rest}>
      {children}
    </button>
  );
}
