import { pageMetadata } from "@/lib/site";
import { privacyContact } from "@/lib/contact";
import Link from "next/link";

export const metadata = pageMetadata(
  "/aviso-de-privacidad",
  "Aviso de privacidad | Keysar Cosmetics",
  "Consulta cómo se usan tus datos al solicitar una cita y los medios para ejercer tus derechos de privacidad.",
);

export default function PrivacyPage() {
  return (
    <>
      <h1>Aviso de privacidad</h1>
      <p>
        {privacyContact.name} es responsable de los datos personales que recibe a través del sitio
        de Keysar Cosmetics para atender solicitudes de cita. Su domicilio es{" "}
        {privacyContact.address}. El teléfono de atención para asuntos de privacidad es el{" "}
        <a href={privacyContact.phoneHref}>{privacyContact.phone}</a>.
      </p>
      <h2>Datos y finalidad</h2>
      <p>
        Para atender tu solicitud usamos tu nombre, el teléfono o correo que proporciones, el canal
        de contacto elegido, el tratamiento, la sucursal, la fecha y la hora que prefieres. También
        recibimos el comentario opcional y el beneficio promocional que decidas incluir. Estos datos
        permiten responderte, consultar disponibilidad y confirmar o gestionar tu cita.
      </p>
      <p>
        El campo de comentarios es para indicaciones sobre tu cita. Evita incluir diagnósticos,
        expedientes médicos, identificaciones o datos bancarios. El formulario no solicita datos
        sensibles ni inscribe tu contacto en campañas publicitarias.
      </p>
      <h2>Cómo llega tu solicitud</h2>
      <p>
        Al pulsar «Enviar solicitud», tu navegador abre WhatsApp con un enlace que contiene los
        datos que escribiste. WhatsApp recibe ese texto para preparar el mensaje. Puedes revisarlo,
        editarlo o salir del chat. Keysar recibe el mensaje cuando pulsas «Enviar» en WhatsApp.
      </p>
      <p>
        WhatsApp trata los datos de acuerdo con su propia política. También puedes llamar a la línea
        de citas que aparece en la portada para solicitar atención.{" "}
        <a href="https://www.whatsapp.com/legal/privacy-policy">
          Política de privacidad de WhatsApp
        </a>
        .
      </p>
      <h2>Uso y conservación</h2>
      <p>
        El equipo que atiende la solicitud utiliza los datos para dar seguimiento por el canal
        elegido. Su conservación se limita al tiempo necesario para atender la cita y cumplir las
        obligaciones legales aplicables. Si deseas limitar su uso o divulgación, llama al número de
        privacidad o presenta una solicitud en el domicilio indicado.
      </p>
      <h2>Cómo ejercer tus derechos</h2>
      <p>
        Puedes solicitar acceso a tus datos, la rectificación de errores, su cancelación o la
        oposición a un uso determinado. También puedes solicitar la revocación de tu consentimiento.
        Para iniciar el trámite, llama al{" "}
        <a href={privacyContact.phoneHref}>{privacyContact.phone}</a> o entrega tu solicitud por
        escrito en el domicilio indicado al inicio de este aviso.
      </p>
      <p>
        Indica tu nombre, un medio para responderte, el derecho que deseas ejercer y los datos a los
        que se refiere tu petición. Te indicaremos cómo acreditar tu identidad o, en su caso, la
        representación. Para una rectificación, señala el cambio y acompaña la documentación que lo
        sustente.
      </p>
      <p>
        Para solicitudes de acceso, rectificación, cancelación u oposición comunicaremos la
        determinación en el plazo legal de hasta veinte días. Si procede, la haremos efectiva dentro
        de los quince días siguientes a la respuesta, con las ampliaciones que permita la ley.
      </p>
      <h2>Almacenamiento en el navegador y cambios al aviso</h2>
      <p>
        Puedes consultar qué guarda la página en tu navegador y cómo eliminarlo en la{" "}
        <Link href="/cookies">configuración de cookies</Link>. Publicaremos en esta misma dirección
        las actualizaciones del aviso con su fecha de revisión.
      </p>
      <p className="text-sm text-keysar-gray">
        Última revisión del aviso el 21 de noviembre de 2026.
      </p>
    </>
  );
}
