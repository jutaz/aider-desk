 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

import { Message, ToolMessage, ResponseMessage } from '@/types/message';
import { TaskEventSubscriber } from '../TaskContext';
import { useApi } from '@/contexts/ApiContext';
import { useTaskStore } from '@/stores/taskStore';

// Mock dependencies
vi.mock('@/contexts/ApiContext');
vi.mock('@/stores/taskStore');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TaskContext - Message Removal Logic', () => {
  describe('Message filtering after removal event', () => {
    it('should filter out single tool message', () => {
      const messages: Message[] = [
        { id: 'assistant-1', type: 'response', content: 'Hello' },
        {
          id: 'tool-1',
          type: 'tool',
          serverName: 'test',
          toolName: 'test',
          args: {},
          content: 'success',
        } as ToolMessage,
      ];

      const messageIds = ['tool-1'];
      const filtered = messages.filter((m) => !messageIds.includes(m.id));

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('assistant-1');
    });

    it('should filter out both tool and assistant message (cascade)', () => {
      const messages: Message[] = [
        { id: 'assistant-1', type: 'response', content: 'Tool call response' },
        {
          id: 'tool-1',
          type: 'tool',
          serverName: 'test',
          toolName: 'test',
          args: {},
          content: 'success',
        } as ToolMessage,
      ];

      const messageIds = ['tool-1', 'assistant-1'];
      const filtered = messages.filter((m) => !messageIds.includes(m.id));

      expect(filtered.length).toBe(0);
    });

    it('should filter out one of two tool messages (partial removal)', () => {
      const messages: Message[] = [
        { id: 'assistant-1', type: 'response', content: 'First response' },
        {
          id: 'tool-1',
          type: 'tool',
          serverName: 'test',
          toolName: 'test1',
          args: {},
          content: 'success1',
        } as ToolMessage,
        { id: 'assistant-2', type: 'response', content: 'Second response' },
        {
          id: 'tool-2',
          type: 'tool',
          serverName: 'test',
          toolName: 'test2',
          args: {},
          content: 'success2',
        } as ToolMessage,
      ];

      const messageIds = ['tool-1'];
      const filtered = messages.filter((m) => !messageIds.includes(m.id));

      expect(filtered.length).toBe(3);
      expect(filtered.map((m) => m.id)).toEqual(['assistant-1', 'assistant-2', 'tool-2']);
    });

    it('should not filter when messageIds is empty', () => {
      const messages: Message[] = [
        { id: 'assistant-1', type: 'response', content: 'Hello' },
        {
          id: 'tool-1',
          type: 'tool',
          serverName: 'test',
          toolName: 'test',
          args: {},
          content: 'success',
        } as ToolMessage,
      ];

      const messageIds: string[] = [];
      const filtered = messages.filter((m) => !messageIds.includes(m.id));

      expect(filtered.length).toBe(2);
      expect(filtered).toEqual(messages);
    });

    it('should handle empty message array', () => {
      const messages: Message[] = [];
      const messageIds = ['tool-1'];
      const filtered = messages.filter((m) => !messageIds.includes(m.id));

      expect(filtered.length).toBe(0);
    });
  });

  describe('TaskContext - Streaming Message Handling', () => {
    let mockApi: any;
    let mockSetMessages: any;
    let mockUpdateTaskState: any;
    let mockClearSession: any;

    beforeEach(() => {
      mockApi = {
        addResponseChunkListener: vi.fn(() => vi.fn()),
        addResponseCompletedListener: vi.fn(() => vi.fn()),
        addLogListener: vi.fn(() => vi.fn()),
        addToolListener: vi.fn(() => vi.fn()),
        addUserMessageListener: vi.fn(() => vi.fn()),
        addCommandOutputListener: vi.fn(() => vi.fn()),
        addTokensInfoListener: vi.fn(() => vi.fn()),
        addAskQuestionListener: vi.fn(() => vi.fn()),
        addQuestionAnsweredListener: vi.fn(() => vi.fn()),
        addUpdateAutocompletionListener: vi.fn(() => vi.fn()),
        addContextFilesUpdatedListener: vi.fn(() => vi.fn()),
        addCustomCommandsUpdatedListener: vi.fn(() => vi.fn()),
        addUpdateAiderModelsListener: vi.fn(() => vi.fn()),
        addClearTaskListener: vi.fn(() => vi.fn()),
        addMessageRemovedListener: vi.fn(() => vi.fn()),
      };

      mockSetMessages = vi.fn();
      mockUpdateTaskState = vi.fn();
      mockClearSession = vi.fn();

      vi.mocked(useApi).mockReturnValue(mockApi);
      vi.mocked(useTaskStore).mockReturnValue({
        setMessages: mockSetMessages,
        updateTaskState: mockUpdateTaskState,
        clearSession: mockClearSession,
        taskStateMap: new Map(),
        taskMessagesMap: new Map(),
        ensureTask: vi.fn(),
        setTodoItems: vi.fn(),
        setAllFiles: vi.fn(),
        setAutocompletionWords: vi.fn(),
        setTokensInfo: vi.fn(),
        setQuestion: vi.fn(),
        setAiderModelsData: vi.fn(),
        setAiderTotalCost: vi.fn(),
        deleteTask: vi.fn(),
        getMemoryUsage: vi.fn(),
        logMemoryUsage: vi.fn(),
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should handle response chunk events and update messages', () => {
      let chunkCallback: any;

      mockApi.addResponseChunkListener.mockImplementation((baseDir, taskId, callback) => {
        chunkCallback = callback;
        return vi.fn();
      });

      render(
        <TaskEventSubscriber
          baseDir="/test"
          taskId="test-task-id"
        />
      );

      // Simulate first chunk
      chunkCallback({
        messageId: 'response-1',
        chunk: 'Hello',
        reflectedMessage: null,
        promptContext: undefined,
      });

      // Should call setMessages to add the new message
      expect(mockSetMessages).toHaveBeenCalledWith('test-task-id', expect.any(Function));

      // Get the update function that was passed
      const updateFn = mockSetMessages.mock.calls[0][1];
      const existingMessages: Message[] = [
        { id: 'user-1', type: 'user', content: 'Hi' },
      ];

      const updatedMessages = updateFn(existingMessages);

      expect(updatedMessages).toHaveLength(2);
      expect(updatedMessages[1]).toEqual({
        id: 'response-1',
        type: 'response',
        content: 'Hello',
        promptContext: undefined,
      });

      // Simulate second chunk for the same message
      mockSetMessages.mockClear();
      chunkCallback({
        messageId: 'response-1',
        chunk: ' World!',
        reflectedMessage: null,
        promptContext: undefined,
      });

      const updateFn2 = mockSetMessages.mock.calls[0][1];
      const messagesWithResponse: Message[] = [
        { id: 'user-1', type: 'user', content: 'Hi' },
        { id: 'response-1', type: 'response', content: 'Hello' },
      ];

      const updatedMessages2 = updateFn2(messagesWithResponse);

      expect(updatedMessages2[1]).toEqual({
        id: 'response-1',
        type: 'response',
        content: 'Hello World!',
        promptContext: undefined,
      });
    });

    it('should handle response completed events and clean up processing map', () => {
      let chunkCallback: any;
      let completedCallback: any;

      mockApi.addResponseChunkListener.mockImplementation((baseDir, taskId, callback) => {
        chunkCallback = callback;
        return vi.fn();
      });

      mockApi.addResponseCompletedListener.mockImplementation((baseDir, taskId, callback) => {
        completedCallback = callback;
        return vi.fn();
      });

      render(
        <TaskEventSubscriber
          baseDir="/test"
          taskId="test-task-id"
        />
      );

      // Start streaming
      chunkCallback({
        messageId: 'response-1',
        chunk: 'Streaming',
        reflectedMessage: null,
        promptContext: undefined,
      });

      // Complete the response
      completedCallback({
        messageId: 'response-1',
        usageReport: { sentTokens: 10, receivedTokens: 20 },
        content: 'Streaming content',
        reflectedMessage: null,
        promptContext: undefined,
      });

      // Should update the message with final content and usage report
      expect(mockSetMessages).toHaveBeenCalledTimes(2); // Once for chunk, once for completion

      const completionUpdateFn = mockSetMessages.mock.calls[1][1];
      const messagesWithStreaming: Message[] = [
        { id: 'user-1', type: 'user', content: 'Hi' },
        { id: 'response-1', type: 'response', content: 'Streaming' },
      ];

      const finalMessages = completionUpdateFn(messagesWithStreaming);

      expect(finalMessages[1]).toEqual({
        id: 'response-1',
        type: 'response',
        content: 'Streaming content',
        usageReport: { sentTokens: 10, receivedTokens: 20 },
        promptContext: undefined,
      });
    });

    it('should handle reflected messages in chunks', () => {
      let chunkCallback: any;

      mockApi.addResponseChunkListener.mockImplementation((baseDir, taskId, callback) => {
        chunkCallback = callback;
        return vi.fn();
      });

      render(
        <TaskEventSubscriber
          baseDir="/test"
          taskId="test-task-id"
        />
      );

      // Simulate chunk with reflected message
      chunkCallback({
        messageId: 'response-1',
        chunk: 'Hello',
        reflectedMessage: 'I reflected on this',
        promptContext: { id: 'ctx-1' },
      });

      const updateFn = mockSetMessages.mock.calls[0][1];
      const existingMessages: Message[] = [];

      const updatedMessages = updateFn(existingMessages);

      // Should add both reflected message and response message
      expect(updatedMessages).toHaveLength(2);
      expect(updatedMessages[0]).toEqual({
        id: expect.any(String), // UUID generated
        type: 'reflected-message',
        content: 'I reflected on this',
        responseMessageId: 'response-1',
        promptContext: { id: 'ctx-1' },
      });
      expect(updatedMessages[1]).toEqual({
        id: 'response-1',
        type: 'response',
        content: 'Hello',
        promptContext: { id: 'ctx-1' },
      });
    });
  });
});