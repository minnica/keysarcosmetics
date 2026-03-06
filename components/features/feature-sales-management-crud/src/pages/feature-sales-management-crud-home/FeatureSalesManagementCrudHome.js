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
      <!-- Wrapper SIN fondo claro: deja que se vea tu fondo oscuro global -->
      <div class="min-h-[calc(100vh-64px)] px-4 md:px-6 py-6">
        <!-- Igual que tu GridJS: centrado y con ancho “premium” -->
        <div class="mx-auto w-full max-w-[1220px]">
          <!-- k-panel SOLO como “contenedor” (no como fondo general) -->
          <section
            class="k-panel rounded-[22px] overflow-hidden"
            style="
              border: 1px solid var(--k-border);
              box-shadow: var(--k-shadow);
              background:
                radial-gradient(900px 420px at 18% 0%, rgba(236,209,200,.35), transparent 60%),
                radial-gradient(700px 420px at 82% 20%, rgba(195,165,131,.18), transparent 55%),
                linear-gradient(180deg, rgba(243,240,233,.94), rgba(243,240,233,.78));
              backdrop-filter: blur(10px);
            "
          >
            <!-- Header -->
            <div
              class="px-5 md:px-7 py-5 border-b"
              style="border-color: rgba(96,96,96,.16);"
            >
              <div class="flex items-center justify-between gap-4 flex-wrap">
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="w-11 h-11 rounded-2xl flex items-center justify-center border"
                    style="
                      border-color: rgba(195,165,131,.35);
                      background: rgba(255,255,255,.55);
                      box-shadow: 0 10px 22px rgba(0,0,0,.07);
                    "
                    aria-hidden="true"
                  >
                    📊
                  </div>

                  <div class="min-w-0">
                    <h1 class="text-[rgba(31,35,40,.94)] text-2xl md:text-3xl font-extrabold tracking-tight truncate">
                      Inicio Admin
                    </h1>
                    <p class="text-[rgba(96,96,96,.88)]">
                      Accesos rápidos a formularios y reportes.
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                  ${this._pillBtn('Dashboard', '📈', () => this._go('/reportes/dashboard'))}
                  ${this._pillBtn('Total ventas', '🧾', () => this._go('/reportes/total-general-ventas'))}
                </div>
              </div>
            </div>

            <!-- Body -->
            <div class="px-5 md:px-7 py-6">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <!-- Módulos -->
                <div class="lg:col-span-2">
                  <div
                    class="rounded-2xl border p-5 md:p-6"
                    style="
                      border-color: rgba(96,96,96,.16);
                      background: rgba(243,240,233,.70);
                      box-shadow: 0 14px 28px rgba(0,0,0,.08);
                      backdrop-filter: blur(8px);
                    "
                  >
                    <div class="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p class="text-[rgba(96,96,96,.92)] text-xs font-bold tracking-[.18em] uppercase">
                          Accesos rápidos
                        </p>
                        <h2 class="text-[rgba(31,35,40,.94)] text-lg md:text-xl font-extrabold mt-1">
                          Módulos principales
                        </h2>
                      </div>

                      <span class="text-[rgba(96,96,96,.85)] text-sm">
                        Usa el menú ☰ para navegar
                      </span>
                    </div>

                    <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      ${this._actionCard('Ventas', 'Captura y gestión', '💳', () => this._go('/formularios/ventas'))}
                      ${this._actionCard('Empleados', 'Altas y edición', '👥', () => this._go('/formularios/empleados'))}
                      ${this._actionCard('Sucursales', 'Administración', '🏬', () => this._go('/formularios/sucursales'))}
                      ${this._actionCard('Métodos de pago', 'Catálogo', '💰', () => this._go('/formularios/metodos-pago'))}
                    </div>
                  </div>
                </div>

                <!-- Reportes -->
                <aside
                  class="rounded-2xl border p-5 md:p-6"
                  style="
                    border-color: rgba(96,96,96,.16);
                    background: rgba(243,240,233,.70);
                    box-shadow: 0 14px 28px rgba(0,0,0,.08);
                    backdrop-filter: blur(8px);
                  "
                >
                  <p class="text-[rgba(96,96,96,.92)] text-xs font-bold tracking-[.18em] uppercase">
                    Reportes
                  </p>
                  <h3 class="text-[rgba(31,35,40,.94)] text-lg font-extrabold mt-1">
                    Resumen rápido
                  </h3>

                  <div class="mt-4 space-y-2">
                    ${this._linkRow('Detalle método de pago', () => this._go('/reportes/metodo-pago'))}
                    ${this._linkRow('Método de pago por día', () => this._go('/reportes/metodo-pago-diario'))}
                    ${this._linkRow('Ventas por vendedor', () => this._go('/reportes/ventas-vendedor'))}
                    ${this._linkRow('Vendedor por día', () => this._go('/reportes/ventas-vendedor-diario'))}
                  </div>

                  <div class="mt-5 h-px" style="background: rgba(96,96,96,.12);"></div>

                  <button
                    class="mt-5 w-full h-10 rounded-full font-extrabold text-sm border transition hover:-translate-y-[1px]"
                    style="
                      border-color: rgba(195,165,131,.55);
                      background: rgba(195,165,131,.22);
                      color: rgba(31,35,40,.92);
                      box-shadow: 0 10px 22px rgba(0,0,0,.08);
                    "
                    @click=${() => this._go('/reportes/dashboard')}
                  >
                    Ver Dashboard
                  </button>
                </aside>
              </div>

              <!-- Atajos inferiores -->
              <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                ${this._miniCard('Reporte total', 'Totales por rango de fechas', '🧮', () =>
                  this._go('/reportes/total-general-ventas')
                )}
                ${this._miniCard('Ventas por vendedor', 'Comparar desempeño', '🏆', () =>
                  this._go('/reportes/ventas-vendedor')
                )}
                ${this._miniCard('Pago diario', 'Cortes por método', '📅', () =>
                  this._go('/reportes/metodo-pago-diario')
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  _pillBtn(label, icon, onClick) {
    return html`
      <button
        class="h-10 px-4 rounded-full font-extrabold text-sm border transition
               hover:-translate-y-[1px] hover:brightness-[1.03]"
        style="
          border-color: rgba(195,165,131,.55);
          background: linear-gradient(180deg, rgba(243,240,233,.98), rgba(236,209,200,.85));
          color: rgba(31,35,40,.92);
          box-shadow: 0 10px 22px rgba(0,0,0,.10);
        "
        @click=${onClick}
      >
        <span class="inline-flex items-center gap-2">
          <span aria-hidden="true">${icon}</span>
          ${label}
        </span>
      </button>
    `;
  }

  _actionCard(title, desc, icon, onClick) {
    return html`
      <button
        class="text-left rounded-2xl p-4 md:p-5 border transition hover:-translate-y-[1px]"
        style="
          border-color: rgba(195,165,131,.30);
          background: rgba(255,255,255,.55);
          box-shadow: 0 10px 22px rgba(0,0,0,.06);
        "
        @click=${onClick}
      >
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 rounded-2xl flex items-center justify-center border"
            style="
              border-color: rgba(195,165,131,.35);
              background: rgba(243,240,233,.85);
            "
            aria-hidden="true"
          >
            ${icon}
          </div>

          <div class="min-w-0">
            <div class="font-extrabold text-[rgba(31,35,40,.94)]">${title}</div>
            <div class="text-[rgba(96,96,96,.88)] text-sm mt-1">${desc}</div>

            <div class="mt-3 inline-flex items-center gap-2 text-sm font-bold" style="color: rgba(31,35,40,.88);">
              Abrir <span aria-hidden="true">→</span>
            </div>
          </div>
        </div>
      </button>
    `;
  }

  // ✅ ARREGLADO: antes tu firma no coincidía y se imprimía la función
  _linkRow(label, onClick) {
    return html`
      <button
        class="w-full text-left px-3 py-2 rounded-xl border transition hover:-translate-y-[1px]"
        style="
          border-color: rgba(195,165,131,.22);
          background: rgba(255,255,255,.55);
          color: rgba(31,35,40,.92);
        "
        @click=${onClick}
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-bold">${label}</span>
          <span class="text-sm" aria-hidden="true">→</span>
        </div>
      </button>
    `;
  }

  _miniCard(title, desc, icon, onClick) {
    return html`
      <div
        class="rounded-2xl border p-5"
        style="
          border-color: rgba(96,96,96,.16);
          background: rgba(243,240,233,.70);
          box-shadow: 0 14px 28px rgba(0,0,0,.08);
          backdrop-filter: blur(8px);
        "
      >
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 rounded-2xl flex items-center justify-center border"
            style="
              border-color: rgba(195,165,131,.35);
              background: rgba(255,255,255,.55);
            "
            aria-hidden="true"
          >
            ${icon}
          </div>

          <div class="min-w-0">
            <div class="font-extrabold text-[rgba(31,35,40,.94)]">${title}</div>
            <div class="text-[rgba(96,96,96,.88)] text-sm mt-1">${desc}</div>
          </div>
        </div>

        <button
          class="mt-4 h-10 px-4 rounded-full font-extrabold text-sm border transition hover:-translate-y-[1px]"
          style="
            border-color: rgba(195,165,131,.55);
            background: rgba(255,255,255,.55);
            color: rgba(31,35,40,.92);
          "
          @click=${onClick}
        >
          Abrir
        </button>
      </div>
    `;
  }
}

customElements.define('feature-sales-management-crud-home', FeatureSalesManagementCrudHome);