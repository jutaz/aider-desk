import { AgentProfile, ContextMemoryMode, InvocationMode, Model, ReasoningEffort, ToolApprovalState } from '@common/types';
import { LlmProviderName } from '@common/providers';
import {
  AIDER_TOOL_ADD_CONTEXT_FILES,
  AIDER_TOOL_DROP_CONTEXT_FILES,
  AIDER_TOOL_GET_CONTEXT_FILES,
  AIDER_TOOL_GROUP_NAME,
  AIDER_TOOL_RUN_PROMPT,
  POWER_TOOL_BASH,
  POWER_TOOL_FETCH,
  POWER_TOOL_FILE_EDIT,
  POWER_TOOL_FILE_READ,
  POWER_TOOL_FILE_WRITE,
  POWER_TOOL_GLOB,
  POWER_TOOL_GREP,
  POWER_TOOL_GROUP_NAME,
  POWER_TOOL_SEMANTIC_SEARCH,
  SUBAGENTS_TOOL_GROUP_NAME,
  SUBAGENTS_TOOL_RUN_TASK,
  TOOL_GROUP_NAME_SEPARATOR,
} from '@common/tools';

export interface LlmProviderBase {
  name: LlmProviderName;
  disableStreaming?: boolean;
  voiceEnabled?: boolean;
}

export interface OllamaProvider extends LlmProviderBase {
  name: LlmProviderName.Ollama;
  baseUrl: string;
}

export const AVAILABLE_PROVIDERS: LlmProviderName[] = Object.values(LlmProviderName);

export interface OpenAiProvider extends LlmProviderBase {
  name: LlmProviderName.Openai;
  apiKey: string;
  reasoningEffort?: ReasoningEffort;
  useWebSearch: boolean;
}
export const isOpenAiProvider = (provider: LlmProviderBase): provider is OpenAiProvider => provider.name === LlmProviderName.Openai;

export interface AzureProvider extends LlmProviderBase {
  name: LlmProviderName.Azure;
  apiKey: string;
  resourceName: string;
  apiVersion?: string;
  reasoningEffort?: ReasoningEffort;
}
export const isAzureProvider = (provider: LlmProviderBase): provider is AzureProvider => provider.name === LlmProviderName.Azure;

export interface AnthropicProvider extends LlmProviderBase {
  name: LlmProviderName.Anthropic;
  apiKey: string;
}
export const isAnthropicProvider = (provider: LlmProviderBase): provider is AnthropicProvider => provider.name === LlmProviderName.Anthropic;

export interface GeminiProvider extends LlmProviderBase {
  name: LlmProviderName.Gemini;
  apiKey: string;
  customBaseUrl?: string;
  includeThoughts: boolean;
  thinkingBudget: number;
  useSearchGrounding: boolean;
}

export const isGeminiProvider = (provider: LlmProviderBase): provider is GeminiProvider => provider.name === LlmProviderName.Gemini;

export interface VertexAiProvider extends LlmProviderBase {
  name: LlmProviderName.VertexAi;
  project: string;
  location: string;
  googleCloudCredentialsJson?: string;
  includeThoughts: boolean;
  thinkingBudget: number;
}

export const isVertexAiProvider = (provider: LlmProviderBase): provider is VertexAiProvider => provider.name === LlmProviderName.VertexAi;

export interface LmStudioProvider extends LlmProviderBase {
  name: LlmProviderName.Lmstudio;
  baseUrl: string;
}
export const isLmStudioProvider = (provider: LlmProviderBase): provider is LmStudioProvider => provider.name === LlmProviderName.Lmstudio;

export interface DeepseekProvider extends LlmProviderBase {
  name: LlmProviderName.Deepseek;
  apiKey: string;
}
export const isDeepseekProvider = (provider: LlmProviderBase): provider is DeepseekProvider => provider.name === LlmProviderName.Deepseek;

