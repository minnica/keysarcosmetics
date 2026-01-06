import { LitElement, html, nothing } from 'lit';
import '../../../components/input-date/InputDate.js';
import '../../../components/grid-table/GridTable.js';

export class FeatureSalesManagementCrudReportTotalSales extends LitElement {
  static get properties() {
    return {
      /**
       * Data for the total sales report.
       * @type {Object}
       * @default {}
       */
      totalSalesData: {
        type: Object,
      },
    };
  }

  constructor() {
    super();
    this.totalSalesData = {};
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
    return html` <grid-table .config=${this.totalSalesData}></grid-table> `;
  }

  /**
   * Template for date selection.
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
      ${FeatureSalesManagementCrudReportTotalSales._tplDate()}
      ${Object.keys(this.totalSalesData || {}).length ? this._tplGridTable() : nothing}
    `;
  }
}
customElements.define(
  'feature-sales-management-crud-report-total-sales',
  FeatureSalesManagementCrudReportTotalSales,
);
