import { describe, it, expect } from 'vitest';
import {
  easeInOutCubic,
  getDescendantIds,
  computeCollapsedPositions,
} from '$lib/collapseAnimation.js';

// ── easeInOutCubic ──────────────────────────────────────────────────────────

describe('easeInOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeInOutCubic(0)).toBe(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('returns 0.5 at t=0.5', () => {
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });

  it('accelerates in the first half (value < t)', () => {
    const t = 0.25;
    expect(easeInOutCubic(t)).toBeLessThan(t);
  });

  it('decelerates in the second half (value > t)', () => {
    const t = 0.75;
    expect(easeInOutCubic(t)).toBeGreaterThan(t);
  });

  it('is monotonically increasing', () => {
    let prev = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const val = easeInOutCubic(t);
      expect(val).toBeGreaterThanOrEqual(prev);
      prev = val;
    }
  });
});

// ── getDescendantIds ────────────────────────────────────────────────────────

describe('getDescendantIds', () => {
  // Build a tree: root -> [a, b], a -> [c, d], b -> [e]
  const parentToChildrenNodeMap = new Map([
    [
      'root',
      [
        { id: 'a', node: { id: 'a' } },
        { id: 'b', node: { id: 'b' } },
      ],
    ],
    [
      'a',
      [
        { id: 'c', node: { id: 'c' } },
        { id: 'd', node: { id: 'd' } },
      ],
    ],
    ['b', [{ id: 'e', node: { id: 'e' } }]],
  ]);

  it('returns all descendants of root', () => {
    const ids = getDescendantIds('root', parentToChildrenNodeMap);
    expect(ids).toHaveLength(5);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).toContain('c');
    expect(ids).toContain('d');
    expect(ids).toContain('e');
  });

  it('returns direct and nested descendants', () => {
    const ids = getDescendantIds('a', parentToChildrenNodeMap);
    expect(ids).toHaveLength(2);
    expect(ids).toContain('c');
    expect(ids).toContain('d');
  });

  it('returns single child', () => {
    const ids = getDescendantIds('b', parentToChildrenNodeMap);
    expect(ids).toHaveLength(1);
    expect(ids).toContain('e');
  });

  it('returns empty array for leaf node', () => {
    const ids = getDescendantIds('c', parentToChildrenNodeMap);
    expect(ids).toHaveLength(0);
  });

  it('returns empty array for unknown node', () => {
    const ids = getDescendantIds('unknown', parentToChildrenNodeMap);
    expect(ids).toHaveLength(0);
  });

  it('handles children without .node wrapper', () => {
    const map = /** @type {any} */ (
      new Map([['x', [{ id: 'y' }, { id: 'z' }]]])
    );
    const ids = getDescendantIds('x', map);
    expect(ids).toHaveLength(2);
    expect(ids).toContain('y');
    expect(ids).toContain('z');
  });
});

// ── computeCollapsedPositions ───────────────────────────────────────────────

describe('computeCollapsedPositions', () => {
  // Tree: root -> [a, b], a -> [c, d]
  const parentToChildrenNodeMap = new Map([
    [
      'root',
      [
        { id: 'a', node: { id: 'a' } },
        { id: 'b', node: { id: 'b' } },
      ],
    ],
    [
      'a',
      [
        { id: 'c', node: { id: 'c' } },
        { id: 'd', node: { id: 'd' } },
      ],
    ],
  ]);

  const nodeIdToRenderedNodeMap = new Map([
    ['root', { x: 100, y: 100 }],
    ['a', { x: 200, y: 200 }],
    ['b', { x: 300, y: 100 }],
    ['c', { x: 250, y: 300 }],
    ['d', { x: 150, y: 300 }],
  ]);

  it('overrides all descendants to the collapsed node position', () => {
    const collapsed = new Set(['a']);
    const overrides = computeCollapsedPositions(
      collapsed,
      parentToChildrenNodeMap,
      nodeIdToRenderedNodeMap,
    );

    expect(overrides.size).toBe(2);
    expect(overrides.get('c')).toEqual({ x: 200, y: 200 });
    expect(overrides.get('d')).toEqual({ x: 200, y: 200 });
  });

  it('handles collapsing root (all nodes become overrides)', () => {
    const collapsed = new Set(['root']);
    const overrides = computeCollapsedPositions(
      collapsed,
      parentToChildrenNodeMap,
      nodeIdToRenderedNodeMap,
    );

    expect(overrides.size).toBe(4);
    for (const id of ['a', 'b', 'c', 'd']) {
      expect(overrides.get(id)).toEqual({ x: 100, y: 100 });
    }
  });

  it('returns empty map when nothing is collapsed', () => {
    const collapsed = new Set();
    const overrides = computeCollapsedPositions(
      collapsed,
      parentToChildrenNodeMap,
      nodeIdToRenderedNodeMap,
    );

    expect(overrides.size).toBe(0);
  });

  it('handles multiple collapsed nodes', () => {
    const collapsed = new Set(['a', 'root']);
    const overrides = computeCollapsedPositions(
      collapsed,
      parentToChildrenNodeMap,
      nodeIdToRenderedNodeMap,
    );

    // root collapses: a,b,c,d -> root position
    // a collapses: c,d -> a position (overrides root's assignment)
    // Since iteration order matters, the last write wins
    expect(overrides.has('a')).toBe(true);
    expect(overrides.has('b')).toBe(true);
    expect(overrides.has('c')).toBe(true);
    expect(overrides.has('d')).toBe(true);
  });

  it('skips collapsed node not found in rendered map', () => {
    const collapsed = new Set(['nonexistent']);
    const overrides = computeCollapsedPositions(
      collapsed,
      parentToChildrenNodeMap,
      nodeIdToRenderedNodeMap,
    );

    expect(overrides.size).toBe(0);
  });
});
