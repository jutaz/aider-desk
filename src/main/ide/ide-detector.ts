import { platform } from 'os';
import { existsSync } from 'fs';

// Import launch-ide types and utilities
import type { Editor } from 'launch-ide';

export interface IDE {
  id: string;
  name: string;
  displayName: string;
  executablePath: string;
  icon?: string;
  isValid: boolean;
  launchArgs?: string[];
}

// Map launch-ide editor names to our IDE interface
const EDITOR_MAPPINGS: Record<Editor, { name: string; displayName: string; launchArgs: string[] }> = {
  code: { name: 'Visual Studio Code', displayName: 'VS Code', launchArgs: ['.'] },
  cursor: { name: 'Cursor', displayName: 'Cursor', launchArgs: ['.'] },
  windsurf: { name: 'Windsurf', displayName: 'Windsurf', launchArgs: ['.'] },
  trae: { name: 'Trae', displayName: 'Trae', launchArgs: ['.'] },
  qoder: { name: 'Qoder', displayName: 'Qoder', launchArgs: ['.'] },
  codebuddy: { name: 'CodeBuddy', displayName: 'CodeBuddy', launchArgs: ['.'] },
  antigravity: { name: 'Antigravity', displayName: 'Antigravity', launchArgs: ['.'] },
  comate: { name: 'Comate', displayName: 'Comate', launchArgs: ['.'] },
  'code-insiders': { name: 'Visual Studio Code Insiders', displayName: 'VS Code Insiders', launchArgs: ['.'] },
  codium: { name: 'VSCodium', displayName: 'VSCodium', launchArgs: ['.'] },
  webstorm: { name: 'WebStorm', displayName: 'WebStorm', launchArgs: ['.'] },
  atom: { name: 'Atom', displayName: 'Atom', launchArgs: ['.'] },
  hbuilder: { name: 'HBuilderX', displayName: 'HBuilderX', launchArgs: ['.'] },
  phpstorm: { name: 'PhpStorm', displayName: 'PhpStorm', launchArgs: ['.'] },
  pycharm: { name: 'PyCharm', displayName: 'PyCharm', launchArgs: ['.'] },
  idea: { name: 'IntelliJ IDEA', displayName: 'IntelliJ IDEA', launchArgs: ['.'] },
  brackets: { name: 'Brackets', displayName: 'Brackets', launchArgs: ['.'] },
  appcode: { name: 'AppCode', displayName: 'AppCode', launchArgs: ['.'] },
  'atom-beta': { name: 'Atom Beta', displayName: 'Atom Beta', launchArgs: ['.'] },
  colin: { name: 'CLion', displayName: 'CLion', launchArgs: ['.'] },
  rider: { name: 'Rider', displayName: 'Rider', launchArgs: ['.'] },
  rubymine: { name: 'RubyMine', displayName: 'RubyMine', launchArgs: ['.'] },
  emacs: { name: 'Emacs', displayName: 'Emacs', launchArgs: ['.'] },
  sublime: { name: 'Sublime Text', displayName: 'Sublime Text', launchArgs: ['.'] },
  notepad: { name: 'Notepad++', displayName: 'Notepad++', launchArgs: ['.'] },
  vim: { name: 'Vim', displayName: 'Vim', launchArgs: ['.'] },
  zed: { name: 'Zed', displayName: 'Zed', launchArgs: ['.'] },
  kiro: { name: 'Kiro', displayName: 'Kiro', launchArgs: ['.'] },
  goland: { name: 'GoLand', displayName: 'GoLand', launchArgs: ['.'] },
};

export class IDEDetector {
  private detectedIDEs: Map<string, IDE> = new Map();
  private detectionPromise: Promise<Map<string, IDE>> | null = null;

  async detectIDEs(): Promise<Map<string, IDE>> {
    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    this.detectionPromise = this.performDetection();
    return this.detectionPromise;
  }

  private async performDetection(): Promise<Map<string, IDE>> {
    const availableEditors = await this.getAvailableEditors();

    for (const editor of availableEditors) {
      const mapping = EDITOR_MAPPINGS[editor.id as Editor];
      if (mapping) {
        const ide: IDE = {
          id: editor.id,
          name: mapping.name,
          displayName: mapping.displayName,
          executablePath: editor.executablePath,
          isValid: editor.isValid,
          launchArgs: mapping.launchArgs,
        };
        this.detectedIDEs.set(editor.id, ide);
      }
    }

    return this.detectedIDEs;
  }

