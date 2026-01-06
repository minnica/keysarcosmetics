import { LitElement, html } from 'lit';
import '../components/sales-api-dm/SalesApiDm.js';
import '../components/employee-api-dm/EmployeeApiDm.js';
import '../components/branches-api-dm/BranchesApiDm.js';
import '../components/payment-method-api-dm/PaymentMethodApiDm.js';
import '../components/report-api-dm/ReportApiDm.js';
import { html as ghtml } from 'gridjs';
import {
  chatColors,
  columnsBranch,
  columnsEmployee,
  columnsPaymentMethod,
  columnsSalesBranch,
  columnTotalSales,
  columnsSalesSeller,
  columnsPaymentMethodReport,
  columnsPaymentMethodReportDaily,
  tableConfig,
} from './utils/configPages.js';

export class FeatureSalesManagementCrudDM extends LitElement {
  static get properties() {
    return {
      dataSalesBranch: { type: Object },
      dataEmployee: { type: Object },
      dataBranches: { type: Object },
      dataPaymentMethod: { type: Object },
      /**
       * Set of data for payment method report.
       * @type {Array}
       * @default []
       * @private
       */
      _dataPaymentMethodReport: {
        type: Array,
      },
      _dataPaymentMethodDailyReport: {
        type: Array,
      },
      /**
       * Set of data for employee report.
       * @type {Array}
       * @default []
       * @private
       */
      _dataEmployeeReport: {
        type: Array,
      },
      /**
       * Set of data for employee report daily.
       * @type {Array}
       * @default []
       * @private
       */
      _dataEmployeeReportDaily: {
        type: Array,
      },
      /**
       * Set of data for total general sales report.
       * @type {Object}
       * @default {}
       * @private
       */
      _dataTotalSalesReport: {
        type: Object,
      },
      /**
       * Set of data for dashboard charts and cards.
       * @type {Object}
       * @default {}
       * @private
       */
      _dataSalesBranchReport: {
        type: Object,
      },
      /**
       * Indicates if the payment method select options requested.
       * @type {Boolean}
       * @default false
       * @private
       */
      _isRequestSelect: {
        type: Boolean,
      },
      /**
       * ID of the selected payment method.
       * @type {String}
       * @default ''
       * @private
       */
      _idPaymentMethodSelected: {
        type: String,
      },
      /**
       * Set date for payment method report daily.
       * @type {Object}
       * @default {}
       * @private
       */
      _datePaymentMethod: {
        type: Object,
      },
    };
  }

  constructor() {
    super();
    this.dataSalesBranch = {};
    this.dataEmployee = {};
    this.dataBranches = {};
    this.dataPaymentMethod = {};
    this._dataPaymentMethodReport = [];
    this._dataPaymentMethodDailyReport = [];
    this._dataEmployeeReport = [];
    this._dataEmployeeReportDaily = [];
    this._dataTotalSalesReport = {};
    this._dataSalesBranchReport = {};
    this._isRequestSelect = false;
    this._idPaymentMethodSelected = '';
    this._datePaymentMethod = {};
  }

  /**
   * Getter to access the sales api dm from the Shadow DOM
   */
  get _salesDm() {
    return this.shadowRoot.querySelector('sales-api-dm');
  }

  /**
   * Getter to access the employee api dm from the Shadow DOM
   */
  get _employeeDm() {
    return this.shadowRoot.querySelector('employee-api-dm');
  }

  /**
   * Getter to access the branches api dm from the Shadow DOM
   */
  get _branchesDm() {
    return this.shadowRoot.querySelector('branches-api-dm');
  }

  /**
   * Getter to access the payment method api dm from the Shadow DOM
   */
  get _paymentMethodDm() {
    return this.shadowRoot.querySelector('payment-method-api-dm');
  }

  get _reportApiDm() {
    return this.shadowRoot.querySelector('report-api-dm');
  }

