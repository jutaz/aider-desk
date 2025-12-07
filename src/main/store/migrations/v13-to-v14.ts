/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProviderProfile } from '@common/types';
import { LlmProvider } from '@common/agent';
import { LlmProviderName } from '@common/providers';

export const migrateProvidersV13toV14 = (settings: { llmProviders: Partial<Record<LlmProviderName, LlmProvider>> }): any => {
  const providers: ProviderProfile[] = Object.entries(settings.llmProviders).map(([name, provider]) => ({
    id: name,
    provider,
  }));

  return providers;
};
