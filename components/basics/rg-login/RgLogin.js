/* tailwindcss classnames */
import { LitElement, html } from 'lit';

export class RgLogin extends LitElement {
  static get properties() {
    return {
      test: {
        type: String,
      },
      email: {
        type: String,
      },
      password: {
        type: String,
      },
    };
  }

  constructor() {
    super();
    this.test = 'Gara';
    this.email = '';
    this.password = '';
  }

  createRenderRoot() {
    return this;
  }

  sendDataToLogin() {
    this.dispatchEvent(
      new CustomEvent('request-login', {
        detail: {
          email: this.email,
          password: this.password,
        },
      }),
    );
  }

  render() {
    return html`
      <div class="flex min-h-screen items-center justify-center bg-gray-200">
        <div
          class="flex min-h-96 w-full max-w-xl flex-col justify-between rounded-2xl bg-white p-12 shadow-2xl"
        >
          <div class="mb-3">
            <h1 class="font-bold text-center text-4xl">Bienvenido a Keysar Cosmetics</h1>
          </div>
          <div class="mb-3 text-center">
            <label class="block text-lg" for="inputEmail">Correo</label>
            <input
              autocomplete="off"
              name="email"
              class="rounded-xl border-1 text-xl p-1"
              type="email"
              .value=${this.email}
              @input=${e => {
                this.email = e.target.value;
              }}
            />
          </div>

          <div class="mb-7 text-center">
            <label class="block text-lg" for="inputPassword">Contraseña</label>
            <input
              class="rounded-xl border-1 text-xl p-1"
              type="password"
              .value=${this.password}
              @input=${e => {
                this.password = e.target.value;
              }}
            />
          </div>
          <div class="mb-3 text-center">
            <button
              class="rounded-xl bg-black p-2 text-xl w-35 text-white"
              @click=${this.sendDataToLogin}
            >
              Ingresar
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('rg-login', RgLogin);
