# react-native-draggable-order-list
🚀 A truly flicker-free, high-performance Draggable FlatList for React Native. Built with Reanimated 4 &amp; Worklets for native UI thread speed. ⚡

| NPM Downloads | GitHub Stars | License |
| :--- | :--- | :--- |
| [![npm downloads badge]](https://www.npmjs.com/package/react-native-draggable-order-list) | [![GitHub stars badge]](https://github.com/Fadion1996/react-native-draggable-order-list) | [![MIT License badge]](LICENSE) |

## ✨ Why Choose react-native-draggable-order-list?

This library eliminates the performance bottleneck common in other solutions by **never updating React state during a drag**. The result is a smooth, 60fps native feel, even when dragging items in lists of thousands.

* **Native UI Thread Animation:** All item movement, scaling, and index-swapping calculations are handled by Reanimated Worklets, bypassing the JavaScript bridge.
* **Variable Height Support:** Accurately calculates swap zones based on the actual measured height of each item.
* **Auto-Scrolling:** Built-in logic to auto-scroll the list when the dragged item hits the viewport edges.

## 📦 Installation

This library requires `react-native-reanimated` (v4+) and `react-native-gesture-handler`.

```bash
npm install react-native-draggable-order-list react-native-reanimated react-native-gesture-handler react-native-worklets
# or
yarn add react-native-draggable-order-list react-native-reanimated react-native-gesture-handler react-native-worklets