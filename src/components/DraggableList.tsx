// /src/components/DraggableList.tsx

import React, { useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  LayoutAnimationConfig,
} from 'react-native-reanimated';
import { TItem, TPositions, THeights, DraggableListRef, TAutoScrollDirection } from '../types';
import DraggableItem from './DraggableItem';
import { useAutoScroll } from '../hooks/useAutoScroll';

/**
 * DraggableListProps: Public interface for the component props.
 */
export interface DraggableListProps<T extends TItem> {
  data: T[];
  renderItem: (item: T, isDragging: boolean) => React.ReactNode;
  keyExtractor: (item: T) => string;
  contentContainerStyle?: ViewStyle;
  autoScrollSpeed?: number;
}

/**
 * @component DraggableList
 * The main container component. Wraps Animated.FlatList and manages the global state 
 * (Shared Values) that are passed to all children (DraggableItem).
 */
const DraggableList = forwardRef(function DraggableList<T extends TItem>(
  {
    data,
    renderItem,
    keyExtractor,
    contentContainerStyle,
    autoScrollSpeed = 8,
  }: DraggableListProps<T>,
  ref: React.Ref<DraggableListRef<T>>
) {
  // --- JS Thread State (Refs) ---
  // currentOrderRef: Holds the final, calculated logical order after a drag,
  // without triggering a component re-render.
  const currentOrderRef = useRef<T[]>(data);

  // --- UI Thread State (Shared Values) ---
  const draggableItemKey = useSharedValue<string | null>(null);
  const draggedItemPosition = useSharedValue<number>(-1);
  const positions = useSharedValue<TPositions>({});
  const itemHeights = useSharedValue<THeights>({});
  const containerHeight = useSharedValue<number>(0);
  const autoScrollDirection = useSharedValue<TAutoScrollDirection>('stop');
  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(0);

  const animatedRef = useAnimatedRef<Animated.FlatList<any>>();

  // --- Hooks ---
  const { startAutoScroll, stopAutoScroll } = useAutoScroll(
    animatedRef,
    scrollY,
    contentHeight,
    containerHeight,
    autoScrollDirection,
    autoScrollSpeed
  );

  /**
   * @function handleDragEnd
   * CALLED ONCE on the JS thread after the drag animation is complete.
   * Updates the internal currentOrderRef with the new logical order.
   */
  const handleDragEnd = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    // Perform the array manipulation on the data copy
    const newData = [...currentOrderRef.current];
    const [movedItem] = newData.splice(fromIndex, 1);
    newData.splice(toIndex, 0, movedItem);

    // Update the ref. The consumer can get this via ref.getCurrentData()
    currentOrderRef.current = newData;
  }, []);

  // --- Layout and Scroll Handlers ---

  // Sync ref when data prop updates (initial load or after external Save)
  useEffect(() => {
    currentOrderRef.current = data;

    // Initialize positions map based on fresh data
    const map: TPositions = {};
    data.forEach((item, index) => {
      map[String(item.id)] = index;
    });
    positions.value = map;
  }, [data]);

  // Expose the sorted data to the parent via Ref
  useImperativeHandle(ref, () => ({
    getCurrentData: () => {
      return currentOrderRef.current;
    },
  }));

  const onContainerLayout = useCallback((event: any) => {
    containerHeight.value = event.nativeEvent.layout.height;
  }, []);

  const onContentSizeChange = useCallback((_: number, height: number) => {
    contentHeight.value = height;
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    }
  });

  // --- Render ---

  // renderDraggableItem: Renders each DraggableItem and passes all required SharedValues
  const renderDraggableItem = useCallback(({ item, index }: { item: T; index: number }) => (
    <DraggableItem
      item={item}
      index={index}
      renderItem={renderItem}
      positions={positions}
      onDragEnd={handleDragEnd}
      listLength={currentOrderRef.current.length}
      itemHeights={itemHeights}
      draggableItemKey={draggableItemKey}
      draggedItemPosition={draggedItemPosition}
      containerHeight={containerHeight}
      scrollY={scrollY}
      autoScrollDirection={autoScrollDirection}
      startAutoScroll={startAutoScroll}
      stopAutoScroll={stopAutoScroll}
    />
  ), [renderItem, positions, handleDragEnd, startAutoScroll, stopAutoScroll]);

  return (
    // skipEntering/Exiting is crucial to prevent the flickering/fading of items 
    // when their index changes.
    <LayoutAnimationConfig skipEntering skipExiting>
      <Animated.FlatList
        ref={animatedRef}
        data={data}
        renderItem={renderDraggableItem}
        keyExtractor={keyExtractor}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={[styles.contentContainer, contentContainerStyle]}

        // Critical performance optimization settings for FlatList
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}

        onLayout={onContainerLayout}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        onContentSizeChange={onContentSizeChange}
      />
    </LayoutAnimationConfig>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    // Add any default content container styles if necessary
  },
});

export default DraggableList;