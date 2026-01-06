import { LitElement, html } from 'lit';
import { Router } from '@lit-labs/router';
import '@components/basics/seller-form/SellerForm.js';
import '@components/basics/employer-form/EmployerForm.js';
import '@components/basics/branch-form/BranchForm.js';
import '@components/basics/nav-bar/NavBar.js';
import '@components/apis/sales-api-dm/SalesApiDm.js';
import '@components/basics/loading-spinner/LoadingSpinner.js';
import './pages/feature-sales-management-crud-sales/FeatureSalesManagementCrudSales.js';
import './pages/feature-sales-management-crud-employee/FeatureSalesManagementCrudEmployee.js';
import './pages/feature-sales-management-crud-branch/FeatureSalesManagementCrudBranch.js';
import './pages/feature-sales-management-crud-payment-method/FeatureSalesManagementCrudPaymentMethod.js';
import './pages/feature-sales-management-crud-report-dashboard/FeatureSalesManagementCrudReportDashboard.js';
import './pages/feature-sales-management-crud-report-total-sales/FeatureSalesManagementCrudReportTotalSales.js';
import './pages/feature-sales-management-crud-report-sales-seller/FeatureSalesManagementCrudReportSalesSeller.js';
import './pages/feature-sales-management-crud-report-daily-sales-seller/FeatureSalesManagementCrudReportDailySalesSeller.js';
import './pages/feature-sales-management-crud-report-payment-method/FeatureSalesManagementCrudReportPaymentMethod.js';
import './pages/feature-sales-management-crud-report-daily-payment-method/FeatureSalesManagementCrudReportDailyPaymentMethod.js';
import './FeatureSalesManagementCrud.css';
import './FeatureSalesManagementCrudDM.js';

export class FeatureSalesManagementCrud extends LitElement {
  static get properties() {
    return {
      /**
       * Data for sales branch page.
       * @type {Object}
       * @default {}
       */
      dataSalesBranch: {
        type: Object,
      },
      /**
       * Data for employee page.
       * @type {Object}
       * @default {}
       */
      dataEmployee: {
        type: Object,
      },
      /**
       * Data for branch page.
       * @type {Object}
       * @default {}
       */
      dataBranches: {
        type: Object,
      },
      /**
       * Data for payment method page.
       * @type {Object}
       * @default {}
       */
      dataPaymentMethod: {
        type: Object,
      },
      /**
       * Data for dashboard page.
       * @type {Array}
       * @default []
       */
      _dashboardData: {
        type: Array,
      },
      /**
       * Data for total general sales page.
       * @type {Object}
       * @default {}
       */
      _totalSalesData: {
        type: Object,
      },
      /**
       * Data for sales seller page.
       * @type {Array}
       * @default []
       */
      _dataEmployeeReport: {
        type: Array,
      },
      /**
       * Data for employee report daily page.
       * @type {Array}
       * @default []
       */
      _dataEmployeeReportDaily: {
        type: Array,
      },
      /**
       * Data for payment method report page.
       * @type {Array}
       * @default []
       */
      _dataPaymentMethodReport: {
        type: Array,
      },
      /**
       * Data for payment method select options.
       * @type {Array}
       * @default []
       */
      _dataPaymentMethodSelect: {
        type: Array,
      },
      /**
       * Data for payment method select options.
       * @type {Array}
       * @default []
       */
      _dataBranchSelect: {
        type: Array,
      },
      /**
       * Data for payment method select options.
       * @type {Array}
       * @default []
       */
      _dataEmployeeSelect: {
        type: Array,
      },
      /**
       * Data for payment method report daily page.
       * @type {Array}
       * @default []
       */
      _dataPaymentMethodDailyReport: {
        type: Array,
      },
      /**
       * Loading counter for tracking concurrent requests.
       * @type {Number}
       * @default 0
       * @private
       */
      _loadingCount: {
        type: Number,
      },
    };
  }

  constructor() {
    super();
    this.dataSalesBranch = {};
    this.dataEmployee = {};
    this.dataBranches = {};
    this.dataPaymentMethod = {};
    this._dashboardData = [];
    this._totalSalesData = {};
    this._dataEmployeeReport = [];
    this._dataEmployeeReportDaily = [];
    this._dataPaymentMethodReport = [];
    this._dataPaymentMethodSelect = [];
    this._dataEmployeeSelect = [];
    this._dataBranchSelect = [];
    this._dataPaymentMethodReportDaily = [];
    this._loadingCount = 0;
    this._user = null;
    this._router = new Router(this, this._routes);
  }

