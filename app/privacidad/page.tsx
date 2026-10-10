import type { Metadata } from 'next'
import { LegalDocument } from '@/components/legal-document'

export const metadata: Metadata = {
  title: "Política de privacidad — Hilo",
  description: 'Borrador de la política de Hilo con datos pendientes de completar.',
  robots: { index: false, follow: true },
}

export default function PrivacyPage() {
  return (
    <LegalDocument title="Política de privacidad">
      <h2>{"Quién es responsable de tus datos"}</h2>
      <p>{"Hilo es la marca comercial de "}<span className="pending">{"Pendiente: nombre completo o razón social"}</span>{", CUIT "}<span className="pending">{"Pendiente: cuit"}</span>{", con domicilio en "}<span className="pending">{"Pendiente: domicilio completo, localidad, provincia y país"}</span>{", responsable de la base de datos de pedidos y de los tratamientos descriptos en esta política."}</p>
      <p>{"Esta política se aplica al sitio "}<span className="pending">{"Pendiente: dominio definitivo"}</span>{". Podés contactarnos por cuestiones de privacidad y ejercicio de derechos en "}<span className="pending">{"Pendiente: correo de privacidad"}</span>{"."}</p>
      <h2>{"Qué información usamos"}</h2>
      <p>La cuenta es opcional. Si te registrás, Supabase Auth gestiona tu correo y contraseña para identificarte y mantener la sesión. Asociamos tu identificador de usuario al carrito guardado y a los pedidos nuevos que realizás con la sesión iniciada.</p>
      <p>{"Podés recorrer el catálogo sin crear una cuenta. Para registrar un pedido, el formulario solicita nombre completo, correo electrónico, calle y número, provincia y código postal. También registramos las prendas elegidas, talles, cantidades, precios, costo de envío, importe total, referencia y fecha del pedido."}</p>
      <p>{"Cuando iniciás un pago, tratamos las referencias de la operación y los estados que informa Mercado Pago, por ejemplo, pendiente, aprobado, rechazado o reembolsado. También podemos registrar si se envió el correo de confirmación."}</p>
      <p>{"La infraestructura que permite mostrar la tienda y atender sus solicitudes puede tratar datos técnicos, como dirección IP, fecha y hora de conexión, recurso solicitado y errores de funcionamiento. El alcance y la conservación de esos registros dependen de la configuración de los servicios utilizados."}</p>
      <p>{"El navegador guarda información del carrito y, cuando corresponde, una referencia al pedido pendiente con un enlace privado al recibo. Encontrarás el detalle en nuestra Política de cookies y almacenamiento local."}</p>
      <p>{"El formulario de Hilo no solicita contraseñas bancarias, números completos de tarjeta ni códigos de seguridad. Esos datos se ingresan, cuando sean necesarios, en el entorno de Mercado Pago. Tampoco solicitamos datos sensibles para comprar prendas."}</p>
      <h2>{"Para qué usamos la información"}</h2>
      <p>{"Usamos los datos del pedido para comprobar disponibilidad e importes, registrar la solicitud, gestionar el pago y preparar la entrega. También sirven para identificar la operación ante consultas, cambios, devoluciones o incidencias, y para cumplir las obligaciones legales que correspondan."}</p>
      <p>{"El correo electrónico permite vincular el pedido con el pago y enviar comunicaciones sobre esa operación cuando el servicio de correo esté habilitado. Los datos técnicos se utilizan para prestar el servicio, diagnosticar fallos y proteger su funcionamiento."}</p>
      <p>{"Los datos necesarios para desarrollar o cumplir la relación contractual y las obligaciones legales se tratan con ese fundamento, conforme a la Ley 25.326. Si incorporamos una finalidad que requiera tu consentimiento, te informaremos y lo solicitaremos de forma específica. Navegar por la tienda o leer esta política no equivale a autorizar cualquier uso de tus datos."}</p>
      <p>{"La versión de la tienda descripta aquí no incluye suscripción a un boletín ni campañas de publicidad personalizada. El correo que proporcionás para un pedido no constituye una suscripción a comunicaciones promocionales."}</p>
      <h2>{"Qué datos son necesarios"}</h2>
      <p>{"Los campos obligatorios del formulario son necesarios para tramitar el pedido. Si no los proporcionás, no podremos registrarlo por este canal. Si son incorrectos, pueden impedir la entrega o que recibas comunicaciones relacionadas con la compra."}</p>
      <p>{"Revisá tus datos antes de enviar el formulario. Si detectás un error después, escribinos al correo de privacidad indicando la referencia del pedido. No incluyas datos de tarjetas ni claves de pago."}</p>
      <h2>{"Quiénes pueden recibir información"}</h2>
      <p>{"Para prestar los servicios de la tienda utilizamos los siguientes proveedores, según las funciones que estén habilitadas:"}</p>
      <div className="my-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Proveedor o destinatario y Función y datos involucrados">
        <table>
          <thead><tr><th scope="col">{"Proveedor o destinatario"}</th><th scope="col">{"Función y datos involucrados"}</th></tr></thead>
          <tbody>
            <tr><td>{"Supabase"}</td><td>{"Gestión de cuentas y sesiones, sincronización del carrito y almacenamiento de pedidos, incluidos los datos de contacto y entrega, productos, importes y estados de la operación."}</td></tr>
            <tr><td>{"Vercel"}</td><td>{"Alojamiento y ejecución de la web; tratamiento de solicitudes y de los datos que atraviesan la aplicación, junto con los registros técnicos configurados."}</td></tr>
            <tr><td>{"Mercado Pago"}</td><td>{"Gestión del pago. Le enviamos el correo del comprador, referencia del pedido, productos, talles, cantidades, importes y las direcciones de retorno al recibo. Nos informa referencias y estados de la operación."}</td></tr>
            <tr><td>{"Resend, si el envío de correo está habilitado"}</td><td>{"Entrega del correo de confirmación, que contiene nombre, dirección de correo, detalle e importe del pedido y enlace privado al recibo."}</td></tr>
            <tr><td>{"Operador de entrega "}<span className="pending">{"Pendiente: identificar o confirmar modalidad"}</span></td><td>{"Datos de identificación y domicilio necesarios para entregar el pedido, cuando corresponda."}</td></tr>
            <tr><td>{"Autoridades competentes"}</td><td>{"Información exigida por una obligación legal o un requerimiento válido, dentro de su alcance."}</td></tr>
          </tbody>
        </table>
      </div>
      <p>{"Mercado Pago puede solicitar información adicional en su propio entorno y tratarla para prestar sus servicios de pago, bajo su política de privacidad. Consultá esa política antes de completar la operación."}</p>
      <p>{"Podés consultar los avisos de "}<a href="https://vercel.com/legal/privacy-notice">{"Vercel"}</a>{", "}<a href="https://supabase.com/privacy">{"Supabase"}</a>{" y "}<a href="https://resend.com/legal/privacy-policy">{"Resend"}</a>{". Esos avisos complementan la información sobre los proveedores; no sustituyen la responsabilidad de Hilo por los tratamientos que le corresponden."}</p>
      <h2>{"Dónde se procesan los datos"}</h2>
      <p>{"Los proveedores tecnológicos pueden utilizar infraestructura situada fuera de Argentina. Para esta tienda, los destinos y mecanismos aplicables son: "}<span className="pending">{"Pendiente: completar países o regiones efectivos y garantías de transferencia por proveedor"}</span>{"."}</p>
      <p>{"Antes de efectuar transferencias internacionales deben verificarse los requisitos argentinos aplicables y, cuando corresponda, instrumentarse las garantías necesarias. La publicación de esta política no constituye por sí sola una garantía de transferencia ni acredita la firma de cláusulas contractuales."}</p>
      <h2>{"Durante cuánto tiempo se conservan"}</h2>
      <p>El carrito de una cuenta se guarda en el servidor hasta que se modifica, se vacía o se elimina la cuenta. Una caché local y operaciones pendientes permiten conservar cambios ante fallos de conexión. Cerrar sesión deja de mostrar el carrito de esa cuenta, pero no elimina esa caché del dispositivo ni los pedidos ya registrados.</p>
      <p><span className="pending">Pendiente: definir la conservación de cuentas inactivas y de los registros que permiten evitar operaciones de carrito duplicadas.</span></p>
      <p>{"La conservación depende de la finalidad y del estado de la operación. No todos los registros tienen el mismo plazo:"}</p>
      <div className="my-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Categoría y Plazo o criterio que debe completar el responsable">
        <table>
          <thead><tr><th scope="col">{"Categoría"}</th><th scope="col">{"Plazo o criterio que debe completar el responsable"}</th></tr></thead>
          <tbody>
            <tr><td>{"Pedidos que no llegan a pagarse"}</td><td><span className="pending">{"Pendiente: plazo desde el último intento o cancelación y procedimiento de borrado"}</span>{"."}</td></tr>
            <tr><td>{"Pedidos pagados y documentación de la operación"}</td><td>{"Durante su gestión y durante los plazos legales aplicables a la documentación comercial, fiscal y a las responsabilidades de la operación: "}<span className="pending">{"Pendiente: identificar plazos y su fundamento"}</span>{"."}</td></tr>
            <tr><td>{"Consultas y reclamaciones"}</td><td>{"Hasta su resolución y, si corresponde, durante el plazo necesario para atender responsabilidades: "}<span className="pending">{"Pendiente: concretar plazo"}</span>{"."}</td></tr>
            <tr><td>{"Registros técnicos y de entrega de correo"}</td><td><span className="pending">{"Pendiente: plazos según configuración de cada proveedor"}</span>{"."}</td></tr>
            <tr><td>{"Copias de respaldo"}</td><td><span className="pending">{"Pendiente: ciclo de retención y procedimiento de supresión o expiración"}</span>{"."}</td></tr>
          </tbody>
        </table>
      </div>
      <p>{"Cuando la información deje de ser necesaria y no exista una obligación que justifique conservarla, deberá eliminarse o disociarse de modo que no permita identificar a su titular. Borrar el carrito o los datos del navegador no borra los pedidos ya registrados en la tienda."}</p>
      <h2>{"Cómo se protege el acceso al pedido"}</h2>
      <p>{"La aplicación utiliza enlaces privados firmados para consultar los recibos. Quien tenga ese enlace puede acceder al recibo asociado, por lo que conviene conservarlo de forma privada y evitar compartirlo en redes o equipos de uso público."}</p>
      <p>{"El enlace también puede estar en el correo de confirmación y en el almacenamiento local del navegador. Si creés que otra persona obtuvo acceso, contactanos para que podamos evaluar el caso. Ningún sistema ofrece una garantía absoluta de seguridad."}</p>
      <h2>{"Cómo ejercer tus derechos"}</h2>
      <p>{"Podés solicitar acceso a tus datos y su rectificación, actualización o supresión, cuando corresponda, escribiendo a "}<span className="pending">{"Pendiente: correo de privacidad"}</span>{" o al domicilio del responsable. Indicá qué necesitás y un medio de respuesta. Verificaremos tu identidad de manera proporcionada; no envíes una copia de tu documento de forma preventiva."}</p>
      <p>{"El acceso es gratuito cada seis meses, o antes si acreditás un interés legítimo. La respuesta corresponde dentro de diez días corridos desde el requerimiento fehaciente. La rectificación, actualización o supresión debe atenderse dentro de cinco días hábiles. Si existe una obligación legal de conservación o derechos de terceros que impidan borrar información, debe explicarse el motivo."}</p>
      <p>{"Cuando un tratamiento se base en tu consentimiento, podés retirarlo para el futuro. Esa decisión no elimina las obligaciones de conservación que resulten aplicables."}</p>
      <p>{"La Agencia de Acceso a la Información Pública recibe denuncias y reclamos relacionados con la protección de datos personales. Podés consultar "}<a href="https://www.argentina.gob.ar/aaip/datospersonales/derechos">{"tus derechos y los canales de denuncia de la AAIP"}</a>{"."}</p>
      <h2>{"Actualizaciones de esta política"}</h2>
      <p>{"Publicaremos la versión vigente y su fecha de actualización en esta página. Si cambiamos las finalidades o incorporamos un tratamiento que requiera consentimiento, informaremos ese cambio y solicitaremos la autorización que corresponda antes de realizarlo."}</p>
      <h2>{"Marco normativo consultado"}</h2>
      <p>{"Este borrador toma como referencia la "}<a href="https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion">{"Ley 25.326 de Protección de los Datos Personales"}</a>{", la "}<a href="https://www.argentina.gob.ar/aaip/datospersonales/derechos">{"información de la AAIP sobre derechos"}</a>{" y sus "}<a href="https://www.argentina.gob.ar/transferencias-internacionales">{"criterios sobre transferencias internacionales"}</a>{", consultados el 10 de octubre de 2026. "}</p>
    </LegalDocument>
  )
}
