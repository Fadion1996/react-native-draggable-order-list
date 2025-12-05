import DraggableList, { DraggableListProps } from './components/DraggableList';
import { DraggableListRef, TItem } from './types';

export type { DraggableListProps } from './components/DraggableList';
export type { TItem } from './types';

export default DraggableList as <T extends TItem>(
  props: DraggableListProps<T> & { ref?: React.Ref<DraggableListRef<T>> }
) => React.ReactElement;