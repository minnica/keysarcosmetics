import { LitElement } from 'lit';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export class EmployeeApiDm extends LitElement {
  static get properties() {
    return {};
  }

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

  async createEmployee(body) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    await this._fetchJson({
      url: `${API_BASE}/employees`,
      method: 'POST',
      body,
      successEvent: 'employee-api-dm-post',
      errorEvent: 'employee-api-dm-post-error',
    });
    console.log('post');
    this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
  }

  async getEmployee() {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    const data = await this._fetchJson({
      url: `${API_BASE}/employees`,
      method: 'GET',
      successEvent: 'employee-api-dm-fetch',
      errorEvent: 'employee-api-dm-fetch-error',
    });
    console.log('get');

    this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    return data || [];
  }

  async updateEmployee(id, body) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    await this._fetchJson({
      url: `${API_BASE}/employees/${id}`,
      method: 'PUT',
      body,
      successEvent: 'employee-api-dm-put',
      errorEvent: 'employee-api-dm-put-error',
    });
    console.log('put');
    this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
  }

  async deleteEmployee(id) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    try {
      const res = await fetch(
        `${API_BASE}/employees/${id}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(
          new CustomEvent('employee-api-dm-fetch-delete-error', { detail: error }),
        );
      } else {
        console.log('del');
        this.dispatchEvent(new CustomEvent('employee-api-dm-delete', { detail: { id } }));
      }
    } catch (error) {
      this.dispatchEvent(new CustomEvent('employee-api-dm-delete-error', { detail: error }));
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }
}

customElements.define('employee-api-dm', EmployeeApiDm);