  /**
   * Get the employee data via api dm
   */
  getEmployee() {
    this._employeeDm.getEmployee();
  }

  /**
   * Get the sales branch data via api dm
   */
  getSalesBranch() {
    this._salesDm.getSalesBranch();
  }

  /**
   * Get the branhces data via api dm
   */
  getBranches() {
    this._branchesDm.getBranches();
  }

  /**
   * Get the employee data via api dm
   */
  getPaymentMethod() {
    this._paymentMethodDm.getPaymentMethod();
  }

  /**
   * Handles the event to get payment method select options.
   * @public
   */
  getPaymentMethodSelect() {
    this._isRequestSelect = true;
    this._paymentMethodDm.getPaymentMethod();
  }

  /**
   * Handles the event to get branch select options.
   * @public
   */
  getBranchSelect() {
    this._isRequestSelect = true;
    this._branchesDm.getBranches();
  }

  /**
   * Handles the event to get seller select options.
   * @public
   */
  getEmployeeSelect() {
    this._isRequestSelect = true;
    this._employeeDm.getEmployee();
  }

  /**
   * Dispatch request to get sales branch chart report.
   * @public
   */
  getSalesBranchChartReport() {
    this._reportApiDm.getSalesBranchChartReport();
  }

  /**
   * Dispatch request to get sales branch card report from a date of day, month and year.
   * @param {String} date
   * @public
   */
  getSalesBranchReport(date) {
    const formatDate = FeatureSalesManagementCrudDM._getFormatDate(date);
    this._reportApiDm.getSalesBranchReport(date, 'day');
    this._reportApiDm.getSalesBranchReport(formatDate.month, 'month');
    this._reportApiDm.getSalesBranchReport(formatDate.year, 'year');
  }

  /**
   * Dispatch request to get total sales branch.
   * @param {String} date
   * @public
   */
  getSalesBranchTotal(date) {
    const formatDate = FeatureSalesManagementCrudDM._getFormatDate(date);
    this._reportApiDm.getSalesBranchTotalReport(date, 'day');
    this._reportApiDm.getSalesBranchTotalReport(formatDate.month, 'month');
    this._reportApiDm.getSalesBranchTotalReport(formatDate.year, 'year');
  }

  /**
   * Dispatch request to get payment method report.
   * @param {String} date
   * @public
   */
  getPaymentMethodReport(startDate, endDate) {
    this._reportApiDm.getPaymentMethodReport(startDate, endDate);
  }

  /**
   * Handles the event to get payment method report daily.
   * @param {String} date
   * @public
   */
  getPaymentMethodDatesDailyReport(date) {
    this._datePaymentMethod = FeatureSalesManagementCrudDM._getFormatDate(date);
    this._getPaymentMethodDailyReport();
  }

  /**
   * Handles the event to get payment method select options.
   * @param {String} id
   * @public
   */
  getPaymentMethodSelectDailyReport(id) {
    this._idPaymentMethodSelected = id;
    this._getPaymentMethodDailyReport();
  }

  /**
   * Handles the event to get payment method daily report.
   * @private
   */
  _getPaymentMethodDailyReport() {
    if (this._idPaymentMethodSelected && Object.keys(this._datePaymentMethod).length) {
      this._reportApiDm.getPaymentMethodDailyReport(
        this._idPaymentMethodSelected,
        this._datePaymentMethod.year,
        this._datePaymentMethod.onlyMonth,
      );
    }
  }

  getEmployeesSellers() {
    this._employeeDm.getEmployeesSellers();
  }

  /**
   * Dispatch request to get sales employee report.
   * @param {String} date
   * @public
   */
  getEmployeeReport(startDate, endDate) {
    this._reportApiDm.getEmployeeReport(startDate, endDate);
  }

  /**
   * Dispatch request to get employee report daily.
   * @param {String} date
   * @public
   */
  getEmployeeDailyReport(date) {
    const formatedDate = FeatureSalesManagementCrudDM._getFormatDate(date);
    this._reportApiDm.getEmployeeDailyReport(formatedDate.year, formatedDate.onlyMonth);
  }

