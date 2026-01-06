import { LitElement, html, nothing } from 'lit';

export class RgSpinner extends LitElement {
  static get properties() {
    return {
      isLoading: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.isLoading = false;
  }

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      ${this.isLoading
        ? html`
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-white/70">
              <div
                class="h-20 w-20 animate-spin rounded-full border-8 border-blue-500 border-t-transparent"
              ></div>
            </div>
          `
        : nothing}
    `;
  }
}
customElements.define('rg-spinner', RgSpinner);
