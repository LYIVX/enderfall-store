"use client";

import React, { ReactNode } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { FaArrowRight, FaArrowLeft, FaTimes, FaBars } from 'react-icons/fa';
import styles from './DraggableList.module.css';

export interface DraggableItem {
  id: string;
  content: ReactNode;
  data: any;
}

export interface ListConfig {
  id: string;
  title?: string;
  items: DraggableItem[];
  maxItems?: number;
  className?: string;
  canAdd?: boolean;
  canRemove?: boolean;
}

interface DraggableListProps {
  lists: ListConfig[];
  onListsChange: (updatedLists: ListConfig[]) => void;
  onDragEnd?: (result: DropResult, updatedLists: ListConfig[]) => void;
  onDragBetweenLists?: (sourceListId: string, destinationListId: string, itemId: string) => void;
  onAdd?: (listId: string, itemId: string) => void;
  onRemove?: (listId: string, itemId: string) => void;
  mode?: 'single' | 'dual' | 'multi';
  className?: string;
}

const DraggableList: React.FC<DraggableListProps> = ({
  lists,
  onListsChange,
  onDragEnd,
  onDragBetweenLists,
  onAdd,
  onRemove,
  mode = 'dual',
  className,
}) => {
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    
    // Dropped outside the list
    if (!destination) {
      return;
    }
    
    // Update the lists based on drag result
    const newLists = [...lists];
    
    // Find source and destination lists
    const sourceListIndex = newLists.findIndex(list => list.id === source.droppableId);
    const destListIndex = newLists.findIndex(list => list.id === destination.droppableId);
    
    if (sourceListIndex === -1 || destListIndex === -1) {
      return;
    }
    
    // Same list reordering
    if (source.droppableId === destination.droppableId) {
      const list = newLists[sourceListIndex];
      const items = Array.from(list.items);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      
      newLists[sourceListIndex] = {
        ...list,
        items
      };
    } else {
      // Moving between lists
      const sourceList = newLists[sourceListIndex];
      const destList = newLists[destListIndex];
      
      // Check if destination list has a max items limit
      if (destList.maxItems !== undefined && destList.items.length >= destList.maxItems) {
        return; // Don't allow the move if it would exceed the limit
      }
      
      // Remove from source list
      const sourceItems = Array.from(sourceList.items);
      const [movedItem] = sourceItems.splice(source.index, 1);
      
      // Add to destination list
      const destItems = Array.from(destList.items);
      destItems.splice(destination.index, 0, movedItem);
      
      // Update both lists
      newLists[sourceListIndex] = {
        ...sourceList,
        items: sourceItems
      };
      
      newLists[destListIndex] = {
        ...destList,
        items: destItems
      };
      
      // Call callback if item moved between lists
      if (onDragBetweenLists) {
        onDragBetweenLists(source.droppableId, destination.droppableId, movedItem.id);
      }
    }
    
    // Update state
    onListsChange(newLists);
    
    // Call additional callback if provided
    if (onDragEnd) {
      onDragEnd(result, newLists);
    }
  };
  
  const handleAdd = (sourceListId: string, destinationListId: string, itemId: string) => {
    const newLists = [...lists];
    
    // Find source and destination lists
    const sourceListIndex = newLists.findIndex(list => list.id === sourceListId);
    const destListIndex = newLists.findIndex(list => list.id === destinationListId);
    
    if (sourceListIndex === -1 || destListIndex === -1) {
      return;
    }
    
    const sourceList = newLists[sourceListIndex];
    const destList = newLists[destListIndex];
    
    // Check if destination list has a max items limit
    if (destList.maxItems !== undefined && destList.items.length >= destList.maxItems) {
      return; // Don't allow the move if it would exceed the limit
    }
    
    // Find the item in the source list
    const itemIndex = sourceList.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return;
    }
    
    // Copy the item to the destination list
    const item = sourceList.items[itemIndex];
    const sourceItems = Array.from(sourceList.items);
    sourceItems.splice(itemIndex, 1);
    
    const destItems = Array.from(destList.items);
    destItems.push(item);
    
    // Update both lists
    newLists[sourceListIndex] = {
      ...sourceList,
      items: sourceItems
    };
    
    newLists[destListIndex] = {
      ...destList,
      items: destItems
    };
    
    // Update state
    onListsChange(newLists);
    
    // Call additional callback if provided
    if (onAdd) {
      onAdd(sourceListId, itemId);
    }
  };
  
  const handleRemove = (sourceListId: string, destinationListId: string, itemId: string) => {
    const newLists = [...lists];
    
    // Find source and destination lists
    const sourceListIndex = newLists.findIndex(list => list.id === sourceListId);
    const destListIndex = newLists.findIndex(list => list.id === destinationListId);
    
    if (sourceListIndex === -1 || destListIndex === -1) {
      return;
    }
    
    const sourceList = newLists[sourceListIndex];
    const destList = newLists[destListIndex];
    
    // Find the item in the source list
    const itemIndex = sourceList.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return;
    }
    
    // Move the item to the destination list
    const item = sourceList.items[itemIndex];
    const sourceItems = Array.from(sourceList.items);
    sourceItems.splice(itemIndex, 1);
    
    const destItems = Array.from(destList.items);
    destItems.push(item);
    
    // Update both lists
    newLists[sourceListIndex] = {
      ...sourceList,
      items: sourceItems
    };
    
    newLists[destListIndex] = {
      ...destList,
      items: destItems
    };
    
    // Update state
    onListsChange(newLists);
    
    // Call additional callback if provided
    if (onRemove) {
      onRemove(sourceListId, itemId);
    }
  };
  
  // Render the lists based on the mode
  const renderLists = () => {
    switch (mode) {
      case 'single':
        return (
          <div className={styles.singleListContainer}>
            {renderList(lists[0])}
          </div>
        );
      case 'dual':
        return (
          <div className={styles.dualListsContainer}>
            {lists.slice(0, 2).map(list => renderList(list))}
          </div>
        );
      case 'multi':
      default:
        return (
          <div className={styles.multiListsContainer}>
            {lists.map(list => renderList(list))}
          </div>
        );
    }
  };
  
  // Helper to render an individual list
  const renderList = (list: ListConfig) => {
    return (
      <div key={list.id} className={`${styles.listSection} ${list.className || ''}`}>
        {list.title && <h3 className={styles.listTitle}>{list.title}</h3>}
        <Droppable droppableId={list.id}>
          {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`${styles.droppableArea} ${snapshot.isDraggingOver ? styles.draggingOver : ''}`}
            >
              {list.items.length === 0 ? (
                <div className={styles.emptyList}>No items</div>
              ) : (
                <div className={styles.list}>
                  {list.items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`${styles.draggableItem} ${
                            snapshot.isDragging ? styles.dragging : ''
                          }`}
                        >
                          {item.content}
                          <div className={styles.itemActions}>
                            {lists.length > 1 && list.canAdd && (
                              <button
                                type="button"
                                className={styles.addButton}
                                onClick={() => {
                                  // Find the next list to add to
                                  const currentIndex = lists.findIndex(l => l.id === list.id);
                                  const nextIndex = (currentIndex + 1) % lists.length;
                                  handleAdd(list.id, lists[nextIndex].id, item.id);
                                }}
                                aria-label="Add"
                              >
                                <FaArrowRight />
                              </button>
                            )}
                            {lists.length > 1 && list.canRemove && (
                              <button
                                type="button"
                                className={styles.removeButton}
                                onClick={() => {
                                  // Find the previous list to remove to
                                  const currentIndex = lists.findIndex(l => l.id === list.id);
                                  const prevIndex = currentIndex === 0 ? lists.length - 1 : currentIndex - 1;
                                  handleRemove(list.id, lists[prevIndex].id, item.id);
                                }}
                                aria-label="Remove"
                              >
                                <FaArrowLeft />
                              </button>
                            )}
                          </div>
                          <div 
                            {...provided.dragHandleProps}
                            className={styles.dragHandle}
                            aria-label="Drag handle"
                          >
                            <FaBars />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };
  
  return (
    <div className={`${styles.draggableListContainer} ${className || ''}`}>
      <DragDropContext onDragEnd={handleDragEnd}>
        {renderLists()}
      </DragDropContext>
    </div>
  );
};

export default DraggableList; 