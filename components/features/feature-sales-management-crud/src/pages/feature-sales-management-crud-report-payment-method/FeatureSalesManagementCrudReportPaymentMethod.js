import { LitElement, html, nothing } from 'lit';
import '@components/basics/input-date/InputDate.js';
import '@components/basics/grid-table/GridTable.js';

export class FeatureSalesManagementCrudReportPaymentMethod extends LitElement {
  static get properties() {
    return {
      /**
       * Data for the payment report.
       * @type {Array}
       * @default []
       */
      paymentReportData: {
        type: Array,
      },
    };
  }

  constructor() {
    super();
    this.paymentReportData = [];
  }

  createRenderRoot() {
    return this;
  }

  /**
   * Template for grid table.
   * @returns {TemplateResult}
   * @private
   */
  _tplGridTable() {
    return html` <grid-table .config=${this.paymentReportData}></grid-table> `;
  }

  /**
   * Template for the date picker.
   * @returns {TemplateResult}
   * @private
   */
  static _tplDate() {
    return html`
      <div class="flex flex-col items-center gap-2 mt-3 mb-3">
        <p class="text-sm text-center font-semibold text-gray-700 uppercase">
          Selecciona un rango de fechas para mostrar datos
        </p>
        <input-date type-date="between"></input-date>
      </div>
    `;
  }

  render() {
    return html`
      ${FeatureSalesManagementCrudReportPaymentMethod._tplDate()}
      ${Object.keys(this.paymentReportData || {}).length ? this._tplGridTable() : nothing}
    `;
  }
}
customElements.define(
  'feature-sales-management-crud-report-payment-method',
  FeatureSalesManagementCrudReportPaymentMethod,
);
