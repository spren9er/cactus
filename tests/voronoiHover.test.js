import { describe, it, expect } from 'vitest';
import {
  buildLeafVoronoi,
  findHoveredLeafByVoronoi,
} from '$lib/voronoiHover.js';

// ── buildLeafVoronoi ────────────────────────────────────────────────────────

describe('buildLeafVoronoi', () => {
  it('returns null for null renderedNodes', () => {
    expect(
      buildLeafVoronoi(/** @type {any} */ (null), new Set(['a'])),
    ).toBeNull();
  });

  it('returns null for null leafNodes', () => {
    const nodes = [{ x: 0, y: 0, radius: 5, node: { id: 'a' } }];
    expect(buildLeafVoronoi(nodes, /** @type {any} */ (null))).toBeNull();
  });

  it('returns null when fewer than 2 leaf nodes', () => {
    const nodes = [{ x: 0, y: 0, radius: 5, node: { id: 'a' } }];
    const leaves = new Set(['a']);
    expect(buildLeafVoronoi(nodes, leaves)).toBeNull();
  });

  it('returns null when fewer than 2 leaves match renderedNodes', () => {
    const nodes = [
      { x: 0, y: 0, radius: 5, node: { id: 'a' } },
      { x: 10, y: 10, radius: 5, node: { id: 'b' } },
    ];
    // Only 'a' is a leaf, 'b' is not
    const leaves = new Set(['a']);
    expect(buildLeafVoronoi(nodes, leaves)).toBeNull();
  });

  it('builds voronoi data for 2+ leaf nodes', () => {
    const nodes = [
      { x: 0, y: 0, radius: 5, node: { id: 'root' } },
      { x: 10, y: 10, radius: 3, node: { id: 'leaf1' } },
      { x: 50, y: 50, radius: 4, node: { id: 'leaf2' } },
    ];
    const leaves = new Set(['leaf1', 'leaf2']);
    const result = /** @type {import('$lib/voronoiHover.js').VoronoiData} */ (
      buildLeafVoronoi(nodes, leaves)
    );

    expect(result).not.toBeNull();
    expect(result.delaunay).toBeDefined();
    expect(result.leafEntries).toHaveLength(2);
    expect(result.leafEntries[0].nodeId).toBe('leaf1');
    expect(result.leafEntries[1].nodeId).toBe('leaf2');
  });

  it('only includes leaf nodes in leafEntries', () => {
    const nodes = [
      { x: 0, y: 0, radius: 20, node: { id: 'root' } },
      { x: 10, y: 10, radius: 8, node: { id: 'inner' } },
      { x: 20, y: 20, radius: 3, node: { id: 'leaf1' } },
      { x: 40, y: 40, radius: 4, node: { id: 'leaf2' } },
      { x: 60, y: 60, radius: 2, node: { id: 'leaf3' } },
    ];
    const leaves = new Set(['leaf1', 'leaf2', 'leaf3']);
    const result = /** @type {import('$lib/voronoiHover.js').VoronoiData} */ (
      buildLeafVoronoi(nodes, leaves)
    );

    expect(result.leafEntries).toHaveLength(3);
    const ids = result.leafEntries.map((e) => e.nodeId);
    expect(ids).toEqual(['leaf1', 'leaf2', 'leaf3']);
  });

  it('preserves radius in leaf entries', () => {
    const nodes = [
      { x: 10, y: 20, radius: 7, node: { id: 'a' } },
      { x: 30, y: 40, radius: 3, node: { id: 'b' } },
    ];
    const leaves = new Set(['a', 'b']);
    const result = /** @type {import('$lib/voronoiHover.js').VoronoiData} */ (
      buildLeafVoronoi(nodes, leaves)
    );

    expect(result.leafEntries[0]).toEqual({
      x: 10,
      y: 20,
      radius: 7,
      nodeId: 'a',
    });
    expect(result.leafEntries[1]).toEqual({
      x: 30,
      y: 40,
      radius: 3,
      nodeId: 'b',
    });
  });
});

