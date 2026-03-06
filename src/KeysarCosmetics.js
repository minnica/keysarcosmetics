import { LitElement, html } from 'lit';
import './index.css';
import '@components/features/feature-sales-management-crud/src/FeatureSalesManagementCrud.js';
import '@components/features/feature-login/src/FeatureLogin.js';

export class KeysarCosmetics extends LitElement {
  static get properties() {
    return {
      /**
       * Indicates if the user is authenticated
       * @type {Boolean}
       * @default false
       */
      authenticated: {
        type: Boolean,
      },
    };
  }

  constructor() {
    super();
    this.authenticated = false;
    this._redirectAfterLogin = null;
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this._syncRouteWithAuth();
  }

  /**
   * Synchronizes the current route with the authentication state.
   * If the user is not authenticated and tries to access a protected route,
   * it saves the current route and redirects to the login page (/).
   * @private
   */
  _syncRouteWithAuth() {
    const currentPath = window.location.pathname;

    if (!this.authenticated && currentPath !== '/') {
      this._redirectAfterLogin = currentPath;
      window.history.replaceState({}, '', '/');
      this.requestUpdate();
    }
  }

  /**
   * Handles the successful login event.
   * @param {CustomEvent} e - The event object.
   * @private
   */
  _handleLoginSuccess(e) {
    const authenticated = !!e.detail?.authenticated;
    this.authenticated = authenticated;

    if (authenticated) {
      const targetPath = this._redirectAfterLogin || '/';
      this._redirectAfterLogin = null;
      window.history.pushState({}, '', targetPath);
      this.requestUpdate();
    }
  }

  /**
   * Handles the logout event
   * @private
   */
  _handleLogout() {
    this.authenticated = false;
    this._redirectAfterLogin = null;
    window.history.replaceState({}, '', '/');
    this.requestUpdate();
  }

  render() {
    return html`
      ${this.authenticated
        ? html`<feature-sales-management-crud
            @nav-bar-logout=${this._handleLogout}
          ></feature-sales-management-crud>`
        : html`<feature-login @feature-login-success=${this._handleLoginSuccess}></feature-login>`}
    `;
  }
}

customElements.define('keysar-cosmetics', KeysarCosmetics);
