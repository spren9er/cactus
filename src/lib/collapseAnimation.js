/**
 * Collapse/Expand animation utilities for CactusTree.
 *
 * Pure utility functions for managing collapse state and computing
 * animated positions. No side effects or DOM dependencies.
 */

/**
 * Ease-in-out cubic easing function.
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} Eased value between 0 and 1
 */
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Recursively collect all descendant node IDs of a given node.
 * @param {string} nodeId - The parent node ID
 * @param {Map<string, Array<{id: string, node: {id: string}}>>} parentToChildrenNodeMap - Map of parent ID to children node data
 * @returns {string[]} Array of all descendant node IDs
 */
export function getDescendantIds(nodeId, parentToChildrenNodeMap) {
  const descendants = [];
  const stack = [nodeId];

  while (stack.length > 0) {
    const currentId = /** @type {string} */ (stack.pop());
    const children = parentToChildrenNodeMap.get(currentId);
    if (!children) continue;

    for (const child of children) {
      const childId = child.node ? child.node.id : child.id;
      descendants.push(childId);
      stack.push(childId);
    }
  }

  return descendants;
}

/**
 * Compute position overrides for all currently collapsed subtrees.
 * Descendants of collapsed nodes get their positions set to the
 * collapsed parent's position. Node sizes (radii) are preserved.
 *
 * @param {Set<string>} collapsedNodeIds - Set of explicitly collapsed node IDs
 * @param {Map<string, Array<{id: string, node: {id: string}}>>} parentToChildrenNodeMap - Parent-to-children map
 * @param {Map<string, {x: number, y: number}>} nodeIdToRenderedNodeMap - Node ID to rendered node data
 * @returns {Map<string, {x: number, y: number}>} Position overrides
 */
export function computeCollapsedPositions(
  collapsedNodeIds,
  parentToChildrenNodeMap,
  nodeIdToRenderedNodeMap,
) {
  const overrides = new Map();

  for (const collapsedId of collapsedNodeIds) {
    const anchorNode = nodeIdToRenderedNodeMap.get(collapsedId);
    if (!anchorNode) continue;

    const descendantIds = getDescendantIds(
      collapsedId,
      parentToChildrenNodeMap,
    );
    for (const id of descendantIds) {
      overrides.set(id, { x: anchorNode.x, y: anchorNode.y });
    }
  }

  return overrides;
}
