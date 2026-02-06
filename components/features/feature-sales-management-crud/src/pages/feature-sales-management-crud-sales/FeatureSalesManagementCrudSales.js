import { LitElement, html, nothing } from 'lit';
import '@components/basics/seller-form/SellerForm.js';
import '@components/basics/grid-table/GridTable.js';

export class FeatureSalesManagementCrudSales extends LitElement {
  static get properties() {
    return {
      /**
       * Data for the sales grid.
       * @type {Object}
       * @default {}
       */
      dataGridSales: {
        type: Object,
      },
      /**
       * Options for the branch select input.
       * @type {Array}
       * @default []
       */
      optionValueBranch: {
        type: Array,
      },
      /**
       * Options for the seller select input.
       * @type {Array}
       * @default []
       */
      optionValueSeller: {
        type: Array,
      },
      /**
       * Options for the payment method select input.
       * @type {Array}
       * @default []
       */
      optionValuePaymentMethod: {
        type: Array,
      },
    };
  }

  constructor() {
    super();
    this.dataGridSales = {};
    this.optionValueBranch = [];
    this.optionValueSeller = [];
    this.optionValuePaymentMethod = [];
  }

  createRenderRoot() {
    return this;
  }

  static _actionButtons = row => {
    const id = row?.cells?.[0]?.data;
    return `
    <div class="flex items-center">
      <button class="px-2 py-1 rounded-md border text-xs hover:bg-red-50 text-red-600 border-red-200" data-action="delete" data-id="${id}">Delete</button>
    </div>
    `;
  };

  _onGridAction(e) {
    const { action, rowData } = e.detail;

    const branchId = rowData[1];
    const dateSale = rowData[3];

    if (action === 'delete') {
      this.dispatchEvent(
        new CustomEvent('feature-sales-management-crud-sales-request-delete-sale', {
          detail: { branchId, dateSale },
        }),
      );
    }
  }

  /**
   * Template for the seller form.
   * @returns {TemplateResult}
   * @private
   */
  _tplForm() {
    return html`
      <seller-form
        id="sellerForm"
        .selectDataBranch=${this.optionValueBranch}
        .selectDataSeller=${this.optionValueSeller}
        .selectDataPaymentMethod=${this.optionValuePaymentMethod}
      >
      </seller-form>
    `;
  }

  /**
   * Template for Grid Table.
   * @returns {TemplateResult}
   * @private
   */
  _tplTable() {
    return html`
    <div class="k-panel">
      <grid-table
        enable-actions
        .config=${this.dataGridSales}
        .actionBuilder=${FeatureSalesManagementCrudSales._actionButtons}
        @grid-action=${this._onGridAction}
        >
        <button
        slot="grid-actions"
        class="grid-primary-btn"
        @click=${() => {
          const sf = this.querySelector('#sellerForm');
          if (!sf) return;
          sf.openForm();
        }}
          >
          Agregar venta
        </button>
      </grid-table>
    </div>
    `;
  }

  render() {
    return html`
      ${this._tplForm()}
      ${Object.keys(this.dataGridSales || {}).length ? this._tplTable() : nothing}
    `;
  }
}
customElements.define('feature-sales-management-crud-sales', FeatureSalesManagementCrudSales);
