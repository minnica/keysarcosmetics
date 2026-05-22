'use client'
// Store global de la aplicación — React Context + localStorage para persistencia
import React, { createContext, useCallback, useContext, useReducer } from 'react'
import {
  INITIAL_SUCURSALES,
  INITIAL_METODOS_PAGO,
  INITIAL_EMPLEADOS,
  INITIAL_REGISTROS,
  type Sucursal,
  type MetodoPago,
  type Empleado,
  type RegistroVenta,
} from './mock-data'

// ─── Estado ──────────────────────────────────────────────────────────────────

interface StoreState {
  sucursales: Sucursal[]
  metodosPago: MetodoPago[]
  empleados: Empleado[]
  registros: RegistroVenta[]
}

// ─── Acciones ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_SUCURSAL'; payload: Sucursal }
  | { type: 'UPDATE_SUCURSAL'; payload: Sucursal }
  | { type: 'DELETE_SUCURSAL'; id: string }
  | { type: 'ADD_METODO_PAGO'; payload: MetodoPago }
  | { type: 'UPDATE_METODO_PAGO'; payload: MetodoPago }
  | { type: 'DELETE_METODO_PAGO'; id: string }
  | { type: 'ADD_EMPLEADO'; payload: Empleado }
  | { type: 'UPDATE_EMPLEADO'; payload: Empleado }
  | { type: 'DELETE_EMPLEADO'; id: string }
  | { type: 'ADD_REGISTRO'; payload: RegistroVenta }
  | { type: 'UPDATE_REGISTRO'; payload: RegistroVenta }
  | { type: 'DELETE_REGISTRO'; id: string }

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: StoreState, action: Action): StoreState {
  let next: StoreState
  switch (action.type) {
    case 'ADD_SUCURSAL':
      next = { ...state, sucursales: [...state.sucursales, action.payload] }; break
    case 'UPDATE_SUCURSAL':
      next = { ...state, sucursales: state.sucursales.map(s => s.id === action.payload.id ? action.payload : s) }; break
    case 'DELETE_SUCURSAL':
      next = { ...state, sucursales: state.sucursales.filter(s => s.id !== action.id) }; break
    case 'ADD_METODO_PAGO':
      next = { ...state, metodosPago: [...state.metodosPago, action.payload] }; break
    case 'UPDATE_METODO_PAGO':
      next = { ...state, metodosPago: state.metodosPago.map(m => m.id === action.payload.id ? action.payload : m) }; break
    case 'DELETE_METODO_PAGO':
      next = { ...state, metodosPago: state.metodosPago.filter(m => m.id !== action.id) }; break
    case 'ADD_EMPLEADO':
      next = { ...state, empleados: [...state.empleados, action.payload] }; break
    case 'UPDATE_EMPLEADO':
      next = { ...state, empleados: state.empleados.map(e => e.id === action.payload.id ? action.payload : e) }; break
    case 'DELETE_EMPLEADO':
      next = { ...state, empleados: state.empleados.filter(e => e.id !== action.id) }; break
    case 'ADD_REGISTRO':
      next = { ...state, registros: [...state.registros, action.payload] }; break
    case 'UPDATE_REGISTRO':
      next = { ...state, registros: state.registros.map(r => r.id === action.payload.id ? action.payload : r) }; break
    case 'DELETE_REGISTRO':
      next = { ...state, registros: state.registros.filter(r => r.id !== action.id) }; break
    default:
      return state
  }
  // Persistir en localStorage (sin los datos mock iniciales — solo los cambios del usuario)
  try {
    localStorage.setItem('envelope-store', JSON.stringify(next))
  } catch { /* ignorar errores de storage */ }
  return next
}

// ─── Inicialización desde localStorage ───────────────────────────────────────

function getInitialState(): StoreState {
  if (typeof window === 'undefined') {
    return { sucursales: INITIAL_SUCURSALES, metodosPago: INITIAL_METODOS_PAGO, empleados: INITIAL_EMPLEADOS, registros: INITIAL_REGISTROS }
  }
  try {
    const saved = localStorage.getItem('envelope-store')
    if (saved) return JSON.parse(saved) as StoreState
  } catch { /* ignorar errores de parseo */ }
  return { sucursales: INITIAL_SUCURSALES, metodosPago: INITIAL_METODOS_PAGO, empleados: INITIAL_EMPLEADOS, registros: INITIAL_REGISTROS }
}

// ─── Contexto ────────────────────────────────────────────────────────────────

interface StoreContextValue {
  state: StoreState
  dispatch: React.Dispatch<Action>
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}

// ─── Hooks helpers ────────────────────────────────────────────────────────────

export function useSucursales() {
  const { state, dispatch } = useStore()
  const add = useCallback((s: Sucursal) => dispatch({ type: 'ADD_SUCURSAL', payload: s }), [dispatch])
  const update = useCallback((s: Sucursal) => dispatch({ type: 'UPDATE_SUCURSAL', payload: s }), [dispatch])
  const remove = useCallback((id: string) => dispatch({ type: 'DELETE_SUCURSAL', id }), [dispatch])
  return { sucursales: state.sucursales, add, update, remove }
}

export function useMetodosPago() {
  const { state, dispatch } = useStore()
  const add = useCallback((m: MetodoPago) => dispatch({ type: 'ADD_METODO_PAGO', payload: m }), [dispatch])
  const update = useCallback((m: MetodoPago) => dispatch({ type: 'UPDATE_METODO_PAGO', payload: m }), [dispatch])
  const remove = useCallback((id: string) => dispatch({ type: 'DELETE_METODO_PAGO', id }), [dispatch])
  return { metodosPago: state.metodosPago, add, update, remove }
}

export function useEmpleados() {
  const { state, dispatch } = useStore()
  const add = useCallback((e: Empleado) => dispatch({ type: 'ADD_EMPLEADO', payload: e }), [dispatch])
  const update = useCallback((e: Empleado) => dispatch({ type: 'UPDATE_EMPLEADO', payload: e }), [dispatch])
  const remove = useCallback((id: string) => dispatch({ type: 'DELETE_EMPLEADO', id }), [dispatch])
  return { empleados: state.empleados, add, update, remove }
}

export function useRegistros() {
  const { state, dispatch } = useStore()
  const add = useCallback((r: RegistroVenta) => dispatch({ type: 'ADD_REGISTRO', payload: r }), [dispatch])
  const update = useCallback((r: RegistroVenta) => dispatch({ type: 'UPDATE_REGISTRO', payload: r }), [dispatch])
  const remove = useCallback((id: string) => dispatch({ type: 'DELETE_REGISTRO', id }), [dispatch])
  return { registros: state.registros, add, update, remove }
}
