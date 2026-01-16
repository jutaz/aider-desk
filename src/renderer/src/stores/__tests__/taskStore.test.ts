import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from '../taskStore';

describe('taskStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    const store = useTaskStore.getState();
    store.taskStateMap.clear();
    store.taskMessagesMap.clear();
  });

  describe('deleteTask', () => {
    it('should remove task state and messages from maps', () => {
      const store = useTaskStore.getState();

      // Add a task
      store.ensureTask('test-task-1');
      store.setMessages('test-task-1', () => [{ id: 'msg1', type: 'user', content: 'test' }]);

      // Verify task exists
      expect(store.taskStateMap.has('test-task-1')).toBe(true);
      expect(store.taskMessagesMap.has('test-task-1')).toBe(true);

      // Delete task
      store.deleteTask('test-task-1');

      // Verify task is removed
      expect(store.taskStateMap.has('test-task-1')).toBe(false);
      expect(store.taskMessagesMap.has('test-task-1')).toBe(false);
    });

    it('should handle deleting non-existent task gracefully', () => {
      const store = useTaskStore.getState();

      // Delete non-existent task
      expect(() => store.deleteTask('non-existent')).not.toThrow();

      // Verify no changes
      expect(store.taskStateMap.size).toBe(0);
      expect(store.taskMessagesMap.size).toBe(0);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage statistics', () => {
      const store = useTaskStore.getState();

      // Add some tasks
      store.ensureTask('task1');
      store.ensureTask('task2');
      store.setMessages('task1', () => [
        { id: 'msg1', type: 'user', content: 'test1' },
        { id: 'msg2', type: 'response', content: 'test2' },
      ]);

      const memoryUsage = store.getMemoryUsage();

      expect(memoryUsage).toHaveProperty('taskStates');
      expect(memoryUsage).toHaveProperty('messages');
      expect(memoryUsage).toHaveProperty('pendingMessages');
      expect(memoryUsage).toHaveProperty('total');

      expect(memoryUsage.taskStates).toBeGreaterThan(0);
      expect(memoryUsage.messages).toBeGreaterThan(0);
      expect(memoryUsage.total).toBe(memoryUsage.taskStates + memoryUsage.messages + memoryUsage.pendingMessages);
    });
  });
});