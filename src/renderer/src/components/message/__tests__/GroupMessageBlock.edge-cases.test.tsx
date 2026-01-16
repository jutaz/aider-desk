import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroupMessageBlock } from '../GroupMessageBlock';
import { GroupMessage, Message, ResponseMessage, ToolMessage } from '@/types/message';
import { UsageReportData } from '@common/types';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => options?.params ? `${key}-${JSON.stringify(options.params)}` : key,
  }),
}));



vi.mock('../MessageBlock', () => ({
  MessageBlock: ({ message, compact, remove, redo, edit }: any) => (
    <div
      data-testid={`message-block-${message.id || 'no-id'}`}
      data-compact={compact}
      data-type={message.type}
    >
      {message.content}
      {remove && <button data-testid={`remove-${message.id}`} onClick={() => remove(message)}>Remove</button>}
      {redo && <button data-testid={`redo-${message.id}`} onClick={redo}>Redo</button>}
      {edit && <button data-testid={`edit-${message.id}`} onClick={() => edit('edited')}>Edit</button>}
    </div>
  ),
}));

vi.mock('../MessageBar', () => ({
  MessageBar: ({ usageReport, className }: { usageReport?: UsageReportData; className?: string }) => (
    <div data-testid="message-bar" className={className}>
      {usageReport ? `Usage: ${usageReport.model}` : 'No usage'}
    </div>
  ),
}));

