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
/* Layout */
#grid-container{
  display:flex;
  justify-content:center;
  padding: 1.25rem 1rem;
}

/* Card premium */
.gridjs-container{
  width: 100%;
  max-width: 1220px;
  border-radius: 18px;
  overflow: hidden;

  background: radial-gradient(1200px 600px at 20% 0%, rgba(99,102,241,.10), transparent 60%),
              radial-gradient(900px 500px at 80% 20%, rgba(34,211,238,.08), transparent 55%),
              rgba(10, 12, 16, .86);

  border: 1px solid rgba(255,255,255,.08);
  box-shadow: 0 25px 60px rgba(0,0,0,.45);
  backdrop-filter: blur(10px);
}

/* Header: search + acciones */
.gridjs-head{
  display:flex;
  align-items:center;
  gap: .8rem;
  flex-wrap: wrap;

  padding: 16px 18px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
}

.gridjs-head .gridjs-search{
  flex: 1 1 auto;
  max-width: 520px;
}

/* Contenedor para botón */
.gridjs-head .grid-actions-head{
  margin-left: auto;
  display:flex;
  align-items:center;
  gap: .5rem;
}

/* Botón en el header de GridJS (más especificidad para ganarle al theme) */
.gridjs-head .grid-primary-btn{
  appearance: none !important;
  -webkit-appearance: none !important;
  border: 1px solid rgba(243,240,233,.55) !important;
  background: linear-gradient(
    180deg,
    rgba(243,240,233,.98),
    rgba(195,165,131,.85)
  ) !important;

  color: rgba(10,12,16,.92) !important;

  height: 40px !important;
  padding: 0 16px !important;
  border-radius: 999px !important;

  font-weight: 800 !important;
  font-size: 14px !important;
  letter-spacing: .02em !important;

  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;

  box-shadow: 0 10px 22px rgba(0,0,0,.35) !important;
  cursor: pointer !important;

  transition: transform .12s ease, filter .15s ease, box-shadow .15s ease !important;
}

.gridjs-head .grid-primary-btn:hover{
  transform: translateY(-1px) !important;
  filter: brightness(1.06) !important;
  box-shadow: 0 14px 28px rgba(0,0,0,.45) !important;
}

.gridjs-head .grid-primary-btn:active{
  transform: translateY(0px) !important;
  filter: brightness(0.98) !important;
}



.gridjs-search input{
  width: 100% !important;
  height: 42px !important;
  padding: 0 14px !important;
  border-radius: 12px !important;

  background: rgba(255,255,255,.04) !important;
  border: 1px solid rgba(255,255,255,.10) !important;
  color: rgba(245,245,245,.95) !important;
  outline: none !important;

  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.gridjs-search input::placeholder{
  color: rgba(180,188,204,.75) !important;
}
.gridjs-search input:focus{
  border-color: rgba(99,102,241,.55) !important;
  box-shadow: 0 0 0 4px rgba(99,102,241,.18) !important;
  background: rgba(255,255,255,.055) !important;
}

/* Wrapper tabla */
.gridjs-wrapper{
  border: 0 !important;
  background: transparent !important;
}

/* Tabla */
.gridjs-table{
  width:100%;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  background: transparent !important;
}

/* Encabezado sticky */
.gridjs-thead th{
  position: sticky;
  top: 0;
  z-index: 10;

  padding: 14px 14px !important;
  font-size: .72rem !important;
  font-weight: 700 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase;

  color: rgba(210,218,232,.92) !important;

  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)) !important;
  border-bottom: 1px solid rgba(255,255,255,.08) !important;

  backdrop-filter: blur(10px);
}

/* Celdas */
.gridjs-td{
  padding: 14px 14px !important;
  font-size: .92rem !important;

  color: rgba(17,24,39,.92) !important;
  border-bottom: 1px solid rgba(255,255,255,.06) !important;
  opacity: 1 !important;

  background: transparent !important;
  vertical-align: middle;
}

