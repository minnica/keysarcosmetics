import { whatsappPhoneNumber } from "@/lib/contact";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";

export const metadata = pageMetadata(
  "/terminos-de-servicio",
  "Términos de servicio | Keysar Cosmetics",
  "Conoce cómo se solicita y confirma una cita en Keysar Cosmetics y cómo se aplica el beneficio KEYSAR15.",
);

export default function TermsPage() {
  return (
    <>
      <h1>Términos de servicio</h1>
      <p>
        Este sitio de Keysar Cosmetics, operado por Liron Keysar, permite consultar tratamientos y
        ubicaciones en Ciudad de México y ponerse en contacto con el equipo para solicitar una cita.
      </p>
      <h2>Solicitud y confirmación de cita</h2>
      <p>
        Elige el tratamiento, la sucursal, la fecha y el horario de tu preferencia. Al pulsar
        «Enviar solicitud» se abre un mensaje en WhatsApp. Revísalo y envíalo desde el chat para que
        el equipo pueda atenderte. También puedes llamar al{" "}
        <a href={`tel:+${whatsappPhoneNumber}`}>55 8056 1135</a>.
      </p>
      <p>
        La cita queda confirmada cuando la asesora te comunica la disponibilidad y acuerda contigo
        los detalles. Puedes consultar el precio, la duración y las condiciones del servicio antes
        de aceptar. El formulario de la landing no procesa pagos.
      </p>
      <h2>Tratamientos y promociones</h2>
      <p>
        Las descripciones ayudan a elegir un tratamiento. La asesora confirmará los servicios
        disponibles en la sucursal y, cuando corresponda, la valoración previa y la duración de la
        sesión.
      </p>
      <p>
        Cuando el sitio te ofrezca KEYSAR15 y lo selecciones, la solicitud incluirá un 15 % de
        cortesía en el tratamiento de menor valor al agregar un segundo tratamiento a la visita. El
        beneficio está sujeto a disponibilidad y se aplica por separado de otras promociones. La
        asesora te confirmará su aplicación.
      </p>
      <h2>Cambios y consultas</h2>
      <p>
        Para cambiar una preferencia o consultar una cita confirmada, responde en la conversación
        con el equipo o llama al número de citas. Ten a la mano la sucursal y la fecha acordadas.
      </p>
      <p>
        Puedes consultar cómo se tratan tus datos en el{" "}
        <Link href="/aviso-de-privacidad">aviso de privacidad</Link>.
      </p>
      <p className="text-sm text-keysar-gray">
        Última revisión de los términos el 21 de noviembre de 2026.
      </p>
    </>
  );
}
