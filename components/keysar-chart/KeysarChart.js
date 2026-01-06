import { LitElement, html } from 'lit';
import Chart from 'chart.js/auto';

export class KeysarChart extends LitElement {
  static get properties() {
    return {
      /**
       * Set of colors for the chart.
       * @type {Array}
       * @default []
       */
      colors: {
        type: Array,
      },
      /**
       * Type of chart to display.
       * @type {String}
       * @default ''
       */
      chartType: {
        type: String,
        attribute: 'chart-type',
      },
      /**
       * Data for the bar chart.
       * @type {Array}
       * @default []
       */
      dataBarChart: {
        type: Array,
      },
      /**
       * Set of labels for the pie chart.
       * @type {Array}
       * @default []
       */
      labels: {
        type: Array,
      },
      /**
       * Set of sales data for the pie chart.
       * @type {Array}
       * @default []
       */
      sales: {
        type: Array,
      },
      /**
       * Title chart to display.
       * @type {String}
       * @default ''
       */
      titleChart: {
        type: String,
        attribute: 'title-chart',
      },
    };
  }

  constructor() {
    super();
    this.colors = [];
    this.chartType = '';
    this.dataBarChart = [];
    this.labels = [];
    this.sales = [];
  }

  createRenderRoot() {
    return this;
  }

  updated() {
    if (this.chart) {
      this.chart.destroy();
    }

    const canvas = this.querySelector('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const chartData = this._formatChartData(this.chartType);

    this.chart = new Chart(ctx, {
      type: this.chartType,
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 8 },
        plugins: { legend: { position: 'top' } },
        scales:
          this.chartType === 'bar' ? { y: { beginAtZero: true, ticks: { precision: 0 } } } : {},
      },
    });
  }

  /**
   * Formats the chart data based on the type.
   * @param {String} type
   * @private
   */
  _formatChartData(type) {
    const dataTypes = {
      bar: {
        labels: ['Ventas'],
        datasets: this?.dataBarChart,
      },
      pie: {
        labels: this?.labels,
        datasets: [
          {
            data: this?.sales,
            backgroundColor: this?.colors?.slice(0, this?.sales.length),
            borderWidth: 1,
          },
        ],
      },
    };
    return dataTypes[type];
  }

  render() {
    return html`
      <div class="bg-white rounded-2xl shadow-2xl p-4 mb-3 w-full max-w-3xl h-100 md:h-96">
        <h2 class="text-xl font-bold">${this.titleChart}</h2>
        <canvas class="w-full h-full block"></canvas>
      </div>
    `;
  }
}
customElements.define('keysar-chart', KeysarChart);
