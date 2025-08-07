// utils/AutoCompleteFolder.ts
import { TAbstractFile, FuzzySuggestModal, App, TFolder } from "obsidian";

export class AutoCompleteFolder extends FuzzySuggestModal<string> {
  constructor(app: App, inputEl: HTMLInputElement, private suggestions: string[]) {
    super(app);

    // Only bind behavior — don’t store inputEl directly
    inputEl.addEventListener("focus", () => this.open());

    // Optional: You can also open on input
    // inputEl.addEventListener("input", () => this.open());
  }

  getItems(): string[] {
    return this.suggestions;
  }

  getItemText(item: string): string {
    return item;
  }

  onChooseItem(item: string): void {
    // We assume the input is still focused when this is called
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement) {
      activeElement.value = item;
      activeElement.dispatchEvent(new Event("input"));
    }
  }
}

