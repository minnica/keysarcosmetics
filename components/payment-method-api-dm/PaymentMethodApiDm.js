import { LitElement } from 'lit';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export class PaymentMethodApiDm extends LitElement {
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

  async createPaymentMethod(body) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    await this._fetchJson({
      url: `${API_BASE}/payment-methods`,
      method: 'POST',
      body,
      successEvent: 'payment-method-api-dm-post',
      errorEvent: 'payment-method-api-dm-post-error',
    });
    console.log('post');
    this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
  }

  async getPaymentMethod() {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    const data = await this._fetchJson({
      url: `${API_BASE}/payment-methods`,
      method: 'GET',
      successEvent: 'payment-method-api-dm-fetch',
      errorEvent: 'payment-method-api-dm-fetch-error',
    });
    console.log('get');

    this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    return data || [];
  }

  async updatePaymentMethod(id, body) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    await this._fetchJson({
      url: `${API_BASE}/payment-methods/${id}`,
      method: 'PUT',
      body,
      successEvent: 'payment-method-api-dm-put',
      errorEvent: 'payment-method-api-dm-put-error',
    });
    console.log('put');
    this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
  }

  async deletePaymentMethod(id) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));

    try {
      const res = await fetch(
        `${API_BASE}/payment-methods/${id}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(
          new CustomEvent('payment-method-api-dm-fetch-delete-error', { detail: error }),
        );
      } else {
        console.log('del')
        this.dispatchEvent(new CustomEvent('payment-method-api-dm-delete', { detail: { id } }));
      }
    } catch (error) {
      this.dispatchEvent(new CustomEvent('payment-method-api-dm-delete-error', { detail: error }));
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }
}

customElements.define('payment-method-api-dm', PaymentMethodApiDm);