  createRenderRoot() {
    return this;
  }

  _getElement(selector) {
    return this.renderRoot?.querySelector(selector) ?? this.querySelector(selector);
  }

  get _salesManagementCrudDm() {
    return this._getElement('feature-sales-management-crud-dm');
  }

  /**
   * Returns the route configuration for the router.
   * @returns {Array}
   * @private
   */
  get _routes() {
    return [
      {
        path: '/',
        render: () => html`<p class="p-4 uppercase">pagina inicial</p>`,
      },
      {
        path: '/login',
        render: () => html`
          <div class="p-4">
            <p class="mb-2">Login placeholder</p>
            <button
              class="menu-buttons"
              @click=${() => {
                this._user = { role: 'admin' };
                this._router.goto('/');
              }}
            >
              Iniciar sesión
            </button>
          </div>
        `,
      },
      {
        path: '/formularios/ventas',
        render: () => {
          this._ensureFetched('ventas', dm => dm.getSalesBranch());
          return html`
            <feature-sales-management-crud-sales
              .optionValueBranch="${this._dataBranchSelect}"
              .optionValueSeller="${this._dataEmployeeSelect}"
              .optionValuePaymentMethod="${this._dataPaymentMethodSelect}"
              .dataGridSales="${this?.dataSalesBranch}"
              @input-select-request-data="${this._handleGetDataSelect}"
              @seller-form-request-post-sales="${e => this._handleSalesRequestPostSales(e.detail)}"
              @feature-sales-management-crud-sales-request-delete-sale="${e =>
                this._handleSalesRequestDeleteSale(e.detail)}"
            ></feature-sales-management-crud-sales>
          `;
        },
      },
      {
        path: '/formularios/empleados',
        render: () => {
          this._ensureFetched('empleados', dm => dm.getEmployee());
          return html`
            <feature-sales-management-crud-employee
              @submit-employee-event="${e => this.handleEmployeeSubmit(e.detail)}"
              .dataGridEmployee="${this?.dataEmployee}"
            ></feature-sales-management-crud-employee>
          `;
        },
      },
      {
        path: '/formularios/sucursales',
        render: () => {
          this._ensureFetched('sucursales', dm => dm.getBranches());
          return html`
            <feature-sales-management-crud-branch
              @submit-event="${e => this.handleBranchSubmit(e.detail)}"
              .dataGridBranch="${this.dataBranches}"
            ></feature-sales-management-crud-branch>
          `;
        },
      },
      {
        path: '/formularios/metodos-pago',
        render: () => {
          this._ensureFetched('metodos-pago', dm => dm.getPaymentMethod());
          return html`
            <feature-sales-management-crud-payment-method
              .dataGridPaymentMethod="${this.dataPaymentMethod}"
              @submit-payment-method-event="${e => this.handlePaymentMethodSubmit(e.detail)}"
            ></feature-sales-management-crud-payment-method>
          `;
        },
      },
      {
        path: '/reportes/metodo-pago',
        render: () => html`
          <feature-sales-management-crud-report-payment-method
            .paymentReportData=${this._dataPaymentMethodReport}
            @input-date-between-data=${e => this._handleGetPaymentMethodReport(e.detail)}
          ></feature-sales-management-crud-report-payment-method>
        `,
      },
      {
        path: '/reportes/metodo-pago-diario',
        render: () => html`
          <feature-sales-management-crud-report-daily-payment-method
            .paymentReportDailyData="${this._dataPaymentMethodReportDaily}"
            .inputSelectData=${this._dataPaymentMethodSelect}
            @input-select-request-data="${this._handleGetPaymentMethodSelect}"
            @input-date-unique-data="${e => this._handleGetPaymentMethodReportDaily(e.detail)}"
            @input-select-change="${e => this._handleRequestPaymentMethodSelect(e.detail)}"
          >
          </feature-sales-management-crud-report-daily-payment-method>
        `,
      },
      {
        path: '/reportes/ventas-vendedor',
        render: () => html`
          <feature-sales-management-crud-report-sales-seller
            .salesSellerData="${this._dataEmployeeReport}"
            @input-date-between-data="${e => this._handleGetSalesSeller(e.detail)}"
          >
          </feature-sales-management-crud-report-sales-seller>
        `,
      },
      {
        path: '/reportes/ventas-vendedor-diario',
        render: () => html`
          <feature-sales-management-crud-report-daily-sales-seller
            @input-date-unique-data="${e => this._handleGetSalesSellerDaily(e.detail)}"
            .dailySalesSellerData="${this._dataEmployeeReportDaily}"
          >
          </feature-sales-management-crud-report-daily-sales-seller>
        `,
      },
      {
        path: '/reportes/total-general-ventas',
        render: () => html`
          <feature-sales-management-crud-report-total-sales
            .totalSalesData="${this._totalSalesData}"
            @input-date-between-data="${e => this._handleGetBranchReport(e.detail)}"
          ></feature-sales-management-crud-report-total-sales>
        `,
      },
      {
        path: '/reportes/dashboard',
        render: () => html`
          <feature-sales-management-crud-report-dashboard
            .data="${this._dashboardData}"
            @input-date-unique-data="${e => this._handleGetSalesBranch(e.detail)}"
          ></feature-sales-management-crud-report-dashboard>
        `,
      },
      {
        path: '(.*)',
        render: () => html`<p class="p-4 text-red-600 uppercase">Página No encontrada</p>`,
      },
    ];
  }

