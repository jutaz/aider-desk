import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { ContextFile, ModelsData, QuestionData, TodoItem, TokensInfoData } from '@common/types';

import { Message } from '@/types/message';

export interface TaskState {
  loading: boolean;
  loaded: boolean;
  tokensInfo: TokensInfoData | null;
  question: QuestionData | null;
  todoItems: TodoItem[];
  allFiles: string[];
  autocompletionWords: string[];
  aiderTotalCost: number;
  contextFiles: ContextFile[];
  aiderModelsData: ModelsData | null;
  lastActiveAt: Date | null;
}

export const EMPTY_TASK_STATE: TaskState = {
  loading: false,
  loaded: false,
  tokensInfo: null,
  question: null,
  todoItems: [],
  allFiles: [],
  autocompletionWords: [],
  aiderTotalCost: 0,
  contextFiles: [],
  aiderModelsData: null,
  lastActiveAt: null,
};

export const EMPTY_MESSAGES: Message[] = [];



interface TaskStore {
  taskStateMap: Map<string, TaskState>;
  taskMessagesMap: Map<string, Message[]>;

  ensureTask: (taskId: string) => void;
  updateTaskState: (taskId: string, updates: Partial<TaskState>) => void;
  setMessages: (taskId: string, updateMessages: (prev: Message[]) => Message[]) => void;
  setTodoItems: (taskId: string, updateTodoItems: (prev: TodoItem[]) => TodoItem[]) => void;
  setAllFiles: (taskId: string, allFiles: string[]) => void;
  setAutocompletionWords: (taskId: string, autocompletionWords: string[]) => void;
  setTokensInfo: (taskId: string, tokensInfo: TokensInfoData | null) => void;
  setQuestion: (taskId: string, question: QuestionData | null) => void;
  setAiderModelsData: (taskId: string, modelsData: ModelsData | null) => void;
  setAiderTotalCost: (taskId: string, cost: number) => void;
  clearSession: (taskId: string, messagesOnly: boolean) => void;
  deleteTask: (taskId: string) => void;
  getMemoryUsage: () => { taskStates: number; messages: number; total: number };
  logMemoryUsage: () => { taskStates: number; messages: number; total: number };
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  taskStateMap: new Map(),
  taskMessagesMap: new Map(),

  ensureTask: (taskId) =>
    set((state) => {
      if (state.taskStateMap.has(taskId) && state.taskMessagesMap.has(taskId)) {
        return state;
      }
      const newStateMap = new Map(state.taskStateMap);
      const newMessagesMap = new Map(state.taskMessagesMap);
      newStateMap.set(taskId, { ...EMPTY_TASK_STATE });
      newMessagesMap.set(taskId, []);
      return { taskStateMap: newStateMap, taskMessagesMap: newMessagesMap };
    }),

  updateTaskState: (taskId, updates) =>
    set((state) => {
      const newMap = new Map(state.taskStateMap);
      const current = newMap.get(taskId) || EMPTY_TASK_STATE;
      newMap.set(taskId, { ...current, ...updates });
      return { taskStateMap: newMap };
    }),

  setMessages: (taskId, updateMessages) => {
    set((state) => {
      const newMessagesMap = new Map(state.taskMessagesMap);
      const currentMessages = newMessagesMap.get(taskId) || [];
      newMessagesMap.set(taskId, updateMessages(currentMessages));
      return { taskMessagesMap: newMessagesMap };
    });
  },

  setTodoItems: (taskId, updateTodoItems) =>
    set((state) => {
      const newMap = new Map(state.taskStateMap);
      const current = newMap.get(taskId) || EMPTY_TASK_STATE;
      newMap.set(taskId, {
        ...current,
        todoItems: updateTodoItems(current.todoItems),
      });
      return { taskStateMap: newMap };
    }),

  setAllFiles: (taskId, allFiles) =>
    set((state) => {
      const newMap = new Map(state.taskStateMap);
      const current = newMap.get(taskId) || EMPTY_TASK_STATE;
      newMap.set(taskId, { ...current, allFiles });
      return { taskStateMap: newMap };
    }),

