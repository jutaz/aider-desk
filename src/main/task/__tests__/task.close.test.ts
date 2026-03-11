/**
 * Tests for task.close - verifying that all pending promises are properly cleaned up
 * This test validates the fix for preventing memory leaks from unresolved promises.
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

describe('Task - close', () => {
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

  describe('pending agent run promises cleanup', () => {
    it('should resolve all pending agent run promises when closing', async () => {
      // Add pending agent run promises
      const resolve1 = vi.fn();
      const resolve2 = vi.fn();
      (task as any).agentRunResolves = [resolve1, resolve2];

      await task.close();

      // All pending promises should be resolved
      expect(resolve1).toHaveBeenCalled();
      expect(resolve2).toHaveBeenCalled();
      expect((task as any).agentRunResolves.length).toBe(0);
    });

    it('should not hang when there are no pending agent run promises', async () => {
      (task as any).agentRunResolves = [];

      // Should resolve without hanging
      await expect(task.close()).resolves.toBeUndefined();
    });
  });

  describe('pending prompt promises cleanup', () => {
    it('should resolve all pending prompt promises with empty results when closing', async () => {
      // Add pending prompt promises
      const resolve1 = vi.fn();
      const resolve2 = vi.fn();
      (task as any).runPromptResolves = [resolve1, resolve2];

      await task.close();

      // All pending promises should be resolved with empty arrays
      expect(resolve1).toHaveBeenCalledWith([]);
      expect(resolve2).toHaveBeenCalledWith([]);
      expect((task as any).runPromptResolves.length).toBe(0);
    });

    it('should not hang when there are no pending prompt promises', async () => {
      (task as any).runPromptResolves = [];

      await expect(task.close()).resolves.toBeUndefined();
    });
  });

  describe('pending question promises cleanup', () => {
    it('should resolve all pending question promises when closing', async () => {
      // Add pending question promises (without setting currentQuestion to avoid triggering answerQuestion)
      const resolve1 = vi.fn();
      const resolve2 = vi.fn();
      (task as any).currentQuestionResolves = [resolve1, resolve2];
      // Note: Not setting currentQuestion to avoid the answerQuestion path in interruptResponse

      await task.close();

      // All pending promises should be resolved with empty answer
      expect(resolve1).toHaveBeenCalledWith(['', undefined]);
      expect(resolve2).toHaveBeenCalledWith(['', undefined]);
      expect((task as any).currentQuestionResolves.length).toBe(0);
    });
  });

  describe('resolution abort controllers cleanup', () => {
    it('should abort all resolution abort controllers when closing', async () => {
      // Add mock abort controllers
      const abortController1 = { abort: vi.fn() };
      const abortController2 = { abort: vi.fn() };
      (task as any).resolutionAbortControllers = {
        'conflict-1': abortController1,
        'conflict-2': abortController2,
      };

      await task.close();

      // All abort controllers should be triggered
      expect(abortController1.abort).toHaveBeenCalled();
      expect(abortController2.abort).toHaveBeenCalled();
      expect(Object.keys((task as any).resolutionAbortControllers).length).toBe(0);
    });
  });

  describe('chunk buffers cleanup', () => {
    it('should clear all chunk buffers when closing', async () => {
      // Add mock chunk buffers with intervals
      const mockInterval1 = { clear: vi.fn() } as any;
      const mockInterval2 = { clear: vi.fn() } as any;

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => {});

      (task as any).responseChunkMap.set('msg-1', { buffer: 'test1', interval: mockInterval1 });
      (task as any).responseChunkMap.set('msg-2', { buffer: 'test2', interval: mockInterval2 });

      expect((task as any).responseChunkMap.size).toBe(2);

      await task.close();

      // All chunk buffers should be cleared
      expect((task as any).responseChunkMap.size).toBe(0);
      clearIntervalSpy.mockRestore();
    });
  });

  describe('aider manager cleanup', () => {
    it('should kill the aider process when closing', async () => {
      const mockAiderManager = (task as any).aiderManager;
      mockAiderManager.kill = vi.fn().mockResolvedValue(undefined);
      mockAiderManager.isStarted = vi.fn().mockReturnValue(true);

      await task.close();

      // Aider process should be killed
      expect(mockAiderManager.kill).toHaveBeenCalled();
    });
  });

  describe('initialized state', () => {
    it('should set initialized to false after closing', async () => {
      expect((task as any).initialized).toBe(true);

      await task.close();

      expect((task as any).initialized).toBe(false);
    });

    it('should return early if not initialized', async () => {
      (task as any).initialized = false;

      await task.close();

      // Should return early without errors
      expect((task as any).initialized).toBe(false);
    });
  });

  describe('with clearContext option', () => {
    it('should send clear task event when clearContext is true', async () => {
      await task.close(true);

      expect(mockEventManager.sendClearTask).toHaveBeenCalledWith(baseDir, taskId, true, true);
    });

    it('should not send clear task event when clearContext is false', async () => {
      await task.close(false);

      expect(mockEventManager.sendClearTask).not.toHaveBeenCalled();
    });
  });

  describe('hooks and extensions', () => {
    it('should trigger onTaskClosed hook when closing', async () => {
      await task.close();

      expect(mockHookManager.trigger).toHaveBeenCalledWith(
        'onTaskClosed',
        expect.objectContaining({ task: (task as any).task }),
        task,
        mockProject,
      );
    });

    it('should dispatch onTaskClosed event to extensions when closing', async () => {
      await task.close();

      expect(mockExtensionManager.dispatchEvent).toHaveBeenCalledWith(
        'onTaskClosed',
        expect.objectContaining({ task: (task as any).task }),
        mockProject,
        task,
      );
    });
  });

  describe('interruptResponse integration', () => {
    it('should call interruptResponse during close', async () => {
      const mockInterruptResponse = vi.spyOn(task, 'interruptResponse').mockResolvedValue();

      await task.close();

      expect(mockInterruptResponse).toHaveBeenCalled();
      mockInterruptResponse.mockRestore();
    });
  });

  describe('cleanup of empty task', () => {
    it('should call cleanUpEmptyTask when cleanupEmptyTask is true', async () => {
      const mockCleanUpEmptyTask = vi.spyOn(task as any, 'cleanUpEmptyTask').mockResolvedValue();

      await task.close(true, true);

      expect(mockCleanUpEmptyTask).toHaveBeenCalled();
      mockCleanUpEmptyTask.mockRestore();
    });

    it('should not call cleanUpEmptyTask when cleanupEmptyTask is false', async () => {
      const mockCleanUpEmptyTask = vi.spyOn(task as any, 'cleanUpEmptyTask').mockResolvedValue();

      await task.close(true, false);

      expect(mockCleanUpEmptyTask).not.toHaveBeenCalled();
      mockCleanUpEmptyTask.mockRestore();
    });
  });
});