  private async getAvailableEditors(): Promise<Array<{ id: string; executablePath: string; isValid: boolean }>> {
    const platformName = platform() as 'darwin' | 'linux' | 'win32';
    const editors: Array<{ id: string; executablePath: string; isValid: boolean }> = [];

    // Import launch-ide's internal maps
    // Since launch-ide doesn't export these, we'll use a simplified version
    const editorMappings = this.getLaunchIdeEditorMappings(platformName);

    for (const [editorId, paths] of Object.entries(editorMappings)) {
      let executablePath = '';
      let isValid = false;

      if (Array.isArray(paths)) {
        // Multiple possible paths
        for (const path of paths) {
          if (this.isEditorAvailable(path, platformName)) {
            executablePath = path;
            isValid = true;
            break;
          }
        }
      } else {
        // Single path
        const path = paths;
        if (this.isEditorAvailable(path, platformName)) {
          executablePath = path;
          isValid = true;
        }
      }

      if (isValid || executablePath) {
        editors.push({ id: editorId, executablePath, isValid });
      }
    }

    return editors;
  }

  private getLaunchIdeEditorMappings(platform: 'darwin' | 'linux' | 'win32'): Record<string, string | string[]> {
    // Simplified mappings based on launch-ide's COMMON_EDITORS_MAP
    const mappings: Record<string, Record<string, string | string[]>> = {
      darwin: {
        code: '/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
        cursor: '/Applications/Cursor.app/Contents/MacOS/Cursor',
        windsurf: '/Applications/Windsurf.app/Contents/MacOS/Electron',
        trae: '/Applications/Trae.app/Contents/MacOS/Electron',
        qoder: '/Applications/Qoder.app/Contents/MacOS/Electron',
        codebuddy: '/Applications/CodeBuddy.app/Contents/MacOS/Electron',
        antigravity: '/Applications/Antigravity.app/Contents/MacOS/Electron',
        comate: '/Applications/Comate.app/Contents/MacOS/Electron',
        'code-insiders': '/Applications/Visual Studio Code - Insiders.app/Contents/MacOS/Electron',
        codium: '/Applications/VSCodium.app/Contents/MacOS/Electron',
        webstorm: '/Applications/WebStorm.app/Contents/MacOS/webstorm',
        atom: '/Applications/Atom.app/Contents/MacOS/Atom',
        hbuilder: '/Applications/HBuilderX.app/Contents/MacOS/HBuilderX',
        phpstorm: '/Applications/PhpStorm.app/Contents/MacOS/phpstorm',
        pycharm: '/Applications/PyCharm.app/Contents/MacOS/pycharm',
        idea: '/Applications/IntelliJ IDEA.app/Contents/MacOS/idea',
        brackets: '/Applications/Brackets.app/Contents/MacOS/Brackets',
        appcode: '/Applications/AppCode.app/Contents/MacOS/appcode',
        'atom-beta': '/Applications/Atom Beta.app/Contents/MacOS/Atom Beta',
        clion: '/Applications/CLion.app/Contents/MacOS/clion',
        rider: '/Applications/Rider.app/Contents/MacOS/rider',
        rubymine: '/Applications/RubyMine.app/Contents/MacOS/rubymine',
        emacs: '/Applications/Emacs.app/Contents/MacOS/Emacs',
        sublime: '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl',
        vim: '/usr/bin/vim',
        zed: '/Applications/Zed.app/Contents/MacOS/zed',
        kiro: '/Applications/Kiro.app/Contents/MacOS/Electron',
        goland: '/Applications/GoLand.app/Contents/MacOS/goland',
      },
      linux: {
        code: ['/usr/bin/code', '/usr/local/bin/code', '/snap/bin/code'],
        cursor: ['/usr/bin/cursor', '/usr/local/bin/cursor'],
        windsurf: ['/usr/bin/windsurf', '/usr/local/bin/windsurf'],
        trae: ['/usr/bin/trae', '/usr/local/bin/trae'],
        qoder: ['/usr/bin/qoder', '/usr/local/bin/qoder'],
        codebuddy: ['/usr/bin/codebuddy', '/usr/local/bin/codebuddy'],
        antigravity: ['/usr/bin/antigravity', '/usr/local/bin/antigravity'],
        comate: ['/usr/bin/comate', '/usr/local/bin/comate'],
        'code-insiders': ['/usr/bin/code-insiders', '/usr/local/bin/code-insiders'],
        codium: ['/usr/bin/codium', '/usr/local/bin/codium'],
        webstorm: ['/usr/bin/webstorm', '/usr/local/bin/webstorm', '/opt/webstorm/bin/webstorm.sh'],
        atom: ['/usr/bin/atom', '/usr/local/bin/atom', '/snap/bin/atom'],
        hbuilder: ['/usr/bin/hbuilder', '/usr/local/bin/hbuilder'],
        phpstorm: ['/usr/bin/phpstorm', '/usr/local/bin/phpstorm', '/opt/phpstorm/bin/phpstorm.sh'],
        pycharm: ['/usr/bin/pycharm', '/usr/local/bin/pycharm', '/opt/pycharm/bin/pycharm.sh'],
        idea: ['/usr/bin/idea', '/usr/local/bin/idea', '/opt/idea/bin/idea.sh'],
        brackets: ['/usr/bin/brackets', '/usr/local/bin/brackets'],
        clion: ['/usr/bin/clion', '/usr/local/bin/clion', '/opt/clion/bin/clion.sh'],
        rider: ['/usr/bin/rider', '/usr/local/bin/rider', '/opt/rider/bin/rider.sh'],
        rubymine: ['/usr/bin/rubymine', '/usr/local/bin/rubymine', '/opt/rubymine/bin/rubymine.sh'],
        emacs: ['/usr/bin/emacs', '/usr/local/bin/emacs'],
        sublime: ['/usr/bin/subl', '/usr/local/bin/subl', '/snap/bin/subl'],
        vim: ['/usr/bin/vim', '/usr/local/bin/vim'],
        zed: ['/usr/bin/zed', '/usr/local/bin/zed'],
        goland: ['/usr/bin/goland', '/usr/local/bin/goland', '/opt/goland/bin/goland.sh'],
      },
      win32: {
        code: ['C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd', 'C:\\Program Files (x86)\\Microsoft VS Code\\bin\\code.cmd'],
        cursor: ['C:\\Program Files\\Cursor\\Cursor.exe'],
        windsurf: ['C:\\Program Files\\Windsurf\\Windsurf.exe'],
        trae: ['C:\\Program Files\\Trae\\Trae.exe'],
        qoder: ['C:\\Program Files\\Qoder\\Qoder.exe'],
        codebuddy: ['C:\\Program Files\\CodeBuddy\\CodeBuddy.exe'],
        antigravity: ['C:\\Program Files\\Antigravity\\Antigravity.exe'],
        comate: ['C:\\Program Files\\Comate\\Comate.exe'],
        'code-insiders': ['C:\\Program Files\\Microsoft VS Code Insiders\\bin\\code-insiders.cmd'],
        codium: ['C:\\Program Files\\VSCodium\\bin\\codium.cmd'],
        webstorm: ['C:\\Program Files\\JetBrains\\WebStorm\\bin\\webstorm64.exe'],
        atom: ['C:\\Users\\%USERNAME%\\AppData\\Local\\atom\\bin\\atom.cmd'],
        hbuilder: ['C:\\Program Files\\HBuilderX\\HBuilderX.exe'],
        phpstorm: ['C:\\Program Files\\JetBrains\\PhpStorm\\bin\\phpstorm64.exe'],
        pycharm: ['C:\\Program Files\\JetBrains\\PyCharm\\bin\\pycharm64.exe'],
        idea: ['C:\\Program Files\\JetBrains\\IntelliJ IDEA\\bin\\idea64.exe'],
        brackets: ['C:\\Program Files\\Brackets\\Brackets.exe'],
        clion: ['C:\\Program Files\\JetBrains\\CLion\\bin\\clion64.exe'],
        rider: ['C:\\Program Files\\JetBrains\\Rider\\bin\\rider64.exe'],
        rubymine: ['C:\\Program Files\\JetBrains\\RubyMine\\bin\\rubymine64.exe'],
        emacs: ['C:\\Program Files\\Emacs\\bin\\emacs.exe'],
        sublime: ['C:\\Program Files\\Sublime Text\\subl.exe', 'C:\\Program Files\\Sublime Text 3\\subl.exe'],
        vim: ['C:\\Program Files\\Vim\\vim82\\vim.exe'],
        zed: ['C:\\Program Files\\Zed\\zed.exe'],
        goland: ['C:\\Program Files\\JetBrains\\GoLand\\bin\\goland64.exe'],
      },
    };

    return mappings[platform] || {};
  }

  private isEditorAvailable(editorPath: string, platform: string): boolean {
    try {
      if (platform === 'win32') {
        // On Windows, check if the path exists
        return existsSync(editorPath);
      } else {
        // On macOS and Linux, check if the executable exists and is executable
        return existsSync(editorPath);
      }
    } catch {
      return false;
    }
  }



  getDetectedIDEs(): Map<string, IDE> {
    return this.detectedIDEs;
  }

  getIDE(id: string): IDE | undefined {
    return this.detectedIDEs.get(id);
  }
}