export interface GroqProvider extends LlmProviderBase {
  name: LlmProviderName.Groq;
  apiKey: string;
}
export const isGroqProvider = (provider: LlmProviderBase): provider is GroqProvider => provider.name === LlmProviderName.Groq;

export interface CerebrasProvider extends LlmProviderBase {
  name: LlmProviderName.Cerebras;
  apiKey: string;
}
export const isCerebrasProvider = (provider: LlmProviderBase): provider is CerebrasProvider => provider.name === LlmProviderName.Cerebras;

export interface BedrockProvider extends LlmProviderBase {
  name: LlmProviderName.Bedrock;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}
export const isBedrockProvider = (provider: LlmProviderBase): provider is BedrockProvider => provider.name === LlmProviderName.Bedrock;

export interface OpenAiCompatibleProvider extends LlmProviderBase {
  name: LlmProviderName.OpenaiCompatible;
  apiKey: string;
  baseUrl?: string;
  reasoningEffort?: ReasoningEffort;
}
export const isOpenAiCompatibleProvider = (provider: LlmProviderBase): provider is OpenAiCompatibleProvider =>
  provider.name === LlmProviderName.OpenaiCompatible;

export const isOllamaProvider = (provider: LlmProviderBase): provider is OllamaProvider => provider.name === LlmProviderName.Ollama;

export interface GpustackProvider extends LlmProviderBase {
  name: LlmProviderName.Gpustack;
  apiKey?: string;
  baseUrl?: string;
}
export const isGpustackProvider = (provider: LlmProviderBase): provider is GpustackProvider => provider.name === LlmProviderName.Gpustack;

export interface OpenRouterProvider extends LlmProviderBase {
  name: LlmProviderName.Openrouter;
  apiKey: string;
  // Advanced routing options
  requireParameters: boolean;
  order: string[];
  only: string[];
  ignore: string[];
  allowFallbacks: boolean;
  dataCollection: 'allow' | 'deny';
  quantizations: string[];
  sort: 'price' | 'throughput' | null;
}
export const isOpenRouterProvider = (provider: LlmProviderBase): provider is OpenRouterProvider => provider.name === LlmProviderName.Openrouter;

export interface RequestyProvider extends LlmProviderBase {
  name: LlmProviderName.Requesty;
  apiKey: string;
  useAutoCache: boolean;
  reasoningEffort: ReasoningEffort;
}
export const isRequestyProvider = (provider: LlmProviderBase): provider is RequestyProvider => provider.name === LlmProviderName.Requesty;

export interface ZaiPlanProvider extends LlmProviderBase {
  name: LlmProviderName.ZaiPlan;
  apiKey: string;
}
export const isZaiPlanProvider = (provider: LlmProviderBase): provider is ZaiPlanProvider => provider.name === LlmProviderName.ZaiPlan;

export interface MinimaxProvider extends LlmProviderBase {
  name: LlmProviderName.Minimax;
  apiKey: string;
}
export const isMinimaxProvider = (provider: LlmProviderBase): provider is MinimaxProvider => provider.name === LlmProviderName.Minimax;

export type LlmProvider =
  | OpenAiProvider
  | AnthropicProvider
  | AzureProvider
  | GeminiProvider
  | VertexAiProvider
  | LmStudioProvider
  | BedrockProvider
  | DeepseekProvider
  | GroqProvider
  | GpustackProvider
  | CerebrasProvider
  | OpenAiCompatibleProvider
  | OllamaProvider
  | OpenRouterProvider
  | RequestyProvider
  | ZaiPlanProvider
  | MinimaxProvider;

export const DEFAULT_MODEL_TEMPERATURE = 0.0;

