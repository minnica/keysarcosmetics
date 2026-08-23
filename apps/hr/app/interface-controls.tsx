"use client";

import { useEffect, useRef, useState } from "react";
import { interfaceLanguages, uiText, type InterfaceLocale } from "./interface-locales";

export type Branding = { brandName: string; brandSubtitle: string; logoName: string | null; logoUrl: string | null };

export default function InterfaceControls({ master, branding, locale, onLocale, onBrandSaved, brandEditorSignal = 0, onBrandEditorHandled }: { master: boolean; branding: Branding; locale: InterfaceLocale; onLocale: (locale: InterfaceLocale) => void; onBrandSaved: (branding: Branding) => void; brandEditorSignal?: number; onBrandEditorHandled?: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const brandEditorRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [brandName, setBrandName] = useState(branding.brandName);
  const [brandSubtitle, setBrandSubtitle] = useState(branding.brandSubtitle);
  const [logo, setLogo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const copy = uiText[locale];

  useEffect(() => {
    const savedTheme = localStorage.getItem("keysar-theme") === "dark" ? "dark" : "light";
    const savedLocale = localStorage.getItem("keysar-locale") as InterfaceLocale | null;
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
    if (savedLocale && interfaceLanguages.some(language => language.code === savedLocale)) onLocale(savedLocale);
  }, [onLocale]);

  useEffect(() => { setBrandName(branding.brandName); setBrandSubtitle(branding.brandSubtitle); }, [branding]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) { if (open && rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => {
    if (!brandEditorSignal || !master) return;
    setOpen(true);
    onBrandEditorHandled?.();
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        brandEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      ),
    );
  }, [brandEditorSignal, master, onBrandEditorHandled]);

  function chooseTheme(next: "light" | "dark") {
    setTheme(next);
    localStorage.setItem("keysar-theme", next);
    document.documentElement.dataset.theme = next;
  }

  function chooseLocale(next: InterfaceLocale) {
    localStorage.setItem("keysar-locale", next);
    document.documentElement.lang = next;
    onLocale(next);
  }

  async function saveBranding() {
    setSaving(true); setMessage("");
    const form = new FormData();
    form.set("action", "branding_update"); form.set("brandName", brandName); form.set("brandSubtitle", brandSubtitle);
    if (logo) form.set("logo", logo);
    try {
      const response = await fetch("/api/app", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible guardar la identidad.");
      onBrandSaved(data.branding); setLogo(null); setMessage("Identidad actualizada correctamente."); setOpen(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible guardar la identidad."); }
    finally { setSaving(false); }
  }

  return <div className="interface-controls" ref={rootRef}>
    <button className="preferences-button" onClick={() => setOpen(!open)} aria-expanded={open}>Aa · ◐ <span>{copy.settings}</span></button>
    {open && <aside className="preferences-panel">
      <header><div><small>KEYSAR EXPERIENCE</small><h2>{copy.settings}</h2></div><button onClick={() => setOpen(false)} aria-label={copy.close}>×</button></header>
      <section><h3>{copy.language}</h3><div className="language-options">{interfaceLanguages.map(language => <button className={locale === language.code ? "active" : ""} onClick={() => chooseLocale(language.code)} key={language.code}><b>{language.short}</b><span>{language.name}</span></button>)}</div></section>
      <section><h3>{copy.appearance}</h3><div className="theme-options"><button className={theme === "light" ? "active" : ""} onClick={() => chooseTheme("light")}><i>☀</i>{copy.light}</button><button className={theme === "dark" ? "active" : ""} onClick={() => chooseTheme("dark")}><i>☾</i>{copy.dark}</button></div></section>
      {master && <section className="brand-editor" ref={brandEditorRef}><h3>{copy.editBrand}</h3><label>{copy.primaryName}<input value={brandName} maxLength={60} onChange={event => setBrandName(event.target.value)}/></label><label>{copy.secondaryName}<input value={brandSubtitle} maxLength={100} onChange={event => setBrandSubtitle(event.target.value)}/></label><label className="logo-upload">{copy.logo}<input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={event => setLogo(event.target.files?.[0] || null)}/><span>{logo?.name || branding.logoName || "Seleccionar archivo"}</span></label><button className="save-brand" disabled={saving || !brandName.trim() || !brandSubtitle.trim()} onClick={saveBranding}>{saving ? copy.saving : copy.saveBrand}</button>{message && <p>{message}</p>}</section>}
    </aside>}
  </div>;
}
