// /src/hooks/useAutoScroll.ts

import { useCallback, useEffect, useRef } from 'react';
import { SharedValue, useAnimatedRef } from 'react-native-reanimated';
import { TAutoScrollDirection } from '../types';

/**
 * @hook useAutoScroll
 * Manages the logic for automatically scrolling the FlatList when the dragged item
 * approaches the edge of the container.
 * * ARCHITECTURE NOTE: Auto-scrolling is handled via a JS-thread setInterval,
 * as Reanimated's scroll commands need to be invoked from the JS side.
 */
export const useAutoScroll = (
  animatedRef: React.MutableRefObject<any>,
  scrollY: SharedValue<number>,
  contentHeight: SharedValue<number>,
  containerHeight: SharedValue<number>,
  autoScrollDirection: SharedValue<TAutoScrollDirection>,
  autoScrollSpeed: number = 8
) => {
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * @function startAutoScroll
   * Clears any existing interval and starts a new one to scroll the list periodically.
   */
  const startAutoScroll = useCallback((direction: 'up' | 'down') => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }

    // Set the scroll interval (~60fps)
    scrollIntervalRef.current = setInterval(() => {
      const currentScroll = scrollY.value;
      const maxScroll = Math.max(0, contentHeight.value - containerHeight.value);

      let newScroll: number;
      if (direction === 'up') {
        newScroll = Math.max(0, currentScroll - autoScrollSpeed);
      } else {
        newScroll = Math.min(maxScroll, currentScroll + autoScrollSpeed);
      }

      // Stop if boundaries are hit
      if (newScroll === currentScroll) {
        clearInterval(scrollIntervalRef.current!);
        scrollIntervalRef.current = null;
        autoScrollDirection.value = 'stop';
        return;
      }

      // Perform the scroll using the AnimatedRef (crucial: animated: false)
      animatedRef.current?.scrollToOffset({
        offset: newScroll,
        animated: false,
      });
    }, 16);
  }, [autoScrollSpeed]);

  /**
   * @function stopAutoScroll
   * Clears the auto-scroll interval.
   */
  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  return { startAutoScroll, stopAutoScroll };
};