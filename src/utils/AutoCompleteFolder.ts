// utils/AutoCompleteFolder.ts
import { TAbstractFile, TFolder, App, AbstractInputSuggest } from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<string> {
  private folders: string[];

  constructor(app: App, private inputEl: HTMLInputElement) {
    super(app, inputEl);

    // Only folders (no files)
    this.folders = app.vault
      .getAllLoadedFiles()
      .filter((f: TAbstractFile): f is TFolder => f instanceof TFolder)
      .map((f: TFolder) => f.path);
  }

  getSuggestions(input: string): string[] {
    return this.folders.filter((folder) =>
      folder.toLowerCase().contains(input.toLowerCase())
    );
  }

  renderSuggestion(folder: string, el: HTMLElement): void {
    el.setText(folder);
  }

  selectSuggestion(folder: string): void {
    this.inputEl.value = folder;
    this.inputEl.trigger("input"); // Notify Obsidian that input changed
  }
}