export const DEFAULT_PROVIDER_MODELS: Partial<Record<LlmProviderName, string>> = {
  [LlmProviderName.Anthropic]: 'claude-sonnet-4-5-20250929',
  [LlmProviderName.Cerebras]: 'qwen-3-235b-a22b-instruct-2507',
  [LlmProviderName.Deepseek]: 'deepseek-chat',
  [LlmProviderName.Gemini]: 'gemini-3-pro',
  [LlmProviderName.Groq]: 'moonshotai/kimi-k2-instruct-0905',
  [LlmProviderName.Openai]: 'gpt-5.1-codex',
  [LlmProviderName.Openrouter]: 'anthropic/claude-sonnet-4.5',
  [LlmProviderName.Requesty]: 'anthropic/claude-sonnet-4-5',
  [LlmProviderName.ZaiPlan]: 'glm-4.6',
  [LlmProviderName.Minimax]: 'MiniMax-M2',
};

export const DEFAULT_AIDER_MAIN_MODEL = `${LlmProviderName.Anthropic}/${DEFAULT_PROVIDER_MODELS[LlmProviderName.Anthropic]}`;

const DEFAULT_AGENT_PROFILE_ID = 'default';

export const DEFAULT_AGENT_PROFILE: AgentProfile = {
  id: DEFAULT_AGENT_PROFILE_ID,
  name: 'Default Agent',
  provider: LlmProviderName.Anthropic,
  model: DEFAULT_PROVIDER_MODELS[LlmProviderName.Anthropic]!,
  maxIterations: 100,
  minTimeBetweenToolCalls: 0,
  toolApprovals: {
    // aider tools
    [`${AIDER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${AIDER_TOOL_GET_CONTEXT_FILES}`]: ToolApprovalState.Always,
    [`${AIDER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${AIDER_TOOL_ADD_CONTEXT_FILES}`]: ToolApprovalState.Always,
    [`${AIDER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${AIDER_TOOL_DROP_CONTEXT_FILES}`]: ToolApprovalState.Always,
    [`${AIDER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${AIDER_TOOL_RUN_PROMPT}`]: ToolApprovalState.Ask,
    // power tools
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_EDIT}`]: ToolApprovalState.Ask,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_READ}`]: ToolApprovalState.Always,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_WRITE}`]: ToolApprovalState.Ask,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_GLOB}`]: ToolApprovalState.Always,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_GREP}`]: ToolApprovalState.Always,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_SEMANTIC_SEARCH}`]: ToolApprovalState.Always,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_BASH}`]: ToolApprovalState.Ask,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FETCH}`]: ToolApprovalState.Always,
    // subagent tools
    [`${SUBAGENTS_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${SUBAGENTS_TOOL_RUN_TASK}`]: ToolApprovalState.Always,
  },
  toolSettings: {
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_BASH}`]: {
      allowedPattern: 'ls .*;cat .*;git status;git show;git log',
      deniedPattern: 'rm .*;del .*;chown .*;chgrp .*;chmod .*',
    },
  },
  includeContextFiles: true,
  includeRepoMap: false,
  usePowerTools: true,
  useAiderTools: false,
  useTodoTools: true,
  useSubagents: true,
  customInstructions: '',
  enabledServers: [],
  subagent: {
    enabled: false,
    systemPrompt: '',
    invocationMode: InvocationMode.OnDemand,
    color: '#3368a8',
    description: '',
    contextMemory: ContextMemoryMode.Off,
  },
  ruleFiles: [],
};

export const DEFAULT_AGENT_PROFILES: AgentProfile[] = [
  // Power tools
  {
    ...DEFAULT_AGENT_PROFILE,
    name: 'Power Tools',
    subagent: {
      ...DEFAULT_AGENT_PROFILE.subagent,
      description:
        'Direct file manipulation and system operations. Best for codebase analysis, file management, advanced search, data analysis, and tasks requiring precise control over individual files. This agent should be used as the main agent for analysis and coding tasks.',
      systemPrompt:
        'You are a specialized subagent for code analysis and file manipulation. Focus on providing detailed technical insights and precise file operations.',
    },
  },
  // Aider
  {
    ...DEFAULT_AGENT_PROFILE,
    id: 'aider',
    name: 'Aider',
    usePowerTools: false,
    useAiderTools: true,
    includeRepoMap: true,
    subagent: {
      ...DEFAULT_AGENT_PROFILE.subagent,
      description:
        "AI-powered code generation and refactoring. Best for implementing features, fixing bugs, and structured development workflows using Aider's intelligent code understanding and modification capabilities.",
      systemPrompt:
        'You are a specialized subagent for AI-powered code generation and refactoring. Focus on providing high-quality code modifications based on the given requirements.',
    },
    toolApprovals: {
      ...DEFAULT_AGENT_PROFILE.toolApprovals,
      [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_EDIT}`]: ToolApprovalState.Never,
      [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_WRITE}`]: ToolApprovalState.Never,
    },
  },
  // Aider with Power Search
  {
    ...DEFAULT_AGENT_PROFILE,
    id: 'aider-power-tools',
    name: 'Aider with Power Search',
    usePowerTools: true,
    useAiderTools: true,
    includeRepoMap: true,
    subagent: {
      ...DEFAULT_AGENT_PROFILE.subagent,
      description:
        "Hybrid approach combining Aider's code generation with advanced search capabilities. Best for complex development tasks requiring both intelligent code modification and comprehensive codebase exploration.",
      systemPrompt:
        'You are a specialized subagent for AI-powered code generation and advanced search. Focus on providing high-quality code modifications based on the given requirements and comprehensive codebase exploration.',
    },
    toolApprovals: {
      ...DEFAULT_AGENT_PROFILE.toolApprovals,
      [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_READ}`]: ToolApprovalState.Never,
      [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_EDIT}`]: ToolApprovalState.Never,
      [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_WRITE}`]: ToolApprovalState.Never,
      [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_BASH}`]: ToolApprovalState.Never,
    },
  },
];

export const INIT_PROJECT_AGENTS_PROFILE: AgentProfile = {
  ...DEFAULT_AGENT_PROFILE,
  id: 'init',
  maxIterations: 50,
  includeRepoMap: true,
  includeContextFiles: false,
  usePowerTools: true,
  useAiderTools: false,
  useTodoTools: false,
  useSubagents: false,
  toolApprovals: {
    ...DEFAULT_AGENT_PROFILE.toolApprovals,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_EDIT}`]: ToolApprovalState.Never,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_WRITE}`]: ToolApprovalState.Always,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_BASH}`]: ToolApprovalState.Never,
    [`${SUBAGENTS_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${SUBAGENTS_TOOL_RUN_TASK}`]: ToolApprovalState.Never,
  },
};

