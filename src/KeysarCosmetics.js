import { LitElement, html } from 'lit';
import './index.css';
import '../components/feature-sales-management-crud/src/FeatureSalesManagementCrud.js';
import '../components/feature-login/src/FeatureLogin.js';

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
  }

  createRenderRoot() {
    return this;
  }

  /**
   * Handles the successful login event.
   * @param {CustomEvent} e - The event object.
   * @private
   */
  _handleLoginSuccess(e) {
    this.authenticated = e.detail?.authenticated;
  }

  /**
   * Handles the logout event.
   * @private
   */
  _handleLogout() {
    this.authenticated = false;
  }

  render() {
    return html`
      ${this.authenticated
        ? html`<feature-sales-management-crud
            @nav-bar-logout="${e => this._handleLogout(e)}"
          ></feature-sales-management-crud>`
        : html`<feature-login
            @feature-login-success="${e => this._handleLoginSuccess(e)}"
          ></feature-login>`}
    `;
  }
}
customElements.define('keysar-cosmetics', KeysarCosmetics);
