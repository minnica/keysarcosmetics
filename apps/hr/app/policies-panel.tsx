"use client";

import { useState } from "react";
import SelectionToolbar from "./selection-toolbar";

export type PolicyDocument = { id: number; title: string; category: string; fileName: string; contentType: string; createdAt: string };

export default function PoliciesPanel({ documents, master, onSaved }: { documents: PolicyDocument[]; master: boolean; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(""), [category, setCategory] = useState("Reglamento"), [file, setFile] = useState<File | null>(null), [selected, setSelected] = useState<number[]>([]), [message, setMessage] = useState(""), [saving, setSaving] = useState(false);
  async function upload() {
    if (!title.trim() || !file) return setMessage("Captura el título y selecciona un archivo.");
    setSaving(true); setMessage("");
    const form = new FormData(); form.set("action", "policy_document_upload"); form.set("title", title); form.set("category", category); form.set("document", file);
    const response = await fetch("/api/app", { method: "POST", body: form }), data = await response.json();
    if (!response.ok) setMessage(data.error || "No fue posible cargar el documento.");
    else { setTitle(""); setFile(null); setMessage("Documento disponible para todo el personal."); await onSaved(); }
    setSaving(false);
  }
  async function removeMany() {
    if (!selected.length || !window.confirm(`¿Borrar ${selected.length} documentos seleccionados?`)) return;
    const response = await fetch("/api/app", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "bulk_delete", entity: "documents", ids: selected }) });
    if (response.ok) { setSelected([]); await onSaved(); }
  }
  return <section className="policies-area">
    <div className="policies-head"><div><p className="eyebrow">CENTRO DE DOCUMENTOS</p><h2>Políticas y reglamentos</h2><span>Información operativa disponible para consulta de todo el personal.</span></div><b>{documents.length} DOCUMENTOS</b></div>
    {master && <div className="policy-upload"><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Nombre del documento"/><select value={category} onChange={event => setCategory(event.target.value)}><option>Reglamento</option><option>Política</option><option>Organigrama</option><option>Manual</option><option>Formato</option><option>Otro</option></select><label><input type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" onChange={event => setFile(event.target.files?.[0] || null)}/><span>{file?.name || "Seleccionar PDF, Word, Excel o imagen"}</span></label><button disabled={saving} onClick={upload}>{saving ? "CARGANDO…" : "PUBLICAR DOCUMENTO"}</button></div>}
    {message && <p className="policy-message">{message}</p>}
    {master && <SelectionToolbar ids={documents.map(document => document.id)} selected={selected} onChange={setSelected} onDelete={removeMany} label="documentos"/>}
    <div className="policy-grid">{documents.map(document => <article key={document.id}>{master && <input type="checkbox" checked={selected.includes(document.id)} onChange={() => setSelected(current => current.includes(document.id) ? current.filter(id => id !== document.id) : [...current, document.id])}/>}<span>{document.category.slice(0,1)}</span><div><small>{document.category.toUpperCase()}</small><h3>{document.title}</h3><p>{document.fileName} · {new Date(document.createdAt).toLocaleDateString("es-MX")}</p></div><a href={`/api/app?document=${document.id}`} target="_blank" rel="noreferrer">ABRIR</a></article>)}{!documents.length && <div className="policy-empty"><b>Sin documentos publicados</b><span>Los reglamentos, organigramas y manuales aparecerán aquí.</span></div>}</div>
  </section>;
}
