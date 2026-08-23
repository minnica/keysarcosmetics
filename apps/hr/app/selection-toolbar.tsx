"use client";

export default function SelectionToolbar({ ids, selected, onChange, onDelete, label = "registros" }: { ids: number[]; selected: number[]; onChange: (ids: number[]) => void; onDelete: () => void; label?: string }) {
  const allSelected = ids.length > 0 && ids.every(id => selected.includes(id));
  return <div className="selection-toolbar">
    <label><input type="checkbox" checked={allSelected} onChange={() => onChange(allSelected ? [] : ids)}/><span>{allSelected ? "Quitar selección" : "Seleccionar todos"}</span></label>
    <b>{selected.length} {label} seleccionados</b>
    <button disabled={!selected.length} onClick={onDelete}>BORRAR SELECCIONADOS</button>
  </div>;
}
