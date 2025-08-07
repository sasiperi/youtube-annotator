// suggest/FolderSuggest.ts
import { App, TAbstractFile, TFolder, AbstractInputSuggest } from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<string> {
  private folders: string[] = [];

  constructor(app: App, private inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.buildFolderList();
  }

  private buildFolderList() {
    const allFiles = this.app.vault.getAllLoadedFiles();
    this.folders = allFiles
      .filter((f: TAbstractFile) => f instanceof TFolder && f.path !== "/")
      .map((f) => f.path);
  }

  getSuggestions(query: string): string[] {
    const lower = query.toLowerCase();
    return this.folders.filter((path) => path.toLowerCase().contains(lower));
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  selectSuggestion(value: string): void {
    this.inputEl.value = value;
    this.inputEl.dispatchEvent(new Event("input"));
  }
}
