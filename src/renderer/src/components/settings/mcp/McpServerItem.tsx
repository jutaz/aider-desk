import { McpServerConfig } from '@common/types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';

import { Accordion } from '@/components/common/Accordion';
import { IconButton } from '@/components/common/IconButton';
import { useApi } from '@/contexts/ApiContext';

type Props = {
  serverName: string;
  config: McpServerConfig;
  onEdit: () => void;
  onRemove: () => void;
  scope: 'global' | 'project';
  isOverridden?: boolean;
};

export const McpServerItem = ({ serverName, config, onEdit, onRemove, scope, isOverridden }: Props) => {
  const { t } = useTranslation();
  const api = useApi();
  const [status, setStatus] = useState<'loading' | 'error' | 'connected'>('loading');
  const [toolCount, setToolCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      setStatus('loading');
      try {
        const tools = await api.loadMcpServerTools(serverName, config);
        setToolCount(tools ? tools.length : 0);
        setStatus('connected');
        setErrorMessage(null);
      } catch (error) {
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    };

    checkStatus();
  }, [serverName, config, api]);

  const renderTitle = () => {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="font-medium">{serverName}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
              scope === 'global'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            }`}
          >
            {scope === 'global' ? t('settings.agent.profileContext.global', 'Global') : t('common.project', 'Project')}
          </span>
          {isOverridden && (
            <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              {t('settings.agent.override', 'Overridden')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {status === 'loading' && <span className="text-xs text-text-muted-light">{t('common.loading')}</span>}
          {status === 'connected' && <span className="text-xs text-success">{t('mcp.toolsCount', { count: toolCount })}</span>}
          {status === 'error' && (
            <span className="text-xs text-error" title={errorMessage || ''}>
              {t('common.error')}
            </span>
          )}

          <div
            className={`w-2.5 h-2.5 rounded-full ${status === 'loading' ? 'bg-gray-400 animate-pulse' : status === 'connected' ? 'bg-success' : 'bg-error'}`}
          />

          <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
            <IconButton
              icon={<FaPencilAlt className="w-3.5 h-3.5" />}
              onClick={onEdit}
              tooltip={t('common.edit')}
              className="text-text-secondary hover:text-text-primary"
            />
            <IconButton
              icon={<FaTrash className="w-3.5 h-3.5" />}
              onClick={onRemove}
              tooltip={t('common.remove')}
              className="text-error-strong hover:text-error"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-border-default-dark rounded mb-2 bg-bg-base">
      <Accordion title={renderTitle()} buttonClassName="px-3 py-2" chevronPosition="right">
        <div className="p-3 text-xs border-t border-border-default-dark bg-bg-subtle">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <div className="font-semibold text-text-muted">{t('mcp.command', 'Command')}:</div>
            <div className="font-mono text-text-primary break-all">{config.command}</div>

            {config.args && config.args.length > 0 && (
              <>
                <div className="font-semibold text-text-muted">{t('mcp.args', 'Args')}:</div>
                <div className="font-mono text-text-primary break-all">{config.args.join(' ')}</div>
              </>
            )}

            {config.env && Object.keys(config.env).length > 0 && (
              <>
                <div className="font-semibold text-text-muted">{t('mcp.env', 'Env')}:</div>
                <div className="font-mono text-text-primary">
                  {Object.entries(config.env).map(([key, value]) => (
                    <div key={key} className="break-all">
                      {key}={value}
                    </div>
                  ))}
                </div>
              </>
            )}

            {errorMessage && (
              <>
                <div className="font-semibold text-error">{t('common.error')}:</div>
                <div className="text-error break-all">{errorMessage}</div>
              </>
            )}
          </div>
        </div>
      </Accordion>
    </div>
  );
};