  _prefetched = new Set();

  // pendiente de documentar
  async _callDM(cb) {
    await Promise.all([
      customElements.whenDefined('feature-sales-management-crud-dm'),
      this.updateComplete,
    ]);
    const dm = this._salesManagementCrudDm;
    if (!dm) return;
    cb(dm);
  }

  // pendiente de documentar
  _ensureFetched(key, cb) {
    if (this._prefetched.has(key)) return;
    this._prefetched.add(key);
    this._callDM(cb);
  }

  // Guard simple (mejorar esto cuando haya login real/JWT)
  _isAuthenticated() {
    return !!this._user;
  }

  // pendiente de documentar
  _authorize(renderFn) {
    if (!this._isAuthenticated()) {
      queueMicrotask(() => this._router.goto('/login'));
      return html``;
    }
    return renderFn();
  }

  // pendiente de documentar
  _logout() {
    this._user = null;
    this._prefetched.clear();
    this._router.goto('/login');
  }

  /**
   * Handles the event to bin detail objetc to dm component
   * @param {Object} detail
   */
  handleBranchSubmit(detail) {
    const { action } = detail;

    if (action === 'create') {
      this._salesManagementCrudDm.createBranch(detail);
    } else if (action === 'update') {
      this._salesManagementCrudDm.updateBranch(detail.id, detail);
    } else if (action === 'delete') {
      this._salesManagementCrudDm.deleteBranch(detail.id);
    }
  }

  /**
   * Handles the event to bin detail objetc to dm component
   * @param {Object} detail
   */
  handleEmployeeSubmit(detail) {
    const { formData, action, id } = detail;
    // const id = formData.get('id');

    let body;

    if (action === 'delete') {
      // Para delete no necesitamos body (o puede ser null)
      body = null;
    } else if (formData instanceof FormData) {
      body = Object.fromEntries(formData.entries());
    } else if (typeof formData === 'object') {
      body = formData; // Ya es objeto plano
    } else {
      return;
    }

    if (action === 'create') {
      this._salesManagementCrudDm.createEmployee(body);
    } else if (action === 'update') {
      this._salesManagementCrudDm.updateEmployee(id, body);
    } else if (action === 'delete') {
      this._salesManagementCrudDm.deleteEmployee(id, body);
    }
  }

  /**
   * Handles the event to bin detail objetc to dm component
   * @param {Object} detail
   */
  handlePaymentMethodSubmit(detail) {
    const { action } = detail;

    if (action === 'create') {
      this._salesManagementCrudDm.createPaymentMethod(detail);
    } else if (action === 'update') {
      this._salesManagementCrudDm.updatePaymentMethod(detail.id, detail);
    } else if (action === 'delete') {
      this._salesManagementCrudDm.deletePaymentMethod(detail.id);
    }
  }

  /**
   * Handles the event to get payment method report.
   * @param {String} data
   * @private
   */
  _handleGetPaymentMethodReport(data) {
    const { startDate, endDate } = data;
    this._salesManagementCrudDm.getPaymentMethodReport(startDate, endDate);
  }

  /**
   * Handles the event to get payment method select options.
   * @private
   */
  _handleGetPaymentMethodSelect() {
    this._salesManagementCrudDm.getPaymentMethodSelect();
  }

  /**
   * Handles the event to get data of select options.
   * @private
   */
  _handleGetDataSelect() {
    this._salesManagementCrudDm.getBranchSelect();
    this._salesManagementCrudDm.getEmployeeSelect();
    this._salesManagementCrudDm.getPaymentMethodSelect();
  }

  /**
   * Handles the event to create a new sales.
   * @param {Object} body
   * @private
   */
  _handleSalesRequestPostSales(body) {
    this._salesManagementCrudDm.createSale(body);
  }

