import type { Metadata } from 'next'
import { LegalDocument } from '@/components/legal-document'
import { CookieChoiceReset } from '@/components/cookie-choice'

export const metadata: Metadata = {
  title: "Política de cookies y almacenamiento local — Hilo",
  description: 'Borrador de la política de Hilo con datos pendientes de completar.',
  robots: { index: false, follow: true },
}

export default function CookiesPage() {
  return (
    <LegalDocument title="Política de cookies y almacenamiento local">
      <h2>{"Quién ofrece el sitio"}</h2>
      <p>{"Hilo es la marca comercial de "}<span className="pending">{"Pendiente: nombre completo o razón social"}</span>{", CUIT "}<span className="pending">{"Pendiente: cuit"}</span>{", con domicilio en "}<span className="pending">{"Pendiente: domicilio completo"}</span>{". Esta política se aplica a "}<span className="pending">{"Pendiente: dominio definitivo"}</span>{". Para consultas, escribinos a "}<span className="pending">{"Pendiente: correo de privacidad"}</span>{"."}</p>
      <h2>{"Qué son las cookies y el almacenamiento local"}</h2>
      <p>{"Las cookies son pequeños registros que el navegador conserva y puede enviar junto con las solicitudes al sitio correspondiente. El almacenamiento local, también llamado localStorage, permite guardar información en el navegador que la aplicación puede leer más adelante; no se envía automáticamente con cada solicitud HTTP."}</p>
      <p>{"Hilo utiliza almacenamiento local para conservar el carrito y acompañar el regreso desde el pago. Esta política incluye ambas tecnologías para que sepas qué se guarda en tu dispositivo y cómo eliminarlo."}</p>
      <h2>{"Qué guarda Hilo en tu navegador"}</h2>
      <p>Como visitante, el carrito queda en este navegador. Al iniciar sesión se combina con el de tu cuenta y se sincroniza con el servidor. Si una prenda y talle están en ambos, conservamos la mayor cantidad. Al cerrar sesión volvés al carrito de visitante.</p>
      <div className="my-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Detalle del almacenamiento local">
        <table>
          <thead><tr><th scope="col">{"Nombre"}</th><th scope="col">{"Tecnología y origen"}</th><th scope="col">{"Finalidad y contenido"}</th><th scope="col">{"Duración"}</th></tr></thead>
          <tbody>
            <tr><td><code>{"clothes-shop-cart"}</code></td><td>{"Almacenamiento local del sitio de Hilo"}</td><td>{"Conserva las prendas agregadas al carrito, con sus referencias, datos de presentación, precios, talles y cantidades. Permite recuperar el carrito y reflejar cambios entre pestañas del mismo origen."}</td><td>{"No tiene una caducidad temporal programada. Se actualiza al modificar el carrito. Al vaciarlo queda una lista vacía; desaparece al borrar los datos del sitio, o cuando el navegador elimina ese almacenamiento."}</td></tr>
            <tr><td><code>{"clothes-shop-pending-order"}</code></td><td>{"Almacenamiento local del sitio de Hilo"}</td><td>{"Guarda la referencia del pedido, las prendas, talles y cantidades enviados, la cuenta de origen si corresponde y la ruta privada al recibo. Permite ajustar el carrito original al regresar de una operación confirmada."}</td><td>{"Se elimina cuando se procesa el regreso a un recibo cuyo pedido está confirmado. Si eso no ocurre, puede permanecer sin vencimiento temporal hasta ser reemplazado por otro pedido o eliminado desde el navegador."}</td></tr>
          </tbody>
        </table>
      </div>
      <p>{"Estos registros cumplen funciones de carrito y pedido. No se utilizan en el código revisado para crear perfiles publicitarios. El registro del pedido pendiente no contiene directamente el nombre, correo o domicilio, pero "}<strong>{"incluye un enlace que permite consultar el recibo"}</strong>{". Por eso, no debe considerarse información anónima."}</p>
      <p>{"Cerrar una pestaña o reiniciar el equipo no necesariamente elimina el almacenamiento local. En navegación privada su duración depende del navegador y suele limitarse a la sesión privada."}</p>
      <h2>Tu elección en el aviso</h2>
      <p>Al pulsar «Aceptar cookies» guardamos en este navegador la clave <code>clothes-shop-cookie-acceptance</code>, con la versión del aviso y la fecha de aceptación. La elección se considera vigente durante 180 días; después volvemos a mostrar el aviso. El registro permanece hasta que se reemplaza, se restablece la elección o se borran los datos del sitio. No incluye datos de contacto ni habilita analítica o publicidad.</p>
      <p>Cerrar el cartel sólo lo oculta durante la navegación actual y no registra aceptación. Las tecnologías de carrito y sesión cumplen las funciones solicitadas cuando usás esas opciones de la tienda. Podés restablecer la elección aquí; hacerlo no borra tu carrito ni cierra tu sesión.</p>
      <CookieChoiceReset />
      <h2>Sesión y caché de la cuenta</h2>
      <p>Supabase Auth utiliza cookies de sesión con nombres de la forma <code>sb-&lt;referencia&gt;-auth-token</code>, que pueden dividirse en partes numeradas. Mantienen el acceso a tu cuenta y se renuevan con la sesión. Configuramos su duración en siete días; cerrar sesión las elimina, y la validez del acceso también depende de los tokens y de las reglas del servicio de autenticación.</p>
      <p>Durante la confirmación del registro puede existir una cookie temporal cuyo nombre termina en <code>-code-verifier</code>. Sirve para completar el acceso desde el enlace de confirmación y se elimina al completar ese intercambio o al vencer.</p>
      <p>Las claves de almacenamiento local <code>clothes-shop-account-cart:&lt;usuario&gt;</code> guardan la caché de cada cuenta. Las claves <code>clothes-shop-cart-op:&lt;usuario&gt;:&lt;operación&gt;</code> conservan cambios aún pendientes de sincronizar. No contienen precios autorizados para cobrar: el servidor vuelve a comprobar los importes.</p>
      <p>Las operaciones locales se eliminan tras confirmarse la sincronización. La caché no tiene vencimiento automático y puede permanecer después de cerrar sesión, aunque la web deja de mostrarla. Podés borrar ambas desde los datos del sitio de tu navegador; si borrás operaciones sin sincronizar, esos cambios pueden perderse. Usamos estas tecnologías para el acceso y el carrito de la cuenta.</p>
      <h2>{"Cookies de analítica y publicidad"}</h2>
      <p>{"La versión de la tienda revisada no incorpora herramientas activas de analítica o publicidad."}</p>
      <p><span className="pending">{"Pendiente: confirmar el inventario de cookies y almacenamiento del sitio publicado, incluidos los servicios de seguridad del alojamiento."}</span></p>
      <p>{"Si incorporamos herramientas opcionales que requieran consentimiento, explicaremos sus finalidades, proveedores y duración y ofreceremos los controles correspondientes antes de activarlas. Continuar navegando no se tratará como una aceptación general de esas finalidades."}</p>
      <h2>{"Qué sucede al ir a Mercado Pago"}</h2>
      <p>{"Al elegir pagar, el navegador se dirige al entorno de Mercado Pago. Ese servicio puede utilizar sus propias cookies y tecnologías para gestionar el acceso, procesar la operación y proteger sus servicios. Sus avisos y controles se consultan en el entorno de pago."}</p>
      <p>{"Las cookies de ese otro dominio no se gestionan con el carrito de Hilo. Tampoco deben confundirse con el registro local que nuestra tienda conserva para reconocer el pedido al regresar."}</p>
      <h2>{"Cómo controlar o eliminar estos registros"}</h2>
      <p>{"Desde la configuración de privacidad del navegador podés consultar los datos guardados para el dominio de Hilo y eliminarlos. Según el navegador, la opción puede llamarse datos de sitios, almacenamiento o cookies y otros datos de sitios. Para borrar localStorage, asegurate de que la limpieza incluya los datos del sitio y no solamente las cookies."}</p>
      <p>{"Si eliminás esos datos, podés perder el carrito guardado y la referencia local del pedido pendiente. La eliminación no cancela un pedido, no revierte un pago y no elimina la información registrada en los sistemas de la tienda o de Mercado Pago."}</p>
      <p>{"Si el navegador impide guardar el carrito, la aplicación intenta conservarlo en memoria mientras la página permanece abierta y muestra un aviso. Podés perderlo al recargar o cerrar la página. El bloqueo del registro del pedido pendiente puede impedir que el carrito se ajuste automáticamente al volver del pago."}</p>
      <p>{"En un dispositivo compartido, conviene borrar los datos del sitio al finalizar y evitar dejar abierto el recibo privado. Conservar el enlace en otro lugar sigue permitiendo acceder al recibo aunque se elimine el almacenamiento local."}</p>
      <h2>{"Consultas y cambios"}</h2>
      <p>{"Para información sobre los datos de los pedidos, sus destinatarios y tus derechos, consultá la Política de privacidad de Hilo. Podés enviar consultas a "}<span className="pending">{"Pendiente: correo de privacidad"}</span>{"."}</p>
      <p>{"Actualizaremos esta página cuando cambien las tecnologías utilizadas. La fecha de vigencia permitirá identificar la versión aplicable. "}</p>
    </LegalDocument>
  )
}
