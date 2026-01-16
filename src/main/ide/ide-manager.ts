import { shell } from 'electron';
import { existsSync } from 'fs';
import path from 'path';
import { launchIDE, Editor } from 'launch-ide';
import { IDE, IDEDetector } from './ide-detector';

export class IDEManager {
  constructor(private ideDetector: IDEDetector) {}

  async launchIDE(ideId: string, directory: string, isWorktree: boolean = false): Promise<boolean> {
    const ide = this.ideDetector.getIDE(ideId);
    if (!ide || !ide.isValid) {
      throw new Error(`IDE ${ideId} not found or not valid`);
    }

    // Determine the target directory
    const targetDir = isWorktree ? directory : path.dirname(directory);
    if (!existsSync(targetDir)) {
      throw new Error(`Directory ${targetDir} does not exist`);
    }

    // Launch the IDE with the directory using launch-ide package
    try {
      launchIDE({
        editor: ideId as Editor, // ideId matches the Editor type from launch-ide
        file: targetDir,
        method: 'auto', // Use auto method for best user experience
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to launch ${ide.displayName}: ${error}`);
    }
  }



  async openDirectoryInDefaultApp(directory: string): Promise<boolean> {
    try {
      const error = await shell.openPath(directory);
      if (error) {
        throw new Error(`Failed to open directory in default app: ${error}`);
      }
      return true;
    } catch (error) {
      throw new Error(`Failed to open directory in default app: ${error}`);
    }
  }

  getAvailableIDEs(): IDE[] {
    const detected = this.ideDetector.getDetectedIDEs();
    return Array.from(detected.values()).filter(ide => ide.isValid);
  }

  isIDEAvailable(ideId: string): boolean {
    const ide = this.ideDetector.getIDE(ideId);
    return ide?.isValid ?? false;
  }
}