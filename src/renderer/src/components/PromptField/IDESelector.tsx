import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IDE } from '@common/types';

import { Button } from '@/components/common/Button';
import { useApi } from '@/contexts/ApiContext';
import { useProjectSettings } from '@/contexts/ProjectSettingsContext';

type Props = {
  baseDir: string;
};

export const IDESelector = ({ baseDir }: Props) => {
  const { t } = useTranslation();
  const api = useApi();
  const { projectSettings, saveProjectSettings } = useProjectSettings();

  const [availableIDEs, setAvailableIDEs] = useState<IDE[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIDE, setSelectedIDE] = useState<string>('');

  useEffect(() => {
    const fetchAvailableIDEs = async () => {
      try {
        const ides = await api.getAvailableIDEs();
        setAvailableIDEs(ides);
        if (ides.length > 0) {
          const preferred = projectSettings?.preferredIde;
          const defaultIDE = preferred && ides.find(ide => ide.id === preferred) ? preferred : ides[0].id;
          setSelectedIDE(defaultIDE);
          if (!preferred || !ides.find(ide => ide.id === preferred)) {
            saveProjectSettings({ preferredIde: defaultIDE });
          }
        }
      } catch (error) {
        console.error('Failed to fetch available IDEs:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchAvailableIDEs();
  }, [api, projectSettings?.preferredIde, saveProjectSettings]);

  const handleIDEChange = (ideId: string) => {
    setSelectedIDE(ideId);
    void saveProjectSettings({ preferredIde: ideId });
  };

  const handleOpenInIDE = () => {
    if (selectedIDE) {
      void api.launchIDE(selectedIDE, baseDir, false);
    }
  };

  if (loading || availableIDEs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={selectedIDE}
        onChange={(e) => handleIDEChange(e.target.value)}
        className="bg-bg-secondary border border-border-default rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-border-accent"
      >
        {availableIDEs.map((ide) => (
          <option key={ide.id} value={ide.id}>
            {ide.displayName}
          </option>
        ))}
      </select>
      <Button
        variant="text"
        onClick={handleOpenInIDE}
        className="hover:!bg-bg-secondary-light !border-border-light !text-text-secondary hover:!text-text-primary"
        size="xs"
        title={t('ideSelector.openInIde')}
      >
        {t('ideSelector.open')}
      </Button>
    </div>
  );
};