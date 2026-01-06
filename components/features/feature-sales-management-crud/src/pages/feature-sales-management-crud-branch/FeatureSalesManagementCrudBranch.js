import { LitElement, html, nothing } from 'lit';
import '@components/basics/branch-form/BranchForm.js';
import '@components/basics/grid-table/GridTable.js';

export class FeatureSalesManagementCrudBranch extends LitElement {
  static get properties() {
    return {
      dataGridBranch: { type: Object },
      editBranch: { type: Object },
    };
  }

  constructor() {
    super();
    this.dataGridBranch = {};
    this.editBranch = {};
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
      new CustomEvent('submit-event', {
        detail: { ...data, action },
      }),
    );
  }

  static _actionButtons = row => {
    const id = row?.cells?.[0]?.data; // asumiendo que "ID" es la 1a columna
    return `
    <div class="flex items-center gap-2">
      <button class="px-2 py-1 rounded-md border text-xs hover:bg-gray-50" data-action="edit" data-id="${id}">Edit</button>
      <button class="px-2 py-1 rounded-md border text-xs hover:bg-red-50 text-red-600 border-red-200" data-action="delete" data-id="${id}">Delete</button>
    </div>
    `;
  };

  _onGridAction(e) {
    const { action, id, rowData } = e.detail;
    // Aquí conectas con tu lógica (abrir modal, navegar, etc.)
    if (action === 'delete') {
      this.dispatchEvent(
        new CustomEvent('submit-event', {
          detail: {
            id,
            action: 'delete',
          },
        }),
      );
    } else if (action === 'edit') {
      this.editBranch = {
        id: rowData[0],
        name: rowData[1],
      };
    }
  }

  get hasValidGridConfig() {
    return (
      Array.isArray(this.dataGridBranch?.data) &&
      this.dataGridBranch.data.length > 0 &&
      Array.isArray(this.dataGridBranch?.columns) &&
      this.dataGridBranch.columns.length > 0
    );
  }

  render() {
    return html`
      ${Object.keys(this.dataGridBranch || {}).length
        ? html`<branch-form
            .inputBranch="${this.editBranch}"
            @request-submit=${e => this.submitPage(e.detail)}
          ></branch-form>`
        : nothing}
      ${this.hasValidGridConfig
        ? html` <grid-table
            .config=${this.dataGridBranch}
            enable-actions
            .actionBuilder=${FeatureSalesManagementCrudBranch._actionButtons}
            @grid-action=${this._onGridAction}
          ></grid-table>`
        : nothing}
    `;
  }
}
customElements.define('feature-sales-management-crud-branch', FeatureSalesManagementCrudBranch);