vi.mock('@/components/common/Accordion', () => ({
  Accordion: ({
    title,
    children,
    isOpen,
    onOpenChange,
    scrollToVisibleWhenExpanded
  }: {
    title: React.ReactNode;
    children: React.ReactNode;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    scrollToVisibleWhenExpanded?: boolean;
  }) => (
    <div data-testid="accordion">
      <div data-testid="accordion-title">{title}</div>
      <button
        data-testid="accordion-toggle"
        onClick={() => onOpenChange(!isOpen)}
        data-scroll-visible={scrollToVisibleWhenExpanded}
      >
        Toggle
      </button>
      {isOpen && <div data-testid="accordion-content">{children}</div>}
    </div>
  ),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('GroupMessageBlock Edge Cases', () => {
  const baseDir = '/test/project';
  const taskId = 'edge-case-task';

  const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
    id: 'msg-1',
    type: 'user',
    content: 'Test message',
    ...overrides,
  });

  const createMockGroupMessage = (overrides: Partial<GroupMessage> = {}): GroupMessage => ({
    id: 'group-edge-case',
    type: 'group',
    content: '',
    group: {
      id: 'group-context-edge',
      name: 'Edge Case Group',
      finished: true,
      color: '#ff0000',
    },
    children: [
      createMockMessage({ id: 'child-1', type: 'user', content: 'User message' }),
      createMockMessage({ id: 'child-2', type: 'response', content: 'Response message' }),
    ],
    ...overrides,
  });

  const defaultProps = {
    baseDir,
    taskId,
    message: createMockGroupMessage(),
    allFiles: ['file1.ts', 'file2.ts'],
    renderMarkdown: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Malformed Data Handling', () => {
    it('should handle messages without IDs', () => {
      const messagesWithoutIds = [
        createMockMessage({ id: undefined, type: 'user', content: 'No ID message 1' }),
        createMockMessage({ id: undefined, type: 'response', content: 'No ID message 2' }),
      ];

      const groupWithoutIds = createMockGroupMessage({ children: messagesWithoutIds });
      render(<GroupMessageBlock {...defaultProps} message={groupWithoutIds} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      expect(screen.getAllByTestId(/^message-block-/)).toHaveLength(2);
      expect(screen.getByTestId('message-block-no-id')).toBeInTheDocument();
    });

    it('should handle empty content strings', () => {
      const emptyContentMessages = [
        createMockMessage({ id: 'empty-1', type: 'user', content: '' }),
        createMockMessage({ id: 'empty-2', type: 'response', content: '' }),
      ];

      const groupWithEmptyContent = createMockGroupMessage({ children: emptyContentMessages });
      render(<GroupMessageBlock {...defaultProps} message={groupWithEmptyContent} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      const messageBlocks = screen.getAllByTestId(/^message-block-/);
      expect(messageBlocks).toHaveLength(2);
      messageBlocks.forEach(block => {
        expect(block).toHaveTextContent('');
      });
    });

    it('should handle extremely long content', () => {
      const longContent = 'A'.repeat(10000);
      const longMessage = createMockMessage({
        id: 'long-msg',
        type: 'user',
        content: longContent,
      });

      const groupWithLongContent = createMockGroupMessage({ children: [longMessage] });
      render(<GroupMessageBlock {...defaultProps} message={groupWithLongContent} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      const messageBlock = screen.getByTestId('message-block-long-msg');
      expect(messageBlock).toHaveTextContent(longContent);
    });

    it('should handle special characters in content', () => {
      const specialContent = 'Special chars: <>&"\'\n\t\r\u0000\uFFFF';
      const specialMessage = createMockMessage({
        id: 'special-msg',
        type: 'user',
        content: specialContent,
      });

      const groupWithSpecialContent = createMockGroupMessage({ children: [specialMessage] });
      render(<GroupMessageBlock {...defaultProps} message={groupWithSpecialContent} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      const messageBlock = screen.getByTestId('message-block-special-msg');
      expect(messageBlock).toHaveTextContent(specialContent);
    });
  });

  describe('Complex Thread Structures', () => {
    it('should handle deeply nested group messages', () => {
      const nestedGroup: GroupMessage = {
        id: 'nested-group',
        type: 'group',
        content: '',
        group: { id: 'nested-context', name: 'Nested Group', finished: true, color: '#00ff00' },
        children: [
          createMockMessage({ id: 'nested-child-1', type: 'user', content: 'Nested user' }),
          {
            id: 'inner-group',
            type: 'group',
            content: '',
            group: { id: 'inner-context', name: 'Inner Group', finished: true, color: '#0000ff' },
            children: [
              createMockMessage({ id: 'inner-child-1', type: 'response', content: 'Inner response' }),
            ],
          } as GroupMessage,
        ],
      };

      render(<GroupMessageBlock {...defaultProps} message={nestedGroup} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // Should render nested structure
      expect(screen.getByTestId('message-block-nested-child-1')).toBeInTheDocument();
      expect(screen.getByText('Inner Group')).toBeInTheDocument();
    });

    it('should handle mixed message types in complex threads', () => {
      const mixedMessages: Message[] = [
        createMockMessage({ id: 'user-msg', type: 'user', content: 'User message' }),
        createMockMessage({ id: 'response-msg', type: 'response', content: 'Response message' }),
        createMockMessage({ id: 'tool-msg', type: 'tool', content: 'Tool message' }),
        createMockMessage({ id: 'loading-msg', type: 'loading', content: 'Loading...' }),
        createMockMessage({ id: 'log-msg', type: 'log', content: 'Log message' }),
        createMockMessage({ id: 'tokens-msg', type: 'tokens-info', content: 'Tokens info' }),
      ];

      const complexGroup = createMockGroupMessage({ children: mixedMessages });
      render(<GroupMessageBlock {...defaultProps} message={complexGroup} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // Should render all message types
      expect(screen.getAllByTestId(/^message-block-/)).toHaveLength(6);
      expect(screen.getByTestId('message-block-user-msg')).toHaveAttribute('data-type', 'user');
      expect(screen.getByTestId('message-block-response-msg')).toHaveAttribute('data-type', 'response');
      expect(screen.getByTestId('message-block-tool-msg')).toHaveAttribute('data-type', 'tool');
    });

    it('should handle threads with only system/tool messages', () => {
      const toolOnlyMessages: Message[] = [
        createMockMessage({ id: 'tool-1', type: 'tool', content: 'Tool execution 1' }),
        createMockMessage({ id: 'tool-2', type: 'tool', content: 'Tool execution 2' }),
      ];

      const toolOnlyGroup = createMockGroupMessage({ children: toolOnlyMessages });
      render(<GroupMessageBlock {...defaultProps} message={toolOnlyGroup} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      expect(screen.getAllByTestId(/^message-block-/)).toHaveLength(2);
    });
  });

  describe('Usage Report Edge Cases', () => {
    it('should aggregate usage from mixed message types', () => {
      const messagesWithMixedUsage: Message[] = [
        {
          ...createMockMessage({ id: 'response-1', type: 'response' }),
          usageReport: { model: 'gpt-4', sentTokens: 100, receivedTokens: 200, messageCost: 0.05 },
        } as ResponseMessage,
        createMockMessage({ id: 'user-1', type: 'user', content: 'User message' }), // No usage
        {
          ...createMockMessage({ id: 'tool-1', type: 'tool' }),
          usageReport: { model: 'gpt-4', sentTokens: 50, receivedTokens: 100, messageCost: 0.03 },
        } as ToolMessage,
        {
          ...createMockMessage({ id: 'response-2', type: 'response' }),
          usageReport: { model: 'gpt-4', sentTokens: 75, receivedTokens: 150, messageCost: 0.04 },
        } as ResponseMessage,
      ];

      const groupWithMixedUsage = createMockGroupMessage({ children: messagesWithMixedUsage });
      render(<GroupMessageBlock {...defaultProps} message={groupWithMixedUsage} />);

      const messageBar = screen.getByTestId('message-bar');
      expect(messageBar).toHaveTextContent('Usage: gpt-4'); // Uses last message's model
    });

    it('should handle usage reports with missing fields', () => {
      const incompleteUsageMessages: Message[] = [
        {
          ...createMockMessage({ id: 'incomplete-1', type: 'response' }),
          usageReport: { model: 'gpt-4', sentTokens: 100 }, // Missing receivedTokens and cost
        } as ResponseMessage,
        {
          ...createMockMessage({ id: 'incomplete-2', type: 'tool' }),
          usageReport: { sentTokens: 50, receivedTokens: 100, messageCost: 0.03 }, // Missing model
        } as ToolMessage,
      ];

      const groupWithIncompleteUsage = createMockGroupMessage({ children: incompleteUsageMessages });
      render(<GroupMessageBlock {...defaultProps} message={groupWithIncompleteUsage} />);

      // Should not crash and show some usage info
      const messageBar = screen.getByTestId('message-bar');
      expect(messageBar).toBeInTheDocument();
    });

    it('should handle zero and negative usage values', () => {
      const zeroUsageMessages: Message[] = [
        {
          ...createMockMessage({ id: 'zero-usage', type: 'response' }),
          usageReport: { model: 'gpt-4', sentTokens: 0, receivedTokens: 0, messageCost: 0 },
        } as ResponseMessage,
        {
          ...createMockMessage({ id: 'negative-usage', type: 'tool' }),
          usageReport: { model: 'gpt-4', sentTokens: -10, receivedTokens: -5, messageCost: -0.01 },
        } as ToolMessage,
      ];

      const groupWithZeroUsage = createMockGroupMessage({ children: zeroUsageMessages });
      render(<GroupMessageBlock {...defaultProps} message={groupWithZeroUsage} />);

      const messageBar = screen.getByTestId('message-bar');
      expect(messageBar).toHaveTextContent('Usage: gpt-4');
    });
  });

  describe('UI State Edge Cases', () => {
    it('should handle rapid state changes', async () => {
      const group = createMockGroupMessage({ children: Array.from({ length: 20 }, (_, i) =>
        createMockMessage({ id: `rapid-${i}`, type: 'user', content: `Message ${i}` })
      )});

      render(<GroupMessageBlock {...defaultProps} message={group} />);

      const toggle = screen.getByTestId('accordion-toggle');

      // Rapid expand/collapse
      for (let i = 0; i < 10; i++) {
        fireEvent.click(toggle);
        await act(async () => {
          await vi.advanceTimersByTime(50);
        });
      }

      // Component should remain stable
      expect(screen.getByTestId('accordion')).toBeInTheDocument();
    });

    it('should handle state changes during lazy loading', async () => {
      const largeGroup = createMockGroupMessage({
        children: Array.from({ length: 30 }, (_, i) =>
          createMockMessage({ id: `large-${i}`, type: 'user', content: `Message ${i}` })
        ),
      });

      render(<GroupMessageBlock {...defaultProps} message={largeGroup} />);

      const toggle = screen.getByTestId('accordion-toggle');

      // Start expansion
      fireEvent.click(toggle);
      expect(screen.getByText('common.loading')).toBeInTheDocument();

      // Immediately collapse before loading completes
      fireEvent.click(toggle);

      await act(async () => {
        await vi.advanceTimersByTime(200);
      });

      // Should not crash and should be in collapsed state
      expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('accordion-content')).not.toBeInTheDocument();
    });

    it('should handle unfinished groups with no preview messages', () => {
      const unfinishedEmptyGroup = createMockGroupMessage({
        group: { ...createMockGroupMessage().group, finished: false },
        children: [], // No children
      });

      render(<GroupMessageBlock {...defaultProps} message={unfinishedEmptyGroup} />);

      // Should not show preview when no children
      const previewMessages = screen.queryAllByTestId(/^message-block-/);
      expect(previewMessages).toHaveLength(0);
    });
  });

  describe('Callback and Interaction Edge Cases', () => {
    it('should handle remove callback on child messages', () => {
      const mockRemove = vi.fn();
      const messagesWithIds = [
        createMockMessage({ id: 'removable-1', type: 'user', content: 'Removable message 1' }),
        createMockMessage({ id: 'removable-2', type: 'response', content: 'Removable message 2' }),
      ];

      const groupWithRemovable = createMockGroupMessage({ children: messagesWithIds });
      render(<GroupMessageBlock {...defaultProps} message={groupWithRemovable} remove={mockRemove} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      const removeButton = screen.getByTestId('remove-removable-1');
      fireEvent.click(removeButton);

      expect(mockRemove).toHaveBeenCalledWith(messagesWithIds[0]);
    });

    it('should handle redo callback', () => {
      const mockRedo = vi.fn();
      const group = createMockGroupMessage();
      render(<GroupMessageBlock {...defaultProps} message={group} redo={mockRedo} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      const redoButton = screen.getByTestId('redo-child-1');
      fireEvent.click(redoButton);

      expect(mockRedo).toHaveBeenCalled();
    });

    it('should handle edit callback', () => {
      const mockEdit = vi.fn();
      const group = createMockGroupMessage();
      render(<GroupMessageBlock {...defaultProps} message={group} edit={mockEdit} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      const editButton = screen.getByTestId('edit-child-1');
      fireEvent.click(editButton);

      expect(mockEdit).toHaveBeenCalledWith('edited');
    });

    it('should disable interactions when callbacks are undefined', () => {
      const group = createMockGroupMessage();
      render(<GroupMessageBlock {...defaultProps} message={group} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // Should not have remove/redo/edit buttons
      expect(screen.queryByTestId(/^remove-/)).not.toBeInTheDocument();
      expect(screen.queryByTestId(/^redo-/)).not.toBeInTheDocument();
      expect(screen.queryByTestId(/^edit-/)).not.toBeInTheDocument();
    });
  });

  describe('Internationalization Edge Cases', () => {
    it('should handle LocalizedString group names with parameters', () => {
      const localizedGroup = createMockGroupMessage({
        group: {
          ...createMockGroupMessage().group,
          name: { key: 'messages.groupWithCount', params: { count: 5 } },
        },
      });

      render(<GroupMessageBlock {...defaultProps} message={localizedGroup} />);

      expect(screen.getByText('messages.groupWithCount-{"count":5}')).toBeInTheDocument();
    });

    it('should handle missing translation keys gracefully', () => {
      const missingKeyGroup = createMockGroupMessage({
        group: {
          ...createMockGroupMessage().group,
          name: 'nonexistent.key',
        },
      });

      render(<GroupMessageBlock {...defaultProps} message={missingKeyGroup} />);

      expect(screen.getByText('nonexistent.key')).toBeInTheDocument();
    });

    it('should handle null/undefined LocalizedString params', () => {
      const nullParamsGroup = createMockGroupMessage({
        group: {
          ...createMockGroupMessage().group,
          name: { key: 'messages.nullParams' },
        },
      });

      render(<GroupMessageBlock {...defaultProps} message={nullParamsGroup} />);

      expect(screen.getByText('messages.nullParams')).toBeInTheDocument();
    });
  });

  describe('Color and Styling Edge Cases', () => {
    it('should handle invalid color values', () => {
      const invalidColorGroup = createMockGroupMessage({
        group: { ...createMockGroupMessage().group, color: 'invalid-color' },
      });

      render(<GroupMessageBlock {...defaultProps} message={invalidColorGroup} />);

      // Should still render without crashing
      const colorBar = document.querySelector('[style*="invalid-color"]');
      expect(colorBar).toBeInTheDocument();
    });

    it('should handle empty color strings', () => {
      const emptyColorGroup = createMockGroupMessage({
        group: { ...createMockGroupMessage().group, color: '' },
      });

      render(<GroupMessageBlock {...defaultProps} message={emptyColorGroup} />);

      const colorBar = document.querySelector('[style*="background-color"]');
      expect(colorBar).toBeInTheDocument();
    });

    it('should handle very long group names', () => {
      const longNameGroup = createMockGroupMessage({
        group: {
          ...createMockGroupMessage().group,
          name: 'A'.repeat(200),
        },
      });

      render(<GroupMessageBlock {...defaultProps} message={longNameGroup} />);

      const titleElement = screen.getByText('A'.repeat(200));
      expect(titleElement).toBeInTheDocument();
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle component unmount during async operations', async () => {
      const largeGroup = createMockGroupMessage({
        children: Array.from({ length: 50 }, (_, i) =>
          createMockMessage({ id: `async-${i}`, type: 'user', content: `Async message ${i}` })
        ),
      });

      const { unmount } = render(<GroupMessageBlock {...defaultProps} message={largeGroup} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // Unmount during loading
      unmount();

      // Should not cause errors
      await act(async () => {
        await vi.advanceTimersByTime(200);
      });
    });

    it('should handle extremely deep component trees', () => {
      // Create a deeply nested structure
      let nestedGroup = createMockGroupMessage();
      for (let i = 0; i < 10; i++) {
        nestedGroup = {
          ...createMockGroupMessage({
            id: `deep-group-${i}`,
            children: [nestedGroup as any],
          }),
        };
      }

      expect(() => {
        render(<GroupMessageBlock {...defaultProps} message={nestedGroup} />);
      }).not.toThrow();
    });

    it('should handle circular references in message structure', () => {
      // This would be prevented by the type system, but test defensive programming
      const circularMessage = createMockMessage({ id: 'circular' });
      const circularGroup = createMockGroupMessage({
        children: [circularMessage],
      });

      // Simulate circular reference (this would normally be prevented)
      (circularMessage as any).parent = circularGroup;

      expect(() => {
        render(<GroupMessageBlock {...defaultProps} message={circularGroup} />);
      }).not.toThrow();
    });
  });
});