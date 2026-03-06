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
    <div class="min-h-screen grid place-items-center px-6">
      <div
        class="w-full max-w-xl rounded-[22px] p-12 shadow-2xl border"
        style="
          background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
          border-color: rgba(243,240,233,.10);
          backdrop-filter: blur(10px);
          box-shadow: 0 35px 80px rgba(0,0,0,.55);
          color: var(--text);
        "
      >
        <div class="mb-6">
          <h1
            class="font-black text-center text-4xl leading-tight"
            style="color: var(--text); letter-spacing: .02em;"
          >
            Bienvenido a Keysar Cosmetics
          </h1>
        </div>

        <div class="mb-5">
          <label
            class="block text-sm font-extrabold mb-2"
            style="color: rgba(243,240,233,.75); letter-spacing:.02em;"
            for="inputEmail"
          >
            Correo
          </label>
          <input
            id="inputEmail"
            autocomplete="off"
            name="email"
            type="email"
            class="w-full h-[46px] rounded-[14px] px-4 outline-none transition"
            style="
              background: rgba(255,255,255,.05);
              border: 1px solid rgba(243,240,233,.14);
              color: var(--text);
            "
            .value=${this.email}
            @input=${e => { this.email = e.target.value; }}
            @focus=${e => {
              e.target.style.boxShadow = '0 0 0 4px rgba(195,165,131,.18)';
              e.target.style.borderColor = 'rgba(195,165,131,.50)';
              e.target.style.background = 'rgba(255,255,255,.07)';
            }}
            @blur=${e => {
              e.target.style.boxShadow = 'none';
              e.target.style.borderColor = 'rgba(243,240,233,.14)';
              e.target.style.background = 'rgba(255,255,255,.05)';
            }}
          />
        </div>

        <div class="mb-7">
          <label
            class="block text-sm font-extrabold mb-2"
            style="color: rgba(243,240,233,.75); letter-spacing:.02em;"
            for="inputPassword"
          >
            Contraseña
          </label>
          <input
            id="inputPassword"
            type="password"
            class="w-full h-[46px] rounded-[14px] px-4 outline-none transition"
            style="
              background: rgba(255,255,255,.05);
              border: 1px solid rgba(243,240,233,.14);
              color: var(--text);
            "
            .value=${this.password}
            @input=${e => { this.password = e.target.value; }}
            @focus=${e => {
              e.target.style.boxShadow = '0 0 0 4px rgba(195,165,131,.18)';
              e.target.style.borderColor = 'rgba(195,165,131,.50)';
              e.target.style.background = 'rgba(255,255,255,.07)';
            }}
            @blur=${e => {
              e.target.style.boxShadow = 'none';
              e.target.style.borderColor = 'rgba(243,240,233,.14)';
              e.target.style.background = 'rgba(255,255,255,.05)';
            }}
          />
        </div>

        <div class="text-center">
          <button
            class="h-[46px] px-6 rounded-[14px] font-black tracking-wide transition"
            style="
              background: linear-gradient(135deg, rgba(195,165,131,.95), rgba(236,209,200,.65));
              border: 1px solid rgba(195,165,131,.35);
              color: rgba(10,12,16,.95);
            "
            @mouseenter=${e => (e.currentTarget.style.filter = 'brightness(1.05)')}
            @mouseleave=${e => (e.currentTarget.style.filter = 'none')}
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
