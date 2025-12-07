import { promises as fs } from 'fs';
import path from 'path';
import { homedir } from 'os';

import { watch, FSWatcher } from 'chokidar';
import { debounce } from 'lodash';
import { McpServerConfig } from '@common/types';

import { AIDER_DESK_DIR, AIDER_DESK_MCP_SERVERS_FILE } from '@/constants';
import logger from '@/logger';
import { EventManager } from '@/events/event-manager';

interface McpServersConfigFile {
  mcpServers: Record<string, McpServerConfig>;
}

export class McpConfigManager {
  private globalConfigPath: string;

  private globalWatcher: FSWatcher | null = null;
  private projectWatcher: FSWatcher | null = null;
  private currentProjectDir: string | null = null;
  private listeners: ((config: Record<string, McpServerConfig>) => void)[] = [];

  // Debounced update method to prevent multiple triggers
  private debouncedEmitUpdate: () => void;

  constructor(private eventManager: EventManager) {
    this.globalConfigPath = path.join(homedir(), AIDER_DESK_DIR, AIDER_DESK_MCP_SERVERS_FILE);

    // Create a debounced function to emit updates
    // We bind it to this context and set a 300ms delay
    this.debouncedEmitUpdate = debounce(async () => {
      try {
        const mergedConfig = await this.getMergedConfig(this.currentProjectDir || undefined);

        // Notify internal listeners
        for (const listener of this.listeners) {
          try {
            listener(mergedConfig);
          } catch (err) {
            logger.error('Error in MCP config listener:', err);
          }
        }

        // Notify renderer
        this.eventManager.sendMcpServersUpdated(mergedConfig, this.currentProjectDir || undefined);
      } catch (error) {
        logger.error('Error emitting MCP config update:', error);
      }
    }, 300);
  }

  /**
   * Register a listener for configuration updates
   */
  public onUpdate(listener: (config: Record<string, McpServerConfig>) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Initialize the manager, setting up global watcher and optionally project watcher
   */
  async init(projectDir?: string): Promise<void> {
    logger.info('Initializing McpConfigManager', { projectDir });

    // Ensure global config exists or at least directory exists
    await this.ensureGlobalConfig();

    // Setup global watcher
    this.setupGlobalWatcher();

    if (projectDir) {
      await this.setProject(projectDir);
    }
  }

  /**
   * Switch the active project, updating watchers
   */
  async setProject(projectDir: string): Promise<void> {
    if (this.currentProjectDir === projectDir) {
      return;
    }

    this.currentProjectDir = projectDir;

    // Re-setup project watcher for the new project
    this.setupProjectWatcher(projectDir);

    // Emit update for the new project context
    this.debouncedEmitUpdate();
  }

  /**
   * Get configuration for a specific scope
   */
  async getConfig(scope: 'global' | 'project', projectDir?: string): Promise<Record<string, McpServerConfig>> {
    if (scope === 'global') {
      return this.loadConfig(this.globalConfigPath);
    } else {
      const targetProjectDir = projectDir || this.currentProjectDir;
      if (!targetProjectDir) {
        return {};
      }
      const projectPath = path.join(targetProjectDir, AIDER_DESK_DIR, AIDER_DESK_MCP_SERVERS_FILE);
      return this.loadConfig(projectPath);
    }
  }

  /**
   * Get merged configuration (project overrides global)
   */
  async getMergedConfig(projectDir?: string): Promise<Record<string, McpServerConfig>> {
    const globalConfig = await this.loadConfig(this.globalConfigPath);

    let projectConfig: Record<string, McpServerConfig> = {};
    if (projectDir) {
      const projectPath = path.join(projectDir, AIDER_DESK_DIR, AIDER_DESK_MCP_SERVERS_FILE);
      projectConfig = await this.loadConfig(projectPath);
    } else if (this.currentProjectDir) {
      // If no explicit projectDir passed but we have a current one, use it
      // This handles the case where getMergedConfig() is called without args
      const projectPath = path.join(this.currentProjectDir, AIDER_DESK_DIR, AIDER_DESK_MCP_SERVERS_FILE);
      projectConfig = await this.loadConfig(projectPath);
    }

    // Merge: project overrides global
    // We use shallow merge (replacement) for servers with same name
    return {
      ...globalConfig,
      ...projectConfig,
    };
  }

  /**
   * Update global configuration
   */
  async updateGlobalConfig(servers: Record<string, McpServerConfig>): Promise<void> {
    await this.saveConfig(this.globalConfigPath, servers);
  }

  /**
   * Update project configuration
   */
  async updateProjectConfig(projectDir: string, servers: Record<string, McpServerConfig>): Promise<void> {
    const configPath = path.join(projectDir, AIDER_DESK_DIR, AIDER_DESK_MCP_SERVERS_FILE);
    await this.saveConfig(configPath, servers);
  }

  // --- Private Helpers ---

  private async ensureGlobalConfig(): Promise<void> {
    try {
      const dir = path.dirname(this.globalConfigPath);
      await fs.mkdir(dir, { recursive: true });

      try {
        await fs.access(this.globalConfigPath);
      } catch {
        // File doesn't exist, create empty
        await this.saveConfig(this.globalConfigPath, {});
      }
    } catch (error) {
      logger.error('Error ensuring global MCP config:', error);
    }
  }

  private async loadConfig(filePath: string): Promise<Record<string, McpServerConfig>> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as McpServersConfigFile;
      return parsed.mcpServers || {};
    } catch (error) {
      // If file doesn't exist or is invalid, return empty
      // We log debug for non-existence to avoid noise
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn(`Failed to load MCP config from ${filePath}:`, error);
      }
      return {};
    }
  }

  private async saveConfig(filePath: string, servers: Record<string, McpServerConfig>): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      const content: McpServersConfigFile = { mcpServers: servers };
      await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
    } catch (error) {
      logger.error(`Failed to save MCP config to ${filePath}:`, error);
      throw error;
    }
  }

  private setupGlobalWatcher(): void {
    if (this.globalWatcher) {
      this.globalWatcher.close();
    }

    this.globalWatcher = watch(this.globalConfigPath, {
      ignoreInitial: true,
      persistent: true,
    });

    this.globalWatcher
      .on('add', () => {
        logger.info('Global MCP config added');
        this.debouncedEmitUpdate();
      })
      .on('change', () => {
        logger.info('Global MCP config changed');
        this.debouncedEmitUpdate();
      })
      .on('unlink', () => {
        logger.info('Global MCP config removed');
        this.debouncedEmitUpdate();
      });
  }

  private setupProjectWatcher(projectDir: string): void {
    if (this.projectWatcher) {
      this.projectWatcher.close();
      this.projectWatcher = null;
    }

    const configPath = path.join(projectDir, AIDER_DESK_DIR, AIDER_DESK_MCP_SERVERS_FILE);

    // We watch the file specifically. If the directory doesn't exist, chokidar might not watch it until it's created.
    // However, usually we want to watch the file path.
    this.projectWatcher = watch(configPath, {
      ignoreInitial: true,
      persistent: true,
    });

    this.projectWatcher
      .on('add', () => {
        logger.info('Project MCP config added');
        this.debouncedEmitUpdate();
      })
      .on('change', () => {
        logger.info('Project MCP config changed');
        this.debouncedEmitUpdate();
      })
      .on('unlink', () => {
        logger.info('Project MCP config removed');
        this.debouncedEmitUpdate();
      });
  }
}
