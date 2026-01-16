import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroupMessageBlock } from '../GroupMessageBlock';
import { GroupMessage, Message, ResponseMessage, ToolMessage } from '@/types/message';
import { UsageReportData } from '@common/types';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));



vi.mock('../MessageBlock', () => ({
  MessageBlock: ({ message, compact }: { message: Message; compact?: boolean }) => (
    <div data-testid={`message-block-${message.id}`} data-compact={compact}>
      {message.content}
    </div>
  ),
}));

vi.mock('../MessageBar', () => ({
  MessageBar: ({ usageReport }: { usageReport?: UsageReportData }) => (
    <div data-testid="message-bar">
      {usageReport ? `Usage: ${usageReport.model}` : 'No usage'}
    </div>
  ),
}));

vi.mock('@/components/common/Accordion', () => ({
  Accordion: ({
    title,
    children,
    isOpen,
    onOpenChange
  }: {
    title: React.ReactNode;
    children: React.ReactNode;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="accordion">
      <button
        data-testid="accordion-toggle"
        onClick={() => onOpenChange(!isOpen)}
      >
        {title}
      </button>
      {isOpen && <div data-testid="accordion-content">{children}</div>}
    </div>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('GroupMessageBlock', () => {
  const baseDir = '/test/project';
  const taskId = 'test-task-123';

  const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
    id: 'msg-1',
    type: 'user',
    content: 'Test message',
    ...overrides,
  });

  const createMockGroupMessage = (overrides: Partial<GroupMessage> = {}): GroupMessage => ({
    id: 'group-1',
    type: 'group',
    content: '',
    group: {
      id: 'group-context-1',
      name: 'Test Group',
      finished: true,
      color: '#ff0000',
    },
    children: [
      createMockMessage({ id: 'child-1', type: 'user', content: 'User message 1' }),
      createMockMessage({ id: 'child-2', type: 'response', content: 'Response message 1' }),
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

  describe('Basic Rendering', () => {
    it('renders group header with name', () => {
      render(<GroupMessageBlock {...defaultProps} />);
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });

    it('renders group header with default name when no name provided', () => {
      const message = createMockGroupMessage({ group: { ...createMockGroupMessage().group, name: undefined } });
      render(<GroupMessageBlock {...defaultProps} message={message} />);
      expect(screen.getByText('messages.group')).toBeInTheDocument();
    });

    it('renders with correct color bar', () => {
      const { container } = render(<GroupMessageBlock {...defaultProps} />);
      const colorBar = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]');
      expect(colorBar).toBeInTheDocument();
    });

    it('renders message bar with aggregated usage', () => {
      const messageWithUsage = createMockGroupMessage({
        children: [
          {
            ...createMockMessage({ id: 'child-1', type: 'response' }),
            usageReport: { model: 'gpt-4', sentTokens: 100, receivedTokens: 200, messageCost: 0.05 },
          } as ResponseMessage,
          {
            ...createMockMessage({ id: 'child-2', type: 'tool' }),
            usageReport: { model: 'gpt-4', sentTokens: 50, receivedTokens: 100, messageCost: 0.03 },
          } as ToolMessage,
        ],
      });
      render(<GroupMessageBlock {...defaultProps} message={messageWithUsage} />);
      expect(screen.getByTestId('message-bar')).toHaveTextContent('Usage: gpt-4');
    });
  });

  describe('Accordion Behavior', () => {
    it('starts collapsed by default', () => {
      render(<GroupMessageBlock {...defaultProps} />);
      expect(screen.queryByTestId('accordion-content')).not.toBeInTheDocument();
    });

    it('expands when clicked', () => {
      render(<GroupMessageBlock {...defaultProps} />);
      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);
      expect(screen.getByTestId('accordion-content')).toBeInTheDocument();
    });

    it('renders child messages when expanded', () => {
      render(<GroupMessageBlock {...defaultProps} />);
      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      expect(screen.getByTestId('message-block-child-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-block-child-2')).toBeInTheDocument();
    });
  });

  describe('Lazy Loading', () => {
    it('loads small threads immediately', () => {
      const smallThread = createMockGroupMessage({
        children: Array.from({ length: 5 }, (_, i) =>
          createMockMessage({ id: `child-${i}`, type: 'user', content: `Message ${i}` })
        ),
      });
      render(<GroupMessageBlock {...defaultProps} message={smallThread} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // All messages should be rendered immediately
      smallThread.children.forEach((_, i) => {
        expect(screen.getByTestId(`message-block-child-${i}`)).toBeInTheDocument();
      });
    });

    it('shows loading state for large threads when expanded', async () => {
      const largeThread = createMockGroupMessage({
        children: Array.from({ length: 15 }, (_, i) =>
          createMockMessage({ id: `child-${i}`, type: 'user', content: `Message ${i}` })
        ),
      });

      render(<GroupMessageBlock {...defaultProps} message={largeThread} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // Should show loading spinner initially
      expect(screen.getByText('common.loading')).toBeInTheDocument();

      // Wait for lazy loading to complete
      await act(async () => {
        await vi.advanceTimersByTime(200);
      });

      // Loading should be gone and messages should be rendered
      expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
      largeThread.children.slice(0, 5).forEach((_, i) => {
        expect(screen.getByTestId(`message-block-child-${i}`)).toBeInTheDocument();
      });
    });


  });

  describe('Preview Message', () => {
    it('shows preview message when collapsed and unfinished', () => {
      const unfinishedGroup = createMockGroupMessage({
        group: { ...createMockGroupMessage().group, finished: false },
        children: [
          createMockMessage({ id: 'child-1', type: 'user', content: 'User message' }),
          createMockMessage({ id: 'child-2', type: 'response', content: 'Response message' }),
        ],
      });

      render(<GroupMessageBlock {...defaultProps} message={unfinishedGroup} />);

      // Should show preview of the last response/tool/user message
      expect(screen.getByTestId('message-block-child-2')).toBeInTheDocument();
      expect(screen.getByTestId('message-block-child-2')).toHaveAttribute('data-compact', 'true');
    });

    it('does not show preview when expanded', () => {
      const unfinishedGroup = createMockGroupMessage({
        group: { ...createMockGroupMessage().group, finished: false },
      });

      render(<GroupMessageBlock {...defaultProps} message={unfinishedGroup} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // Preview should not be shown when expanded
      const previewMessages = screen.queryAllByTestId(/message-block-/).filter(
        el => el.getAttribute('data-compact') === 'true'
      );
      expect(previewMessages).toHaveLength(0);
    });

    it('does not show preview when finished', () => {
      const finishedGroup = createMockGroupMessage({
        group: { ...createMockGroupMessage().group, finished: true },
      });

      render(<GroupMessageBlock {...defaultProps} message={finishedGroup} />);

      const previewMessages = screen.queryAllByTestId(/message-block-/).filter(
        el => el.getAttribute('data-compact') === 'true'
      );
      expect(previewMessages).toHaveLength(0);
    });
  });

  describe('Usage Aggregation', () => {
    it('aggregates usage from multiple messages', () => {
      const messagesWithUsage: Message[] = [
        {
          ...createMockMessage({ id: 'child-1', type: 'response' }),
          usageReport: { model: 'gpt-4', sentTokens: 100, receivedTokens: 200, messageCost: 0.05 },
        } as ResponseMessage,
        {
          ...createMockMessage({ id: 'child-2', type: 'tool' }),
          usageReport: { model: 'gpt-4', sentTokens: 50, receivedTokens: 100, messageCost: 0.03 },
        } as ToolMessage,
        createMockMessage({ id: 'child-3', type: 'user', content: 'User message' }), // No usage
      ];

      const groupWithUsage = createMockGroupMessage({ children: messagesWithUsage });
      render(<GroupMessageBlock {...defaultProps} message={groupWithUsage} />);

      const messageBar = screen.getByTestId('message-bar');
      expect(messageBar).toHaveTextContent('Usage: gpt-4');
    });

    it('uses last message tokens for aggregated report', () => {
      const messagesWithUsage: Message[] = [
        {
          ...createMockMessage({ id: 'child-1', type: 'response' }),
          usageReport: { model: 'gpt-4', sentTokens: 100, receivedTokens: 200, messageCost: 0.05 },
        } as ResponseMessage,
        {
          ...createMockMessage({ id: 'child-2', type: 'tool' }),
          usageReport: { model: 'gpt-4', sentTokens: 50, receivedTokens: 150, messageCost: 0.03 },
        } as ToolMessage,
      ];

      const groupWithUsage = createMockGroupMessage({ children: messagesWithUsage });
      render(<GroupMessageBlock {...defaultProps} message={groupWithUsage} />);

      // Should use tokens from the last message with usage
      const messageBar = screen.getByTestId('message-bar');
      expect(messageBar).toHaveTextContent('Usage: gpt-4');
    });

    it('returns undefined when no messages have usage', () => {
      const messagesWithoutUsage = [
        createMockMessage({ id: 'child-1', type: 'user', content: 'User message' }),
        createMockMessage({ id: 'child-2', type: 'response', content: 'Response message' }),
      ];

      const groupWithoutUsage = createMockGroupMessage({ children: messagesWithoutUsage });
      render(<GroupMessageBlock {...defaultProps} message={groupWithoutUsage} />);

      const messageBar = screen.getByTestId('message-bar');
      expect(messageBar).toHaveTextContent('No usage');
    });
  });

  describe('Animation and Visual States', () => {
    it('shows pulse animation when group is unfinished', () => {
      const unfinishedGroup = createMockGroupMessage({
        group: { ...createMockGroupMessage().group, finished: false },
      });

      const { container } = render(<GroupMessageBlock {...defaultProps} message={unfinishedGroup} />);

      const animatedElements = container.querySelectorAll('[class*="animate-pulse"]');
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('does not show pulse animation when group is finished', () => {
      const finishedGroup = createMockGroupMessage({
        group: { ...createMockGroupMessage().group, finished: true },
      });

      const { container } = render(<GroupMessageBlock {...defaultProps} message={finishedGroup} />);

      const animatedElements = container.querySelectorAll('[class*="animate-pulse"]');
      expect(animatedElements.length).toBe(0);
    });
  });

  describe('Memoization', () => {
    it('re-renders when message content changes', () => {
      const { rerender } = render(<GroupMessageBlock {...defaultProps} />);

      const newMessage = createMockGroupMessage({
        children: [
          createMockMessage({ id: 'child-1', type: 'user', content: 'Updated message' }),
        ],
      });

      rerender(<GroupMessageBlock {...defaultProps} message={newMessage} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      expect(screen.getByTestId('message-block-child-1')).toHaveTextContent('Updated message');
    });

    it('does not re-render when props are equal', () => {
      const message1 = createMockGroupMessage();
      const message2 = createMockGroupMessage(); // Same content

      const { rerender } = render(<GroupMessageBlock {...defaultProps} message={message1} />);

      // Rerender with identical message
      rerender(<GroupMessageBlock {...defaultProps} message={message2} />);

      // Component should still function normally
      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);
      expect(screen.getByTestId('accordion-content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children array', () => {
      const emptyGroup = createMockGroupMessage({ children: [] });
      render(<GroupMessageBlock {...defaultProps} message={emptyGroup} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // Should not crash and show empty content
      expect(screen.getByTestId('accordion-content')).toBeInTheDocument();
    });

    it('handles messages without IDs', () => {
      const messagesWithoutIds = [
        createMockMessage({ id: undefined, type: 'user', content: 'Message 1' }),
        createMockMessage({ id: undefined, type: 'response', content: 'Message 2' }),
      ];

      const groupWithoutIds = createMockGroupMessage({ children: messagesWithoutIds });
      render(<GroupMessageBlock {...defaultProps} message={groupWithoutIds} />);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // Should render messages even without IDs
      expect(screen.getAllByTestId(/^message-block-/)).toHaveLength(2);
    });

    it('handles LocalizedString group names', () => {
      const localizedNameGroup = createMockGroupMessage({
        group: {
          ...createMockGroupMessage().group,
          name: { key: 'custom.group.name', params: { count: 5 } },
        },
      });

      render(<GroupMessageBlock {...defaultProps} message={localizedNameGroup} />);

      expect(screen.getByText('custom.group.name')).toBeInTheDocument();
    });
  });


});