  /**
   * Dispatch request to get total general sales branch.
   * @param {String} date
   * @public
   */
  getBranchReport(startDate, endDate) {
    this._reportApiDm.getBranchReport(startDate, endDate);
  }

  /**
   * Get formatted date for sales branch report.
   * @param {String} date
   * @private
   */
  static _getFormatDate(date) {
    return {
      month: date.slice(0, 7),
      year: date.slice(0, 4),
      onlyMonth: date.slice(5, 7),
    };
  }

  /**
   * Transforms the raw data into a structured format with defined columns
   * @param {CustomEvent} e Event containing raw sales branch data
   */
  _setDataSalesBranch(e) {
    this.dataSalesBranch = e.detail;
    this.dataSalesBranch = {
      data: this.dataSalesBranch.map(item => [
        item.idSalesBranch,
        item.idBranch,
        item.branchName,
        item.dateSalesBranch,
        item.salesBranchTotal,
        item.notes,
      ]),
    };
    this.dataSalesBranch = {
      ...this.dataSalesBranch,
      columns: columnsSalesBranch,
      search: true,
      pagination: { limit: 9 },
    };
    this.dispatchEvent(
      new CustomEvent('set-data-sales-branch', {
        detail: this.dataSalesBranch,
      }),
    );
  }

  /**
   * Transforms the raw data into a structured table format.
   * @param {*} e Event containing raw employee data
   */
  _setDataEmployee(e) {
    this.dataEmployee = e.detail;

    if (this._isRequestSelect) {
      this.dispatchEvent(
        new CustomEvent('feature-sales-management-crud-dm-set-data-employee-select', {
          detail: this.dataEmployee,
        }),
      );
    }

    this.dataEmployee = {
      data: this.dataEmployee.map(item => [
        item.idEmployee,
        item.fullName,
        item.firstName,
        item.lastName,
        item.middleName,
        item.bank,
        item.accountNumber,
        item.position,
        item.personalTarget,
      ]),
    };
    this.dataEmployee = {
      ...this.dataEmployee,
      columns: columnsEmployee,
      search: true,
      pagination: { limit: 9 },
    };
    this.dispatchEvent(
      new CustomEvent('set-data-employee', {
        detail: this.dataEmployee,
      }),
    );
  }

  /**
   * Transforms the raw data into a structured format.
   * @param {CustomEvent} e Event containing raw branch data
   */
  _setDataBranches(e) {
    this.dataBranches = e.detail;

    if (this._isRequestSelect) {
      this.dispatchEvent(
        new CustomEvent('feature-sales-management-crud-dm-set-data-branch-select', {
          detail: this.dataBranches,
        }),
      );
    }

    this.dataBranches = {
      data: this.dataBranches.map(item => [item.idBranch, item.branchName]),
    };
    this.dataBranches = {
      ...this.dataBranches,
      columns: columnsBranch,
      search: true,
      pagination: { limit: 6 },
    };
    this.dispatchEvent(
      new CustomEvent('set-data-branches', {
        detail: this.dataBranches,
      }),
    );
  }

  /**
   * Transforms the raw data into a structured format.
   * @param {*} e Event containing raw payment method data 
   */
  _setDataPaymentMethod(e) {
    this.dataPaymentMethod = e.detail;

    if (this._isRequestSelect) {
      this.dispatchEvent(
        new CustomEvent('feature-sales-management-crud-dm-set-data-payment-method-select', {
          detail: this.dataPaymentMethod,
        }),
      );
    }

    this.dataPaymentMethod = {
      data: this.dataPaymentMethod.map(item => [item.idPaymentMethod, item.paymentMethodName]),
    };
    this.dataPaymentMethod = {
      ...this.dataPaymentMethod,
      columns: columnsPaymentMethod,
      search: true,
      pagination: { limit: 6 },
    };
    this.dispatchEvent(
      new CustomEvent('set-data-payment-method', {
        detail: this.dataPaymentMethod,
      }),
    );
  }

