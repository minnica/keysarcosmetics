import { LitElement } from 'lit';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export class ReportApiDm extends LitElement {
  /**
   * Fetch sales branch chart report data from the endpoint.
   * @public
   * @event loading-start
   * @event loading-end
   * @event branch-chart-report-api-dm-fetch
   * @event branch-chart-report-api-dm-fetch-error
   * @event branch-chart-report-api-dm-error
   */
  async getSalesBranchChartReport() {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));
    try {
      const res = await fetch(
        `${API_BASE}/dashboard/sales/branch/chart?month=2025-07`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(
          new CustomEvent('branch-chart-report-api-dm-fetch-error', { detail: error }),
        );
        return;
      }

      const data = await res.json();
      this.dispatchEvent(new CustomEvent('branch-chart-report-api-dm-fetch', { detail: data }));
    } catch (error) {
      this.dispatchEvent(new CustomEvent('branch-chart-report-api-dm-error', { detail: error }));
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }

  /**
   * Fetch sales branch card report data from dynamic date for day, month and year the endpoint.
   * @public
   * @param {String} date
   * @param {String} period
   * @event loading-start
   * @event loading-end
   * @event branch-report-api-dm-fetch
   * @event branch-report-api-dm-fetch-error
   * @event branch-report-api-dm-error
   */
  async getSalesBranchReport(date, period) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));
    try {
      const res = await fetch(
        `${API_BASE}/dashboard/sales/branch?date=${date}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(
          new CustomEvent('branch-report-api-dm-fetch-error', { detail: { error, period } }),
        );
        return;
      }

      const data = await res.json();
      this.dispatchEvent(
        new CustomEvent('branch-report-api-dm-fetch', { detail: { data, period } }),
      );
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent('branch-report-api-dm-error', { detail: { error, period } }),
      );
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }

  /**
   * Fetch total sales branch card report data from dynamic date for day, month and year.
   * @public
   * @param {String} date
   * @param {String} period
   * @event loading-start
   * @event loading-end
   * @event branch-total-api-dm-fetch
   * @event branch-total-api-dm-fetch-error
   * @event branch-total-api-dm-error
   */
  async getSalesBranchTotalReport(date, period) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));
    try {
      const res = await fetch(
        `${API_BASE}/dashboard/sales/branch/total?date=${date}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(
          new CustomEvent('branch-total-api-dm-fetch-error', { detail: { error, period } }),
        );
        return;
      }

      const data = await res.json();
      this.dispatchEvent(
        new CustomEvent('branch-total-api-dm-fetch', { detail: { data, period } }),
      );
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent('branch-total-api-dm-error', { detail: { error, period } }),
      );
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }

  /**
   * Fetch total sales branch card report data between start and end dates.
   * @public
   * @param {String} startDate
   * @param {String} endDate
   * @event loading-start
   * @event loading-end
   * @event branch-total-sales-report-api-dm-fetch
   * @event branch-total-sales-report-api-dm-fetch-error
   * @event branch-total-sales-report-api-dm-error
   */
  async getBranchReport(startDate, endDate) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));
    try {
      const res = await fetch(
        `${API_BASE}/reports/branches?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(
          new CustomEvent('branch-total-sales-report-api-dm-fetch-error', { detail: error }),
        );
        return;
      }

      const data = await res.json();
      this.dispatchEvent(
        new CustomEvent('branch-total-sales-report-api-dm-fetch', { detail: data }),
      );
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent('branch-total-sales-report-api-dm-error', { detail: error }),
      );
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }

  /**
   * Fetch employee report data between start and end dates.
   * @public
   * @param {String} startDate
   * @param {String} endDate
   * @event loading-start
   * @event loading-end
   * @event employee-report-api-dm-fetch
   * @event employee-report-api-dm-fetch-error
   * @event employee-report-api-dm-error
   */
  async getEmployeeReport(startDate, endDate) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));
    try {
      const res = await fetch(
        `${API_BASE}/reports/employees?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(
          new CustomEvent('employee-report-api-dm-fetch-error', { detail: error }),
        );
        return;
      }

      const data = await res.json();
      this.dispatchEvent(new CustomEvent('employee-report-api-dm-fetch', { detail: data }));
    } catch (error) {
      this.dispatchEvent(new CustomEvent('employee-report-api-dm-error', { detail: error }));
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }

  /**
   * Fetch employee report data between start and end dates.
   * @public
   * @param {String} year
   * @param {String} month
   * @event loading-start
   * @event loading-end
   * @event employee-report-daily-api-dm-fetch
   * @event employee-report-daily-api-dm-fetch-error
   * @event employee-report-daily-api-dm-error
   */
  async getEmployeeDailyReport(year, month) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));
    try {
      const res = await fetch(
        `${API_BASE}/reports/employees/daily?year=${year}&month=${month}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(
          new CustomEvent('employee-report-daily-api-dm-fetch-error', { detail: error }),
        );
        return;
      }

      const data = await res.json();
      this.dispatchEvent(new CustomEvent('employee-report-daily-api-dm-fetch', { detail: data }));
    } catch (error) {
      this.dispatchEvent(new CustomEvent('employee-report-daily-api-dm-error', { detail: error }));
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }

  /**
   * Fetch payment method report data between start and end dates.
   * @public
   * @param {String} startDate
   * @param {String} endDate
   * @event loading-start
   * @event loading-end
   * @event payment-method-report-api-dm-fetch
   * @event payment-method-report-api-dm-fetch-error
   * @event payment-method-report-api-dm-error
   */
  async getPaymentMethodReport(startDate, endDate) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));
    try {
      const res = await fetch(
        `${API_BASE}/reports/payment-methods?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(
          new CustomEvent('payment-method-report-api-dm-fetch-error', { detail: error }),
        );
        return;
      }

      const data = await res.json();
      this.dispatchEvent(new CustomEvent('payment-method-report-api-dm-fetch', { detail: data }));
    } catch (error) {
      this.dispatchEvent(new CustomEvent('payment-method-report-api-dm-error', { detail: error }));
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }

  /**
   * Fetch payment method report daily data between start and end dates.
   * @public
   * @param {String} idPaymentMethod
   * @param {String} year
   * @param {String} month
   * @event loading-start
   * @event loading-end
   * @event payment-method-report-daily-api-dm-fetch
   * @event payment-method-report-daily-api-dm-fetch-error
   * @event payment-method-report-daily-api-dm-error
   */
  async getPaymentMethodDailyReport(idPaymentMethod, year, month) {
    this.dispatchEvent(new CustomEvent('loading-start', { bubbles: true, composed: true }));
    try {
      const res = await fetch(
        `${API_BASE}/reports/payment-methods/daily?idPaymentMethod=${idPaymentMethod}&year=${year}&month=${month}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!res.ok) {
        const error = await res.json();
        this.dispatchEvent(
          new CustomEvent('payment-method-report-daily-api-dm-fetch-error', { detail: error }),
        );
        return;
      }

      const data = await res.json();
      this.dispatchEvent(
        new CustomEvent('payment-method-report-daily-api-dm-fetch', { detail: data }),
      );
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent('payment-method-report-daily-api-dm-error', { detail: error }),
      );
    } finally {
      this.dispatchEvent(new CustomEvent('loading-end', { bubbles: true, composed: true }));
    }
  }
}
customElements.define('report-api-dm', ReportApiDm);
