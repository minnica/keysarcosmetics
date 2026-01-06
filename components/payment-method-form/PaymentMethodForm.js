import { LitElement, html, nothing } from 'lit';

export class PaymentMethodForm extends LitElement {
  static get properties() {
    return {
      /**
       *This property should be bound from the parent component.
       *@type {Object}
       *@default {}
       */
      inputPaymentMethod: { type: Object },

      /**
       * Boolean to show form
       * @type {Boolean}
       * @default 'false'
       */
      showForm: { type: Boolean },

      /**
       * Input text to handel method name
       * @type {String}
       * @default ''
       */
      inputPaymentMethodName: { type: String },
    };
  }

  constructor() {
    super();
    this.inputPaymentMethod = {};
    this.showForm = false;
    this.inputPaymentMethodName = '';
  }

  /**
   * Overrides LitElement's default behavior to render into the light DOM.
   * @returns {BranchForm} This component without shadow DOM.
   */
  createRenderRoot() {
    return this;
  }

  /**
   * Renders the modal form to register a new payment method.
   * @returns {import('lit-html').TemplateResult}
   */
  _tplPaymentMethodFormModal() {
    return html`
      <div class="modal-branch">
        <div class="card-div">
          <h2 class="card-title">
            ${this.inputPaymentMethod?.id ? 'Editar Forma de Pago:' : 'Agregar Forma de Pago:'}
          </h2>
          <form id="payment-method-form" @submit="${this.submit}">
            <div class="grid-div">
              <div class="grid-cols-2">
                <label class="card-label">Nombre del Tipo de Pago:</label>
                <input
                  class="card-input"
                  type="text"
                  name="branch"
                  maxlength="33"
                  .value=${this.inputPaymentMethodName}
                  @input=${e => {
                    this.inputPaymentMethodName = e.target.value;
                  }}
                />
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="card-buttons">
              <button
                class="close-btn"
                type="button"
                @click=${() => {
                  this.showForm = false;
                }}
              >
                Cerrar
              </button>
              <button class="agree-btn" type="submit">Agregar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Handle form submit event and dispatch custom event
   * @param {Event} event
   */
  submit(event) {
    event.preventDefault();

    const trimedName = this.inputPaymentMethodName.trim();

    if (!trimedName) {
      alert('El nombre del metodo de pago no puede estar vacio.');
      return;
    }
    if (trimedName.length > 33) {
      alert('El nombre del metodo de pago no debe superar los 15 caracteres.');
      return;
    }
    if (trimedName.length < 3) {
      alert('El nombre del método de pago debe tener al menos 3 caracteres.');
      return;
    }

    this.dispatchEvent(
      new CustomEvent('request-submit', {
        detail: {
          id: this.inputPaymentMethod?.id ?? null,
          paymentMethodName: this.inputPaymentMethodName,
          action: this.inputPaymentMethod?.id ? 'update' : 'create',
        },
        bubbles: true,
        composed: true,
      }),
    );

    event.target.reset();
    this.showForm = false;
    this.inputPaymentMethod = {};
    this.inputPaymentMethodName = '';
  }

  /**
   * Lifecycle method called whenever reactive properties change.
   * If a new `inputPaymentMethod` object is passed in and is not empty,
   * the form is shown and the input field is pre-filled with the method name.
   *
   * @param {Map<string | number | symbol, unknown} changedProps
   */
  updated(changedProps) {
    if (
      changedProps.has('inputPaymentMethod') &&
      this.inputPaymentMethod &&
      Object.keys(this.inputPaymentMethod).length > 0
    ) {
      this.showForm = true;
      this.inputPaymentMethodName = this.inputPaymentMethod.name || '';
    }
  }

  /**
   * Method to show button and reset properties
   * @returns HTML Button Template
   */
  tplButtonModal() {
    return html`
      <button
        class="new-form-btn"
        @click=${() => {
          this.showForm = true;
          this.inputPaymentMethod = {};
          this.inputPaymentMethodName = '';
        }}
      >
        Agregar
      </button>
    `;
  }

  render() {
    return html`
      ${this.tplButtonModal()} ${this.showForm ? this._tplPaymentMethodFormModal() : nothing}
    `;
  }
}

customElements.define('payment-method-form', PaymentMethodForm);
