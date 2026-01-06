import { LitElement, html, nothing } from 'lit';
import '@components/basics/input-select/InputSelect.js';
import '@components/basics/input-date/InputDate.js';
import '@components/basics/grid-table/GridTable.js';

export class FeatureSalesManagementCrudReportDailyPaymentMethod extends LitElement {
  static get properties() {
    return {
      /**
       * Set of data for payment method report.
       * @type {Array}
       * @default []
       */
      paymentReportDailyData: {
        type: Array,
      },
      /**
       * Set of data for input select options.
       * @type {Array}
       * @default []
       */
      inputSelectData: {
        type: Array,
      },
    };
  }

  constructor() {
    super();
    this.paymentReportDailyData = [];
    this.inputSelectData = [];
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
    return html` <grid-table .config=${this.paymentReportDailyData}></grid-table> `;
  }

  /**
   * Template for input select and input date.
   * @returns {TemplateResult}
   * @private
   */
  _tplSelectDate() {
    return html`
      <div class="flex flex-col items-center gap-2 mt-3 mb-3">
        <p class="text-sm text-center font-semibold text-gray-700 uppercase">
          Selecciona método de pago y fecha para mostrar datos
        </p>
        <div class="flex flex-col mt-1">
          <input-select
            select-type="paymentMethod"
            .optionValue=${this.inputSelectData}
          ></input-select>
        </div>
        <input-date type-date="unique" without-day></input-date>
      </div>
    `;
  }

  render() {
    return html`
      ${this._tplSelectDate()}
      ${Object.keys(this.paymentReportDailyData || {}).length ? this._tplGridTable() : nothing}
    `;
  }
}
customElements.define(
  'feature-sales-management-crud-report-daily-payment-method',
  FeatureSalesManagementCrudReportDailyPaymentMethod,
);
