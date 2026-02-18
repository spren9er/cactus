/**
 * Mouse and touch interaction handlers for CactusTree
 * Handles pan, zoom, hover, and other mouse/touch interactions
 */

import { findHoveredNode } from './drawNode.js';
import { findHoveredLeafByVoronoi } from './voronoiHover.js';

/**
 * Gets coordinates from mouse or touch event
 * @param {MouseEvent|Touch} event - Mouse event or touch object
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {{ x: number, y: number }} Coordinates relative to canvas
 */
function getEventCoordinates(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

/**
 * Handles panning logic for both mouse and touch
 * @param {Object} state - Component state
 * @param {number} currentX - Current X coordinate
 * @param {number} currentY - Current Y coordinate
 * @param {Function} scheduleRender - Render scheduling function
 */
function handlePanning(
  /** @type {any} */ state,
  /** @type {number} */ currentX,
  /** @type {number} */ currentY,
  /** @type {Function} */ scheduleRender,
) {
  if (!state.isDragging || !state.pannable) return;

  const deltaX = currentX - state.lastMouseX;
  const deltaY = currentY - state.lastMouseY;
  state.panX += deltaX;
  state.panY += deltaY;
  state.lastMouseX = currentX;
  state.lastMouseY = currentY;
  scheduleRender();
}

/**
 * Handles zoom logic for both wheel and pinch
 * @param {Object} state - Component state
 * @param {number} zoomFactor - Zoom multiplication factor
 * @param {number} centerX - X coordinate to zoom toward
 * @param {number} centerY - Y coordinate to zoom toward
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Function} scheduleRender - Render scheduling function
 * @returns {boolean} Whether zoom was applied
 */
function handleZoom(
  /** @type {any} */ state,
  /** @type {number} */ zoomFactor,
  /** @type {number} */ centerX,
  /** @type {number} */ centerY,
  /** @type {number} */ width,
  /** @type {number} */ height,
  /** @type {Function} */ scheduleRender,
) {
  if (!state.zoomable) return false;

  const proposedZoom = state.currentZoom * zoomFactor;

  // Check zoom bounds
  if (
    (proposedZoom > state.maxZoomLimit &&
      state.currentZoom >= state.maxZoomLimit) ||
    (proposedZoom < state.minZoomLimit &&
      state.currentZoom <= state.minZoomLimit)
  ) {
    return false;
  }

  const newZoom = Math.max(
    state.minZoomLimit,
    Math.min(state.maxZoomLimit, proposedZoom),
  );

  // Calculate zoom-to-point: keep the world point under the center fixed
  const canvasCenterX = width / 2;
  const canvasCenterY = height / 2;

  const worldX = (centerX - canvasCenterX - state.panX) / state.currentZoom;
  const worldY = (centerY - canvasCenterY - state.panY) / state.currentZoom;

  state.panX = centerX - canvasCenterX - worldX * newZoom;
  state.panY = centerY - canvasCenterY - worldY * newZoom;
  state.currentZoom = newZoom;

  scheduleRender();
  return true;
}

/**
 * Handles hover detection logic for both mouse and touch
 * @param {Object} state - Component state
 * @param {number} x - X coordinate relative to canvas
 * @param {number} y - Y coordinate relative to canvas
 * @param {Function} scheduleRender - Render scheduling function
 */
function handleHoverDetection(
  /** @type {any} */ state,
  /** @type {number} */ x,
  /** @type {number} */ y,
  /** @type {Function} */ scheduleRender,
) {
  if (!state.renderedNodes.length) return;

  // Transform coordinates to account for pan
  const transformedX = x - state.panX;
  const transformedY = y - state.panY;

  // Find which node is being hovered/tapped (exact point-in-circle)
  let newHoveredNodeId = findHoveredNode(
    transformedX,
    transformedY,
    state.renderedNodes,
  );

  // Fallback: use Voronoi-based proximity for leaf nodes
  if (newHoveredNodeId === null && state.voronoiData) {
    newHoveredNodeId = findHoveredLeafByVoronoi(
      transformedX,
      transformedY,
      state.voronoiData,
      state.leafHoverTolerance ?? 15,
    );
  }

  // Only re-render if hover state changed
  if (newHoveredNodeId !== state.hoveredNodeId) {
    state.hoveredNodeId = newHoveredNodeId;
    scheduleRender();
  }
}

/**
 * Creates mouse move handler
 * @param {{ canvas: HTMLCanvasElement, hoveredNodeId: string|null, renderedNodes: Array<any>, isDragging: boolean, pannable: boolean, panX: number, panY: number, currentZoom: number, lastMouseX: number, lastMouseY: number }} state - Component state object
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Function} scheduleRender - Function to schedule a re-render
 * @returns {function(MouseEvent): void} Mouse move event handler
 */
export function createMouseMoveHandler(state, width, height, scheduleRender) {
  return function handleMouseMove(/** @type {MouseEvent} */ event) {
    if (!state.canvas) return;

    const coords = getEventCoordinates(event, state.canvas);

    // Handle panning
    handlePanning(state, coords.x, coords.y, scheduleRender);

    state.lastMouseX = coords.x;
    state.lastMouseY = coords.y;

    // Handle hovering (only if not dragging)
    if (!state.isDragging) {
      handleHoverDetection(state, coords.x, coords.y, scheduleRender);
    }
  };
}

/**
 * Creates mouse down handler
 * @param {{ canvas: HTMLCanvasElement, isDragging: boolean, pannable: boolean, lastMouseX: number, lastMouseY: number, _mouseDownX: number, _mouseDownY: number }} state - Component state object
 * @returns {function(MouseEvent): void} Mouse down event handler
 */
export function createMouseDownHandler(state) {
  return function handleMouseDown(/** @type {MouseEvent} */ event) {
    const coords = getEventCoordinates(event, state.canvas);

    // Record position for click detection
    state._mouseDownX = coords.x;
    state._mouseDownY = coords.y;

    if (!state.pannable) return;

    state.isDragging = true;
    state.lastMouseX = coords.x;
    state.lastMouseY = coords.y;

    // Prevent text selection during drag
    event.preventDefault();
  };
}

/**
 * Creates mouse up handler with click detection
 * @param {{ isDragging: boolean, canvas: HTMLCanvasElement, _mouseDownX: number, _mouseDownY: number, panX: number, panY: number, renderedNodes: any[], onNodeClick?: function(string): void }} state - Component state object
 * @returns {function(MouseEvent): void} Mouse up event handler
 */
export function createMouseUpHandler(state) {
  return function handleMouseUp(/** @type {MouseEvent} */ event) {
    state.isDragging = false;

    // Click detection: minimal movement from mousedown position
    if (state._mouseDownX !== undefined && state.canvas && state.onNodeClick) {
      const coords = getEventCoordinates(event, state.canvas);
      const dx = coords.x - state._mouseDownX;
      const dy = coords.y - state._mouseDownY;

      if (dx * dx + dy * dy < 25) {
        const transformedX = coords.x - state.panX;
        const transformedY = coords.y - state.panY;
        const clickedNodeId = findHoveredNode(
          transformedX,
          transformedY,
          state.renderedNodes,
        );

        if (clickedNodeId !== null) {
          state.onNodeClick(clickedNodeId);
        }
      }
    }
  };
}

/**
 * Creates mouse leave handler
 * @param {{ isDragging: boolean, hoveredNodeId: string|null }} state - Component state object
 * @param {Function} scheduleRender - Function to schedule a re-render
 * @returns {function(): void} Mouse leave event handler
 */
export function createMouseLeaveHandler(state, scheduleRender) {
  return function handleMouseLeave() {
    state.isDragging = false;
    if (state.hoveredNodeId !== null) {
      state.hoveredNodeId = null;
      scheduleRender();
    }
  };
}

/**
 * Creates wheel handler for zoom functionality
 * @param {{ canvas: HTMLCanvasElement, zoomable: boolean, currentZoom: number, minZoomLimit: number, maxZoomLimit: number, panX: number, panY: number }} state - Component state object
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Function} scheduleRender - Function to schedule a re-render
 * @returns {function(WheelEvent): void} Wheel event handler
 */
export function createWheelHandler(state, width, height, scheduleRender) {
  return function handleWheel(/** @type {WheelEvent} */ event) {
    if (!state.canvas) return;

    event.preventDefault();

    const coords = getEventCoordinates(event, state.canvas);
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

    handleZoom(
      state,
      zoomFactor,
      coords.x,
      coords.y,
      width,
      height,
      scheduleRender,
    );
  };
}

/**
 * Creates touch start handler
 * @param {{ canvas: HTMLCanvasElement, isDragging: boolean, pannable: boolean, zoomable: boolean, lastMouseX: number, lastMouseY: number, touches: Touch[], lastTouchDistance: number, renderedNodes: any[] }} state - Component state object
 * @returns {function(TouchEvent): void} Touch start event handler
 */
export function createTouchStartHandler(
  /** @type {any} */ state,
  /** @type {Function} */ scheduleRender,
) {
  return function handleTouchStart(/** @type {TouchEvent} */ event) {
    event.preventDefault();

    const touches = /** @type {Touch[]} */ (Array.from(event.touches));
    state.touches = touches;

    if (touches.length === 1) {
      const coords = getEventCoordinates(touches[0], state.canvas);

      // Record position for tap detection
      state._touchStartX = coords.x;
      state._touchStartY = coords.y;

      if (state.pannable) {
        // Single touch - start panning
        state.isDragging = true;
        state.lastMouseX = coords.x;
        state.lastMouseY = coords.y;
      }

      // Handle hover detection for single touch (tap to highlight)
      handleHoverDetection(state, coords.x, coords.y, scheduleRender);
    } else if (touches.length === 2 && state.zoomable) {
      // Two touches - start pinch zoom
      const touch1 = getEventCoordinates(touches[0], state.canvas);
      const touch2 = getEventCoordinates(touches[1], state.canvas);
      state.lastTouchDistance = Math.sqrt(
        Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2),
      );
    }
  };
}

