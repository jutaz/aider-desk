import { MemoryEmbeddingProgress, MemoryEmbeddingProgressPhase, MemoryEmbeddingProvider, MemoryEntry, ProviderProfile, SettingsData } from '@common/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTrash } from 'react-icons/fa';

import { Checkbox } from '../common/Checkbox';
import { Select, type Option } from '../common/Select';
import { Section } from '../common/Section';

import { useApi } from '@/contexts/ApiContext';
import { useModelProviders } from '@/contexts/ModelProviderContext';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { IconButton } from '@/components/common/IconButton';
import { CodeInline } from '@/components/common/CodeInline';
import { Slider } from '@/components/common/Slider';
import { InfoIcon } from '@/components/common/InfoIcon';

const OPENAI_EMBEDDING_MODELS = [
  { value: 'text-embedding-3-small', label: 'text-embedding-3-small', dimensions: 1536, cost: '$0.02/1M' },
  { value: 'text-embedding-3-large', label: 'text-embedding-3-large', dimensions: 3072, cost: '$0.13/1M' },
];

const LITELLM_EMBEDDING_MODELS = [
  { value: 'text-embedding-3-small', label: 'text-embedding-3-small', dimensions: 1536, cost: 'Varies' },
  { value: 'text-embedding-3-large', label: 'text-embedding-3-large', dimensions: 3072, cost: 'Varies' },
];

const LOCAL_MODELS = [
  {
    value: 'Xenova/all-MiniLM-L6-v2',
    label: 'MiniLM-L6 (Fast, 100MB)',
    description: 'Fast and lightweight model',
  },
  {
    value: 'BAAI/bge-small-en-v1.5',
    label: 'BGE-Small (Good, 400MB)',
    description: 'Good balance of speed and quality',
  },
  {
    value: 'BAAI/bge-base-en-v1.5',
    label: 'BGE-Base (Better, 1.2GB)',
    description: 'Better quality for complex tasks',
  },
  {
    value: 'BAAI/bge-large-en-v1.5',
    label: 'BGE-Large (Best, 1.3GB)',
    description: 'Highest quality, slower',
  },
];

type Props = {
  settings: SettingsData;
  setSettings: (settings: SettingsData) => void;
};

