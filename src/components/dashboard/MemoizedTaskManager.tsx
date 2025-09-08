import React, { memo } from 'react';
import { TaskManager } from './TaskManager';

export const MemoizedTaskManager = memo(() => {
  return <TaskManager />;
});

MemoizedTaskManager.displayName = 'MemoizedTaskManager';