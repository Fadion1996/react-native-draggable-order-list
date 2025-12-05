// /src/types/index.ts

import { SharedValue } from 'react-native-reanimated';

/**
 * TItem: Base interface required for any data item used in the list.
 * The 'id' field is mandatory for stable key extraction and Reanimated logic.
 */
export interface TItem {
  id: string | number;
  [key: string]: any;
}

/**
 * TPositions: A map used by Reanimated to track the visual order of items.
 * Key: Item ID (string). Value: Current numerical index/position.
 */
export type TPositions = { [key: string]: number };

/**
 * THeights: A map used by Reanimated to track the height of each item.
 * Necessary for variable-height list support and accurate swap calculations.
 */
export type THeights = { [key: string]: number };

/**
 * TAutoScrollDirection: Defines the current state of auto-scrolling.
 */
export type TAutoScrollDirection = 'up' | 'down' | 'stop';

/**
 * DraggableListRef: Interface for the imperative handle, allowing parent components
 * to access the current, final ordered data on the JS thread without re-rendering.
 */
export interface DraggableListRef<T> {
  getCurrentData: () => T[];
}