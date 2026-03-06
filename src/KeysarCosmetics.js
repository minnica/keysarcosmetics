import { LitElement, html } from 'lit';
import './index.css';
import '@components/features/feature-sales-management-crud/src/FeatureSalesManagementCrud.js';
import '@components/features/feature-login/src/FeatureLogin.js';

const REDIRECT_KEY = 'keysar_redirect_after_login';

export class KeysarCosmetics extends LitElement {
  static get properties() {
    return {
      authenticated: {
        type: Boolean,
      },
    };
  }

  constructor() {
    super();
    this.authenticated = false;
    this._handleLoginSuccess = this._handleLoginSuccess.bind(this);
    this._handleLogout = this._handleLogout.bind(this);
    this._handlePopState = this._handlePopState.bind(this);
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('popstate', this._handlePopState);
    this._syncRouteWithAuth();
  }

  disconnectedCallback() {
    window.removeEventListener('popstate', this._handlePopState);
    super.disconnectedCallback();
  }

  _handlePopState() {
    this._syncRouteWithAuth();
  }

  /**
   * If not authenticated and enters a protected route,
   * saves the route and visually redirects to "/".
   * @private
   */
  _syncRouteWithAuth() {
    const currentPath = window.location.pathname;

    if (!this.authenticated && currentPath !== '/') {
      sessionStorage.setItem(REDIRECT_KEY, currentPath);
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      this.requestUpdate();
    }
  }

  /**
   * Handle login success.
   * @param {CustomEvent} e
   * @private
   */
  _handleLoginSuccess(e) {
    const authenticated = !!e.detail?.authenticated;
    this.authenticated = authenticated;

    if (authenticated) {
      const redirectPath = sessionStorage.getItem(REDIRECT_KEY) || '/';
      sessionStorage.removeItem(REDIRECT_KEY);

      window.history.pushState({}, '', redirectPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
      this.requestUpdate();
    }
  }

  /**
   * Handle logout.
   * @private
   */
  _handleLogout() {
    this.authenticated = false;
    sessionStorage.removeItem(REDIRECT_KEY);

    window.history.replaceState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
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
