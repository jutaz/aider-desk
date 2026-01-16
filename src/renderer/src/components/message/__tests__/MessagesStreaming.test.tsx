import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Messages, MessagesRef } from '../Messages';
import { Message, ResponseMessage, GroupMessage, UserMessage } from '@/types/message';
import { TaskData, DefaultTaskState } from '@common/types';
import { useTaskStore } from '@/stores/taskStore';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

// Mock dependencies
vi.mock('@/stores/taskStore');
vi.mock('@/contexts/SettingsContext');
vi.mock('react-i18next');

vi.mock('@/hooks/useScrollingPaused');
vi.mock('@/hooks/useUserMessageNavigation');
vi.mock('@/components/message/utils', () => ({
  groupMessagesByPromptContext: vi.fn((messages) => messages),
}));

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn(() => Promise.resolve('mock-png-data')),
}));

// Mock react-icons
vi.mock('react-icons/md', () => ({
  MdKeyboardDoubleArrowDown: () => <div data-testid="scroll-icon" />,
}));

// Mock components
vi.mock('@/components/common/IconButton', () => ({
  IconButton: ({ children, onClick, tooltip }: any) => (
    <button onClick={onClick} title={tooltip} data-testid="icon-button">
      {children}
    </button>
  ),
}));

vi.mock('@/components/common/StyledTooltip', () => ({
  StyledTooltip: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../MessageBlock', () => ({
  MessageBlock: ({ message }: any) => (
    <div data-testid={`message-${message.id}`}>
      {message.type === 'response' && <span data-testid={`content-${message.id}`}>{message.content}</span>}
      {message.type === 'user' && <span data-testid={`user-content-${message.id}`}>{message.content}</span>}
    </div>
  ),
}));

