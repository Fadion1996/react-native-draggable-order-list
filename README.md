# react-native-draggable-order-list

🚀 A truly flicker-free, high-performance Draggable FlatList for React Native. Built with Reanimated 4 & Worklets for native UI thread speed. ⚡

| NPM Downloads | GitHub Stars | License |
| :--- | :--- | :--- |
| [![npm downloads badge]](https://www.npmjs.com/package/react-native-draggable-order-list) | [![GitHub stars badge]](https://github.com/Fadion1996/react-native-draggable-order-list) | [![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/Fadion1996/react-native-draggable-order-list/blob/main/LICENSE) |

## ✨ Why Choose react-native-draggable-order-list?

This library eliminates the performance bottleneck common in other solutions by **never updating React state during a drag**. The result is a smooth, 60fps native feel, even when dragging items in lists of thousands.

* **Native UI Thread Animation:** All item movement, scaling, and index-swapping calculations are handled by Reanimated Worklets, bypassing the JavaScript bridge.
* **Variable Height Support:** Accurately calculates swap zones based on the actual measured height of each item.
* **Auto-Scrolling:** Built-in logic to auto-scroll the list when the dragged item hits the viewport edges.
* **Zero Flicker:** Items never fade or flicker during reordering thanks to optimized layout animations.

## 📦 Installation

This library requires `react-native-reanimated` (v4+) and `react-native-gesture-handler`.

```bash
npm install react-native-draggable-order-list react-native-reanimated react-native-gesture-handler react-native-worklets
# or
yarn add react-native-draggable-order-list react-native-reanimated react-native-gesture-handler react-native-worklets
```

### Additional Setup

Make sure to complete the setup for the peer dependencies:

1. **React Native Reanimated**: Follow the [official setup guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/)
2. **React Native Gesture Handler**: Follow the [official setup guide](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation)

## 🚀 Quick Start

Here's a basic example to get you started:

```tsx
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DraggableList, { DraggableListRef, TItem } from 'react-native-draggable-order-list';

interface Task extends TItem {
  id: number;
  text: string;
}

const initialData: Task[] = [
  { id: 1, text: 'First Task' },
  { id: 2, text: 'Second Task' },
  { id: 3, text: 'Third Task' },
];

export default function App() {
  const [data, setData] = useState(initialData);
  const listRef = useRef<DraggableListRef<Task>>(null);

  const handleSaveOrder = () => {
    const finalOrder = listRef.current?.getCurrentData();
    if (finalOrder) {
      setData(finalOrder);
      console.log('Final Order:', finalOrder);
      // Send to your API or Redux store
    }
  };

  return (
    <View style={styles.container}>
      <DraggableList<Task>
        ref={listRef}
        data={data}
        renderItem={(item, isDragging) => (
          <View
            style={[
              styles.item,
              isDragging && styles.itemDragging,
            ]}
          >
            <Text style={styles.itemText}>{item.text}</Text>
          </View>
        )}
        keyExtractor={(item) => String(item.id)}
      />
      
      <TouchableOpacity onPress={handleSaveOrder} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save Order</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  item: {
    height: 60,
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  itemDragging: {
    backgroundColor: '#e0e0ff',
    borderColor: '#4a4ae7',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  itemText: {
    fontSize: 16,
  },
  saveButton: {
    padding: 15,
    backgroundColor: '#4a4ae7',
    borderRadius: 8,
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

## 📚 Examples

### Example 1: Variable Height Items

The library automatically handles items with different heights:

```tsx
interface Note extends TItem {
  id: number;
  title: string;
  content: string;
}

const notes: Note[] = [
  { id: 1, title: 'Short Note', content: 'Brief content' },
  { id: 2, title: 'Long Note', content: 'This is a much longer note with more content...' },
];

<DraggableList<Note>
  data={notes}
  renderItem={(item, isDragging) => (
    <View style={[styles.note, isDragging && styles.noteDragging]}>
      <Text style={styles.noteTitle}>{item.title}</Text>
      <Text style={styles.noteContent}>{item.content}</Text>
    </View>
  )}
  keyExtractor={(item) => String(item.id)}
/>
```

### Example 2: Custom Drag Handle

Add a dedicated drag handle instead of making the entire item draggable:

```tsx
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

<DraggableList<Task>
  data={data}
  renderItem={(item, isDragging) => {
    const panGesture = Gesture.Pan()
      .onStart(() => {
        // Trigger drag start
      });

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemContent}>
          <Text>{item.text}</Text>
        </View>
        <GestureDetector gesture={panGesture}>
          <View style={styles.dragHandle}>
            <Text>☰</Text>
          </View>
        </GestureDetector>
      </View>
    );
  }}
  keyExtractor={(item) => String(item.id)}
/>
```

### Example 3: Custom Auto-Scroll Speed

Adjust the auto-scroll speed for better UX:

```tsx
<DraggableList<Task>
  data={data}
  renderItem={(item, isDragging) => <YourItem item={item} isDragging={isDragging} />}
  keyExtractor={(item) => String(item.id)}
  autoScrollSpeed={12} // Default is 8
