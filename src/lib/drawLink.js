/**
 * Link drawing utilities for CactusTree
 *
 * Draws connecting links between parent and child nodes (visible when overlap < 0).
 */

import { setCanvasStyles, colorWithAlpha } from './canvasUtils.js';
import { resolveDepthStyle } from './drawNode.js';

/**
 * Draw connecting links between parent & child nodes (for overlap < 0 case).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<any>} renderedNodes
 * @param {Map<string, any[]>} parentToChildrenNodeMap
 * @param {any} mergedStyle
 * @param {Map<number, any>} depthStyleCache
 * @param {number} overlap
 * @param {Map<number, Set<string>>} negativeDepthNodes
 */
export function drawConnectingLinks(
  ctx,
  renderedNodes,
  parentToChildrenNodeMap,
  mergedStyle,
  depthStyleCache,
  overlap,
  negativeDepthNodes,
) {
  if (!ctx || overlap >= 0 || !renderedNodes || renderedNodes.length === 0)
    return;

  for (const nodeData of renderedNodes) {
    const { x, y, node, depth } = nodeData;
    const children =
      (parentToChildrenNodeMap && parentToChildrenNodeMap.get(node.id)) || [];
    for (const child of children) {
      const depthStyle = resolveDepthStyle(
        depth,
        node.id,
        mergedStyle,
        depthStyleCache,
        negativeDepthNodes,
      );

      const lineWidth =
        depthStyle?.link?.strokeWidth ?? mergedStyle?.link?.strokeWidth ?? 0;
      const lineColor =
        depthStyle?.link?.strokeColor ??
        mergedStyle?.link?.strokeColor ??
        'none';
      const lineOpacity =
        depthStyle?.link?.strokeOpacity ??
        mergedStyle?.link?.strokeOpacity ??
        1;

      if (lineWidth > 0 && lineColor !== 'none') {
        const prevStroke = ctx.strokeStyle;
        const prevWidthLocal = ctx.lineWidth;
        const strokeStyleWithAlpha = colorWithAlpha(lineColor, lineOpacity);
        setCanvasStyles(ctx, {
          strokeStyle: strokeStyleWithAlpha,
          lineWidth,
        });
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(child.x, child.y);
        ctx.stroke();
        if (ctx.lineWidth !== prevWidthLocal) ctx.lineWidth = prevWidthLocal;
        if (ctx.strokeStyle !== prevStroke) ctx.strokeStyle = prevStroke;
      }
    }
  }
}
