/* eslint-disable @typescript-eslint/no-explicit-any */
import { SettingsData, MemoryEmbeddingProvider } from '@common/types';

import logger from '@/logger';

/**
 * Migration v17 to v18:
 * - Add providerId to memory config (default: undefined)
 * - Ensure existing configs default to sentence-transformers provider
 * - Preserve all existing memory settings
 */
export const migrateSettingsV17toV18 = (settings: SettingsData): SettingsData => {
  logger.info('Migrating settings from v17 to v18: adding memory providerId');

  // Ensure memory object exists
  const existingMemory = (settings as any).memory || {};

  // Create updated memory config with providerId
  const updatedMemory = {
    ...existingMemory,
    // Ensure provider is set to sentence-transformers for existing configs
    provider: existingMemory.provider ?? MemoryEmbeddingProvider.SentenceTransformers,
    // Add providerId field (undefined for existing configs - they use local provider)
    providerId: existingMemory.providerId ?? undefined,
    // Preserve all other existing memory settings
    model: existingMemory.model ?? 'Xenova/all-MiniLM-L6-v2',
    maxDistance: existingMemory.maxDistance ?? 1.5,
    enabled: existingMemory.enabled ?? true,
  };

  const updatedSettings = {
    ...settings,
    memory: updatedMemory,
  };

  logger.info('Memory providerId migration completed');
  return updatedSettings as SettingsData;
};
