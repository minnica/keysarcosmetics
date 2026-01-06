import { LitElement } from 'lit';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export class BranchesApiDm extends LitElement {
  static get properties() {
    return {};
  }

  /** Utilidad interna para manejar peticiones HTTP */
  async _fetchJson({ url, method = 'GET', body = null, successEvent, errorEvent }) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        ...(body && { body: JSON.stringify(body) }),
      };

      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json();
        this.dispatchEvent(new CustomEvent(errorEvent, { detail: error }));
        return null;
      }

      const data = await response.json();
      this.dispatchEvent(new CustomEvent(successEvent, { detail: data }));
      return data;
    } catch (error) {
      this.dispatchEvent(new CustomEvent(errorEvent, { detail: error }));
      return null;
    }
  }

  async createBranch(body) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    await this._fetchJson({
      url: `${API_BASE}/branches`,
      method: 'POST',
      body,
      successEvent: 'branches-api-dm-post',
      errorEvent: 'branches-api-dm-post-error',
    });

    this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
  }

  async getBranches() {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    const data = await this._fetchJson({
      url: `${API_BASE}/branches`,
      method: 'GET',
      successEvent: 'branches-api-dm-fetch',
      errorEvent: 'branches-api-dm-fetch-error',
    });

    this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    return data || [];
  }

  async updateBranch(id, body) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    await this._fetchJson({
      url: `${API_BASE}/branches/${id}`,
      method: 'PUT',
      body,
      successEvent: 'branches-api-dm-put',
      errorEvent: 'branches-api-dm-put-error',
    });

    this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
  }

  async deleteBranch(id) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    try {
      const res = await fetch(`${API_BASE}/branches/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(
          new CustomEvent('branches-api-dm-fetch-delete-error', { detail: error }),
        );
      } else {
        this.dispatchEvent(new CustomEvent('branches-api-dm-delete', { detail: { id } }));
      }
    } catch (error) {
      this.dispatchEvent(new CustomEvent('branches-api-dm-delete-error', { detail: error }));
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }
}

customElements.define('branches-api-dm', BranchesApiDm);
