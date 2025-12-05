import { useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import DraggableList, { DraggableListRef, TItem } from 'react-native-draggable-order-list';

interface MyItem extends TItem {
	id: number;
	text: string;
}

const initialData: MyItem[] = [
	{ id: 1, text: 'First Task' },
	{ id: 2, text: 'Second Task' },
	{ id: 3, text: 'Third Task' },
];

const DraggingExample = () => {
	const [data, setData] = useState(initialData);
	const listRef = useRef<DraggableListRef<MyItem>>(null);

	const handleSaveOrder = () => {
		// Get the final, current order from the ref
		const finalOrder = listRef.current?.getCurrentData();
		if (finalOrder) {
			// Typically, you would send this to your Redux store or API
			setData(finalOrder);
			console.log('Final Order:', finalOrder);
		}
	};

	const renderItem = useCallback(({ item, isDragging, drag }) => {
		return (
			// The drag handler must be attached to the view that initiates the drag
			<TouchableOpacity
				onPressIn={drag} // Drag initiates on press
				style={{
					height: 60,
					backgroundColor: isDragging ? '#e0e0ff' : 'white', // Visual feedback
					padding: 15,
					marginVertical: 4,
					borderWidth: 1,
					borderColor: isDragging ? '#4a4ae7' : '#ccc',
				}}
			>
				<Text>{item.text}</Text>
			</TouchableOpacity>
		);
	}, []);

	return (
		<View style={{ flex: 1, padding: 20 }}>
			<DraggableList<MyItem>
				ref={listRef}
				data={data}
				renderItem={({ item, isDragging }) => renderItem({ item, isDragging, drag: null })} // Adjusting based on your DraggableItem logic
				keyExtractor={(item) => String(item.id)}
			/>
			<TouchableOpacity onPress={handleSaveOrder} style={{ padding: 15, backgroundColor: 'green', marginTop: 10 }}>
				<Text style={{ color: 'white', textAlign: 'center' }}>Save Final Order</Text>
			</TouchableOpacity>
		</View>
	);
};

export default DraggingExample;