  /**
   * Format and set data for the sales branch chart report.
   * @param {Array} data
   * @private
   */
  _setDataSalesBranchChartReport(data) {
    const labels = data.map(row => row.branch);
    const sales = data.map(row => row.sales);

    const dataBarChart = data.map((row, i) => ({
      label: row.branch,
      data: [row.sales],
      backgroundColor: chatColors[i % chatColors.length],
      borderWidth: 1,
    }));

    this._dataSalesBranchReport = {
      ...this._dataSalesBranchReport,
      chart: {
        labels,
        sales,
        dataBarChart,
        colors: chatColors,
      },
    };

    this._setDashboardData();
  }

  /**
   * Set data for the sales branch card report.
   * @param {Array} detail
   * @private
   */
  _setDataSalesBranchCardReport(detail) {
    const { period, data } = detail;
    this._dataSalesBranchReport = {
      ...this._dataSalesBranchReport,
      card: {
        ...(this._dataSalesBranchReport.card || {}),
        [period]: data,
      },
    };
    this._setDashboardData();
  }

  _setDataSalesBranchTotalReport(detail) {
    const { period, data } = detail;
    this._dataSalesBranchReport = {
      ...this._dataSalesBranchReport,
      card: {
        ...(this._dataSalesBranchReport?.card ?? {}),
        total: {
          ...(this._dataSalesBranchReport?.card?.total ?? {}),
          [period]: data,
        },
      },
    };

    this._setDashboardData();
  }

  /**
   * Sincronize data of cards and charts.
   * @event 'feature-sales-management-crud-dm-set-dashboard-data'
   * @private
   */
  _setDashboardData() {
    if (
      this._dataSalesBranchReport?.chart &&
      this._dataSalesBranchReport?.card &&
      ['day', 'month', 'year'].every(prop => this._dataSalesBranchReport.card[prop]) &&
      this._dataSalesBranchReport.card.total &&
      ['day', 'month', 'year'].every(prop => this._dataSalesBranchReport.card.total[prop])
    ) {
      this.dispatchEvent(
        new CustomEvent('feature-sales-management-crud-dm-set-dashboard-data', {
          detail: this._dataSalesBranchReport,
        }),
      );
    }
  }

  /**
   * Set data for total general sales report.
   * @param {Array} data
   * @event 'feature-sales-management-crud-dm-set-data-total-sales'
   * @private
   */
  _setDataBranchTotalSalesReport(data) {
    this._dataTotalSalesReport = data;
    this._dataTotalSalesReport = {
      data: this._dataTotalSalesReport.map(item => [
        item.DATE,
        item.GALERIAS_INSURGENTES,
        item.OPATRA,
        item.MITIKAH,
        item.DELTA,
        item.MITIKAH_2,
        item.MIYANA,
        item.MASARYK,
        item.NEW_BRANCH,
        item.PRUEBA_POST,
        item.POST,
        item.POSTZZZ,
        item.TOTAL,
      ]),
    };
    this._dataTotalSalesReport = {
      ...this._dataTotalSalesReport,
      columns: columnTotalSales,
      search: true,
      pagination: { limit: 10 },
      className: tableConfig.className,
      language: tableConfig.language,
    };
    this.dispatchEvent(
      new CustomEvent('feature-sales-management-crud-dm-set-data-total-sales', {
        detail: this._dataTotalSalesReport,
      }),
    );
  }

