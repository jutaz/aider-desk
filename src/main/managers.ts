import { createServer } from 'http';

import type { BrowserWindow } from 'electron';

import { McpManager, AgentProfileManager } from '@/agent';
import { McpConfigManager } from '@/mcp/mcp-config-manager';
import { CloudflareTunnelManager, ServerController } from '@/server';
import { ConnectorManager } from '@/connector';
import { ProjectManager } from '@/project';
import { EventManager } from '@/events';
import { ModelManager } from '@/models';
import { DataManager } from '@/data-manager';
import { TerminalManager } from '@/terminal';
import { VersionsManager } from '@/versions';
import { TelemetryManager } from '@/telemetry';
import { WorktreeManager } from '@/worktrees';
import { Store } from '@/store';
import { SERVER_PORT } from '@/constants';
import logger from '@/logger';
import { EventsHandler } from '@/events-handler';

export interface ManagersResult {
  eventsHandler: EventsHandler;
  serverController: ServerController;
  cleanup: () => Promise<void>;
}

export const initManagers = async (store: Store, mainWindow: BrowserWindow | null = null): Promise<ManagersResult> => {
  // Initialize telemetry manager
  const telemetryManager = new TelemetryManager(store);
  await telemetryManager.init();

  // Initialize event manager (no main window in headless)
  const eventManager = new EventManager(mainWindow);

  // Initialize MCP Config Manager
  const activeProject = store.getOpenProjects().find((project) => project.active);
  const mcpConfigManager = new McpConfigManager(eventManager);
  await mcpConfigManager.init(activeProject?.baseDir);

  // Initialize MCP manager
  const mcpManager = new McpManager();

  void mcpManager.initMcpConnectors(mcpConfigManager, activeProject?.baseDir);

  // Initialize model manager
  const modelManager = new ModelManager(store, eventManager);

  // Initialize data manager
  const dataManager = new DataManager();
  dataManager.init();

  const worktreeManager = new WorktreeManager();

  // Initialize agent profile manager
  const agentProfileManager = new AgentProfileManager(eventManager);
  await agentProfileManager.start();

  // Initialize project manager
  const projectManager = new ProjectManager(
    store,
    mcpManager,
    mcpConfigManager,
    telemetryManager,
    dataManager,
    eventManager,
    modelManager,
    worktreeManager,
    agentProfileManager,
  );

  // Initialize terminal manager
  const terminalManager = new TerminalManager(eventManager, telemetryManager);

  // Initialize Versions Manager
  const versionsManager = new VersionsManager(eventManager, store);

  // Create HTTP server
  const httpServer = createServer();

  // Initialize Cloudflare tunnel manager
  const cloudflareTunnelManager = new CloudflareTunnelManager();

  // Initialize events handler (no main window)
  const eventsHandler = new EventsHandler(
    mainWindow,
    projectManager,
    store,
    mcpManager,
    mcpConfigManager,
    versionsManager,
    modelManager,
    telemetryManager,
    dataManager,
    terminalManager,
    cloudflareTunnelManager,
    eventManager,
    agentProfileManager,
  );

  // Create and initialize REST API controller with the server
  const serverController = new ServerController(httpServer, projectManager, eventsHandler, store);

  // Initialize connector manager with the server
  const connectorManager = new ConnectorManager(httpServer, projectManager, eventManager);

  // Start listening
  httpServer.listen(SERVER_PORT);
  logger.info(`AiderDesk headless server listening on http://localhost:${SERVER_PORT}`);

  let cleanedUp = false;
  const cleanup = async (): Promise<void> => {
    if (cleanedUp) {
      return;
    }

    try {
      cloudflareTunnelManager.stop();
      terminalManager.close();
      versionsManager.destroy();
      dataManager.close();

      await Promise.all([
        connectorManager.close(),
        serverController.close(),
        projectManager.close(),
        mcpManager.close(),
        telemetryManager.destroy(),
        agentProfileManager.dispose(),
      ]);
    } catch (error) {
      logger.error('Error during cleanup:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    cleanedUp = true;
  };

  // Handle process signals
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await cleanup();
    process.exit(0);
  });

  return {
    eventsHandler,
    serverController,
    cleanup,
  };
};
