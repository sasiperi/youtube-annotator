// suggest/FileSuggest.ts
import { App, TAbstractFile, TFile, AbstractInputSuggest } from "obsidian";

export class FileSuggest extends AbstractInputSuggest<string> {
  private files: string[] = [];

  constructor(app: App, private inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.buildFileList();
  }

  private buildFileList() {
    const allFiles = this.app.vault.getAllLoadedFiles();
    this.files = allFiles
      .filter((f: TAbstractFile) => f instanceof TFile && f.extension === "md")
      .map((f) => f.path);
  }

  getSuggestions(query: string): string[] {
    const lower = query.toLowerCase();
    return this.files.filter((path) => path.toLowerCase().contains(lower));
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  selectSuggestion(value: string): void {
    this.inputEl.value = value;
    this.inputEl.dispatchEvent(new Event("input"));
  }
}
