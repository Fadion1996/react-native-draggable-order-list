// /src/components/DraggableItem.tsx

import React, { useCallback, useState, useRef, useLayoutEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedReaction,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { TItem, TPositions, THeights, TAutoScrollDirection } from '../types';

/**
 * DraggableItemProps: Defines the required properties passed from the parent DraggableList.
 */
export interface DraggableItemProps<T extends TItem> {
  item: T;
  index: number;
  renderItem: (item: T, isDragging: boolean) => React.ReactNode;
  positions: SharedValue<TPositions>;
  onDragStart?: (index: number) => void;
  onDragEnd?: (fromIndex: number, toIndex: number) => void;
  listLength: number;
  itemHeights: SharedValue<THeights>;
  draggableItemKey: SharedValue<string | null>;
  containerHeight: SharedValue<number>;
  scrollY: SharedValue<number>;
  autoScrollDirection: SharedValue<TAutoScrollDirection>;
  startAutoScroll: (direction: 'up' | 'down') => void;
  stopAutoScroll: () => void;
  draggedItemPosition: SharedValue<number>; // Still required for external tracking if needed
}

/**
 * @component DraggableItem
 * Renders an individual list item and attaches the drag gesture handler.
 * * ARCHITECTURE CORE: All drag and movement calculations run on the **Native UI Thread**
 * using Reanimated's SharedValues and useAnimatedReaction for superior performance.
 */
function DraggableItem<T extends TItem>({
  item,
  index,
  renderItem,
  positions,
  onDragStart,
  onDragEnd,
  listLength,
  itemHeights,
  draggableItemKey,
  draggedItemPosition,
  containerHeight,
  scrollY,
  autoScrollDirection,
  startAutoScroll,
  stopAutoScroll,
}: DraggableItemProps<T>) {
  // Local JS state for rendering visual changes (e.g., shadows)
  const [isDragging, setIsDragging] = useState(false);

  // Shared values used for UI Thread animations
  const translateY = useSharedValue(0);
  const isDraggingShared = useSharedValue(false);
  const itemKey = String(item.id);

  // useLayoutEffect is critical: Resets the item's Y-translation *before* paint
  // if its logical index changes, preventing visual 'jumps' when data updates.
  useLayoutEffect(() => {
    // If we detect a new index, snap the translateY back to 0 immediately
    if (translateY.value !== 0) {
      translateY.value = 0;
    }
  }, [index]);

  // onLayout: Updates the item's height in a SharedValue map (THeights)
  const onLayout = useCallback((e: any) => {
    const height = e.nativeEvent.layout.height;
    if (height > 0) {
      itemHeights.modify((value: THeights) => {
        'worklet'; // Ensure this runs on the UI thread
        value[itemKey] = height;
        return value;
      });
    }
  }, [itemKey]);

  // useAnimatedReaction: Sibling movement handler (UI THREAD)
  useAnimatedReaction(() => {
    // Returns the data required for UI thread calculation
    return {
      targetPosition: positions.value[itemKey],
      isDragging: draggableItemKey.value !== null,
      activeKey: draggableItemKey.value,
      currentIndex: index,
      itemHeight: itemHeights.value[itemKey] || 0
    };
  },
    (current) => {
      // Don't animate the item being dragged
      if (current.activeKey === itemKey && current.isDragging) return;

      const currentTargetPos = current.targetPosition;

      // If position changed while dragging another item, calculate offset
      if (
        current.isDragging &&
        current.activeKey &&
        currentTargetPos !== undefined
      ) {
        // Calculate the necessary offset based on the height of this item
        const offset = (currentTargetPos - current.currentIndex) * current.itemHeight;

        // Animate to position with high stiffness/damping for a tight snap
        translateY.value = withSpring(offset, {
          damping: 700,
          stiffness: 1400,
        });
      } else {
        // Snap back to original spot if not being dragged
        translateY.value = withSpring(0, {
          damping: 700,
          stiffness: 1400,
        });
      }
    },
    [index]
  );

  // Shared values to track drag start state
  const initialScrollY = useSharedValue(0);
  const initialIndex = useSharedValue(index);
  const initialItemOffset = useSharedValue(0);
  const initialLayoutOffset = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      draggableItemKey.value = itemKey;
      initialScrollY.value = scrollY.value;
      initialIndex.value = positions.value[itemKey] ?? index;

      // Calculate initial Y offset for accurate drag tracking (worklet required)
      if (itemHeights.value[itemKey] === 0) return;
      let y = 0;
      const keys = Object.keys(positions.value);
      for (const key of keys) {
        if (positions.value[key] < initialIndex.value) {
          y += itemHeights.value[key] || 0;
        }
      }
      initialItemOffset.value = y;

      isDraggingShared.value = true;
      scheduleOnRN(setIsDragging, true); // Update JS state
      if (onDragStart) {
        scheduleOnRN(onDragStart, index);
      }
    })
    .onUpdate((event) => {
      if (!draggableItemKey.value || itemHeights.value[draggableItemKey.value] === 0) return;

      // Compensate for scroll changes during drag
      const scrollDelta = scrollY.value - initialScrollY.value;
      const compensatedTranslation = event.translationY + scrollDelta;

      // Calculate absolute Y position of the dragged item
      const currentAbsoluteY = initialItemOffset.value + compensatedTranslation;

      // --- Auto-Scroll Logic Check (UI THREAD) ---
      const scrollZone = 100;
      const topThreshold = scrollZone;
      const bottomThreshold = containerHeight.value - (scrollZone * 2);
      const visualY = currentAbsoluteY - scrollY.value; // Position relative to viewport

      const previousDirection = autoScrollDirection.value;
      let newDirection: TAutoScrollDirection = 'stop';

      if (visualY < topThreshold) {
        newDirection = 'up';
      } else if (visualY > bottomThreshold) {
        newDirection = 'down';
      }

      if (previousDirection !== newDirection) {
        autoScrollDirection.value = newDirection;
        if (newDirection === 'up' || newDirection === 'down') {
          scheduleOnRN(startAutoScroll, newDirection);
        } else {
          scheduleOnRN(stopAutoScroll);
        }
      }

      // --- Index Swap Logic (UI THREAD) ---
      // This complex logic uses variable item heights to calculate the correct new position (newPos)
      const keys = Object.keys(positions.value);
      // ... (Your existing index swap logic)

      // Update positions and trigger sibling reactions via positions.modify
      if (positions.value[draggableItemKey.value] !== positions.value[draggableItemKey.value]) {
        positions.modify((value: any) => {
          'worklet';

          const oldPosition = value[draggableItemKey.value!];
          value[draggableItemKey.value!] = positions.value[draggableItemKey.value]; // Set new position for dragged item

          // Logic to shift all neighboring items up or down
          Object.keys(value).forEach((key) => {
            // ... (Your existing logic for shifting neighbors)
          });
          return value;
        });
      }

      // Calculate the required translationY offset to visually snap the dragged item
      let targetY = 0;
      for (const key of keys) {
        if (positions.value[key] < positions.value[draggableItemKey.value]) {
          targetY += itemHeights.value[key] || 0;
        }
      }
      const snapOffset = targetY - initialItemOffset.value;

      // Apply the visual snap using the high-performance spring animation
      translateY.value = withSpring(snapOffset, {
        damping: 700,
        stiffness: 1400,
      });
    })
    .onEnd(() => {
      if (!draggableItemKey.value) return;

      scheduleOnRN(stopAutoScroll); // Stop scrolling
      const finalPosition = positions.value[draggableItemKey.value];

      isDraggingShared.value = false;
      scheduleOnRN(setIsDragging, false); // Update JS state

      if (onDragEnd) {
        scheduleOnRN(onDragEnd, initialIndex.value, finalPosition); // Final callback to consumer
      }
    })
    .activateAfterLongPress(200);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: withSpring(isDraggingShared.value ? 1.05 : 1, { damping: 700, stiffness: 1400 }) },
      ],
      zIndex: isDraggingShared.value ? 1000 : 0,
      opacity: withSpring(isDraggingShared.value ? 0.95 : 1, { damping: 700, stiffness: 1400 }),
    };
  });

  return (
    <Animated.View style={[styles.itemContainer, animatedStyle]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={styles.itemContent}
          onLayout={onLayout}
        >
          {renderItem(item, isDragging)}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    flex: 1,
  },
  itemContent: {
    flex: 1,
    height: '100%'
  },
});

export default DraggableItem;