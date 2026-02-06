import { LitElement, html, nothing } from 'lit';
import '@components/basics/payment-method-form/PaymentMethodForm.js';
import '@components/basics/grid-table/GridTable.js';

export class FeatureSalesManagementCrudPaymentMethod extends LitElement {
  static get properties() {
    return {
      dataGridPaymentMethod: { type: Object },
      editPaymentMethod: { type: Object },
    };
  }

  constructor() {
    super();
    this.dataGridPaymentMethod = {};
    this.editPaymentMethod = {};
  }

  createRenderRoot() {
    return this;
  }

  /**
   * Set Object data on CustomEvent
   * @param {Object} data
   */
  submitPage(data) {
    const { action } = data;
    this.dispatchEvent(
      new CustomEvent('submit-payment-method-event', {
        detail: { ...data, action },
        bubbles: true,
        composed: true,
      }),
    );
  }

  static _actionButtons = row => {
    const id = row?.cells?.[0]?.data; // asumiendo que "ID" es la 1a columna
    return `
    <div class="flex items-center gap-2">
      <button class="btn primary" data-action="edit" data-id="${id}">Edit</button>
      <button class="btn danger" data-action="delete" data-id="${id}">Delete</button>
    </div>
    `;
  };

  _onGridAction(e) {
    const { action, id, rowData } = e.detail;
    // Aquí conectas con tu lógica (abrir modal, navegar, etc.)
    if (action === 'delete') {
      this.dispatchEvent(
        new CustomEvent('submit-payment-method-event', {
          detail: {
            id,
            action: 'delete',
          },
        }),
      );
    } else if (action === 'edit') {
      this.editPaymentMethod = {
        id: rowData[0], // ID
        name: rowData[1], // Tipo de Pago
      };
    }
  }

  get hasValidGridConfig() {
    return (
      Array.isArray(this.dataGridPaymentMethod?.data) &&
      this.dataGridPaymentMethod.data.length > 0 &&
      Array.isArray(this.dataGridPaymentMethod?.columns) &&
      this.dataGridPaymentMethod.columns.length > 0
    );
  }

  render() {
    return html`
      ${Object.keys(this.dataGridPaymentMethod || {}).length
        ? html`
         <payment-method-form
            id="paymentMethodForm"
            .inputPaymentMethod=${this.editPaymentMethod}
            @request-submit="${e => this.submitPage(e.detail)}"
          ></payment-method-form>
          <div class="k-panel">
            
            ${this.hasValidGridConfig
          ? html` <grid-table
            .config=${this.dataGridPaymentMethod}
            enable-actions
            .actionBuilder=${FeatureSalesManagementCrudPaymentMethod._actionButtons}
            @grid-action=${this._onGridAction}
            >
            <button
            slot="grid-actions"
            class="grid-primary-btn"
            @click=${() => {
              const bf = this.querySelector('#paymentMethodForm');
              if (!bf) return;
              bf.showForm = true;
              bf.inputPaymentMethod = {};
              bf.inputPaymentMethodName = '';
              }}
              >
              Agregar Metodo de Pago
            </button>
          </grid-table>`
          : nothing}
        </div>
        `: nothing}
        `;
  }
}
customElements.define(
  'feature-sales-management-crud-payment-method',
  FeatureSalesManagementCrudPaymentMethod,
);
