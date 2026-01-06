import { LitElement } from 'lit';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export class LoginApiDm extends LitElement {
  static get is() {
    return 'login-api-dm';
  }

  static get properties() {
    return {
      authenticated: { type: Boolean },
      user: { type: Object },
      test: {
        type: String,
      },
    };
  }

  constructor() {
    super();
    this.authenticated = false;
    this.user = null;
    this.test = 'Enrique';
  }

  async handleLogin(body) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: body.email,
          password: body.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.dispatchEvent(new CustomEvent('login-api-dm-fetch-error', { detail: error }));
        return;
      }

      const data = await response.json();
      this.dispatchEvent(new CustomEvent('login-api-dm-fetch', { detail: data }));
    } catch (error) {
      this.dispatchEvent(new CustomEvent('login-api-dm-error', { detail: error }));
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }

  async handleLogout() {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));
    try {
      const res = await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(new CustomEvent('logout-api-dm-fetch-error', { detail: error }));
        return;
      }

      const data = await res.json();
      this.dispatchEvent(new CustomEvent('logout-api-dm-fetch', { detail: data }));
    } catch (error) {
      this.dispatchEvent(new CustomEvent('logout-api-dm-error', { detail: error }));
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }

  async handleSession() {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));
    try {
      const res = await fetch(`${API_BASE}/verify-token`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(new CustomEvent('session-api-dm-fetch-error', { detail: error }));
        return;
      }

      const data = await res.json();
      this.dispatchEvent(new CustomEvent('session-api-dm-fetch', { detail: data }));
    } catch (error) {
      this.dispatchEvent(new CustomEvent('session-api-dm-error', { detail: error }));
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }
}

customElements.define('login-api-dm', LoginApiDm);
