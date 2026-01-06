import { LitElement, html } from 'lit';
import { LoginApiDm } from '@components/apis/login-api-dm/index.js';

export class FeatureLoginDM extends LitElement {
  static get is() {
    return 'feature-login-dm';
  }

  static get properties() {
    return {
      test: {
        type: String,
      },
      dataToRequestLogin: {
        type: Object,
      },
      dataCheckSession: {
        type: Object,
      },
    };
  }

  constructor() {
    super();
    this.test = 'Hola mundo desde FeatureLoginDM';
    this.dataToRequestLogin = {};
    this.dataCheckSession = {};
  }

  /* firstUpdated() {
    const loginApiDm = this.renderRoot.querySelector('login-api-dm');
    if (loginApiDm) {
      loginApiDm.handleSession();
    }
  } */

  _getElement(selector) {
    return this.renderRoot?.querySelector(selector) ?? this.querySelector(selector);
  }

  get loginApiDm() {
    return this._getElement(LoginApiDm.is);
  }

  requestHandleLogin(bodyToRequest) {
    this.loginApiDm.handleLogin(bodyToRequest);
  }

  requestHandleSession() {
    this.loginApiDm.handleSession();
  }

  requestHandleLogout() {
    this.loginApiDm.handleLogout();
  }

  successLogin(e) {
    this.dataToRequestLogin = e.detail;
    this.dispatchEvent(new CustomEvent('set-data-from-dm', { detail: this.dataToRequestLogin }));
  }

  successLogout(e) {
    this.dispatchEvent(new CustomEvent('logout-success', { detail: e.detail }));
  }

  successSession(e) {
    this.dataCheckSession = e.detail;
    this.dispatchEvent(
      new CustomEvent('set-data-check-session', { detail: this.dataCheckSession }),
    );
  }

  static loginError(e) {
    console.error('Login error:', e);
  }

  render() {
    return html`
      <login-api-dm
        @login-api-dm-fetch="${e => this.successLogin(e)}"
        @login-api-dm-fetch-error="${e => FeatureLoginDM.loginError(e)}"
        @login-api-dm-error="${e => FeatureLoginDM.loginError(e)}"
        @session-api-dm-fetch="${e => this.successSession(e)}"
        @logout-api-dm-fetch="${e => this.successLogout(e)}"
      >
      </login-api-dm>
    `;
  }
}

customElements.define('feature-login-dm', FeatureLoginDM);