  /**
   * Set data for employee report.
   * @param {Array} data
   * @event 'feature-sales-management-crud-dm-set-data-employee-report'
   * @private
   */
  _setDataEmployeeReport(data) {
    this._dataEmployeeReport = data;
    this._dataEmployeeReport = {
      data: this._dataEmployeeReport.map(item => [
        item.EMPLOYEE,
        item.GALERIAS_INSURGENTES,
        item.OPATRA,
        item.MITIKAH,
        item.DELTA,
        item.MITIKAH_2,
        item.MIYANA,
        item.MASARYK,
        item.NEW_BRANCH,
        item.PRUEBA_POST,
        item.POST,
        item.POSTZZZ,
        item.TOTAL,
        item.MONTHLY_TARGET,
        item.TO_GO,
        item.PERCENTAGE,
      ]),
    };

    const percentageFormatter = cell => {
      const raw = Number(cell ?? 0);
      const display = Number.isFinite(raw) ? raw : 0;

      const clamped = Math.max(0, Math.min(100, display));

      const colorRanges = [
        { max: 50, bgColor: 'bg-red-700', textColor: 'text-black' },
        { max: 80, bgColor: 'bg-yellow-600', textColor: 'text-white' },
        { max: 101, bgColor: 'bg-green-700', textColor: 'text-white' },
      ];
      const { bgColor, textColor } = colorRanges.find(r => clamped < r.max) ?? {
        bgColor: 'bg-green-700',
        textColor: 'text-white',
      };

      const displayTxt = (() => {
        const s = display % 1 === 0 ? String(display) : display.toFixed(2);
        return s.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
      })();

      return ghtml(`
        <div class="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div class="${bgColor} h-4 rounded-full" style="width:${clamped}%"></div>
          <span class="${textColor} absolute inset-0 flex items-center justify-center text-xs font-bold">
            ${displayTxt}%
          </span>
        </div>
      `);
    };

    const columnPercentage = {
      name: 'porcentaje',
      width: '175px',
      formatter: percentageFormatter,
    };

    this._dataEmployeeReport = {
      ...this._dataEmployeeReport,
      columns: [...columnsSalesSeller, columnPercentage],
      search: true,
      pagination: { limit: 10 },
      className: tableConfig.className,
      language: tableConfig.language,
    };
    this.dispatchEvent(
      new CustomEvent('feature-sales-management-crud-dm-set-data-employee-report', {
        detail: this._dataEmployeeReport,
      }),
    );
  }

