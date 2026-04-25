// A small instruction card shown at the top of a game.
// Optional "Read to me" button hooks into the existing narration system
// if the text_to_voice feature flag is on.

export default class PromptCard {
  constructor({ title = '', body = '' } = {}) {
    const root = document.createElement('div');
    root.className = 'mg-prompt-card';
    root.innerHTML = `
      ${title ? `<h3 class="mg-prompt-title">${title}</h3>` : ''}
      <p class="mg-prompt-body">${body}</p>
    `;
    this.root = root;
    this.body = root.querySelector('.mg-prompt-body');
  }

  setBody(text) { this.body.textContent = text; }
}
