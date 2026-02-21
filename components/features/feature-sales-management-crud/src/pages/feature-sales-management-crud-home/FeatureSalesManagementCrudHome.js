import { LitElement, html } from 'lit';

export class FeatureSalesManagementCrudHome extends LitElement {
  createRenderRoot() {
    return this;
  }

  _go(path) {
    this.dispatchEvent(
      new CustomEvent('feature-sales-management-crud-navigate', {
        detail: { path },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <section
        class="p-4 md:p-6"
        style="
          background:
            radial-gradient(900px 420px at 20% 0%, rgba(236,209,200,.60), transparent 60%),
            radial-gradient(700px 420px at 80% 20%, rgba(195,165,131,.25), transparent 55%),
            linear-gradient(180deg, rgba(243,240,233,.95), rgba(243,240,233,.80));
          border-radius: 22px;
        "
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 class="text-[rgba(31,35,40,.92)] text-2xl md:text-3xl font-extrabold tracking-tight">
              Inicio Admin
            </h1>
            <p class="text-[rgba(96,96,96,.90)] mt-1">
              Accesos rápidos a formularios y reportes.
            </p>
          </div>

          <button
            class="h-10 px-4 rounded-full font-extrabold text-sm
                   border border-[rgba(195,165,131,.55)]
                   bg-[linear-gradient(180deg,rgba(243,240,233,.98),rgba(236,209,200,.85))]
                   text-[rgba(31,35,40,.92)]
                   shadow-[0_10px_22px_rgba(0,0,0,.12)]
                   hover:-translate-y-sm hover:brightness-[1.03]
                   transition"
            @click=${() => this._go('/reportes/dashboard')}
          >
            Ver Dashboard
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          ${this._card('Ventas', 'Captura y gestión de ventas', '/formularios/ventas')}
          ${this._card('Empleados', 'Altas, bajas y edición', '/formularios/empleados')}
          ${this._card('Sucursales', 'Administración de sucursales', '/formularios/sucursales')}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          ${this._card('Métodos de pago', 'Catálogo y mantenimiento', '/formularios/metodos-pago')}
          ${this._card('Reporte total', 'Totales por rango de fechas', '/reportes/total-general-ventas')}
        </div>
      </section>
    `;
  }

  _card(title, desc, path) {
    return html`
      <div
        class="rounded-2xl border border-[rgba(96,96,96,.22)]
               bg-[linear-gradient(180deg,rgba(243,240,233,.92),rgba(243,240,233,.78))]
               shadow-[0_18px_45px_rgba(0,0,0,.10)]
               backdrop-blur-sm p-5"
      >
        <p class="text-[rgba(96,96,96,.95)] text-xs font-bold tracking-[.12em] uppercase">
          módulo
        </p>
        <h3 class="text-[rgba(31,35,40,.92)] text-lg font-extrabold mt-1">${title}</h3>
        <p class="text-[rgba(96,96,96,.90)] mt-1">${desc}</p>

        <button
          class="mt-4 h-10 px-4 rounded-full font-extrabold text-sm
                 border border-[rgba(195,165,131,.55)]
                 bg-[rgba(255,255,255,.55)]
                 text-[rgba(31,35,40,.92)]
                 hover:bg-[rgba(255,255,255,.75)]
                 transition"
          @click=${() => this._go(path)}
        >
          Abrir
        </button>
      </div>
    `;
  }
}

customElements.define('feature-sales-management-crud-home', FeatureSalesManagementCrudHome);