  /**
   * Set data for employee report daily.
   * @param {Array} data
   * @event 'feature-sales-management-crud-dm-set-data-employee-report-daily'
   * @private
   */
  _setDataEmployeeDailyReport(data) {
    const _formatMoney = value =>
      `$${Number(value || 0).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const dateKeyRegex = /^\d{2}\/\d{2}\/\d{2}$/;
    const allDateKeys = Array.from(
      new Set(data.flatMap(obj => Object.keys(obj).filter(k => dateKeyRegex.test(k)))),
    );

    const sortByDate = (a, b) => {
      const [da, ma, ya] = a.split('/').map(n => parseInt(n, 10));
      const [db, mb, yb] = b.split('/').map(n => parseInt(n, 10));
      const A = new Date(2000 + ya, ma - 1, da);
      const B = new Date(2000 + yb, mb - 1, db);
      return A - B;
    };
    allDateKeys.sort(sortByDate);

    const columnsDailyNames = ['EMPLOYEE', ...allDateKeys, 'TOTAL'];
    const columnsDaily = columnsDailyNames.map((name, idx) => {
      if (idx === 0) return { name: 'EMPLOYEE', width: '150px' };
      return {
        name,
        width: '150px',
        formatter: cell => {
          const value = Number(cell || 0);
          const formatted = _formatMoney(value);
          return ghtml(
            `<span class="${value === 0 ? 'text-red-600 font-bold' : 'font-bold'}">${formatted}</span>`,
          );
        },
        sort: { compare: (a, b) => Number(a || 0) - Number(b || 0) },
      };
    });

    const rows = data.map(item => [
      item.EMPLOYEE ?? '',
      ...allDateKeys.map(k => Number(item[k] ?? 0)),
      Number(item.TOTAL ?? 0),
    ]);

    this._dataEmployeeReportDaily = {
      data: rows,
      columns: columnsDaily,
      search: true,
      pagination: { limit: 10 },
      className: tableConfig.className,
      language: tableConfig.language,
    };

    this.dispatchEvent(
      new CustomEvent('feature-sales-management-crud-dm-set-data-employee-report-daily', {
        detail: this._dataEmployeeReportDaily,
      }),
    );
  }

  /**
   * Set data for payment method report.
   * @param {Array} data
   * @event 'feature-sales-management-crud-dm-set-data-payment-method-report'
   * @private
   */
  _setDataPaymentMethodReport(data) {
    this._dataPaymentMethodReport = data;
    this._dataPaymentMethodReport = {
      data: this._dataPaymentMethodReport.map(item => [
        item.branch,
        item.EFECTIVO,
        item.TARJETA,
        item['NETPAY LINK'],
        item.TRANSFERENCIA,
        item['NEW METHOD'],
        item['PRUEBA POST'],
        item.POSTZZZ,
        item.TOTAL,
      ]),
    };
    this._dataPaymentMethodReport = {
      ...this._dataPaymentMethodReport,
      columns: columnsPaymentMethodReport,
      search: true,
      pagination: { limit: 12 },
      className: tableConfig.className,
      language: tableConfig.language,
    };
    this.dispatchEvent(
      new CustomEvent('feature-sales-management-crud-dm-set-data-payment-method-report', {
        detail: this._dataPaymentMethodReport,
      }),
    );
  }

  /**
   * Set data for payment method report daily.
   * @param {Array} data
   * @event 'feature-sales-management-crud-dm-set-data-payment-method-report'
   * @private
   */
  _setDataPaymentMethodDailyReport(data) {
    this._dataPaymentMethodDailyReport = data;
    this._dataPaymentMethodDailyReport = {
      data: this._dataPaymentMethodDailyReport.map(item => [
        item.DATE,
        item.MITIKAH,
        item.DELTA,
        item.GALERIAS_INSURGENTES,
        item.OPATRA,
        item.MIYANA,
        item.MASARYK,
        item.MITIKAH_2,
        item.NEW_BRANCH,
        item.PRUEBA_POST,
        item.POST,
        item.POSTZZZ,
        item.TOTAL,
      ]),
    };
    this._dataPaymentMethodDailyReport = {
      ...this._dataPaymentMethodDailyReport,
      columns: columnsPaymentMethodReportDaily,
      search: true,
      pagination: { limit: 10 },
      className: tableConfig.className,
      language: tableConfig.language,
    };
    this.dispatchEvent(
      new CustomEvent('feature-sales-management-crud-dm-set-data-payment-method-report-daily', {
        detail: this._dataPaymentMethodDailyReport,
      }),
    );
  }

  /**
   * Creates a new sale.
   * @param {Object} body
   */
  createSale(body) {
    this._salesDm.createSale(body);
  }

  /**
   * Deletes a sale.
   * @param {Object} body
   */
  deleteSales(body) {
    const { branchId, dateSale } = body;
    this._salesDm.deleteSales(branchId, dateSale);
  }

  /**
   * Execute create method to create the api post data key - value from body object
   * @param {Object} body
   */
  createEmployee(body) {
    this._employeeDm.createEmployee(body);
  }

  /**
   * Execute update method from employee api dm
   * @param {Number} id employee id
   * @param {Object} body put data 
   */
  updateEmployee(id, body) {
    this._employeeDm.updateEmployee(id, body);
  }

  /**
   * Execute delete method from employee api dm
   * @param {Number} id employee id 
   */
  deleteEmployee(id) {
    this._employeeDm.deleteEmployee(id);
  }

  /**
   * Execute create method from branche api dm
   * @param {Object} body data object
   */
  createBranch(body) {
    this._branchesDm.createBranch(body);
  }

  /**
   * Execute update method from branch api dm
   * @param {Number} id 
   * @param {Object} body data object
   */
  updateBranch(id, body) {
    this._branchesDm.updateBranch(id, body);
  }

  /**
   * Execute delete method from branch api dm
   * @param {Number} id 
   */
  deleteBranch(id) {
    this._branchesDm.deleteBranch(id);
  }

  /**
   * Execute create method from payment method api dm
   * @param {Object} body data object 
   */
  createPaymentMethod(body) {
    this._paymentMethodDm.createPaymentMethod(body);
  }

  /**
   * Execute update method from payment method api dm
   * @param {Number} id 
   * @param {Object} body data object
   */
  updatePaymentMethod(id, body) {
    this._paymentMethodDm.updatePaymentMethod(id, body);
  }

  /**
   * Execute delete method form payment method api dm
   * @param {Number} id 
   */
  deletePaymentMethod(id) {
    this._paymentMethodDm.deletePaymentMethod(id);
  }

  /**
   * Handle the api dm error events 
   * @param {Event} detail 
   */
  static _catchError(detail) {
    console.error('Error:', detail);
  }

  render() {
    return html`
      <sales-api-dm
        @sales-api-dm-error=${e => FeatureSalesManagementCrudDM._catchError(e.detail)}
        @sales-api-dm-fetch-error=${e => FeatureSalesManagementCrudDM._catchError(e.detail)}
        @sales-api-dm-fetch=${e => this._setDataSalesBranch(e)}
        @create-sales-api-dm-fetch=${() => this.getSalesBranch()}
        @delete-sales-api-dm-fetch=${() => this.getSalesBranch()}
      ></sales-api-dm>
      <employee-api-dm
        @employee-api-dm-error=${e => FeatureSalesManagementCrudDM._catchError(e.detail)}
        @employee-api-dm-fetch-error=${e => FeatureSalesManagementCrudDM._catchError(e.detail)}
        @employee-api-dm-fetch=${e => this._setDataEmployee(e)}
      >
      </employee-api-dm>
      <branches-api-dm
        @branches-api-dm-error=${e => FeatureSalesManagementCrudDM._catchError(e.detail)}
        @branches-api-dm-fetch-error=${e => FeatureSalesManagementCrudDM._catchError(e.detail)}
        @branches-api-dm-fetch=${e => this._setDataBranches(e)}
      >
      </branches-api-dm>
      <payment-method-api-dm
        @payment-method-api-dm-error=${e => FeatureSalesManagementCrudDM._catchError(e.detail)}
        @payment-method-api-dm-fetch-error=${e =>
          FeatureSalesManagementCrudDM._catchError(e.detail)}
        @payment-method-api-dm-fetch=${e => this._setDataPaymentMethod(e)}
      >
      </payment-method-api-dm>
      <report-api-dm
        @branch-chart-report-api-dm-fetch=${e => this._setDataSalesBranchChartReport(e.detail)}
        @branch-report-api-dm-fetch=${e => this._setDataSalesBranchCardReport(e.detail)}
        @branch-total-api-dm-fetch=${e => this._setDataSalesBranchTotalReport(e.detail)}
        @branch-total-sales-report-api-dm-fetch=${e =>
          this._setDataBranchTotalSalesReport(e.detail)}
        @employee-report-api-dm-fetch=${e => this._setDataEmployeeReport(e.detail)}
        @employee-report-daily-api-dm-fetch=${e => this._setDataEmployeeDailyReport(e.detail)}
        @payment-method-report-api-dm-fetch=${e => this._setDataPaymentMethodReport(e.detail)}
        @payment-method-report-daily-api-dm-fetch=${e =>
          this._setDataPaymentMethodDailyReport(e.detail)}
      >
      </report-api-dm>
    `;
  }
}
customElements.define('feature-sales-management-crud-dm', FeatureSalesManagementCrudDM);