/**
 * Creates touch move handler
 * @param {{ canvas: HTMLCanvasElement, isDragging: boolean, pannable: boolean, zoomable: boolean, panX: number, panY: number, currentZoom: number, lastMouseX: number, lastMouseY: number, touches: Touch[], lastTouchDistance: number, minZoomLimit: number, maxZoomLimit: number }} state - Component state object
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Function} scheduleRender - Function to schedule a re-render
 * @returns {function(TouchEvent): void} Touch move event handler
 */
export function createTouchMoveHandler(state, width, height, scheduleRender) {
  return function handleTouchMove(/** @type {TouchEvent} */ event) {
    event.preventDefault();

    const touches = /** @type {Touch[]} */ (Array.from(event.touches));

    if (touches.length === 1 && state.isDragging && state.pannable) {
      // Single touch panning
      const coords = getEventCoordinates(touches[0], state.canvas);
      handlePanning(state, coords.x, coords.y, scheduleRender);
    } else if (touches.length === 2 && state.zoomable) {
      // Pinch zoom
      const touch1 = getEventCoordinates(touches[0], state.canvas);
      const touch2 = getEventCoordinates(touches[1], state.canvas);
      const currentDistance = Math.sqrt(
        Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2),
      );

      if (state.lastTouchDistance > 0) {
        const zoomFactor = currentDistance / state.lastTouchDistance;
        const centerX = (touch1.x + touch2.x) / 2;
        const centerY = (touch1.y + touch2.y) / 2;

        handleZoom(
          state,
          zoomFactor,
          centerX,
          centerY,
          width,
          height,
          scheduleRender,
        );
      }

      state.lastTouchDistance = currentDistance;
    }
  };
}