  /**
   * Handles the event to delete a sale.
   * @param {Object} body
   * @private
   */
  _handleSalesRequestDeleteSale(data) {
    this._salesManagementCrudDm.deleteSales(data);
  }

  /**
   * Handles the event to get payment method report daily.
   * @param {String} data
   * @private
   */
  _handleGetPaymentMethodReportDaily(data) {
    this._salesManagementCrudDm.getPaymentMethodDatesDailyReport(data);
  }

  /**
   * Handles the event to get payment method select options.
   * @param {String} id
   * @private
   */
  _handleRequestPaymentMethodSelect(id) {
    this._salesManagementCrudDm.getPaymentMethodSelectDailyReport(id);
  }

  /**
   * Handles the event to get sales seller report.
   * @param {String} data
   * @private
   */
  _handleGetSalesSeller(data) {
    const { startDate, endDate } = data;
    this._salesManagementCrudDm.getEmployeeReport(startDate, endDate);
  }

  /**
   * Handles the event to get sales seller daily report.
   * @param {String} data
   * @private
   */
  _handleGetSalesSellerDaily(date) {
    this._salesManagementCrudDm.getEmployeeDailyReport(date);
  }

  /**
   * Handles the event to get total sales report.
   * @param {String} date
   * @private
   */
  _handleGetBranchReport(data) {
    const { startDate, endDate } = data;
    this._salesManagementCrudDm.getBranchReport(startDate, endDate);
  }

  /**
   * Handles the event to get sales branch chart report from api.
   * @param {String} date
   * @private
   */
  _handleGetSalesBranch(date) {
    this._salesManagementCrudDm.getSalesBranchChartReport();
    this._salesManagementCrudDm.getSalesBranchReport(date);
    this._salesManagementCrudDm.getSalesBranchTotal(date);
  }

  /**
   * Sets dashboard pages config.
   * @param {Object} event
   * @private
   */
  _setDashboardConfig(detail) {
    this._dashboardData = detail;
  }

  /**
   * Increments the global loading counter.
   * @private
   */
  _incrementLoading() {
    this._loadingCount += 1;
    this.requestUpdate();
  }

  /**
   * Decrements the global loading counter.
   * @private
   */
  _decrementLoading() {
    this._loadingCount = Math.max(0, this._loadingCount - 1);
    this.requestUpdate();
  }

  render() {
    return html`
      <nav-bar></nav-bar>

      ${this._router.outlet()}

      <feature-sales-management-crud-dm
        @set-data-sales-branch="${e => {
          this.dataSalesBranch = e.detail;
        }}"
        @set-data-employee="${e => {
          this.dataEmployee = e.detail;
        }}"
        @set-data-branches="${e => {
          this.dataBranches = e.detail;
        }}"
        @set-data-payment-method="${e => {
          this.dataPaymentMethod = e.detail;
        }}"
        @feature-sales-management-crud-dm-set-data-payment-method-report="${e => {
          this._dataPaymentMethodReport = e.detail;
        }}"
        @feature-sales-management-crud-dm-set-data-payment-method-select="${e => {
          this._dataPaymentMethodSelect = e.detail;
        }}"
        @feature-sales-management-crud-dm-set-data-branch-select="${e => {
          this._dataBranchSelect = e.detail;
        }}"
        @feature-sales-management-crud-dm-set-data-employee-select="${e => {
          this._dataEmployeeSelect = e.detail;
        }}"
        @feature-sales-management-crud-dm-set-data-payment-method-report-daily="${e => {
          this._dataPaymentMethodReportDaily = e.detail;
        }}"
        @feature-sales-management-crud-dm-set-data-employee-report="${e => {
          this._dataEmployeeReport = e.detail;
        }}"
        @feature-sales-management-crud-dm-set-data-employee-report-daily="${e => {
          this._dataEmployeeReportDaily = e.detail;
        }}"
        @feature-sales-management-crud-dm-set-data-total-sales="${e => {
          this._totalSalesData = e.detail;
        }}"
        @feature-sales-management-crud-dm-set-dashboard-data="${e => {
          this._setDashboardConfig(e.detail);
        }}"
        @loading-start=${this._incrementLoading}
        @loading-end=${this._decrementLoading}
      >
      </feature-sales-management-crud-dm>
      <loading-spinner .isLoading=${this._loadingCount > 0}></loading-spinner>
    `;
  }
}

customElements.define('feature-sales-management-crud', FeatureSalesManagementCrud);