  setAutocompletionWords: (taskId, autocompletionWords) =>
    set((state) => {
      const newMap = new Map(state.taskStateMap);
      const current = newMap.get(taskId) || EMPTY_TASK_STATE;
      newMap.set(taskId, { ...current, autocompletionWords });
      return { taskStateMap: newMap };
    }),

  setTokensInfo: (taskId, tokensInfo) =>
    set((state) => {
      const newMap = new Map(state.taskStateMap);
      const current = newMap.get(taskId) || EMPTY_TASK_STATE;
      newMap.set(taskId, { ...current, tokensInfo });
      return { taskStateMap: newMap };
    }),

  setQuestion: (taskId, question) =>
    set((state) => {
      const newMap = new Map(state.taskStateMap);
      const current = newMap.get(taskId) || EMPTY_TASK_STATE;
      newMap.set(taskId, { ...current, question });
      return { taskStateMap: newMap };
    }),

  setAiderModelsData: (taskId, modelsData) =>
    set((state) => {
      const newMap = new Map(state.taskStateMap);
      const current = newMap.get(taskId) || EMPTY_TASK_STATE;
      newMap.set(taskId, { ...current, aiderModelsData: modelsData });
      return { taskStateMap: newMap };
    }),

  setAiderTotalCost: (taskId, cost) =>
    set((state) => {
      const newMap = new Map(state.taskStateMap);
      const current = newMap.get(taskId) || EMPTY_TASK_STATE;
      newMap.set(taskId, { ...current, aiderTotalCost: cost });
      return { taskStateMap: newMap };
    }),

  clearSession: (taskId, messagesOnly) =>
    set((state) => {
      const newStateMap = new Map(state.taskStateMap);
      const newMessagesMap = new Map(state.taskMessagesMap);
      const current = newStateMap.get(taskId) || EMPTY_TASK_STATE;
      const update: Partial<TaskState> = {};
      if (!messagesOnly) {
        update.aiderTotalCost = 0;
        update.tokensInfo = null;
        update.question = null;
      }
      newStateMap.set(taskId, { ...current, ...update });
      newMessagesMap.set(taskId, []);
      return { taskStateMap: newStateMap, taskMessagesMap: newMessagesMap };
    }),

  deleteTask: (taskId) =>
    set((state) => {
      const newStateMap = new Map(state.taskStateMap);
      const newMessagesMap = new Map(state.taskMessagesMap);

      const hadState = newStateMap.has(taskId);
      const hadMessages = newMessagesMap.has(taskId);
      const hadPendingMessages = taskPendingMessages.has(taskId);

      // Remove task state
      newStateMap.delete(taskId);

      // Remove task messages
      newMessagesMap.delete(taskId);

      // Log cleanup for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`TaskStore: Cleaned up task ${taskId}`, {
          hadState,
          hadMessages,
          hadPendingMessages,
          remainingTasks: newStateMap.size,
          remainingMessageMaps: newMessagesMap.size,
        });
      }

      return { taskStateMap: newStateMap, taskMessagesMap: newMessagesMap };
    }),

  getMemoryUsage: () => {
    const state = get();
    let messagesSize = 0;

    // Calculate messages memory usage (rough estimate: ~1KB per message)
    for (const messages of state.taskMessagesMap.values()) {
      messagesSize += messages.length * 1024;
    }

    // Rough estimate: ~2KB per task state
    const taskStatesSize = state.taskStateMap.size * 2048;

    return {
      taskStates: taskStatesSize,
      messages: messagesSize,
      total: taskStatesSize + messagesSize,
    };
  },

  logMemoryUsage: () => {
    const usage = get().getMemoryUsage();
    if (process.env.NODE_ENV === 'development') {
      console.log('TaskStore Memory Usage:', {
        ...usage,
        formatted: {
          taskStates: `${(usage.taskStates / 1024).toFixed(2)} KB`,
          messages: `${(usage.messages / 1024).toFixed(2)} KB`,
          total: `${(usage.total / 1024).toFixed(2)} KB`,
        },
      });
    }
    return usage;
  },
}));

export const useTaskState = (taskId: string) => useTaskStore((state) => state.taskStateMap.get(taskId) || EMPTY_TASK_STATE);

export const useTaskMessages = (taskId: string) => useTaskStore(useShallow((state) => state.taskMessagesMap.get(taskId) || EMPTY_MESSAGES));
