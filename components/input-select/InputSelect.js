import { LitElement, html } from 'lit';

export class InputSelect extends LitElement {
  static get properties() {
    return {
      /**
       * Type of the select input.
       * @type {String}
       * @default ''
       */
      selectType: {
        type: String,
        attribute: 'select-type',
      },
      /**
       * Options for the select input.
       * @type {Array}
       * @default []
       */
      optionValue: {
        type: Array,
      },
      /**
       * Value of the select input.
       * @type {String}
       * @default ''
       */
      value: {
        type: String,
      },
    };
  }

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.selectType = '';
    this.optionValue = [];
    this.value = '';
  }

  updated(changed) {
    if (changed.has('selectType')) this._requestOptions();

    if (changed.has('optionValue')) {
      const ids = (this.optionValue ?? []).map(o => {
        if (this.selectType === 'paymentMethod') return String(o.idPaymentMethod);
        if (this.selectType === 'branch') return String(o.idBranch);
        if (this.selectType === 'seller') return String(o.idEmployee);
        return '';
      });
      if (this.value && !ids.includes(String(this.value))) {
        this.value = '';
      }
    }
  }

  /**
   * Requests options for the select input.
   * @private
   * @event input-select-request-data
   */
  _requestOptions() {
    this.dispatchEvent(
      new CustomEvent('input-select-request-data', {
        composed: true,
        bubbles: true,
      }),
    );
  }

  /**
   * Dispatch selected date.
   * @private
   * @event input-select-change
   */
  _onChange(event) {
    this.value = event.target.value;
    this.dispatchEvent(
      new CustomEvent('input-select-change', {
        detail: this.value,
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Template for select.
   * @returns {TemplateResult}
   * @private
   */
  _tplSelect() {
    return html`
      <div class="relative">
        <select
          @change="${e => this._onChange(e)}"
          .value=${this.value}
          class="w-full appearance-none -webkit-appearance-none pr-10 border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" selected disabled hidden>SELECCIONA</option>
          ${this._mapOptions(this.selectType)}
        </select>

        <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
              clip-rule="evenodd"
            />
          </svg>
        </span>
      </div>
    `;
  }

  /**
   * Maps options based on the select type.
   * @private
   * @param {String} selectType
   */
  _mapOptions(selectType) {
    const dictionary = {
      paymentMethod: () =>
        this.optionValue.map(
          item => html`<option value=${item.idPaymentMethod}>${item.paymentMethodName}</option>`,
        ),
      branch: () =>
        this.optionValue.map(
          item => html`<option value=${item.idBranch}>${item.branchName}</option>`,
        ),
      seller: () =>
        this.optionValue.map(
          item => html`<option value=${item.idEmployee}>${item.fullName}</option>`,
        ),
    };
    const dispatchDictionary = dictionary[selectType];
    return dispatchDictionary();
  }

  render() {
    return html`${this._tplSelect()}`;
  }
}
customElements.define('input-select', InputSelect);
