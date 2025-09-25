import { Page, Locator } from '@playwright/test';

/**
 * Level Editor Page Object Model
 * Handles level editor interactions
 */
export class LevelEditorPage {
  readonly page: Page;
  readonly editorCanvas: Locator;
  readonly blockPalette: Locator;
  readonly saveButton: Locator;
  readonly loadButton: Locator;
  readonly clearButton: Locator;
  readonly testButton: Locator;
  readonly shareButton: Locator;
  readonly levelNameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editorCanvas = page.locator('[data-testid="editor-canvas"]');
    this.blockPalette = page.locator('[data-testid="block-palette"]');
    this.saveButton = page.locator('[data-testid="save-level"]');
    this.loadButton = page.locator('[data-testid="load-level"]');
    this.clearButton = page.locator('[data-testid="clear-level"]');
    this.testButton = page.locator('[data-testid="test-level"]');
    this.shareButton = page.locator('[data-testid="share-level"]');
    this.levelNameInput = page.locator('[data-testid="level-name"]');
  }

  async goto() {
    await this.page.goto('/editor');
  }

  async selectBlockType(type: string) {
    await this.blockPalette.locator(`[data-block-type="${type}"]`).click();
  }

  async placeBlock(x: number, y: number) {
    await this.editorCanvas.click({ position: { x, y } });
  }

  async removeBlock(x: number, y: number) {
    await this.editorCanvas.click({ position: { x, y }, button: 'right' });
  }

  async setLevelName(name: string) {
    await this.levelNameInput.fill(name);
  }

  async saveLevel() {
    await this.saveButton.click();
  }

  async loadLevel(levelName: string) {
    await this.loadButton.click();
    await this.page.locator(`[data-level-name="${levelName}"]`).click();
  }

  async clearLevel() {
    await this.clearButton.click();
    await this.page.locator('[data-testid="confirm-clear"]').click();
  }

  async testLevel() {
    await this.testButton.click();
  }

  async shareLevel() {
    await this.shareButton.click();
  }

  async isVisible(): Promise<boolean> {
    return await this.editorCanvas.isVisible();
  }
}