/>
```

### Example 4: Custom Content Container Style

Apply custom styles to the list container:

```tsx
<DraggableList<Task>
  data={data}
  renderItem={(item, isDragging) => <YourItem item={item} isDragging={isDragging} />}
  keyExtractor={(item) => String(item.id)}
  contentContainerStyle={{
    paddingHorizontal: 16,
    paddingBottom: 100,
  }}
/>
```

## 📖 API Reference

### DraggableList Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `T[]` | ✅ | - | Array of items to render. Each item must extend `TItem` (have an `id` field) |
| `renderItem` | `(item: T, isDragging: boolean) => ReactNode` | ✅ | - | Function to render each item. Receives the item and dragging state |
| `keyExtractor` | `(item: T) => string` | ✅ | - | Function to extract unique key from each item |
| `contentContainerStyle` | `ViewStyle` | ❌ | - | Style for the FlatList content container |
| `autoScrollSpeed` | `number` | ❌ | `8` | Speed of auto-scrolling when dragging near edges |

### DraggableListRef Methods

Access these methods via ref:

```tsx
const listRef = useRef<DraggableListRef<YourItemType>>(null);

// Get current order without triggering re-render
const currentOrder = listRef.current?.getCurrentData();
```

| Method | Returns | Description |
|--------|---------|-------------|
| `getCurrentData()` | `T[]` | Returns the current order of items after drag operations |

### TItem Interface

Your data items must extend this interface:

```tsx
interface TItem {
  id: string | number;  // Required: unique identifier
  [key: string]: any;   // Any additional properties
}
```

## 🎯 Best Practices

### 1. **Use `useCallback` for `renderItem`**

Memoize your render function to prevent unnecessary re-renders:

```tsx
const renderItem = useCallback((item: Task, isDragging: boolean) => (
  <TaskItem item={item} isDragging={isDragging} />
), []);
```

### 2. **Provide Visual Feedback**

Always indicate when an item is being dragged:

```tsx
renderItem={(item, isDragging) => (
  <View style={[
    styles.item,
    isDragging && {
      opacity: 0.9,
      transform: [{ scale: 1.05 }],
      elevation: 8,
    }
  ]}>
    {/* ... */}
  </View>
)}
```

### 3. **Stable Keys**

Use stable, unique IDs for `keyExtractor`:

```tsx
// ✅ Good
keyExtractor={(item) => String(item.id)}

// ❌ Bad - index changes during drag
keyExtractor={(item, index) => String(index)}
```

### 4. **Save Order After Drag**

Use the ref to get the final order and update your state/backend:

```tsx
const handleDragEnd = () => {
  const newOrder = listRef.current?.getCurrentData();
  if (newOrder) {
    // Update local state
    setData(newOrder);
    
    // Persist to backend
    api.updateOrder(newOrder);
  }
};
```

### 5. **Performance Optimization**

For large lists, consider:

```tsx
// Memoize your item component
const TaskItem = React.memo(({ item, isDragging }) => (
  <View style={[styles.item, isDragging && styles.dragging]}>
    <Text>{item.text}</Text>
  </View>
));

// Use in renderItem
renderItem={(item, isDragging) => (
  <TaskItem item={item} isDragging={isDragging} />
)}
```

## ⚡ Performance Tips

1. **Avoid Heavy Computations in `renderItem`**: Keep your render function lightweight
2. **Use `React.memo`**: Memoize item components to prevent unnecessary re-renders
3. **Optimize Images**: Use optimized images and consider lazy loading for image-heavy lists
4. **Limit Item Complexity**: Keep item components simple for better drag performance
5. **Test on Real Devices**: Always test on actual devices, not just simulators

## 🐛 Troubleshooting

### Drag not working

**Solution**: 
1. Ensure `react-native-gesture-handler` is properly installed and configured
2. Check that your item has a touchable area (sufficient height/width)
3. Verify that no parent component is blocking touch events

### Auto-scroll too fast/slow

**Solution**: Adjust the `autoScrollSpeed` prop:

```tsx
<DraggableList autoScrollSpeed={5} /> // Slower
<DraggableList autoScrollSpeed={15} /> // Faster
```

### TypeScript errors with custom item types

**Solution**: Make sure your item interface extends `TItem`:

```tsx
import { TItem } from 'react-native-draggable-order-list';

interface MyItem extends TItem {
  id: number;
  // ... other properties
}
```

### Items not swapping correctly with variable heights

**Solution**: The library automatically measures item heights. Ensure your items have consistent padding and margins, and avoid using `flex: 1` on item containers.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [Fadion1996](https://github.com/Fadion1996)

## 🙏 Acknowledgments

Built with:
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [React Native Worklets](https://github.com/margelo/react-native-worklets-core)

---

**Made with ❤️ for the React Native community**