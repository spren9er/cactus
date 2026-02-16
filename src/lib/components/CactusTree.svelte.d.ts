import type { Component } from 'svelte';
import type { Options, Styles } from '$lib/types.js';

interface Props {
  width: number;
  height: number;
  nodes: any[];
  edges?: any[];
  options?: Options;
  styles?: Styles;
  pannable?: boolean;
  zoomable?: boolean;
  collapsible?: boolean;
}

declare const CactusTree: Component<Props>;

export default CactusTree;
