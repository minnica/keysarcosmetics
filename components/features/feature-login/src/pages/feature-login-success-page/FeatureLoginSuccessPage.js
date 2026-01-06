import { LitElement, html } from 'lit';
// import '@components/success-default/SuccessDefault.js';
import '../../../components/success-default/SuccessDefault.js';

export class FeatureLoginSuccessPage extends LitElement {
  static get properties() {
    return {
      user: { type: String },
    };
  }

  constructor() {
    super();
    this.user = '';
  }

  handleLogout() {
    this.dispatchEvent(new CustomEvent('feature-login-success-page-logout'));
  }

  render() {
    return html` <success-default @success-default-logout="${this.handleLogout}" .user=${this.user}>
    </success-default>`;
  }
}
customElements.define('feature-login-success-page', FeatureLoginSuccessPage);