vi.mock('../GroupMessageBlock', () => ({
  GroupMessageBlock: ({ message }: any) => (
    <div data-testid={`group-${message.id}`}>
      <span data-testid={`group-content-${message.id}`}>{message.content}</span>
      {message.children?.map((child: Message) => (
        <div key={child.id} data-testid={`group-child-${child.id}`}>
          {child.type === 'response' && <span data-testid={`child-content-${child.id}`}>{child.content}</span>}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../TaskStateActions', () => ({
  TaskStateActions: () => <div data-testid="task-state-actions" />,
}));

describe('Messages Streaming', () => {
  const mockTask: TaskData = {
    id: 'test-task-id',
    name: 'Test Task',
    baseDir: '/test',
    state: DefaultTaskState.InProgress,
    mainModel: 'gpt-4',
    weakModel: null,
    architectModel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date(),
  };

  let mockSetMessages: any;
  let mockUpdateTaskState: any;
  let mockClearSession: any;

  beforeEach(() => {
    mockSetMessages = vi.fn();
    mockUpdateTaskState = vi.fn();
    mockClearSession = vi.fn();

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

    vi.mocked(useSettings).mockReturnValue({
      settings: { renderMarkdown: true, taskSettings: { showTaskStateActions: false, smartTaskState: false, autoGenerateTaskName: false, worktreeSymlinkFolders: [] } },
      updateSettings: vi.fn(),
    });

    vi.mocked(useTranslation).mockReturnValue({
      t: vi.fn((key) => key),
    });

    // Mock scrolling hooks
    vi.mocked(await import('@/hooks/useScrollingPaused')).then(() => ({
      useScrollingPaused: vi.fn(() => ({
        scrollingPaused: false,
        setScrollingPaused: vi.fn(),
        scrollToBottom: vi.fn(),
        eventHandlers: {},
      })),
    }));

    vi.mocked(await import('@/hooks/useUserMessageNavigation')).then(() => ({
      useUserMessageNavigation: vi.fn(() => ({
        hasPreviousUserMessage: false,
        hasNextUserMessage: false,
        renderGoToPrevious: () => null,
        renderGoToNext: () => null,
      })),
    }));


  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders messages and displays streaming content as props change', async () => {
    const initialMessages: Message[] = [
      {
        id: 'user-1',
        type: 'user',
        content: 'Hello AI',
      },
    ];

    const { rerender } = render(
      <Messages
        baseDir="/test"
        taskId="test-task-id"
        task={mockTask}
        messages={initialMessages}
        allFiles={[]}
        renderMarkdown={true}
        removeMessage={vi.fn()}
        resumeTask={vi.fn()}
        redoLastUserPrompt={vi.fn()}
        editLastUserMessage={vi.fn()}
        onMarkAsDone={vi.fn()}
        onProceed={vi.fn()}
        onArchiveTask={vi.fn()}
        onUnarchiveTask={vi.fn()}
        onDeleteTask={vi.fn()}
      />
    );

    // Initial render should show user message
    expect(screen.getByTestId('user-content-user-1')).toHaveTextContent('Hello AI');

    // Simulate first streaming chunk by re-rendering with updated messages
    const messagesWithFirstChunk: Message[] = [
      ...initialMessages,
      {
        id: 'response-1',
        type: 'response',
        content: 'Hello',
      },
    ];

    rerender(
      <Messages
        baseDir="/test"
        taskId="test-task-id"
        task={mockTask}
        messages={messagesWithFirstChunk}
        allFiles={[]}
        renderMarkdown={true}
        removeMessage={vi.fn()}
        resumeTask={vi.fn()}
        redoLastUserPrompt={vi.fn()}
        editLastUserMessage={vi.fn()}
        onMarkAsDone={vi.fn()}
        onProceed={vi.fn()}
        onArchiveTask={vi.fn()}
        onUnarchiveTask={vi.fn()}
        onDeleteTask={vi.fn()}
      />
    );

    // Should show the response message with first chunk
    expect(screen.getByTestId('content-response-1')).toHaveTextContent('Hello');

    // Simulate second chunk
    const messagesWithSecondChunk: Message[] = [
      ...initialMessages,
      {
        id: 'response-1',
        type: 'response',
        content: 'Hello World!',
      },
    ];

    rerender(
      <Messages
        baseDir="/test"
        taskId="test-task-id"
        task={mockTask}
        messages={messagesWithSecondChunk}
        allFiles={[]}
        renderMarkdown={true}
        removeMessage={vi.fn()}
        resumeTask={vi.fn()}
        redoLastUserPrompt={vi.fn()}
        editLastUserMessage={vi.fn()}
        onMarkAsDone={vi.fn()}
        onProceed={vi.fn()}
        onArchiveTask={vi.fn()}
        onUnarchiveTask={vi.fn()}
        onDeleteTask={vi.fn()}
      />
    );

    // Should show updated content
    expect(screen.getByTestId('content-response-1')).toHaveTextContent('Hello World!');
  });

  it('handles grouped messages with subagent responses', async () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        type: 'user',
        content: 'Create a plan',
      },
      {
        id: 'group-1',
        type: 'group',
        content: 'Subagent responses',
        group: { id: 'group-1', name: 'Planning Agents' },
        children: [
          {
            id: 'response-1',
            type: 'response',
            content: 'Step 1: Analyze requirements',
            promptContext: { id: 'ctx-1', group: { id: 'group-1', name: 'Planning Agents' } },
          },
        ],
      },
    ];

    // Mock groupMessagesByPromptContext to return grouped messages
    const mockGroupMessagesByPromptContext = vi.mocked(await import('../utils')).groupMessagesByPromptContext;
    mockGroupMessagesByPromptContext.mockImplementation((msgs) => msgs); // Return as is for this test

    render(
      <Messages
        baseDir="/test"
        taskId="test-task-id"
        task={mockTask}
        messages={messages}
        allFiles={[]}
        renderMarkdown={true}
        removeMessage={vi.fn()}
        resumeTask={vi.fn()}
        redoLastUserPrompt={vi.fn()}
        editLastUserMessage={vi.fn()}
        onMarkAsDone={vi.fn()}
        onProceed={vi.fn()}
        onArchiveTask={vi.fn()}
        onUnarchiveTask={vi.fn()}
        onDeleteTask={vi.fn()}
      />
    );

    // Should render group message
    expect(screen.getByTestId('group-group-1')).toBeInTheDocument();
    expect(screen.getByTestId('group-child-response-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-content-response-1')).toHaveTextContent('Step 1: Analyze requirements');
  });

  it('handles component re-renders without losing message display', async () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        type: 'user',
        content: 'Test message',
      },
      {
        id: 'response-1',
        type: 'response',
        content: 'Streaming content',
      },
    ];

    const { rerender } = render(
      <Messages
        baseDir="/test"
        taskId="test-task-id"
        task={mockTask}
        messages={messages}
        allFiles={[]}
        renderMarkdown={true}
        removeMessage={vi.fn()}
        resumeTask={vi.fn()}
        redoLastUserPrompt={vi.fn()}
        editLastUserMessage={vi.fn()}
        onMarkAsDone={vi.fn()}
        onProceed={vi.fn()}
        onArchiveTask={vi.fn()}
        onUnarchiveTask={vi.fn()}
        onDeleteTask={vi.fn()}
      />
    );

    // Initial render
    expect(screen.getByTestId('content-response-1')).toHaveTextContent('Streaming content');

    // Re-render with same props
    rerender(
      <Messages
        baseDir="/test"
        taskId="test-task-id"
        task={mockTask}
        messages={messages}
        allFiles={[]}
        renderMarkdown={true}
        removeMessage={vi.fn()}
        resumeTask={vi.fn()}
        redoLastUserPrompt={vi.fn()}
        editLastUserMessage={vi.fn()}
        onMarkAsDone={vi.fn()}
        onProceed={vi.fn()}
        onArchiveTask={vi.fn()}
        onUnarchiveTask={vi.fn()}
        onDeleteTask={vi.fn()}
      />
    );

    // Content should still be there
    expect(screen.getByTestId('content-response-1')).toHaveTextContent('Streaming content');

    // Re-render with updated content
    const updatedMessages = [
      ...messages.slice(0, -1),
      {
        id: 'response-1',
        type: 'response',
        content: 'Streaming content updated',
      },
    ];

    rerender(
      <Messages
        baseDir="/test"
        taskId="test-task-id"
        task={mockTask}
        messages={updatedMessages}
        allFiles={[]}
        renderMarkdown={true}
        removeMessage={vi.fn()}
        resumeTask={vi.fn()}
        redoLastUserPrompt={vi.fn()}
        editLastUserMessage={vi.fn()}
        onMarkAsDone={vi.fn()}
        onProceed={vi.fn()}
        onArchiveTask={vi.fn()}
        onUnarchiveTask={vi.fn()}
        onDeleteTask={vi.fn()}
      />
    );

    // Updated content should be displayed
    expect(screen.getByTestId('content-response-1')).toHaveTextContent('Streaming content updated');
  });

  it('renders mixed message types correctly', () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        type: 'user',
        content: 'Hello',
      },
      {
        id: 'response-1',
        type: 'response',
        content: 'Hi there!',
      },
      {
        id: 'user-2',
        type: 'user',
        content: 'How are you?',
      },
      {
        id: 'response-2',
        type: 'response',
        content: 'I am doing well, thank you!',
      },
    ];

    render(
      <Messages
        baseDir="/test"
        taskId="test-task-id"
        task={mockTask}
        messages={messages}
        allFiles={[]}
        renderMarkdown={true}
        removeMessage={vi.fn()}
        resumeTask={vi.fn()}
        redoLastUserPrompt={vi.fn()}
        editLastUserMessage={vi.fn()}
        onMarkAsDone={vi.fn()}
        onProceed={vi.fn()}
        onArchiveTask={vi.fn()}
        onUnarchiveTask={vi.fn()}
        onDeleteTask={vi.fn()}
      />
    );

    // Check all messages are rendered
    expect(screen.getByTestId('user-content-user-1')).toHaveTextContent('Hello');
    expect(screen.getByTestId('content-response-1')).toHaveTextContent('Hi there!');
    expect(screen.getByTestId('user-content-user-2')).toHaveTextContent('How are you?');
    expect(screen.getByTestId('content-response-2')).toHaveTextContent('I am doing well, thank you!');
  });
});