import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { DashboardItem } from '@/data/mockData';
import Widget from './Widget';

type DashboardProps = {
  items: DashboardItem[];
  setItems: React.Dispatch<React.SetStateAction<DashboardItem[]>>;
  isCustomizationEnabled: boolean;
  hiddenWidgetIds: string[];
  onHideWidget: (widgetId: string) => void;
};

const Dashboard = ({ items, setItems, isCustomizationEnabled, hiddenWidgetIds, onHideWidget }: DashboardProps) => {
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) {
      return;
    }
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(source.index, 1);
    newItems.splice(destination.index, 0, reorderedItem);
    setItems(newItems);
  };

  const visibleItems = items.filter(item => !hiddenWidgetIds.includes(item.id));

  if (visibleItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 rounded-lg border border-dashed shadow-sm bg-card col-span-3">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Dashboard is Empty</h2>
          <p className="text-muted-foreground">Add widgets from the customization panel.</p>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="dashboard-widgets" isDropDisabled={!isCustomizationEnabled}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="grid gap-4 md:grid-cols-1 lg:grid-cols-3"
          >
            {visibleItems.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!isCustomizationEnabled}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={snapshot.isDragging ? 'opacity-80' : ''}
                  >
                    <Widget
                      item={item}
                      isCustomizing={isCustomizationEnabled}
                      onHide={() => onHideWidget(item.id)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default Dashboard;
