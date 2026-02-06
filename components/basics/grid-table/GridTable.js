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
  const localHref = new URL('./gridtable.css', import.meta.url).href;

  if (!document.querySelector(`link[href="${localHref}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = localHref;
    document.head.appendChild(link);
  }
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
          width: '200px',
          minWidth: '200px',
          formatter: (_, row) => {
            const id = row?.cells?.[0]?.data;
            const htmlStr = this.actionBuilder
              ? `<div class="grid-actions">${this.actionBuilder(row)}</div>`
              : '';
            return ghtml(htmlStr);
          },
        };
      });
    } else {
      cols = cols.filter(c => (c?.name ?? '') !== 'Acciones');
    }
    return cols;
  }


_mountHeaderActions() {
  const head = this.querySelector('.gridjs-head');
  const slotted = this.querySelector('[slot="grid-actions"]');
  if (!head || !slotted) return;

  let right = head.querySelector('.grid-actions-head');
  if (!right) {
    right = document.createElement('div');
    right.className = 'grid-actions-head';
    head.appendChild(right);
  }

  if (!right.contains(slotted)) right.appendChild(slotted);
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

      // 👇 IMPORTANTE: GridJS re-renderiza el header, así que volvemos a montar acciones
      queueMicrotask(() => this._mountHeaderActions());
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

  // 👇 Primera vez también
  queueMicrotask(() => this._mountHeaderActions());
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
    return html`    <div id="grid-container"></div>
    <slot name="grid-actions"></slot>`;
  }
}

customElements.define('grid-table', GridTable);
