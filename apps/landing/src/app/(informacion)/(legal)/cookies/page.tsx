import { pageMetadata } from "@/lib/site";
import Link from "next/link";

export const metadata = pageMetadata(
  "/cookies",
  "Configuración de cookies | Keysar Cosmetics",
  "Consulta qué preferencias guarda la landing en tu navegador y cómo administrar los datos del sitio.",
);

export default function CookiesPage() {
  return (
    <>
      <h1>Configuración de cookies</h1>
      <h2>Qué guarda la landing</h2>
      <p>
        Cuando se muestra el aviso de ayuda de Keysar, la página guarda una marca en el
        almacenamiento de sesión de esa pestaña para evitar repetirlo. La marca contiene únicamente
        el valor que indica que ya se mostró. El formulario mantiene tus preferencias en memoria
        mientras preparas la solicitud.
      </p>
      <p>
        La landing no instala cookies publicitarias ni de analítica. Al abrir WhatsApp, Instagram o
        Google Maps, pasas al servicio correspondiente, que administra sus propias tecnologías y
        preferencias.
      </p>
      <h2>Cómo administrar los datos del sitio</h2>
      <p>
        Al cerrar la pestaña normalmente termina el almacenamiento de sesión. Para revisar o
        eliminar los datos guardados, abre la configuración de privacidad de tu navegador, busca los
        datos del sitio keysarcosmetics.com y selecciona la opción para borrarlos.
      </p>
      <p>
        Para conocer el uso de tus datos de contacto, consulta el{" "}
        <Link href="/aviso-de-privacidad">aviso de privacidad</Link>.
      </p>
    </>
  );
}
