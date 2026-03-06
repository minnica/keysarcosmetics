import { LitElement, html } from 'lit';
import '@components/basics/rg-login/RgLogin.js';
import '@components/apis/login-api-dm/LoginApiDm.js';
import '@components/basics/rg-spinner/RgSpinner.js';
import './FeatureLoginDM.js';
import './feature-login.css'

export class FeatureLogin extends LitElement {
  static get properties() {
    return {
      authenticated: { type: Boolean },
      user: { type: Object },
      data: { type: Object },
      /**
       * Loading counter for tracking concurrent requests.
       * @type {Number}
       * @default 0
       * @private
       */
      _loadingCount: {
        type: Number,
      },
    };
  }

  constructor() {
    super();
    this.authenticated = false;
    this.user = null;
    this.data = {};
    this._loadingCount = 0;
  }

  createRenderRoot() {
    return this;
  }

  _getElement(selector) {
    return this.renderRoot?.querySelector(selector) ?? this.querySelector(selector);
  }

  get featureLoginDm() {
    return this._getElement('feature-login-dm');
  }

  requestLogin(e) {
    this.data = e.detail;
    this.featureLoginDm.requestHandleLogin(this.data);
  }

  requestLogout() {
    this.featureLoginDm.requestHandleLogout();
  }

  successLoginFromDm() {
    this.featureLoginDm.requestHandleSession();
  }

  successSessionFromDm(e) {
    const { authenticated, user } = e.detail;
    this.authenticated = authenticated;
    this.user = user?.name;
    this.dispatchEvent(
      new CustomEvent('feature-login-success', {
        detail: { authenticated, user },
        bubbles: true,
        composed: true,
      }),
    );
  }

  successLogoutFromDm() {
    this.authenticated = false;
    this.user = null;
  }

  /**
   * Increments the global loading counter.
   * @private
   */
  _incrementLoading() {
    this._loadingCount += 1;
    this.requestUpdate();
  }

  /**
   * Decrements the global loading counter.
   * @private
   */
  _decrementLoading() {
    this._loadingCount = Math.max(0, this._loadingCount - 1);
    this.requestUpdate();
  }

  render() {
    return html`
      <rg-login @request-login="${e => this.requestLogin(e)}"> </rg-login>
      <feature-login-dm
        .dataToRequestLogin=${this.data}
        @set-data-from-dm="${this.successLoginFromDm}"
        @set-data-check-session="${e => this.successSessionFromDm(e)}"
        @logout-success="${e => this.successLogoutFromDm(e)}"
        @loading-start=${this._incrementLoading}
        @loading-end=${this._decrementLoading}
      ></feature-login-dm>
      <rg-spinner .isLoading=${this._loadingCount > 0}></rg-spinner>
    `;
  }
}

customElements.define('feature-login', FeatureLogin);
