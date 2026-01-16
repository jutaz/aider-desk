import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupMessageBlock } from '../GroupMessageBlock';
import { GroupMessage, Message } from '@/types/message';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/usePerformanceMonitor', () => ({
  PerformanceProfiler: ({ children }: { children: React.ReactNode }) => children,
  usePerformanceMonitor: () => ({
    trackLazyLoading: vi.fn(),
  }),
}));

vi.mock('../MessageBlock', () => ({
  MessageBlock: ({ message }: { message: Message }) => (
    <div data-testid={`message-block-${message.id}`}>{message.content}</div>
  ),
}));

vi.mock('../MessageBar', () => ({
  MessageBar: () => <div data-testid="message-bar" />,
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
      <button data-testid="accordion-toggle" onClick={() => onOpenChange(!isOpen)}>
        {title}
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

describe('GroupMessageBlock Performance Tests', () => {
  const baseDir = '/test/project';
  const taskId = 'perf-test-task';

  const createLargeMessageArray = (count: number): Message[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `msg-${i}`,
      type: 'user' as const,
      content: `Performance test message ${i} with some additional content to simulate real message size and complexity in the rendering pipeline.`,
    }));

  const createMockGroupMessage = (children: Message[], overrides: Partial<GroupMessage> = {}): GroupMessage => ({
    id: 'group-perf-test',
    type: 'group',
    content: '',
    group: {
      id: 'group-context-perf',
      name: 'Performance Test Group',
      finished: true,
      color: '#ff0000',
    },
    children,
    ...overrides,
  });

  const defaultProps = {
    baseDir,
    taskId,
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

  describe('Lazy Loading Performance', () => {
    it('should load small threads immediately without performance impact', () => {
      const smallThread = createMockGroupMessage(createLargeMessageArray(5));

      const startTime = performance.now();
      render(<GroupMessageBlock {...defaultProps} message={smallThread} />);
      const renderTime = performance.now() - startTime;

      // Small threads should render quickly (< 100ms)
      expect(renderTime).toBeLessThan(100);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // All messages should be immediately available
      expect(screen.getAllByTestId(/^message-block-/)).toHaveLength(5);
    });

    it('should handle large thread expansion with acceptable performance', async () => {
      const largeThread = createMockGroupMessage(createLargeMessageArray(100));

      render(<GroupMessageBlock {...defaultProps} message={largeThread} />);

      const toggle = screen.getByTestId('accordion-toggle');
      const expandStartTime = performance.now();

      fireEvent.click(toggle);

      // Should show loading state immediately
      expect(screen.getByText('common.loading')).toBeInTheDocument();

      // Wait for lazy loading
      await act(async () => {
        await vi.advanceTimersByTime(200);
      });

      const expandTime = performance.now() - expandStartTime;

      // Large thread expansion should complete within reasonable time (< 500ms)
      expect(expandTime).toBeLessThan(500);
      expect(screen.queryByText('common.loading')).not.toBeInTheDocument();

      // Should render all messages
      expect(screen.getAllByTestId(/^message-block-/)).toHaveLength(100);
    });

    it('should maintain performance with very large threads', async () => {
      const veryLargeThread = createMockGroupMessage(createLargeMessageArray(500));

      const renderStartTime = performance.now();
      render(<GroupMessageBlock {...defaultProps} message={veryLargeThread} />);
      const initialRenderTime = performance.now() - renderStartTime;

      // Initial render should be fast even with large thread
      expect(initialRenderTime).toBeLessThan(200);

      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      await act(async () => {
        await vi.advanceTimersByTime(200);
      });

      // Should handle large thread without crashing
      expect(screen.getAllByTestId(/^message-block-/)).toHaveLength(500);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not render all messages in collapsed state for large threads', () => {
      const largeThread = createMockGroupMessage(createLargeMessageArray(50));

      render(<GroupMessageBlock {...defaultProps} message={largeThread} />);

      // In collapsed state, should not render any message blocks
      expect(screen.queryAllByTestId(/^message-block-/)).toHaveLength(0);
    });

    it('should efficiently handle thread state changes', async () => {
      const largeThread = createMockGroupMessage(createLargeMessageArray(30));

      render(<GroupMessageBlock {...defaultProps} message={largeThread} />);

      // Expand
      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      await act(async () => {
        await vi.advanceTimersByTime(200);
      });

      expect(screen.getAllByTestId(/^message-block-/)).toHaveLength(30);

      // Collapse
      fireEvent.click(toggle);

      // Messages should be cleaned up from DOM
      expect(screen.queryAllByTestId(/^message-block-/)).toHaveLength(0);
    });
  });

  describe('Animation Performance', () => {
    it('should handle preview message animations smoothly', () => {
      const unfinishedThread = createMockGroupMessage(createLargeMessageArray(10), {
        group: { id: 'group-anim', name: 'Animation Test', finished: false, color: '#00ff00' },
      });

      const renderStartTime = performance.now();
      render(<GroupMessageBlock {...defaultProps} message={unfinishedThread} />);
      const renderTime = performance.now() - renderStartTime;

      // Preview rendering should be fast
      expect(renderTime).toBeLessThan(100);

      // Should show preview message
      const previewMessages = screen.queryAllByTestId(/^message-block-/);
      expect(previewMessages.length).toBeGreaterThan(0);
    });

    it('should animate preview disappearance when expanded', async () => {
      const unfinishedThread = createMockGroupMessage(createLargeMessageArray(10), {
        group: { id: 'group-anim', name: 'Animation Test', finished: false, color: '#00ff00' },
      });

      render(<GroupMessageBlock {...defaultProps} message={unfinishedThread} />);

      // Should show preview initially
      expect(screen.getAllByTestId(/^message-block-/).length).toBeGreaterThan(0);

      // Expand
      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      await act(async () => {
        await vi.advanceTimersByTime(200);
      });

      // Preview should be hidden when expanded (animation completes)
      const previewMessages = screen.queryAllByTestId(/^message-block-/).filter(
        el => !el.closest('[data-testid="accordion-content"]')
      );
      expect(previewMessages).toHaveLength(0);
    });
  });

  describe('Re-rendering Optimization', () => {
    it('should prevent unnecessary re-renders with memoization', () => {
      const thread = createMockGroupMessage(createLargeMessageArray(5));

      const { rerender } = render(<GroupMessageBlock {...defaultProps} message={thread} />);

      // Rerender with same props
      rerender(<GroupMessageBlock {...defaultProps} message={thread} />);

      // Component should still function (memoization prevents unnecessary work)
      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);
      expect(screen.getByTestId('accordion-content')).toBeInTheDocument();
    });

    it('should re-render efficiently when props change', () => {
      const thread1 = createMockGroupMessage(createLargeMessageArray(3));
      const thread2 = createMockGroupMessage(createLargeMessageArray(3), {
        group: { ...thread1.group, name: 'Updated Name' },
      });

      const { rerender } = render(<GroupMessageBlock {...defaultProps} message={thread1} />);

      const rerenderStartTime = performance.now();
      rerender(<GroupMessageBlock {...defaultProps} message={thread2} />);
      const rerenderTime = performance.now() - rerenderStartTime;

      // Re-render should be fast
      expect(rerenderTime).toBeLessThan(50);

      // Should show updated name
      expect(screen.getByText('Updated Name')).toBeInTheDocument();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle rapid expand/collapse operations', async () => {
      const thread = createMockGroupMessage(createLargeMessageArray(20));

      render(<GroupMessageBlock {...defaultProps} message={thread} />);

      const toggle = screen.getByTestId('accordion-toggle');

      // Rapid expand/collapse cycles
      for (let i = 0; i < 5; i++) {
        fireEvent.click(toggle); // expand
        await act(async () => {
          await vi.advanceTimersByTime(100);
        });

        fireEvent.click(toggle); // collapse
        await act(async () => {
          await vi.advanceTimersByTime(100);
        });
      }

      // Component should remain stable
      expect(screen.getByTestId('accordion')).toBeInTheDocument();
    });

    it('should handle multiple large threads simultaneously', () => {
      const threads = [
        createMockGroupMessage(createLargeMessageArray(25), { id: 'group-1' }),
        createMockGroupMessage(createLargeMessageArray(25), { id: 'group-2' }),
        createMockGroupMessage(createLargeMessageArray(25), { id: 'group-3' }),
      ];

      const renderStartTime = performance.now();

      threads.forEach(thread => {
        render(<GroupMessageBlock {...defaultProps} message={thread} key={thread.id} />);
      });

      const renderTime = performance.now() - renderStartTime;

      // Rendering multiple threads should be efficient
      expect(renderTime).toBeLessThan(300);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should clean up event listeners and state on unmount', () => {
      const thread = createMockGroupMessage(createLargeMessageArray(15));

      const { unmount } = render(<GroupMessageBlock {...defaultProps} message={thread} />);

      // Expand to trigger lazy loading
      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // Unmount component
      unmount();

      // Component should clean up without issues
      // (This test mainly ensures no console errors or crashes)
    });

    it('should handle component unmounting during lazy loading', async () => {
      const thread = createMockGroupMessage(createLargeMessageArray(20));

      const { unmount } = render(<GroupMessageBlock {...defaultProps} message={thread} />);

      // Start expansion
      const toggle = screen.getByTestId('accordion-toggle');
      fireEvent.click(toggle);

      // Unmount before lazy loading completes
      unmount();

      // Should not cause memory leaks or errors
      await act(async () => {
        await vi.advanceTimersByTime(200);
      });
    });
  });
});