export const COMPACT_CONVERSATION_AGENT_PROFILE: AgentProfile = {
  ...DEFAULT_AGENT_PROFILE,
  id: 'compact',
  maxIterations: 5,
  includeRepoMap: false,
  includeContextFiles: false,
  usePowerTools: false,
  useAiderTools: false,
  useTodoTools: false,
  useSubagents: false,
  toolApprovals: {
    ...DEFAULT_AGENT_PROFILE.toolApprovals,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_EDIT}`]: ToolApprovalState.Never,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_FILE_WRITE}`]: ToolApprovalState.Never,
    [`${POWER_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${POWER_TOOL_BASH}`]: ToolApprovalState.Never,
    [`${SUBAGENTS_TOOL_GROUP_NAME}${TOOL_GROUP_NAME_SEPARATOR}${SUBAGENTS_TOOL_RUN_TASK}`]: ToolApprovalState.Never,
  },
};

// TODO: move to providers.ts
export const getDefaultProviderParams = <T extends LlmProvider>(providerName: LlmProviderName): T => {
  let provider: LlmProvider;

  const baseConfig: LlmProviderBase = {
    name: providerName,
    disableStreaming: false,
  };

  switch (providerName) {
    case LlmProviderName.Openai:
      provider = {
        name: LlmProviderName.Openai,
        apiKey: '',
        useWebSearch: false,
      } satisfies OpenAiProvider;
      break;
    case LlmProviderName.Azure:
      provider = {
        name: LlmProviderName.Azure,
        apiKey: '',
        resourceName: '',
        apiVersion: '',
      } satisfies AzureProvider;
      break;
    case LlmProviderName.Anthropic:
      provider = {
        name: LlmProviderName.Anthropic,
        apiKey: '',
      } satisfies AnthropicProvider;
      break;
    case LlmProviderName.Gemini:
      provider = {
        name: LlmProviderName.Gemini,
        apiKey: '',
        useSearchGrounding: false,
        includeThoughts: false,
        thinkingBudget: 0,
        customBaseUrl: '',
      } satisfies GeminiProvider;
      break;
    case LlmProviderName.VertexAi:
      provider = {
        name: LlmProviderName.VertexAi,
        project: '',
        location: '',
        googleCloudCredentialsJson: '',
        includeThoughts: false,
        thinkingBudget: 0,
      } satisfies VertexAiProvider;
      break;
    case LlmProviderName.Groq:
      provider = {
        name: LlmProviderName.Groq,
        apiKey: '',
      } satisfies GroqProvider;
      break;
    case LlmProviderName.Gpustack:
      provider = {
        name: LlmProviderName.Gpustack,
        apiKey: '',
        baseUrl: 'http://localhost',
      } satisfies GpustackProvider;
      break;
    case LlmProviderName.Cerebras:
      provider = {
        name: LlmProviderName.Cerebras,
        apiKey: '',
      } satisfies CerebrasProvider;
      break;
    case LlmProviderName.Deepseek:
      provider = {
        name: LlmProviderName.Deepseek,
        apiKey: '',
      } satisfies DeepseekProvider;
      break;
    case LlmProviderName.Bedrock:
      provider = {
        name: LlmProviderName.Bedrock,
        accessKeyId: '',
        secretAccessKey: '',
        region: 'us-east-1', // Default region
      } satisfies BedrockProvider;
      break;
    case LlmProviderName.OpenaiCompatible:
      provider = {
        name: LlmProviderName.OpenaiCompatible,
        apiKey: '',
        baseUrl: '',
        reasoningEffort: ReasoningEffort.None,
      } satisfies OpenAiCompatibleProvider;
      break;
    case LlmProviderName.Ollama:
      provider = {
        name: LlmProviderName.Ollama,
        baseUrl: 'http://localhost:11434/api',
      } satisfies OllamaProvider;
      break;
    case LlmProviderName.Openrouter:
      provider = {
        name: LlmProviderName.Openrouter,
        apiKey: '',
        order: [],
        allowFallbacks: true,
        dataCollection: 'allow',
        only: [],
        ignore: [],
        quantizations: [],
        sort: null,
        requireParameters: false,
      } satisfies OpenRouterProvider;
      break;
    case LlmProviderName.Lmstudio:
      provider = {
        name: LlmProviderName.Lmstudio,
        baseUrl: 'http://localhost:1234/v1',
      } satisfies LmStudioProvider;
      break;
    case LlmProviderName.Requesty:
      provider = {
        name: LlmProviderName.Requesty,
        apiKey: '',
        useAutoCache: true,
        reasoningEffort: ReasoningEffort.None,
      } satisfies RequestyProvider;
      break;
    case LlmProviderName.ZaiPlan:
      provider = {
        name: LlmProviderName.ZaiPlan,
        apiKey: '',
      } satisfies ZaiPlanProvider;
      break;
    case LlmProviderName.Minimax:
      provider = {
        name: LlmProviderName.Minimax,
        apiKey: '',
      } satisfies MinimaxProvider;
      break;
    default:
      // For any other provider, create a base structure. This might need more specific handling if new providers are added.
      provider = {
        ...baseConfig,
      } as LlmProvider;
  }

  return provider as T;
};

export const isSubagentEnabled = (agentProfile: AgentProfile, currentProfileId?: string): boolean => {
  return Boolean(agentProfile.subagent.systemPrompt && agentProfile.subagent.enabled && (!currentProfileId || agentProfile.id !== currentProfileId));
};

export const getProviderModelId = (model: Model): string => {
  return `${model.providerId}/${model.id}`;
};
