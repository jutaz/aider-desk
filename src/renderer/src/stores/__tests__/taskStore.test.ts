import { describe, it, expect, beforeEach, vi } from 'vitest';
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
      expect(memoryUsage.total).toBe(memoryUsage.taskStates + memoryUsage.messages);
    });

    it('should log memory usage in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const store = useTaskStore.getState();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = store.logMemoryUsage();

      expect(result).toHaveProperty('total');
      expect(consoleSpy).toHaveBeenCalledWith('TaskStore Memory Usage:', expect.any(Object));

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Integration: Task Cleanup and Memory Management', () => {
    it('should completely clean up task data when deleted', () => {
      const store = useTaskStore.getState();

      // Create a task with comprehensive data
      store.ensureTask('cleanup-test-task');
      store.updateTaskState('cleanup-test-task', {
        loading: true,
        loaded: true,
        tokensInfo: { baseDir: '/test', taskId: 'cleanup-test-task', chatHistory: { tokens: 100, cost: 0.1 }, files: {}, repoMap: { tokens: 0, cost: 0 }, systemMessages: { tokens: 0, cost: 0 } },
        question: { baseDir: '/test', taskId: 'cleanup-test-task', text: 'Test question', defaultAnswer: 'Yes' },
        todoItems: [{ name: 'Test todo', completed: false }],
        allFiles: ['file1.ts', 'file2.ts'],
        autocompletionWords: ['word1', 'word2'],
        aiderTotalCost: 0.5,
        contextFiles: [{ path: 'context1.ts', readOnly: false }],
        aiderModelsData: { baseDir: '/test', taskId: 'cleanup-test-task', mainModel: 'test-model' },
      });

      store.setMessages('cleanup-test-task', () => [
        { id: 'msg1', type: 'user', content: 'User message' },
        { id: 'msg2', type: 'response', content: 'Response message' },
        { id: 'msg3', type: 'group', content: '', children: [] },
      ]);

      // Verify data exists
      expect(store.taskStateMap.has('cleanup-test-task')).toBe(true);
      expect(store.taskMessagesMap.has('cleanup-test-task')).toBe(true);
      expect(store.taskStateMap.get('cleanup-test-task')?.tokensInfo).toBeDefined();
      expect(store.taskStateMap.get('cleanup-test-task')?.todoItems).toHaveLength(1);
      expect(store.taskMessagesMap.get('cleanup-test-task')).toHaveLength(3);

      // Delete task
      store.deleteTask('cleanup-test-task');

      // Verify complete cleanup
      expect(store.taskStateMap.has('cleanup-test-task')).toBe(false);
      expect(store.taskMessagesMap.has('cleanup-test-task')).toBe(false);
    });

    it('should clean up pending messages when task is deleted', () => {
      const store = useTaskStore.getState();

      // Create task and set pending messages
      store.ensureTask('pending-cleanup-task');
      store.setMessages('pending-cleanup-task', () => [
        { id: 'pending-msg1', type: 'user', content: 'Pending message' },
      ]);

      // Simulate pending state by checking internal map
      const pendingMessages = (store as any).taskPendingMessages || {};
      expect(pendingMessages['pending-cleanup-task']).toBeDefined();

      // Delete task
      store.deleteTask('pending-cleanup-task');

      // Verify pending messages are cleaned up
      expect(pendingMessages['pending-cleanup-task']).toBeUndefined();
    });

    it('should handle multiple task deletions efficiently', () => {
      const store = useTaskStore.getState();

      // Create multiple tasks
      const taskIds = ['multi-delete-1', 'multi-delete-2', 'multi-delete-3'];
      taskIds.forEach(taskId => {
        store.ensureTask(taskId);
        store.setMessages(taskId, () => [
          { id: `msg-${taskId}`, type: 'user', content: 'Test message' },
        ]);
      });

      // Verify all tasks exist
      taskIds.forEach(taskId => {
        expect(store.taskStateMap.has(taskId)).toBe(true);
        expect(store.taskMessagesMap.has(taskId)).toBe(true);
      });

      // Delete all tasks
      taskIds.forEach(taskId => store.deleteTask(taskId));

      // Verify all tasks are cleaned up
      taskIds.forEach(taskId => {
        expect(store.taskStateMap.has(taskId)).toBe(false);
        expect(store.taskMessagesMap.has(taskId)).toBe(false);
      });

      // Verify memory usage is reduced
      const memoryUsage = store.getMemoryUsage();
      expect(memoryUsage.taskStates).toBe(0);
      expect(memoryUsage.messages).toBe(0);
    });

    it('should maintain data integrity for other tasks during cleanup', () => {
      const store = useTaskStore.getState();

      // Create multiple tasks
      store.ensureTask('keep-task-1');
      store.ensureTask('delete-task');
      store.ensureTask('keep-task-2');

      // Set data for all tasks
      ['keep-task-1', 'delete-task', 'keep-task-2'].forEach(taskId => {
        store.setMessages(taskId, () => [
          { id: `msg-${taskId}`, type: 'user', content: `Message for ${taskId}` },
        ]);
        store.updateTaskState(taskId, { aiderTotalCost: 0.1 });
      });

      // Delete middle task
      store.deleteTask('delete-task');

      // Verify other tasks remain intact
      expect(store.taskStateMap.has('keep-task-1')).toBe(true);
      expect(store.taskStateMap.has('keep-task-2')).toBe(true);
      expect(store.taskMessagesMap.has('keep-task-1')).toBe(true);
      expect(store.taskMessagesMap.has('keep-task-2')).toBe(true);
      expect(store.taskStateMap.get('keep-task-1')?.aiderTotalCost).toBe(0.1);
      expect(store.taskStateMap.get('keep-task-2')?.aiderTotalCost).toBe(0.1);
    });

    it('should handle rapid task creation and deletion cycles', () => {
      const store = useTaskStore.getState();

      // Simulate rapid task lifecycle
      for (let i = 0; i < 10; i++) {
        const taskId = `rapid-task-${i}`;
        store.ensureTask(taskId);
        store.setMessages(taskId, () => [
          { id: `rapid-msg-${i}`, type: 'user', content: 'Rapid message' },
        ]);
        store.deleteTask(taskId);
      }

      // Verify no memory leaks
      const memoryUsage = store.getMemoryUsage();
      expect(memoryUsage.taskStates).toBe(0);
      expect(memoryUsage.messages).toBe(0);
      expect(store.taskStateMap.size).toBe(0);
      expect(store.taskMessagesMap.size).toBe(0);
    });

    it('should clear session data correctly', () => {
      const store = useTaskStore.getState();

      // Create task with session data
      store.ensureTask('session-test-task');
      store.updateTaskState('session-test-task', {
        tokensInfo: { baseDir: '/test', taskId: 'session-test-task', chatHistory: { tokens: 100, cost: 0.1 }, files: {}, repoMap: { tokens: 0, cost: 0 }, systemMessages: { tokens: 0, cost: 0 } },
        question: { baseDir: '/test', taskId: 'session-test-task', text: 'Test question', defaultAnswer: 'Yes' },
        aiderTotalCost: 0.5,
        todoItems: [{ name: 'Test todo', completed: false }],
      });
      store.setMessages('session-test-task', () => [
        { id: 'msg1', type: 'user', content: 'User message' },
      ]);

      // Clear session (messagesOnly = false)
      store.clearSession('session-test-task', false);

      // Verify session data is cleared but task structure remains
      const state = store.taskStateMap.get('session-test-task');
      expect(state).toBeDefined();
      expect(state?.tokensInfo).toBeNull();
      expect(state?.question).toBeNull();
      expect(state?.aiderTotalCost).toBe(0);
      expect(state?.todoItems).toHaveLength(1); // Should keep todoItems
      expect(store.taskMessagesMap.get('session-test-task')).toHaveLength(0);
    });

    it('should clear only messages when messagesOnly is true', () => {
      const store = useTaskStore.getState();

      // Create task with session data
      store.ensureTask('messages-only-test');
      store.updateTaskState('messages-only-test', {
        tokensInfo: { baseDir: '/test', taskId: 'messages-only-test', chatHistory: { tokens: 100, cost: 0.1 }, files: {}, repoMap: { tokens: 0, cost: 0 }, systemMessages: { tokens: 0, cost: 0 } },
        question: { baseDir: '/test', taskId: 'messages-only-test', text: 'Test question', defaultAnswer: 'Yes' },
        aiderTotalCost: 0.5,
      });
      store.setMessages('messages-only-test', () => [
        { id: 'msg1', type: 'user', content: 'User message' },
      ]);

      // Clear session (messagesOnly = true)
      store.clearSession('messages-only-test', true);

      // Verify only messages are cleared
      const state = store.taskStateMap.get('messages-only-test');
      expect(state).toBeDefined();
      expect(state?.tokensInfo).toBeDefined(); // Should keep tokensInfo
      expect(state?.question).toBeDefined(); // Should keep question
      expect(state?.aiderTotalCost).toBe(0.5); // Should keep cost
      expect(store.taskMessagesMap.get('messages-only-test')).toHaveLength(0);
    });
  });

  describe('Performance: Memory Management', () => {
    it('should handle large message arrays efficiently', () => {
      const store = useTaskStore.getState();

      // Create task with many messages
      store.ensureTask('large-messages-task');

      const largeMessageArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `large-msg-${i}`,
        type: 'user' as const,
        content: `Message content ${i}`,
      }));

      store.setMessages('large-messages-task', () => largeMessageArray);

      // Verify memory calculation includes large arrays
      const memoryUsage = store.getMemoryUsage();
      expect(memoryUsage.messages).toBeGreaterThan(1000 * 1024); // At least 1KB per message

      // Cleanup
      store.deleteTask('large-messages-task');
      const afterCleanup = store.getMemoryUsage();
      expect(afterCleanup.messages).toBe(0);
    });

    it('should maintain performance with many concurrent tasks', () => {
      const store = useTaskStore.getState();

      // Create many tasks
      const taskCount = 100;
      for (let i = 0; i < taskCount; i++) {
        store.ensureTask(`perf-task-${i}`);
        store.setMessages(`perf-task-${i}`, () => [
          { id: `perf-msg-${i}`, type: 'user', content: 'Performance test message' },
        ]);
      }

      // Verify memory scales linearly
      const memoryUsage = store.getMemoryUsage();
      expect(memoryUsage.taskStates).toBe(taskCount * 2048); // ~2KB per task
      expect(memoryUsage.messages).toBeGreaterThan(taskCount * 1024); // At least 1KB per message

      // Cleanup all tasks
      for (let i = 0; i < taskCount; i++) {
        store.deleteTask(`perf-task-${i}`);
      }

      const afterCleanup = store.getMemoryUsage();
      expect(afterCleanup.taskStates).toBe(0);
      expect(afterCleanup.messages).toBe(0);
    });

    it('should handle pending message batching efficiently', () => {
      const store = useTaskStore.getState();

      store.ensureTask('batching-test-task');

      // Simulate multiple rapid message updates
      for (let i = 0; i < 50; i++) {
        store.setMessages('batching-test-task', (prev) => [
          ...prev,
          { id: `batch-msg-${i}`, type: 'user', content: `Batched message ${i}` },
        ]);
      }

      // Verify messages are batched (should have all 50 messages)
      const messages = store.taskMessagesMap.get('batching-test-task') || [];
      expect(messages).toHaveLength(50);

      // Cleanup
      store.deleteTask('batching-test-task');
    });
  });
});