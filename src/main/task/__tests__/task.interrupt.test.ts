/**
 * Tests for task.interruptResponse - verifying that canceling a task kills the aider process
 * This test validates the fix for ensuring task cancellation actually terminates the aider process.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies BEFORE importing
vi.mock('@/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('{}'),
    stat: vi.fn().mockRejectedValue(new Error('File not found')),
    readdir: vi.fn().mockResolvedValue([]),
    rm: vi.fn().mockResolvedValue(undefined),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{}'),
  stat: vi.fn().mockRejectedValue(new Error('File not found')),
  readdir: vi.fn().mockResolvedValue([]),
  rm: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils', () => ({
  fileExists: vi.fn().mockResolvedValue(false),
  filterIgnoredFiles: vi.fn().mockResolvedValue([]),
  getEnvironmentVariablesForAider: vi.fn().mockReturnValue({}),
  execWithShellPath: vi.fn(),
}));

vi.mock('@/constants', () => ({
  PROBE_BINARY_PATH: '/probe',
  AIDER_DESK_TASKS_DIR: '.aider-desk/tasks',
  AIDER_DESK_DIR: '.aider-desk',
  AIDER_DESK_TODOS_FILE: 'todos.json',
  AIDER_DESK_RULES_DIR: 'rules',
  AIDER_DESK_PROJECT_RULES_DIR: '.aider-desk/rules',
  AIDER_DESK_GLOBAL_RULES_DIR: '/home/.aider-desk/rules',
  AIDER_DESK_COMMANDS_DIR: '.aider-desk/commands',
  AIDER_DESK_HOOKS_DIR: '.aider-desk/hooks',
  AIDER_DESK_GLOBAL_HOOKS_DIR: '/home/.aider-desk/hooks',
  AIDER_DESK_PROMPTS_DIR: '.aider-desk/prompts',
  AIDER_DESK_DEFAULT_PROMPTS_DIR: '/resources/prompts',
  AIDER_DESK_GLOBAL_PROMPTS_DIR: '/home/.aider-desk/prompts',
  AIDER_DESK_AGENTS_DIR: '.aider-desk/agents',
  AIDER_DESK_TMP_DIR: '.aider-desk/tmp',
  AIDER_DESK_WATCH_FILES_LOCK: '.aider-desk/watch-files.lock',
  WORKTREE_BRANCH_PREFIX: 'aider-desk/task/',
  AIDER_DESK_MEMORY_FILE: '/data/memory.db',
  LOGS_DIR: '/logs',
  AIDER_DESK_CONNECTOR_DIR: '/connector',
  PID_FILES_DIR: '/pidfiles',
  PYTHON_COMMAND: 'python',
  SERVER_PORT: 12345,
}));

vi.mock('@/agent', () => ({
  Agent: class {
    run = vi.fn();
    dispose = vi.fn();
    interrupt = vi.fn();
    isRunning = vi.fn().mockReturnValue(false);
  },
  McpManager: class {},
  AgentProfileManager: class {},
}));

vi.mock('@/task/aider-manager', () => ({
  AiderManager: class {
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    dispose = vi.fn();
    isStarted = vi.fn().mockReturnValue(false);
    kill = vi.fn().mockResolvedValue(undefined);
    openCommandOutput = vi.fn();
    closeCommandOutput = vi.fn();
  },
}));

vi.mock('@/hooks/hook-manager', () => ({
  HookManager: class {
    trigger = vi.fn().mockResolvedValue({ event: {}, blocked: false });
    stopWatchingProject = vi.fn();
  },
}));

vi.mock('@/prompts', () => ({
  PromptsManager: class {},
}));

vi.mock('@/data-manager', () => ({
  DataManager: class {},
}));

vi.mock('@/telemetry', () => ({
  TelemetryManager: class {},
}));

vi.mock('@/models', () => ({
  ModelManager: class {},
}));

vi.mock('@/events', () => ({
  EventManager: class {
    sendTaskUpdated = vi.fn();
    sendTaskCreated = vi.fn();
    sendTaskDeleted = vi.fn();
    sendClearTask = vi.fn();
  },
}));

vi.mock('@/memory/memory-manager', () => ({
  MemoryManager: class {},
}));

vi.mock('@/worktrees', () => ({
  WorktreeManager: class {},
}));

vi.mock('@/custom-commands', () => ({
  CustomCommandManager: class {},
}));

vi.mock('@/store', () => ({
  Store: class {},
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid'),
}));

vi.mock('@/app', () => ({
  getElectronApp: vi.fn().mockReturnValue(null),
}));

import { Task } from '../task';
import { DefaultTaskState } from '@common/types';

describe('Task - interruptResponse', () => {
  let task: Task;
  let mockProject: any;
  let mockStore: any;
  let mockMcpManager: any;
  let mockCustomCommandManager: any;
  let mockAgentProfileManager: any;
  let mockTelemetryManager: any;
  let mockDataManager: any;
  let mockEventManager: any;
  let mockModelManager: any;
  let mockWorktreeManager: any;
  let mockMemoryManager: any;
  let mockHookManager: any;
  let mockPromptsManager: any;
  let mockExtensionManager: any;

  const baseDir = '/test/project';
  const taskId = 'test-task-id';

  beforeEach(() => {
    vi.clearAllMocks();

    // Create minimal mock dependencies
    mockProject = {
      baseDir,
      getProjectSettings: vi.fn(() => ({
        mainModel: 'default-model',
        agentProfileId: 'default-profile',
        modelEditFormats: {},
        currentMode: 'agent',
        autoApproveLocked: false,
      })),
    };

    mockStore = {
      getSettings: vi.fn(() => ({
        language: 'en',
        renderMarkdown: true,
        aider: { autoCommits: true, cachingEnabled: true, watchFiles: true },
        promptBehavior: { requireCommandConfirmation: {} },
      })),
    };

    mockMcpManager = {};
    mockCustomCommandManager = {};
    mockAgentProfileManager = {
      getProfile: vi.fn(() => null),
    };
    mockTelemetryManager = {};
    mockDataManager = {};
    mockEventManager = {
      sendTaskUpdated: vi.fn(),
      sendTaskCreated: vi.fn(),
      sendTaskDeleted: vi.fn(),
      sendClearTask: vi.fn(),
    };
    mockModelManager = {};
    mockWorktreeManager = {};
    mockMemoryManager = {};
    mockHookManager = {
      trigger: vi.fn((_hookName: string, event: any) => Promise.resolve({ event, blocked: false })),
    };
    mockPromptsManager = {};
    mockExtensionManager = {
      isInitialized: vi.fn(() => false),
      dispatchEvent: vi.fn().mockResolvedValue({}),
    };

    // Create Task instance
    task = new Task(
      mockProject,
      taskId,
      mockStore,
      mockMcpManager,
      mockCustomCommandManager,
      mockAgentProfileManager,
      mockTelemetryManager,
      mockDataManager,
      mockEventManager,
      mockModelManager,
      mockWorktreeManager,
      mockMemoryManager,
      mockHookManager,
      mockPromptsManager,
      mockExtensionManager,
    );

    // Mark as initialized for tests
    (task as any).initialized = true;
    (task as any).task.state = DefaultTaskState.InProgress;
  });

  describe('when aider process is started', () => {
    beforeEach(() => {
      // Mock the AiderManager to simulate started state
      const mockAiderManager = (task as any).aiderManager;
      mockAiderManager.isStarted = vi.fn().mockReturnValue(true);
      mockAiderManager.kill = vi.fn().mockResolvedValue(undefined);
    });

    it('should kill the aider process when interruptResponse is called', async () => {
      const mockAiderManager = (task as any).aiderManager;

      await task.interruptResponse();

      // Verify that kill was called to terminate the aider process
      expect(mockAiderManager.kill).toHaveBeenCalled();
    });

    it('should call agent.interrupt() when interrupting', async () => {
      const mockAgent = (task as any).agent;

      await task.interruptResponse();

      expect(mockAgent.interrupt).toHaveBeenCalled();
    });

    it('should cleanup chunk buffers when interrupting', async () => {
      // Add some mock chunk buffers
      const mockInterval = {} as NodeJS.Timeout;
      (task as any).responseChunkMap.set('msg-1', { buffer: 'test', interval: mockInterval });
      expect((task as any).responseChunkMap.size).toBe(1);

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      await task.interruptResponse();

      // Verify chunk buffers are cleaned up
      expect((task as any).responseChunkMap.size).toBe(0);
      clearIntervalSpy.mockRestore();
    });

    it('should update task state to Interrupted when interrupting', async () => {
      await task.interruptResponse();

      // Verify that the task state is updated to Interrupted
      expect((task as any).task.state).toBe(DefaultTaskState.Interrupted);
    });

    it('should handle errors when killing aider process gracefully', async () => {
      const mockAiderManager = (task as any).aiderManager;
      mockAiderManager.kill = vi.fn().mockRejectedValue(new Error('Process not found'));

      // Should not throw
      await expect(task.interruptResponse()).resolves.toBeUndefined();
    });
  });

  describe('when aider process is not started', () => {
    it('should not call kill when aider is not started', async () => {
      const mockAiderManager = (task as any).aiderManager;
      mockAiderManager.isStarted = vi.fn().mockReturnValue(false);
      mockAiderManager.kill = vi.fn();

      await task.interruptResponse();

      expect(mockAiderManager.kill).not.toHaveBeenCalled();
    });
  });

  describe('with specific interruptId', () => {
    it('should abort specific conflict resolution agent when interruptId is provided', async () => {
      const interruptId = 'conflict-resolution-1';
      const mockAbortController = {
        abort: vi.fn(),
      };
      (task as any).resolutionAbortControllers[interruptId] = mockAbortController;

      await task.interruptResponse(interruptId);

      expect(mockAbortController.abort).toHaveBeenCalled();
      expect((task as any).resolutionAbortControllers[interruptId]).toBeUndefined();
    });

    it('should log warning when conflict resolution agent not found', async () => {
      const interruptId = 'non-existent-id';

      // Should not throw
      await expect(task.interruptResponse(interruptId)).resolves.toBeUndefined();
    });
  });

  describe('with current question', () => {
    it('should answer question with "n" (Cancelled) when interrupting with active question', async () => {
      const mockAnswerQuestion = vi.fn().mockResolvedValue(undefined);
      (task as any).answerQuestion = mockAnswerQuestion;
      (task as any).currentQuestion = { id: 'question-1', text: 'Continue?' };

      await task.interruptResponse();

      expect(mockAnswerQuestion).toHaveBeenCalledWith('n', 'Cancelled');
    });
  });
});
