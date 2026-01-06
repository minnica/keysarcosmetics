import { LitElement, html } from 'lit';

export class SummaryCard extends LitElement {
  static get properties() {
    return {
      /**
       * The title of the card.
       * @type {String}
       * @default ''
       */
      titleCard: {
        type: String,
        attribute: 'title-card',
      },
      /**
       * The data for the items in the card.
       * @type {Array}
       * @default []
       */
      dataBranch: {
        type: Array,
      },
      /**
       * The total sales amount.
       * @type {Number}
       * @default 0
       */
      salesTotal: {
        type: Number,
      },
    };
  }

  constructor() {
    super();
    this.titleCard = '';
    this.dataBranch = [];
    this.salesTotal = 0;
  }

  createRenderRoot() {
    return this;
  }

  /**
   * Template for the summary card.
   * @returns {TemplateResult}
   * @private
   */
  _tplCard() {
    return html`
      <div class="bg-white rounded-2xl shadow-2xl p-4 mt-2 w-full max-w-md">
        <div class="flex items-center justify-between pb-3">
          <h2 class="text-xl font-bold">${this.titleCard}</h2>
        </div>
        <ul>
          ${this?.dataBranch?.map(
            item => html`
              <li class="flex justify-between items-center py-1 border-b border-gray-300">
                <span class="text-gray-800">${item.branch}</span>
                <span class="font-bold text-gray-900">$${item.sales.toFixed(2)}</span>
              </li>
            `,
          )}
        </ul>
        <div class="rounded-b-2xl flex justify-center">
          <span class="text-lg font-bold text-gray-900">$${this.salesTotal.toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  render() {
    return html` ${this._tplCard()} `;
  }
}
customElements.define('summary-card', SummaryCard);
