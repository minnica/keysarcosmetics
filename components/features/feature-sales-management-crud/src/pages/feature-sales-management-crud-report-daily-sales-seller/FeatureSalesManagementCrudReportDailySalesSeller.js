import { LitElement, html, nothing } from 'lit';
import '@components/basics/summary-card/SummaryCard.js';
import '@components/basics/grid-table/GridTable.js';

export class FeatureSalesManagementCrudReportDailySalesSeller extends LitElement {
  static get properties() {
    return {
      /**
       * Set of data for daily sales by seller report.
       * @type {Array}
       * @default []
       */
      dailySalesSellerData: {
        type: Array,
      },
    };
  }

  constructor() {
    super();
    this.dailySalesSellerData = [];
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
    return html` <grid-table .config=${this.dailySalesSellerData}></grid-table> `;
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
          Selecciona fecha para mostrar datos
        </p>
        <input-date type-date="unique" without-day></input-date>
      </div>
    `;
  }

  render() {
    return html`
      ${FeatureSalesManagementCrudReportDailySalesSeller._tplDate()}
      ${Object.keys(this.dailySalesSellerData || {}).length ? this._tplGridTable() : nothing}
    `;
  }
}
customElements.define(
  'feature-sales-management-crud-report-daily-sales-seller',
  FeatureSalesManagementCrudReportDailySalesSeller,
);
