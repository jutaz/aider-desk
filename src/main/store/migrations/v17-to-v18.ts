import { promises as fs } from 'fs';
import path from 'path';
import { homedir } from 'os';

import { AIDER_DESK_DIR, AIDER_DESK_MCP_SERVERS_FILE } from '@/constants';
import logger from '@/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const migrateSettingsV17toV18 = async (settings: any): Promise<any> => {
  if (settings.mcpServers) {
    try {
      const globalConfigPath = path.join(homedir(), AIDER_DESK_DIR, AIDER_DESK_MCP_SERVERS_FILE);
      const dir = path.dirname(globalConfigPath);

      // Ensure dir exists
      await fs.mkdir(dir, { recursive: true });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let existingConfig: any = { mcpServers: {} };
      try {
        const content = await fs.readFile(globalConfigPath, 'utf-8');
        existingConfig = JSON.parse(content);
      } catch {
        // File doesn't exist or invalid, ignore
      }

      const mergedServers = {
        ...(existingConfig.mcpServers || {}),
        ...settings.mcpServers,
      };

      const newConfig = { mcpServers: mergedServers };
      await fs.writeFile(globalConfigPath, JSON.stringify(newConfig, null, 2), 'utf-8');

      logger.info('Migrated MCP servers from settings to global config file.');
      delete settings.mcpServers;
    } catch (error) {
      logger.error('Failed to migrate MCP servers:', error);
      // If migration fails, we keep mcpServers in settings so we don't lose them
    }
  }
  return settings;
};