.gridjs-tr:nth-child(odd) .gridjs-td{
  background: rgba(255,255,255,1) !important;
}
.gridjs-tr:nth-child(even) .gridjs-td{
  background: rgba(248,250,252,1) !important; /* slate-50 */
}
.gridjs-tr:hover .gridjs-td{
  background: rgba(99,102,241,.08) !important;
}

/* Footer premium */
.gridjs-footer{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: .75rem;
  flex-wrap: wrap;

  padding: 14px 18px;
  border-top: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.02) !important;
}

/* Summary */
.gridjs-summary{
  color: rgba(180,188,204,.9) !important;
  font-size: .9rem;
}

/* Pagination buttons premium */
.gridjs-pagination{
  display:flex !important;
  align-items:center;
  gap: .45rem;
  flex-wrap: wrap;
}
.gridjs-pagination .gridjs-pages button{
  height: 36px !important;
  min-width: 36px !important;
  padding: 0 10px !important;
  border-radius: 12px !important;

  background: rgba(255,255,255,.04) !important;
  border: 1px solid rgba(255,255,255,.10) !important;
  color: rgba(241,245,249,.9) !important;

  transition: transform .12s ease, background .15s ease, border-color .15s ease;
}
.gridjs-pagination .gridjs-pages button:hover{
  background: rgba(255,255,255,.07) !important;
  transform: translateY(-1px);
}
.gridjs-pagination .gridjs-pages button.gridjs-currentPage{
  background: rgba(99,102,241,.22) !important;
  border-color: rgba(99,102,241,.35) !important;
  color: rgba(245,245,245,.96) !important;
}

/* Scrollbar (solo webkit) */
.gridjs-wrapper::-webkit-scrollbar{ height: 10px; }
.gridjs-wrapper::-webkit-scrollbar-thumb{
  background: rgba(255,255,255,.12);
  border-radius: 999px;
}
.gridjs-wrapper::-webkit-scrollbar-track{
  background: rgba(255,255,255,.04);
}

/* --- ACCIONES STICKY a la derecha --- */
.gridjs-thead th:last-child{
  position: sticky;
  right: 0;
  z-index: 15;

  background: linear-gradient(180deg, rgba(15,18,26,.96), rgba(15,18,26,.82)) !important;
  border-left: 1px solid rgba(255,255,255,.10) !important;
}
.gridjs-tr .gridjs-td:last-child{
  position: sticky;
  right: 0;
  z-index: 5;

  background: rgba(248,250,252,1) !important;
  border-left: 1px solid rgba(0,0,0,.08) !important;
}

/* Contenedor para tus botones de acción */
.grid-actions{
  display:flex;
  justify-content:center;
  gap: .5rem;
}

/* Botones acción (compactos, premium) */
.grid-actions .btn{
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.14);
  color: rgba(245,245,245,.92);
}
.grid-actions .btn:hover{
  background: rgba(255,255,255,.075);
  transform: translateY(-1px);
}
.grid-actions .btn.primary{
  background: rgba(99,102,241,.20);
  border-color: rgba(99,102,241,.35);
}
.grid-actions .btn.primary:hover{
  background: rgba(99,102,241,.28);
}
.grid-actions .btn.danger{
  background: rgba(239,68,68,.14);
  border-color: rgba(239,68,68,.25);
  color: rgba(254,202,202,.95);
}
.grid-actions .btn.danger:hover{
  background: rgba(239,68,68,.22);
}

/* Responsive */
@media (max-width: 640px){
  .gridjs-head{ padding: 14px 14px; }
  .gridjs-footer{ padding: 12px 14px; }
  .gridjs-search{ max-width: 100%; }
}

.gridjs-head [slot="grid-actions"]{
  margin-left: auto;
  display: flex;
  align-items: center;
}

grid-table > slot[name="grid-actions"]{
  display:none;
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
