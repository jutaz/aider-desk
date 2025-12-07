import { McpServerConfig, ProjectData } from '@common/types';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaGlobe, FaProjectDiagram } from 'react-icons/fa';

import { McpServerItem } from './McpServerItem';
import { McpServerForm } from './McpServerForm';

import { useApi } from '@/contexts/ApiContext';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { BaseDialog } from '@/components/common/BaseDialog';

type Props = {
  openProjects?: ProjectData[];
};

export const McpSettings = ({ openProjects }: Props) => {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = useApi() as any;

  const [scope, setScope] = useState<'global' | 'project'>('global');
  const [selectedProjectDir, setSelectedProjectDir] = useState<string | null>(null);
  const [servers, setServers] = useState<Record<string, McpServerConfig>>({});
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingServerName, setEditingServerName] = useState<string | null>(null);

  // Initialize selectedProjectDir if needed
  useEffect(() => {
    if (scope === 'project' && !selectedProjectDir && openProjects && openProjects.length > 0) {
      setSelectedProjectDir(openProjects[0].baseDir);
    }
  }, [scope, openProjects, selectedProjectDir]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const projectDir = scope === 'project' ? selectedProjectDir : undefined;
      if (scope === 'project' && !projectDir) {
        setServers({});
        return;
      }

      // Use api.getMcpConfig if available
      if (api.getMcpConfig) {
        const config = await api.getMcpConfig(projectDir);
        setServers(config || {});
      } else {
        // eslint-disable-next-line no-console
        console.warn('api.getMcpConfig is not defined');
        setServers({});
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch MCP config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedProjectDir]);

  const handleSave = async (newServers: Record<string, McpServerConfig>) => {
    try {
      const projectDir = scope === 'project' ? selectedProjectDir : undefined;
      if (scope === 'project' && !projectDir) {
        return;
      }

      let updatedServers = { ...servers };

      if (editingServerName) {
        delete updatedServers[editingServerName];
      }

      updatedServers = { ...updatedServers, ...newServers };

      if (api.saveMcpConfig) {
        await api.saveMcpConfig(projectDir, updatedServers);
        setServers(updatedServers);

        // Reload servers to apply changes
        await api.reloadMcpServers(updatedServers);
      } else {
        // eslint-disable-next-line no-console
        console.warn('api.saveMcpConfig is not defined');
      }

      setIsAdding(false);
      setEditingServerName(null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save MCP config:', error);
    }
  };

  const handleRemove = async (serverName: string) => {
    try {
      const projectDir = scope === 'project' ? selectedProjectDir : undefined;
      if (scope === 'project' && !projectDir) {
        return;
      }

      const updatedServers = { ...servers };
      delete updatedServers[serverName];

      if (api.saveMcpConfig) {
        await api.saveMcpConfig(projectDir, updatedServers);
        setServers(updatedServers);

        await api.reloadMcpServers(updatedServers);
      } else {
        // eslint-disable-next-line no-console
        console.warn('api.saveMcpConfig is not defined');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove MCP server:', error);
    }
  };

  const projectOptions = useMemo(() => {
    return (openProjects || []).map((p) => ({
      value: p.baseDir,
      label: p.baseDir.split('/').pop() || p.baseDir,
    }));
  }, [openProjects]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex bg-bg-subtle rounded-lg p-1 border border-border-default">
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                scope === 'global' ? 'bg-bg-base text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
              onClick={() => setScope('global')}
            >
              <div className="flex items-center gap-2">
                <FaGlobe className="w-3.5 h-3.5" />
                {t('settings.agent.profileContext.global')}
              </div>
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                scope === 'project' ? 'bg-bg-base text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
              onClick={() => setScope('project')}
              disabled={!openProjects || openProjects.length === 0}
            >
              <div className="flex items-center gap-2">
                <FaProjectDiagram className="w-3.5 h-3.5" />
                {t('common.project')}
              </div>
            </button>
          </div>

          {scope === 'project' && (
            <div className="w-64">
              <Select options={projectOptions} value={selectedProjectDir || ''} onChange={(val) => setSelectedProjectDir(val)} />
            </div>
          )}
        </div>

        <Button variant="contained" onClick={() => setIsAdding(true)}>
          <FaPlus className="mr-2" />
          {t('mcpServer.addServer')}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-text-muted">{t('common.loading')}</div>
        ) : Object.keys(servers).length === 0 ? (
          <div className="text-center py-8 text-text-muted">{t('mcpServer.noServers')}</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(servers).map(([name, config]) => (
              <McpServerItem
                key={name}
                serverName={name}
                config={config}
                onEdit={() => setEditingServerName(name)}
                onRemove={() => handleRemove(name)}
                scope={scope}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      {(isAdding || editingServerName) && (
        <BaseDialog
          title={editingServerName ? t('mcpServer.editServer', { name: editingServerName }) : t('mcpServer.addServer')}
          onClose={() => {
            setIsAdding(false);
            setEditingServerName(null);
          }}
          width={800}
          footer={<></>}
        >
          <McpServerForm
            onSave={handleSave}
            onCancel={() => {
              setIsAdding(false);
              setEditingServerName(null);
            }}
            servers={editingServerName ? [{ name: editingServerName, config: servers[editingServerName] }] : undefined}
          />
        </BaseDialog>
      )}
    </div>
  );
};
