import { LitElement, html, nothing } from 'lit';

export class EmployerForm extends LitElement {
  static get properties() {
    return {
      /**
       * Name of employe
       * @type {String}
       * @default ''
       */
      firstName: { type: String },

      /**
       * Last name of employe
       * @type {String}
       * @default ''
       */
      lastName: { type: String },

      /**
       * Middle name of employe
       * @type {String}
       * @default ''
       */
      middleName: { type: String },

      /**
       * Bank type of employee
       * @type {String}
       * @default ''
       */
      bank: { type: String },

      /**
       * Account number of employee
       * @type {String}
       * @default ''
       */
      accountNumber: { type: String },

      /**
       * Position of employee
       * @type {String}
       * @default ''
       */
      position: { type: String },

      /**
       * Boolean to show form template
       * @type {Boolean}
       * @default 'false'
       */
      showForm: { type: Boolean },

      /**
       * Object to contain labels form values
       * @type {Object}
       * @default '{}'
       */
      formData: { type: Object },

      /**
       *This property should be bound from the parent component.
       *@type {Object}
       *@default {}
       */
      inputEmployee: { type: Object },
    };
  }

  constructor() {
    super();
    this.employees = [];
    this.firstName = '';
    this.lastName = '';
    this.middleName = '';
    this.showForm = false;
    this.formData = {};
    this.inputEmployee = {};
    this.bank = '';
    this.accountNumber = '';
  }

  /**
   * Overrides LitElement's default behavior to render into the light DOM.
   * @returns {EmployerForm} This component without shadow DOM.
   */
  createRenderRoot() {
    return this;
  }

  /**
   * Handles name input fields and updates the associated property.
   * @param {InputEvent} e - The input event from name fields.
   */
  handleNameInput(e) {
    const { name, value: inputValue } = e.target;
    let value = inputValue;
    if (name !== 'position') value = value.trim();

    this[name] = value;
  }

  /**
   * Computes the full name based on input fields.
   * @returns {string}
   */
  get fullName() {
    return [this.firstName, this.lastName, this.middleName].filter(Boolean).join(' ');
  }

  /**
   * Render text input
   * @param {string} label - Text label
   * @param {string} name - Name input
   * @param {string} value - Value
   * @param {boolean} [readonly=false] - read only
   * @param {string} [extraClass=''] - Aditional class
   * @returns {import('lit-html').TemplateResult}
   */
  _renderTextInput(label, name, value, readonly = false, extraClass = '') {
    return html`
      <div class=${extraClass}>
        <label class="card-label">${label}:</label>
        <input
          type="text"
          class="card-input"
          name=${name}
          .value=${value}
          ?readonly=${readonly}
          @input=${this.handleNameInput}
        />
      </div>
    `;
  }

  /**
   * Render numeric input
   */
  _renderNumericInput(label, name, value, extraClass = '') {
    return html`
      <div class=${extraClass}>
        <label class="card-label">${label}:</label>
        <input
          type="text"
          inputmode="numeric"
          class="card-input"
          name=${name}
          .value=${value}
          @input=${this.handleNameInput}
        />
      </div>
    `;
  }

  /**
   * Render select
   */
  _renderSelect(label, name, value, options = [], extraClass = '') {
    return html`
      <div class=${extraClass}>
        <label class="card-label">${label}:</label>
        <select class="card-select" name=${name} .value=${value} @change=${this.handleNameInput}>
          ${options.map(opt => html`<option value=${opt}>${opt}</option>`)}
        </select>
      </div>
    `;
  }

  /**
   * Renders the employee form modal.
   * @returns {import('lit-html').TemplateResult}
   * @private
   */
_tplFormModal() {
  return html`
    <div id="card-sell" class="modal-employer">
      <div class="card-div">
        <h2 class="card-title">
          ${this.inputEmployee?.id ? 'Editar datos de Empleado' : 'Registrar Empleado'}
        </h2>
        <form @submit=${this.submit}>
          <div class="grid-div">
            ${this._renderTextInput('Nombre Completo', 'fullName', this.fullName, true, 'col-span-2')}
            ${this._renderTextInput('Nombre', 'firstName', this.firstName)}
            ${this._renderTextInput('Apellido Paterno', 'lastName', this.lastName)}
            ${this._renderTextInput('Apellido Materno', 'middleName', this.middleName, false, 'col-span-1')}
            ${this._renderTextInput('Banco', 'bank', this.bank, false, 'col-span-1')}
            ${this._renderNumericInput('Numero de Cuenta', 'accountNumber', this.accountNumber, 'col-span-2')}
            ${this._renderSelect('Puesto', 'position', this.position, ['Vendedor', 'Manager', 'Director'], 'col-span-2')}
          </div>

          <div class="card-buttons">
            <button
              class="close-btn"
              type="button"
              @click=${() => {this.showForm = false}}
            >
              Cerrar
            </button>
            <button class="agree-btn" type="submit">Agregar Empleado</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

  /**
   * Renders the button to show form and add new employee
   * @returns {TemplateResult}
   * @private
   */
  _tplButtonModal() {
    return html`
     <slot name="trigger">
      <button
        class="new-form-btn"
        type="button"
        @click=${() => {
          this.resetForm();
        }}
      >
        Agregar Empleado
      </button>
    </slot>
    `;
  }

  /**
   * Resets the form filds data
   */
  resetForm() {
    this.inputEmployee = {};
    this.firstName = '';
    this.lastName = '';
    this.middleName = '';
    this.bank = '';
    this.accountNumber = '';
    this.position = '';
    this.showForm = true;
  }

  /**
   * Validate if all fields are complete
   * @returns Bolean
   */
  validateForm() {
    if (!this.firstName || !this.lastName || !this.accountNumber || !this.bank) {
      alert('Por favor llena todos los campos obligatorios.');
      return false;
    }
    return true;
  }

  /**
   * Handles the form submission event. Collects
   * the form data using the FormData
   *
   * @param {Event} event - The form submission event.
   */
  submit(event) {
    event.preventDefault();
    if (!this.validateForm()) return;
    this.formData = new FormData(event.target);

    this.dispatchEvent(
      new CustomEvent('request-submit', {
        detail: {
          id: this.inputEmployee?.id ?? null,
          formData: this.formData,
          action: this.inputEmployee?.id ? 'update' : 'create',
        },
        bubbles: true,
        composed: true,
      }),
    );
    event.target.reset();
    this.showForm = false;
    this.resetForm();
  }

    /**
   * Lifecycle method called whenever reactive properties change.
   * 
   * @param {Map<string | number | symbol, unknown} changedProps
   */
  updated(changedProps) {
    if (
      changedProps.has('inputEmployee') &&
      this.inputEmployee &&
      Object.keys(this.inputEmployee).length > 0
    ) {
      this.showForm = true;

      const {
        firstName = '',
        lastName = '',
        middleName = '',
        bank = '',
        accountNumber = '',
        position = '',
      } = this.inputEmployee;

      this.firstName = firstName;
      this.lastName = lastName;
      this.middleName = middleName;
      this.bank = bank;
      this.accountNumber = accountNumber;
      this.position = position;
    }
  }

  render() {
    return html`${this.showForm ? this._tplFormModal() : nothing} `;
  }
}

customElements.define('employer-form', EmployerForm);