export const MemorySettings = ({ settings, setSettings }: Props) => {
  const { t } = useTranslation();
  const api = useApi();
  const { providers } = useModelProviders();

  const [memories, setMemories] = useState<MemoryEntry[] | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('__all__');
  const [memoryToDelete, setMemoryToDelete] = useState<MemoryEntry | null>(null);
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const [showReembeddingWarning, setShowReembeddingWarning] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Reset warning when provider changes
  useEffect(() => {
    if (hasInitialized) {
      setShowReembeddingWarning(false);
    } else {
      // Mark as initialized after first render
      setHasInitialized(true);
    }
  }, [settings.memory.provider, hasInitialized]);

  const [embeddingProgress, setEmbeddingProgress] = useState<MemoryEmbeddingProgress | null>(null);

  // Provider options - defined after hooks to use t()
  const providerOptions = useMemo(
    () => [
      { value: MemoryEmbeddingProvider.SentenceTransformers, label: t('memory.providerLocal') },
      { value: MemoryEmbeddingProvider.OpenAI, label: t('memory.providerOpenAI') },
      { value: MemoryEmbeddingProvider.LiteLLM, label: t('memory.providerLiteLLM') },
    ],
    [t],
  );

  // Filter to relevant providers
  const openaiProviders = useMemo(() => providers.filter((p) => p.provider.name === 'openai'), [providers]);
  const litellmProviders = useMemo(() => providers.filter((p) => p.provider.name === 'litellm'), [providers]);

  // Helper functions
  const getFirstProviderId = (provider: MemoryEmbeddingProvider): string | undefined => {
    switch (provider) {
      case MemoryEmbeddingProvider.OpenAI:
        return openaiProviders[0]?.id;
      case MemoryEmbeddingProvider.LiteLLM:
        return litellmProviders[0]?.id;
      default:
        return undefined;
    }
  };

  const getDefaultModelForProvider = (provider: MemoryEmbeddingProvider): string => {
    switch (provider) {
      case MemoryEmbeddingProvider.OpenAI:
        return OPENAI_EMBEDDING_MODELS[0].value;
      case MemoryEmbeddingProvider.LiteLLM:
        return LITELLM_EMBEDDING_MODELS[0].value;
      default:
        return LOCAL_MODELS[0].value;
    }
  };

  const getSelectedProviderProfiles = (): ProviderProfile[] => {
    const providerName = settings.memory.provider;
    switch (providerName) {
      case MemoryEmbeddingProvider.OpenAI:
        return openaiProviders;
      case MemoryEmbeddingProvider.LiteLLM:
        return litellmProviders;
      default:
        return [];
    }
  };

  const getProviderOptions = useCallback(
    (providerName: MemoryEmbeddingProvider): Option[] => {
      switch (providerName) {
        case MemoryEmbeddingProvider.OpenAI:
          return openaiProviders.map((p) => ({ value: p.id, label: p.name || p.provider.name }));
        case MemoryEmbeddingProvider.LiteLLM:
          return litellmProviders.map((p) => ({ value: p.id, label: p.name || p.provider.name }));
        default:
          return [];
      }
    },
    [openaiProviders, litellmProviders],
  );

  const getModelOptions = (): Option[] => {
    switch (settings.memory.provider) {
      case MemoryEmbeddingProvider.OpenAI:
        return OPENAI_EMBEDDING_MODELS.map((m) => ({ value: m.value, label: m.label }));
      case MemoryEmbeddingProvider.LiteLLM:
        return LITELLM_EMBEDDING_MODELS.map((m) => ({ value: m.value, label: m.label }));
      default:
        return LOCAL_MODELS.map((m) => ({ value: m.value, label: m.label }));
    }
  };

  const getModelDimensions = (): number => {
    const models = settings.memory.provider === MemoryEmbeddingProvider.OpenAI ? OPENAI_EMBEDDING_MODELS : LITELLM_EMBEDDING_MODELS;
    return models.find((m) => m.value === settings.memory.model)?.dimensions ?? 0;
  };

  const getModelCost = (): string => {
    const models = settings.memory.provider === MemoryEmbeddingProvider.OpenAI ? OPENAI_EMBEDDING_MODELS : LITELLM_EMBEDDING_MODELS;
    return models.find((m) => m.value === settings.memory.model)?.cost ?? '';
  };

  const handleProviderChange = (provider: string) => {
    const newProvider = provider as MemoryEmbeddingProvider;

    // Reset providerId when switching providers
    const newProviderId = newProvider === MemoryEmbeddingProvider.SentenceTransformers ? undefined : getFirstProviderId(newProvider);

    // Set default model for the provider
    const defaultModel = getDefaultModelForProvider(newProvider);

    setSettings({
      ...settings,
      memory: {
        ...settings.memory,
        provider: newProvider,
        providerId: newProviderId,
        model: defaultModel,
      },
    });

    // Only show warning after initial load
    if (hasInitialized) {
      setShowReembeddingWarning(true);
    }
  };

  const handleProviderIdChange = (providerId: string) => {
    setSettings({
      ...settings,
      memory: {
        ...settings.memory,
        providerId,
      },
    });
  };

  const loadMemories = async () => {
    const all = await api.listAllMemories();
    setMemories(all);
  };

  useEffect(() => {
    void loadMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let timeoutId: number | null = null;
    let isCancelled = false;

    const poll = async () => {
      try {
        const progress = await api.getMemoryEmbeddingProgress();
        if (isCancelled) {
          return;
        }
        setEmbeddingProgress(progress);

        if (!progress.finished) {
          timeoutId = window.setTimeout(() => {
            void poll();
          }, 1000);
        }
      } catch {
        if (isCancelled) {
          return;
        }
        timeoutId = window.setTimeout(() => {
          void poll();
        }, 2000);
      }
    };

    void poll();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [api, settings.memory.model, settings.memory.provider]);

  const projectOptions = useMemo(() => {
    const ids = new Set<string>();
    (memories ?? []).forEach((m) => {
      if (m.projectId) {
        ids.add(m.projectId);
      }
    });

    return [
      { value: '__all__', label: t('settings.memory.memories.allProjects') },
      ...Array.from(ids)
        .sort((a, b) => a.localeCompare(b))
        .map((id) => ({ value: id, label: id.split('/').pop() || id })),
    ];
  }, [memories, t]);

  const filteredMemories = useMemo(() => {
    if (!memories) {
      return null;
    }
    if (selectedProjectId === '__all__') {
      return memories;
    }
    return memories.filter((m) => m.projectId === selectedProjectId);
  }, [memories, selectedProjectId]);

  const handleDeleteMemory = async () => {
    if (!memoryToDelete) {
      return;
    }
    await api.deleteMemory(memoryToDelete.id);
    setMemoryToDelete(null);
    await loadMemories();
  };

  const handleDeleteProjectMemories = async () => {
    if (selectedProjectId === '__all__') {
      return;
    }
    await api.deleteProjectMemories(selectedProjectId);
    setIsDeleteProjectDialogOpen(false);
    await loadMemories();
  };

  const handleEnabledChange = (enabled: boolean) => {
    setSettings({
      ...settings,
      memory: {
        ...settings.memory,
        enabled,
      },
    });
  };

  const handleModelChange = (model: string) => {
    setSettings({
      ...settings,
      memory: {
        ...settings.memory,
        model,
      },
    });
  };

  const handleMaxDistanceChange = (value: number) => {
    setSettings({
      ...settings,
      memory: {
        ...settings.memory,
        maxDistance: value,
      },
    });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <Section id="memory-general" title={t('settings.memory.configuration')}>
        <div className="px-4 py-5 space-y-4">
          <div className="text-xs py-2">{t('settings.memory.description')}</div>

          <Checkbox label={t('settings.memory.enabled.label')} checked={settings.memory.enabled} onChange={handleEnabledChange} size="md" />

          {settings.memory.enabled && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <Select
                  label={t('settings.memory.provider.label')}
                  value={settings.memory.provider}
                  onChange={handleProviderChange}
                  options={providerOptions}
                  className="w-full"
                />
                <p className="text-xs text-text-secondary mt-1">{t('settings.memory.provider.description')}</p>
              </div>

              {settings.memory.provider !== MemoryEmbeddingProvider.SentenceTransformers && (
                <div>
                  <Select
                    label={t('memory.selectProviderProfile')}
                    value={settings.memory.providerId || ''}
                    onChange={handleProviderIdChange}
                    options={getProviderOptions(settings.memory.provider)}
                    className="w-full"
                  />
                  {getSelectedProviderProfiles().length === 0 && (
                    <p className="text-sm text-yellow-600">{t('memory.noProviderConfigured', { provider: settings.memory.provider })}</p>
                  )}
                </div>
              )}

              <div>
                <Select
                  label={t('settings.memory.model.label')}
                  value={settings.memory.model}
                  onChange={handleModelChange}
                  options={getModelOptions()}
                  className="w-full"
                />
                {settings.memory.provider !== MemoryEmbeddingProvider.SentenceTransformers && (
                  <p className="text-xs text-text-secondary mt-1">
                    {t('memory.dimensions')}: {getModelDimensions()} | {t('memory.costPerMillion')}: {getModelCost()}
                  </p>
                )}
                {settings.memory.provider === MemoryEmbeddingProvider.SentenceTransformers && (
                  <p className="text-xs text-text-secondary mt-1">{LOCAL_MODELS.find((m) => m.value === settings.memory.model)?.description}</p>
                )}
              </div>

              <div>
                <Slider
                  label={
                    <div className="flex items-center text-xs gap-1">
                      <span>{t('settings.memory.maxDistance.label')}</span>
                      <InfoIcon tooltip={t('settings.memory.maxDistance.description')} className="ml-1" />
                    </div>
                  }
                  min={0}
                  max={2}
                  step={0.05}
                  value={settings.memory.maxDistance}
                  onChange={handleMaxDistanceChange}
                />
              </div>
            </div>
          )}

          {showReembeddingWarning && settings.memory.provider !== MemoryEmbeddingProvider.SentenceTransformers && (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">{t('memory.reembeddingWarning')}</div>
          )}
          {embeddingProgress && embeddingProgress.phase !== MemoryEmbeddingProgressPhase.Idle && (
            <div className="text-2xs text-text-muted">
              {embeddingProgress.phase === MemoryEmbeddingProgressPhase.LoadingModel && (
                <span>
                  {t('settings.memory.embeddingProgress.loadingModel', {
                    status: embeddingProgress.status || '-',
                  })}
                </span>
              )}
              {embeddingProgress.phase === MemoryEmbeddingProgressPhase.ReEmbedding && (
                <span>
                  {t('settings.memory.embeddingProgress.reEmbedding', {
                    done: embeddingProgress.done,
                    total: embeddingProgress.total,
                  })}
                </span>
              )}
              {embeddingProgress.phase === MemoryEmbeddingProgressPhase.Error && (
                <span className="text-error">
                  {t('settings.memory.embeddingProgress.error', {
                    error: embeddingProgress.error || '',
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section id="memory-memories" title={t('settings.memory.memories.title')} className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-5 space-y-4 flex-1 min-h-0 flex flex-col">
          <div className="flex items-end justify-between gap-4">
            <Select
              label={t('settings.memory.memories.project')}
              value={selectedProjectId}
              onChange={(value) => setSelectedProjectId(value)}
              options={projectOptions}
              className="min-w-[300px]"
            />

            <Button variant="contained" onClick={() => setIsDeleteProjectDialogOpen(true)} size="sm" color="danger" disabled={selectedProjectId === '__all__'}>
              {t('settings.memory.memories.deleteAllForProject')}
            </Button>
          </div>

          <div className="border border-border-default-dark rounded-md overflow-hidden flex-1 min-h-0">
            {!filteredMemories ? (
              <div className="px-4 py-3 text-xs text-text-secondary bg-bg-secondary">{t('settings.memory.memories.loading')}</div>
            ) : filteredMemories.length === 0 ? (
              <div className="px-4 py-3 text-xs text-text-secondary bg-bg-secondary">{t('settings.memory.memories.empty')}</div>
            ) : (
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-bg-secondary-light scrollbar-thumb-bg-fourth hover:scrollbar-thumb-bg-tertiary">
                <div className="divide-y divide-border-default-dark">
                  {filteredMemories
                    .slice()
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((m) => (
                      <div key={m.id} className="px-3 py-2.5 bg-bg-secondary flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-text-muted flex flex-wrap gap-x-1 gap-y-0.5 leading-4">
                            {m.projectId && (
                              <span>
                                <CodeInline>{m.projectId}</CodeInline>
                              </span>
                            )}
                            <span>
                              <CodeInline>{m.type}</CodeInline>
                            </span>
                          </div>
                          <div className="text-2xs text-text-primary mt-1 whitespace-pre-wrap break-words">{m.content}</div>
                        </div>

                        <div className="flex-shrink-0">
                          <IconButton
                            icon={<FaTrash className="w-3.5 h-3.5" />}
                            onClick={() => setMemoryToDelete(m)}
                            className="p-1.5 hover:bg-bg-tertiary hover:text-error rounded-md"
                            tooltip={t('settings.memory.memories.delete')}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {memoryToDelete && (
        <ConfirmDialog
          title={t('settings.memory.memories.deleteDialogTitle')}
          onConfirm={handleDeleteMemory}
          onCancel={() => setMemoryToDelete(null)}
          confirmButtonText={t('settings.memory.memories.delete')}
          confirmButtonClass="bg-error hover:bg-error"
        >
          <div className="text-sm text-text-secondary space-y-2">
            <div>
              {t('settings.memory.memories.deleteDialogText')} <CodeInline>{memoryToDelete.id}</CodeInline>
            </div>
          </div>
        </ConfirmDialog>
      )}

      {isDeleteProjectDialogOpen && selectedProjectId !== '__all__' && (
        <ConfirmDialog
          title={t('settings.memory.memories.deleteProjectDialogTitle')}
          onConfirm={handleDeleteProjectMemories}
          onCancel={() => setIsDeleteProjectDialogOpen(false)}
          confirmButtonText={t('settings.memory.memories.deleteAllForProject')}
          confirmButtonClass="bg-error hover:bg-error"
        >
          <div className="text-sm text-text-secondary space-y-2">
            <div>
              {t('settings.memory.memories.deleteProjectDialogText')} <CodeInline>{selectedProjectId}</CodeInline>
            </div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};
