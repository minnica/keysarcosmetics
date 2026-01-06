import { LitElement, html } from 'lit';

export class SuccessDefault extends LitElement {
  static get properties() {
    return {
      user: {
        type: String,
      },
    };
  }

  constructor() {
    super();
    this.user = '';
  }

  createRenderRoot() {
    return this;
  }

  logOut() {
    this.dispatchEvent(new CustomEvent('success-default-logout'));
  }

  render() {
    return html`
      <div class="bg-green-500">
        <h1>Bienvenido ${this.user}</h1>
        <button class="text-sky-500 border-2 border-black" @click="${this.logOut}">
          Cerrar sesión
        </button>
      </div>
    `;
  }
}

customElements.define('success-default', SuccessDefault);