// ── findHoveredLeafByVoronoi ────────────────────────────────────────────────

describe('findHoveredLeafByVoronoi', () => {
  // Two leaves far apart for unambiguous nearest-neighbour results
  const nodes = [
    { x: 0, y: 0, radius: 10, node: { id: 'root' } },
    { x: 100, y: 100, radius: 5, node: { id: 'leafA' } },
    { x: 300, y: 300, radius: 8, node: { id: 'leafB' } },
  ];
  const leaves = new Set(['leafA', 'leafB']);
  const voronoiData =
    /** @type {import('$lib/voronoiHover.js').VoronoiData} */ (
      buildLeafVoronoi(nodes, leaves)
    );

  it('returns null for null voronoiData', () => {
    expect(
      findHoveredLeafByVoronoi(100, 100, /** @type {any} */ (null), 20),
    ).toBeNull();
  });

  it('returns leaf id when point is exactly at leaf center', () => {
    expect(findHoveredLeafByVoronoi(100, 100, voronoiData, 20)).toBe('leafA');
  });

  it('returns leaf id when point is within radius (no tolerance needed)', () => {
    // leafA at (100,100) with radius 5 — point at (104, 100) is distance 4
    expect(findHoveredLeafByVoronoi(104, 100, voronoiData, 0)).toBe('leafA');
  });

  it('returns leaf id when point is outside radius but within tolerance', () => {
    // leafA at (100,100) with radius 5 — point at (120, 100) is distance 20
    // radius + tolerance = 5 + 20 = 25 > 20 ✓
    expect(findHoveredLeafByVoronoi(120, 100, voronoiData, 20)).toBe('leafA');
  });

  it('returns null when point is outside radius + tolerance', () => {
    // leafA at (100,100) with radius 5 — point at (130, 100) is distance 30
    // radius + tolerance = 5 + 20 = 25 < 30 ✗
    expect(findHoveredLeafByVoronoi(130, 100, voronoiData, 20)).toBeNull();
  });

  it('returns the nearest leaf when between two leaves', () => {
    // Midpoint between leafA (100,100) and leafB (300,300) is (200,200)
    // Point slightly closer to leafA
    expect(findHoveredLeafByVoronoi(190, 190, voronoiData, 200)).toBe('leafA');
  });

  it('returns leafB when closer to it', () => {
    // Point at (290, 290) is distance ~14.1 from leafB(300,300)
    // radius(8) + tolerance(20) = 28 > 14.1 ✓
    expect(findHoveredLeafByVoronoi(290, 290, voronoiData, 20)).toBe('leafB');
  });

  it('respects per-leaf radius differences', () => {
    // leafA has radius 5, leafB has radius 8
    // With tolerance=0, point must be within the leaf's own radius
    // Point at (307, 300) is distance 7 from leafB — within radius 8
    expect(findHoveredLeafByVoronoi(307, 300, voronoiData, 0)).toBe('leafB');
    // Point at (309, 300) is distance 9 from leafB — outside radius 8
    expect(findHoveredLeafByVoronoi(309, 300, voronoiData, 0)).toBeNull();
  });

  it('tolerance extends the effective radius per leaf', () => {
    // leafA radius=5, tolerance=10 → effective=15
    // Point at (114, 100) is distance 14 from leafA — within 15 ✓
    expect(findHoveredLeafByVoronoi(114, 100, voronoiData, 10)).toBe('leafA');
    // Point at (116, 100) is distance 16 from leafA — outside 15 ✗
    expect(findHoveredLeafByVoronoi(116, 100, voronoiData, 10)).toBeNull();
  });

  it('works with zero tolerance (same as radius-only check)', () => {
    // At center: within radius
    expect(findHoveredLeafByVoronoi(100, 100, voronoiData, 0)).toBe('leafA');
    // Just outside radius
    expect(findHoveredLeafByVoronoi(106, 100, voronoiData, 0)).toBeNull();
  });
});
