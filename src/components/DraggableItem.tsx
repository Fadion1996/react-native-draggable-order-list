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
function DraggableItem<T extends { id: string | number }>({
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
  const [isDragging, setIsDragging] = useState(false);

  const translateY = useSharedValue(0);
  const isDraggingShared = useSharedValue(false);
  const itemKey = String(item.id);
  const targetPosition = useSharedValue(index); // Track the target position for snapping

  // Track previous index to detect layout updates
  const prevIndex = useRef(index);

  // useLayoutEffect ensures this runs synchronously after the DOM/layout update but before paint
  useLayoutEffect(() => {
    if (prevIndex.current !== index) {
      translateY.value = 0
      targetPosition.value = index;

      prevIndex.current = index;
    }
  }, [index]);

  const onLayout = useCallback((e: any) => {
    const height = e.nativeEvent.layout.height;
    if (height > 0) {
      itemHeights.modify((value: any) => {
        'worklet';
        value[itemKey] = height;
        return value;
      });
    }
  }, [itemKey]);

  // React to position changes for synchronized movement
  useAnimatedReaction(() => {
    return {
      targetPosition: positions.value[itemKey],
      isDragging: draggableItemKey.value !== null,
      activeKey: draggableItemKey.value,
      currentIndex: index,
    };
  },
    (current, previous) => {
      // Don't animate the item being dragged
      if (current.activeKey === itemKey && current.isDragging) return;

      const currentTargetPos = current.targetPosition;

      // If position changed while dragging another item, move synchronously
      if (
        current.isDragging &&
        current.activeKey &&
        currentTargetPos !== undefined &&
        currentTargetPos !== current.currentIndex
      ) {
        // Calculate offset based on the dragged item's height
        const offset = (currentTargetPos - current.currentIndex) * itemHeights.value[itemKey];

        // Snap to position with quick spring animation
        translateY.value = withSpring(offset, {
          damping: 700,
          stiffness: 1400,
        });
      } else if (current.isDragging && currentTargetPos === current.currentIndex) {
        // Snap back to original spot
        translateY.value = withSpring(0, {
          damping: 700,
          stiffness: 1400,
        });
      }
    },
    [index]
  );

  const initialScrollY = useSharedValue(0);
  const initialIndex = useSharedValue(index);
  const initialItemOffset = useSharedValue(0);
  const initialLayoutOffset = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      draggableItemKey.value = itemKey;
      initialScrollY.value = scrollY.value;
      const currentPos = positions.value[itemKey] ?? index;
      initialIndex.value = currentPos;
      targetPosition.value = currentPos;

      if (itemHeights.value[itemKey] === 0) return;

      // Calculate initial layout Y offset
      let y = 0;
      const keys = Object.keys(positions.value);
      for (const key of keys) {
        if (positions.value[key] < currentPos) {
          y += itemHeights.value[key] || 0;
        }
      }
      initialItemOffset.value = y;
      initialLayoutOffset.value = y - translateY.value;

      isDraggingShared.value = true;
      scheduleOnRN(setIsDragging, true);

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

      // Auto-scroll zones (top and bottom of visible area)
      const scrollZone = 100;
      const topThreshold = scrollZone;
      const bottomThreshold = containerHeight.value - (scrollZone * 2);

      const previousDirection = autoScrollDirection.value;

      // Determine scroll direction based on position
      // Use visual position relative to scroll
      const visualY = currentAbsoluteY - scrollY.value;

      if (visualY < topThreshold) {
        autoScrollDirection.value = 'up';
        if (previousDirection !== 'up') {
          scheduleOnRN(startAutoScroll, 'up');
        }
      } else if (visualY > bottomThreshold) {
        autoScrollDirection.value = 'down';
        if (previousDirection !== 'down') {
          scheduleOnRN(startAutoScroll, 'down');
        }
      } else {
        if (previousDirection !== 'stop') {
          autoScrollDirection.value = 'stop';
          scheduleOnRN(stopAutoScroll);
        }
      }

      // Calculate which position this item should occupy based on variable heights
      const keys = Object.keys(positions.value);
      const sortedItems = [];
      for (const key of keys) {
        if (key !== draggableItemKey.value) {
          sortedItems.push({
            key,
            index: positions.value[key],
            height: itemHeights.value[key] || 0
          });
        }
      }
      sortedItems.sort((a, b) => a.index - b.index);

      let newPos = 0;
      let runningY = 0;
      let found = false;

      for (const item of sortedItems) {
        const itemCenterY = runningY + item.height / 2;
        if (currentAbsoluteY < itemCenterY) {
          found = true;
          break;
        }
        runningY += item.height;
        newPos++;
      }

      const newPosition = Math.max(0, Math.min(listLength - 1, newPos));

      draggedItemPosition.value = newPosition;

      // Update positions and snap the dragged item to the calculated position
      if (newPosition !== positions.value[draggableItemKey.value]) {
        positions.modify((value: any) => {
          'worklet';

          const oldPosition = value[draggableItemKey.value!];
          value[draggableItemKey.value!] = newPosition;

          Object.keys(value).forEach((key) => {
            if (draggableItemKey.value && key !== draggableItemKey.value) {
              const itemPos = value[key];
              if (newPosition > oldPosition && itemPos > oldPosition && itemPos <= newPosition) {
                value[key] = itemPos - 1;
              } else if (newPosition < oldPosition && itemPos < oldPosition && itemPos >= newPosition) {
                value[key] = itemPos + 1;
              }
            }
          });

          return value;
        });

        // Update target position
        targetPosition.value = newPosition;
      }

      // Calculate the exact offset for the new position and snap to it
      let targetY = 0;
      for (const key of keys) {
        if (positions.value[key] < newPosition) {
          targetY += itemHeights.value[key] || 0;
        }
      }
      const snapOffset = targetY - initialLayoutOffset.value;

      // Snap to the calculated position with a quick spring
      translateY.value = withSpring(snapOffset, {
        damping: 700,
        stiffness: 1400,
      });
    })
    .onEnd(() => {
      if (!draggableItemKey.value) return;

      // Stop auto-scrolling
      autoScrollDirection.value = 'stop';
      scheduleOnRN(stopAutoScroll);

      const finalPosition = positions.value[draggableItemKey.value];

      isDraggingShared.value = false;
      scheduleOnRN(setIsDragging, false);

      if (onDragEnd) {
        scheduleOnRN(onDragEnd, initialIndex.value, finalPosition);
      }
    })
    .activateAfterLongPress(200);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: translateY.value,
        },
        {
          scale: withSpring(isDraggingShared.value ? 1.05 : 1, {
            damping: 700,
            stiffness: 1400,
          }),
        },
      ],
      zIndex: isDraggingShared.value ? 1000 : 0,
      opacity: withSpring(isDraggingShared.value ? 0.95 : 1, {
        damping: 700,
        stiffness: 1400,
      }),
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