/**
 * HTML overlay dialogue box (sits above the Phaser canvas in #game-container).
 * Avoids camera/zoom rendering issues with Phaser Game Objects.
 */
export default class DialogueBox {
  constructor() {
    this.isActive = false;
    this.lines = [];
    this.lineIndex = 0;
    this.speakerName = '';
    this.blockAdvanceUntilSpaceUp = false;

    this.root = document.getElementById('dialogue-box');
    this.speakerEl = document.getElementById('dialogue-speaker');
    this.bodyEl = document.getElementById('dialogue-body');
    this.hintEl = document.getElementById('dialogue-hint');

    if (!this.root || !this.speakerEl || !this.bodyEl) {
      console.error('[DialogueBox] Missing #dialogue-box elements in index.html');
    }
  }

  open(speaker, lines) {
    console.log('[DialogueBox] Dialogue started — speaker:', speaker, 'lines:', lines.length);

    this.speakerName = speaker;
    this.lines = [...lines];
    this.lineIndex = 0;
    this.isActive = true;
    this.blockAdvanceUntilSpaceUp = true;

    this.root?.classList.add('is-open');
    this.showCurrentLine();
  }

  showCurrentLine() {
    const line = this.lines[this.lineIndex];
    if (line === undefined) {
      console.warn('[DialogueBox] Missing line at index', this.lineIndex);
      return;
    }
    if (this.speakerEl) this.speakerEl.textContent = this.speakerName;
    if (this.bodyEl) this.bodyEl.textContent = line;
  }

  tryAdvance(spaceKey) {
    if (!this.isActive) return true;

    if (this.blockAdvanceUntilSpaceUp) {
      if (!spaceKey.isDown) {
        this.blockAdvanceUntilSpaceUp = false;
      }
      return false;
    }

    if (!Phaser.Input.Keyboard.JustDown(spaceKey)) {
      return false;
    }

    this.lineIndex += 1;
    if (this.lineIndex >= this.lines.length) {
      console.log('[DialogueBox] Dialogue finished');
      this.close();
      return true;
    }

    console.log('[DialogueBox] Showing line', this.lineIndex + 1, 'of', this.lines.length);
    this.showCurrentLine();
    return false;
  }

  close() {
    this.isActive = false;
    this.lines = [];
    this.lineIndex = 0;
    this.blockAdvanceUntilSpaceUp = false;
    this.root?.classList.remove('is-open');
  }

  get isOpen() {
    return this.isActive;
  }
}
