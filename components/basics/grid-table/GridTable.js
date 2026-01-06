import { LitElement, html, nothing } from 'lit';
import { Grid, html as ghtml } from 'gridjs';

export class GridTable extends LitElement {
  static get properties() {
    return {
      config: { type: Object },
      enableActions: { type: Boolean, attribute: 'enable-actions' },
      actionBuilder: { type: Object }, // function
    };
  }

  constructor() {
    super();
    this.config = {};
    this.enableActions = false;
    this.actionBuilder = null;
    this._grid = null;
    this._onClick = this._onClick?.bind?.(this); // por si el bundler transpila distinto
  }

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    GridTable._injectGridCSS();
    this._renderGrid();
  }

  updated(changed) {
    if (changed.has('config') || changed.has('enableActions') || changed.has('actionBuilder')) {
      this._renderGrid();
    }
  }

  static _injectGridCSS() {
    const href = 'https://unpkg.com/gridjs/dist/theme/mermaid.min.css';
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
    const style = document.createElement('style');
    style.textContent = `
  /* Centra el grid completo */
  #grid-container {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
  }

  /* Contenedor principal */
  .gridjs-container {
    width: 100%;
    max-width: 1200px; /* <- más ancho */
    background-color: #f9fafb;
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    box-sizing: border-box;
  }

  /* Tabla */
  .gridjs-table {
    width: 100%;
    table-layout: auto;
    border-collapse: collapse;
    background-color: #f3f4f6 !important;
  }

  .gridjs-th {
    background-color: #e5e7eb !important; /* ← Encabezado gris más oscuro */
    color: #374151 !important;            /* ← Texto gris oscuro */
    font-weight: 600;
    text-align: center;
    vertical-align: middle;
    padding: 0.5rem 1rem;
    min-width: 100px;
  }


  .gridjs-td {
    text-align: center;
    vertical-align: middle;
    padding: 0.5rem 1rem;
    min-width: 100px;
    background-color: #f3f4f6 !important;
  }

  .gridjs-th:last-child,
  .gridjs-td:last-child {
    min-width: 140px;
  }

  /* Encabezado (buscador, botones, etc.) */
  .gridjs-head {
    display: flex;
    justify-content: space-between; /* <- separa buscador y botones */
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .gridjs-search {
    flex: 1 1 auto;
    max-width: 400px;
  }

  /* Pie de página */
  .gridjs-footer {
    background-color: #e5e7eb !important; 
    padding: 0.75rem 1rem;
    border-top: 1px solid #d1d5db;
    margin-top: 1rem;
    border-radius: 0 0 0.5rem 0.5rem; 
  }
@media (max-width: 640px) {
  .gridjs-pagination {
    display: flex !important;
    justify-content: center !important;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
    }

`;
    document.head.appendChild(style);
  }

  static _normalizeColumns(columns) {
    return (columns || []).map(c => (typeof c === 'string' ? { name: c } : c));
  }

  _buildColumns(baseColumns) {
    let cols = GridTable._normalizeColumns(baseColumns);
    const hasActions = cols.some(c => (c?.name ?? '') === 'Acciones');

    if (this.enableActions) {
      if (!hasActions) cols = cols.concat([{ name: 'Acciones' }]);
      cols = cols.map(c => {
        if ((c?.name ?? '') !== 'Acciones') return c;
        return {
          ...c,
          sort: false,
          minWidth: '33%',
          formatter: (_, row) => {
            const id = row?.cells?.[0]?.data;
            const htmlStr = this.actionBuilder
              ? `<div class="flex justify-center gap-2">${this.actionBuilder(row)}</div>`
              : nothing;
            return ghtml(htmlStr);
          },
        };
      });
    } else {
      cols = cols.filter(c => (c?.name ?? '') !== 'Acciones');
    }
    return cols;
  }

  _renderGrid() {
    const container = this.querySelector('#grid-container');
    if (!container) return;

    const base = { ...(this.config || {}) };
    base.columns = this._buildColumns(base.columns || []);

    // Si ya existe, actualiza en lugar de destruir
    if (this._grid) {
      try {
        this._grid.updateConfig(base).forceRender();
        return;
      } catch (err) {
        console.log('Grid update falló, re-render completo.', err);
        try {
          this._grid.destroy();
        } catch (e) {
          console.log('Destroy falló:', e);
        }
        this._grid = null;
      }
    }

    this._grid = new Grid(base).render(container);
  }

  _onClick = e => {
    const btn = e.target.closest?.('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');

    // Buscar el índice de la fila con ese ID (asumiendo que está en la primera columna)
    const rowIndex = this.config?.data?.findIndex(row => `${row[0]}` === id);
    const rowData = this.config?.data?.[rowIndex] ?? null;

    this.dispatchEvent(
      new CustomEvent('grid-action', {
        detail: { action, id, rowIndex, rowData },
        bubbles: true,
        composed: true,
      }),
    );
  };

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._onClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._onClick);
    if (this._grid) {
      try {
        this._grid.destroy();
      } catch (e) {
        console.log('Destroy falló:', e);
      }
      this._grid = null;
    }
    super.disconnectedCallback();
  }

  render() {
    return html`<div id="grid-container"></div>`;
  }
}

customElements.define('grid-table', GridTable);