/**
 * Creates touch end handler with tap detection
 * @param {{ isDragging: boolean, touches: Touch[], lastTouchDistance: number, pannable: boolean, canvas: HTMLCanvasElement, lastMouseX: number, lastMouseY: number, _touchStartX: number, _touchStartY: number, panX: number, panY: number, renderedNodes: any[], onNodeClick?: function(string): void }} state - Component state object
 * @returns {function(TouchEvent): void} Touch end event handler
 */
export function createTouchEndHandler(state) {
  return function handleTouchEnd(/** @type {TouchEvent} */ event) {
    event.preventDefault();

    const changedTouches = event.changedTouches
      ? Array.from(event.changedTouches)
      : [];
    const touches = /** @type {Touch[]} */ (Array.from(event.touches));
    state.touches = touches;

    if (touches.length === 0) {
      // No more touches
      state.isDragging = false;
      state.lastTouchDistance = 0;

      // Tap detection: single touch ended with minimal movement
      if (
        changedTouches.length === 1 &&
        state._touchStartX !== undefined &&
        state.onNodeClick
      ) {
        const coords = getEventCoordinates(changedTouches[0], state.canvas);
        const dx = coords.x - state._touchStartX;
        const dy = coords.y - state._touchStartY;

        if (dx * dx + dy * dy < 25) {
          const transformedX = coords.x - state.panX;
          const transformedY = coords.y - state.panY;
          const tappedNodeId = findHoveredNode(
            transformedX,
            transformedY,
            state.renderedNodes,
          );

          if (tappedNodeId !== null) {
            state.onNodeClick(tappedNodeId);
          }
        }
      }
    } else if (touches.length === 1) {
      // Down to one touch - reset for potential panning
      state.lastTouchDistance = 0;
      if (state.pannable) {
        const coords = getEventCoordinates(touches[0], state.canvas);
        state.lastMouseX = coords.x;
        state.lastMouseY = coords.y;
        state.isDragging = true;
      }
    }
  };
}

