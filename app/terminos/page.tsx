import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalDocument } from '@/components/legal-document'

export const metadata: Metadata = {
  title: 'Términos y condiciones — Hilo',
  description: 'Condiciones de uso y compra de Hilo. Borrador con datos pendientes de completar.',
  robots: { index: false, follow: true },
}

export default function TermsPage() {
  return (
    <LegalDocument title="Términos y condiciones" updatedAt="11 de octubre de 2026">
      <h2>Quién ofrece la tienda</h2>
      <p>
        Hilo es la marca comercial de <span className="pending">Pendiente: nombre completo o razón social</span>,
        CUIT <span className="pending">Pendiente: CUIT</span>, con domicilio en{' '}
        <span className="pending">Pendiente: domicilio completo</span>. El sitio al que se aplica este texto es{' '}
        <span className="pending">Pendiente: dominio definitivo</span>.
      </p>
      <p>
        Atención al cliente: <span className="pending">Pendiente: correo, teléfono y horarios de atención</span>.
        Estos términos describen el uso de la tienda y la compra de prendas para consumo final.
        Los campos pendientes deben completarse antes de presentar esta versión como definitiva.
      </p>

      <h2>Uso del sitio y de tu cuenta</h2>
      <p>
        Podés explorar el catálogo y comprar sin crear una cuenta. Para contratar debés contar
        con capacidad legal o la intervención de quien corresponda. Completá tus datos de contacto
        y entrega con información correcta y revisalos antes de enviar el pedido.
      </p>
      <p>
        Si creás una cuenta, cuidá tu contraseña y cerrá la sesión en equipos compartidos.
        Si detectás un acceso que no reconocés, cambiá tu contraseña y comunicalo a atención al cliente.
        No se permite intentar acceder a cuentas ajenas, alterar pedidos o interferir con la tienda.
      </p>

      <h2>Carrito y disponibilidad</h2>
      <p>
        El carrito de visitante se conserva en este navegador. Al iniciar sesión se combina con
        el carrito de tu cuenta y se sincroniza con el servidor; cuando una prenda y talle aparecen
        en ambos, conservamos la mayor cantidad. Al cerrar sesión volvés al carrito de visitante.
      </p>
      <p>
        Agregar una prenda al carrito no reserva stock ni congela su precio. Antes del pago,
        la tienda vuelve a comprobar los talles, las cantidades, la disponibilidad y los importes.
        Revisá cualquier cambio antes de continuar. Los pedidos quedan registrados en el servidor.
      </p>

      <h2>Información de las prendas</h2>
      <p>
        Revisá la descripción, la composición, el color, el talle y las indicaciones de cuidado
        de cada prenda. La representación del color puede variar según la pantalla; esto no elimina
        la obligación de entregar un producto que corresponda a lo ofrecido.
        Las guías identificadas como medidas de referencia todavía requieren confirmación.
      </p>
      <p><span className="pending">Pendiente: validar fotografías, medidas reales por talle, composición, cuidados y stock de cada prenda antes de habilitar su venta.</span></p>

      <h2>Precios, promociones y pago</h2>
      <p>
        Los importes se muestran en pesos argentinos (ARS). Antes de pagar, el resumen presenta
        las prendas, las cantidades, el costo de envío y el total. Las promociones se aplican según
        lo informado en la oferta. No se añadirán cargos que no hayan sido informados y aceptados.
      </p>
      <p>
        El flujo de pago previsto utiliza Mercado Pago, cuando esté habilitado. Los datos de la
        tarjeta se ingresan en el entorno del proveedor de pago. Una operación pendiente o rechazada
        no equivale a un pago aprobado. Los cambios futuros de precio no modifican una compra ya celebrada.
      </p>
      <p><span className="pending">Pendiente: confirmar tratamiento impositivo, emisión del comprobante fiscal, medios de pago y financiación ofrecida, si corresponde.</span></p>

      <h2>Registro y seguimiento del pedido</h2>
      <p>
        El recibo permite consultar el estado del pedido. Conservá su enlace privado y evitá
        compartirlo, porque da acceso a información de la compra. El estado «Pago recibido» indica
        que la tienda verificó el pago y asignó el stock correspondiente; no significa que el envío
        ya se haya realizado ni reemplaza el comprobante fiscal.
      </p>
      <p>
        Si se detecta un problema de disponibilidad o de cobro, se informará la situación y se
        gestionará la solución que corresponda, respetando tus derechos a cumplimiento, sustitución
        o devolución según el caso. No se impondrá un cambio de prenda o un saldo a favor sin tu acuerdo.
      </p>

      <h2>Envíos y entrega</h2>
      <p>
        El costo de envío se informa en el checkout. Las condiciones de envío gratuito que se
        anuncien forman parte de la oferta. La fecha o el plazo de entrega deben informarse antes
        de contratar; no se consideran aceptados plazos que sigan marcados como pendientes.
      </p>
      <p><span className="pending">Pendiente: confirmar zonas de cobertura, transportista, preparación, plazos de entrega, seguimiento, retiro y gestión de entregas fallidas.</span></p>

      <h2 id="arrepentimiento" className="scroll-mt-40">Arrepentimiento de la compra a distancia</h2>
      <p>
        <strong>En una compra a distancia alcanzada por la normativa argentina, podés revocar
        la aceptación sin penalidad dentro de los 10 días corridos desde la entrega o la celebración
        del contrato, lo que ocurra después.</strong> Si el vencimiento es inhábil, se extiende al
        primer día hábil siguiente. Debés poner el producto a disposición del vendedor;
        los gastos de devolución corresponden a este último. El reintegro se gestiona conforme
        a la normativa aplicable, sin reemplazarlo por un crédito en la tienda sin tu aceptación.
      </p>
      <p>
        Podés comunicar la revocación por escrito o por medios electrónicos. La falta de una
        cuenta no impide ejercer este derecho. Sólo se aplican las excepciones legales que correspondan;
        no se presume que una prenda de catálogo sea un producto personalizado.
      </p>
      <p><span className="pending">Pendiente: habilitar el Botón de Arrepentimiento, completar el canal electrónico de recepción, la constancia de solicitud y el procedimiento de devolución y reintegro.</span></p>

      <h2 id="cambios-y-devoluciones" className="scroll-mt-40">Cambios, devoluciones y garantías</h2>
      <p>
        La tienda anuncia devoluciones en 30 días. Esa oferta comercial es adicional a los derechos
        legales y este borrador no la deja sin efecto para una compra realizada bajo esa publicidad.
        Sus condiciones operativas todavía requieren confirmación y deben informarse antes de comprar.
      </p>
      <p><span className="pending">Pendiente: confirmar desde cuándo se cuentan los 30 días, condiciones de cambios voluntarios, retiro, domicilio de devolución, costos y modalidad de reintegro de la política comercial.</span></p>
      <p>
        Si recibís una prenda defectuosa o distinta de la pedida, conservás los derechos y las
        garantías legales aplicables. Para bienes muebles nuevos no consumibles, la garantía legal
        mínima es de seis meses desde la entrega. Una condición comercial de cambio no puede
        reducir esa protección ni los derechos por incumplimiento.
      </p>

      <h2>Privacidad y cookies</h2>
      <p>
        El uso de los datos personales y del almacenamiento del navegador se describe en la{' '}
        <Link href="/privacidad">política de privacidad</Link> y la{' '}
        <Link href="/cookies">política de cookies</Link>. Aceptar el aviso de cookies registra
        esa elección; no supone aceptar estas condiciones de compra ni renunciar a derechos.
      </p>

      <h2>Contenido del sitio y funcionamiento</h2>
      <p>
        Los derechos sobre la marca, textos, fotografías y diseños corresponden a sus respectivos
        titulares. Consultar la tienda no otorga permiso para explotarlos comercialmente.
        Pueden existir interrupciones por mantenimiento; se atenderán los problemas que afecten
        pedidos en curso sin excluir la responsabilidad que imponga la ley.
      </p>

      <h2>Consultas, reclamos y cambios de este texto</h2>
      <p>
        Para consultas o reclamos, utilizá <span className="pending">Pendiente: canal de atención y reclamos</span>.
        También podés acudir a las autoridades de defensa del consumidor y a los tribunales competentes.
        Este texto no impone una jurisdicción exclusiva ni limita derechos irrenunciables.
      </p>
      <p>
        El marco previsto es Argentina, pendiente de confirmación. Las actualizaciones se publicarán
        con su fecha y regirán para futuras contrataciones; no cambiarán las condiciones de compras
        anteriores sin acuerdo válido. La vigencia de esta versión está pendiente de completar.
      </p>
      <p>
        Podés consultar la <a href="https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion">Ley de Defensa del Consumidor</a>
        {' '}y el <a href="https://www.argentina.gob.ar/normativa/nacional/ley-26994-235975/actualizacion">Código Civil y Comercial</a> en sus fuentes oficiales.
      </p>
    </LegalDocument>
  )
}
