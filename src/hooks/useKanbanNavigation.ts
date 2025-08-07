import { useState, useEffect, useRef } from 'react';

export function useKanbanNavigation() {
  const [activeColumnId, setActiveColumnId] = useState<string>('');
  const kanbanRef = useRef<HTMLDivElement>(null);

  const scrollToColumn = (columnId: string) => {
    if (!kanbanRef.current) return;
    
    const columnElement = kanbanRef.current.querySelector(`[data-column-id="${columnId}"]`);
    if (columnElement) {
      columnElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      setActiveColumnId(columnId);
    }
  };

  const handleScroll = () => {
    if (!kanbanRef.current) return;

    const kanbanRect = kanbanRef.current.getBoundingClientRect();
    const kanbanCenter = kanbanRect.left + kanbanRect.width / 2;

    const columns = kanbanRef.current.querySelectorAll('[data-column-id]');
    let closestColumn = '';
    let closestDistance = Infinity;

    columns.forEach((column) => {
      const columnRect = column.getBoundingClientRect();
      const columnCenter = columnRect.left + columnRect.width / 2;
      const distance = Math.abs(columnCenter - kanbanCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestColumn = column.getAttribute('data-column-id') || '';
      }
    });

    if (closestColumn !== activeColumnId) {
      setActiveColumnId(closestColumn);
    }
  };

  useEffect(() => {
    const kanbanElement = kanbanRef.current;
    if (!kanbanElement) return;

    kanbanElement.addEventListener('scroll', handleScroll);
    // Set initial active column
    setTimeout(handleScroll, 100);

    return () => {
      kanbanElement.removeEventListener('scroll', handleScroll);
    };
  }, [activeColumnId]);

  return {
    activeColumnId,
    kanbanRef,
    scrollToColumn
  };
}