/**
 * Creates all mouse and touch event handlers for the CactusTree component
 * @param {{ canvas: HTMLCanvasElement, hoveredNodeId: string|null, renderedNodes: any[], isDragging: boolean, pannable: boolean, zoomable: boolean, panX: number, panY: number, currentZoom: number, lastMouseX: number, lastMouseY: number, minZoomLimit: number, maxZoomLimit: number, touches: Touch[], lastTouchDistance: number }} state - Component state object
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Function} scheduleRender - Function to schedule a re-render
 * @returns {{ onMouseMove: function(MouseEvent): void, onMouseDown: function(MouseEvent): void, onMouseUp: function(MouseEvent): void, onMouseLeave: function(): void, onWheel: function(WheelEvent): void, onTouchStart: function(TouchEvent): void, onTouchMove: function(TouchEvent): void, onTouchEnd: function(TouchEvent): void }} Object containing all mouse and touch event handlers
 */
export function createMouseHandlers(
  /** @type {any} */ state,
  /** @type {number} */ width,
  /** @type {number} */ height,
  /** @type {Function} */ scheduleRender,
) {
  return {
    onMouseMove: createMouseMoveHandler(state, width, height, scheduleRender),
    onMouseDown: createMouseDownHandler(state),
    onMouseUp: createMouseUpHandler(state),
    onMouseLeave: createMouseLeaveHandler(state, scheduleRender),
    onWheel: createWheelHandler(state, width, height, scheduleRender),
    onTouchStart: createTouchStartHandler(state, scheduleRender),
    onTouchMove: createTouchMoveHandler(state, width, height, scheduleRender),
    onTouchEnd: createTouchEndHandler(state),
  };
}
