import { LitElement, html, nothing } from 'lit';

export class InputDate extends LitElement {
  static get properties() {
    return {
      /**
       * Type of date input.
       * @type {String}
       * @default ''
       */
      typeDate: {
        type: String,
        attribute: 'type-date',
      },
      /**
       * Whether to show the date input without the day.
       * @type {Boolean}
       * @default false
       */
      withoutDay: {
        type: Boolean,
        attribute: 'without-day',
      },
    };
  }

  constructor() {
    super();
    this.typeDate = '';
    this.withoutDay = false;
  }

  createRenderRoot() {
    return this;
  }

  /**
   * Get element from the shadow DOM or light DOM.
   * @param {String} selector
   * @private
   */
  _getElement(selector) {
    return this.renderRoot?.querySelector(selector) ?? this.querySelector(selector);
  }

  /**
   * Dispatch selected date.
   * @private
   * @event input-date-between-data
   * @event input-date-unique-data
   */
  _sendDate() {
    const startDate = this._getElement('#startDateDashboardReport')?.value ?? '';
    const endDate = this._getElement('#endDateDashboardReport')?.value ?? '';
    if (this.typeDate === 'between') {
      if (startDate && endDate) {
        this.dispatchEvent(
          new CustomEvent('input-date-between-data', {
            bubbles: true,
            composed: true,
            detail: { startDate, endDate },
          }),
        );
      }
    }
    if (this.typeDate === 'unique' || this.withoutDay) {
      if (startDate) {
        this.dispatchEvent(
          new CustomEvent('input-date-unique-data', {
            bubbles: true,
            composed: true,
            detail: startDate,
          }),
        );
      }
    }
  }

  /**
   * Template for input date.
   * @returns {TemplateResult}
   * @private
   */
  _tplDate() {
    return html`
      <div class="flex ${this.typeDate === 'between' ? 'flex-row gap-4' : 'flex-col'}">
        <div class="flex flex-col">
          <label for="startDateDashboardReport" class="mb-1 text-xs font-medium text-gray-600">
            ${this.typeDate === 'between' ? 'Fecha inicial' : ''}
          </label>
          <input
            type="date"
            name="startDateDashboardReport"
            id="startDateDashboardReport"
            @change=${this._sendDate}
            class="border border-gray-300 rounded-lg px-3 py-1.5 shadow-xl text-gray-700"
          />
        </div>
        ${this.typeDate === 'between'
          ? html`<div class="flex flex-col">
              <label for="endDateDashboardReport" class="mb-1 text-xs font-medium text-gray-600">
                Fecha final
              </label>
              <input
                type="date"
                name="endDateDashboardReport"
                id="endDateDashboardReport"
                @change=${this._sendDate}
                class="border border-gray-300 rounded-lg px-3 py-1.5 shadow-xl text-gray-700"
              />
            </div>`
          : nothing}
      </div>
    `;
  }

  /**
   * Template for input daye mounth.
   * @returns {TemplateResult}
   * @private
   */
  _tplDateMounth() {
    return html`
      <input
        type="month"
        id="startDateDashboardReport"
        @change=${this._sendDate}
        class="border border-gray-300 rounded-lg px-3 py-1.5 shadow-xl text-gray-700"
      />
    `;
  }

  render() {
    return html`${this.withoutDay ? this._tplDateMounth() : this._tplDate()}`;
  }
}
customElements.define('input-date', InputDate);
