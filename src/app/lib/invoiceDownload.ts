import { formatCOP, type Invoice, type OrderItem } from './localDB';

/** ID de seguimiento del pedido (distinto del número interno PR-xxxx). */
export function getInvoiceTrackingId(inv: Invoice): string {
  return inv.trackingId ?? inv.orderId;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function orderItemCellHtml(item: OrderItem): string {
  const extraLines: string[] = [];
  if (item.addOns?.length) {
    extraLines.push(
      `<div style="font-size:0.85em;color:#555;margin-top:4px">+ ${item.addOns.map(a => escapeHtml(a.name)).join(', ')}</div>`
    );
  }
  if (item.drinks?.length) {
    extraLines.push(
      `<div style="font-size:0.85em;color:#555;margin-top:2px">Beb.: ${item.drinks.map(d => escapeHtml(d.name)).join(', ')}</div>`
    );
  }
  return `<td>${escapeHtml(item.name)}${extraLines.join('')}</td>`;
}

export function buildInvoiceHtmlDocument(inv: Invoice): string {
  const trackingId = getInvoiceTrackingId(inv);
  const rows = inv.items
    .map(
      item => `<tr>
        ${orderItemCellHtml(item)}
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${escapeHtml(formatCOP(item.price))}</td>
        <td style="text-align:right">${escapeHtml(formatCOP(item.price * item.quantity))}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Factura ${escapeHtml(inv.invoiceNumber)}</title>
<style>
  :root{
    --ink:#0f172a;
    --muted:#475569;
    --paper:#ffffff;
    --line:#e2e8f0;
    --soft:#f8fafc;
    --brand:#C9A84C;
    --brand2:#0b1220;
    --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
  *{ box-sizing:border-box; }
  body{
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
    margin:0;
    background: #f1f5f9;
    color: var(--ink);
  }
  .page{
    max-width: 860px;
    margin: 28px auto;
    padding: 0 16px;
  }
  .card{
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 12px 30px rgba(2,6,23,.08);
  }
  .topbar{
    padding: 22px 24px;
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:16px;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  }
  .brand{
    display:flex;
    align-items:center;
    gap:12px;
    min-width: 0;
  }
  .logo{
    width:44px;height:44px;border-radius:14px;
    background: rgba(201,168,76,.18);
    border: 1px solid rgba(201,168,76,.35);
    display:flex;align-items:center;justify-content:center;
    flex: 0 0 auto;
  }
  .logoDot{
    width:18px;height:18px;border-radius:7px;
    background: var(--brand);
    box-shadow: 0 10px 18px rgba(201,168,76,.35);
  }
  .brand h1{
    font-size: 16px;
    line-height: 1.2;
    margin: 0;
    font-weight: 800;
    letter-spacing: .02em;
    color: var(--brand2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .brand p{
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 12px;
  }
  .title{
    text-align:right;
  }
  .title .inv{
    font-size: 12px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .14em;
  }
  .title .num{
    margin-top: 6px;
    font-size: 22px;
    font-weight: 900;
    color: var(--ink);
  }
  .content{ padding: 22px 24px 24px; }
  .grid{
    display:grid;
    grid-template-columns: 1.2fr .8fr;
    gap: 14px;
  }
  .box{
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 14px 14px;
    background: var(--soft);
  }
  .box h2{
    margin: 0 0 10px;
    font-size: 12px;
    color: var(--muted);
    letter-spacing: .12em;
    text-transform: uppercase;
  }
  .kv{
    display:grid;
    grid-template-columns: 140px 1fr;
    gap: 8px 12px;
    font-size: 13px;
  }
  .k{ color: var(--muted); }
  .v{ color: var(--ink); font-weight: 600; }
  .mono{ font-family: var(--mono); font-weight: 600; word-break: break-all; }
  table{
    width:100%;
    border-collapse: collapse;
    margin-top: 14px;
    border: 1px solid var(--line);
    border-radius: 14px;
    overflow:hidden;
  }
  thead th{
    background: #ffffff;
    color: var(--muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .14em;
    padding: 12px 12px;
    border-bottom: 1px solid var(--line);
  }
  tbody td{
    padding: 12px 12px;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
    font-size: 13px;
  }
  tbody tr:nth-child(even) td{ background: #fcfdff; }
  tbody tr:last-child td{ border-bottom: none; }
  .totals{
    margin-top: 14px;
    display:flex;
    justify-content:flex-end;
  }
  .totalsCard{
    width: 320px;
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 14px 14px;
    background: #ffffff;
  }
  .totalsRow{
    display:flex;
    justify-content:space-between;
    padding: 6px 0;
    color: var(--muted);
    font-size: 13px;
  }
  .totalsRow strong{ color: var(--ink); }
  .grand{
    margin-top: 8px;
    border-top: 1px solid var(--line);
    padding-top: 10px;
    display:flex;
    justify-content:space-between;
    align-items: baseline;
  }
  .grand .label{ color: var(--muted); font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
  .grand .value{ color: var(--brand2); font-size: 20px; font-weight: 900; }
  .footer{
    padding: 14px 24px 18px;
    border-top: 1px solid var(--line);
    display:flex;
    justify-content:space-between;
    gap: 12px;
    color: var(--muted);
    font-size: 12px;
  }
  .badge{
    display:inline-flex;
    align-items:center;
    gap:8px;
    padding: 8px 10px;
    border-radius: 999px;
    border: 1px solid rgba(201,168,76,.35);
    background: rgba(201,168,76,.12);
    color: var(--brand2);
    font-weight: 700;
    letter-spacing: .02em;
  }
  @media (max-width: 720px){
    .grid{ grid-template-columns: 1fr; }
    .title{ text-align:left; }
    .kv{ grid-template-columns: 120px 1fr; }
    .totals{ justify-content: stretch; }
    .totalsCard{ width: 100%; }
  }
  @media print{
    body{ background: #ffffff; }
    .page{ margin: 0; padding: 0; max-width: none; }
    .card{ box-shadow:none; border-radius: 0; border: none; }
    .topbar, .footer{ border-color: #ddd; }
    table, thead th, tbody td, .box, .totalsCard{ border-color: #ddd; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="card">
      <div class="topbar">
        <div class="brand">
          <div class="logo" aria-hidden="true"><div class="logoDot"></div></div>
          <div style="min-width:0">
            <h1>Prime &amp; Rare</h1>
            <p>Factura / Recibo de compra</p>
          </div>
        </div>
        <div class="title">
          <div class="inv">Factura</div>
          <div class="num">${escapeHtml(inv.invoiceNumber)}</div>
        </div>
      </div>

      <div class="content">
        <div class="grid">
          <div class="box">
            <h2>Cliente</h2>
            <div class="kv">
              <div class="k">Nombre</div><div class="v">${escapeHtml(inv.customer.name)}</div>
              <div class="k">Correo</div><div class="v">${escapeHtml(inv.customer.email)}</div>
              <div class="k">Teléfono</div><div class="v">${escapeHtml(inv.customer.phone)}</div>
              ${inv.customer.address ? `<div class="k">Dirección</div><div class="v">${escapeHtml(inv.customer.address)}</div>` : ''}
            </div>
          </div>

          <div class="box">
            <h2>Detalle</h2>
            <div class="kv">
              <div class="k">Pedido</div><div class="v">${escapeHtml(inv.orderNumber)}</div>
              <div class="k">Tracking</div><div class="v mono">${escapeHtml(trackingId)}</div>
              <div class="k">Fecha</div><div class="v">${escapeHtml(
                new Date(inv.createdAt).toLocaleString('es-CO', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })
              )}</div>
              <div class="k">Pago</div><div class="v">${escapeHtml(inv.paymentMethod)}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Artículo</th>
              <th style="text-align:center">Cant.</th>
              <th style="text-align:right">P. Unit.</th>
              <th style="text-align:right">Importe</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="totals">
          <div class="totalsCard">
            <div class="totalsRow"><span>Subtotal</span><strong>${escapeHtml(formatCOP(inv.subtotal))}</strong></div>
            <div class="totalsRow"><span>Imp. al consumo (8%)</span><strong>${escapeHtml(formatCOP(inv.tax))}</strong></div>
            ${inv.deliveryFee > 0 ? `<div class="totalsRow"><span>Domicilio</span><strong>${escapeHtml(formatCOP(inv.deliveryFee))}</strong></div>` : ''}
            <div class="grand">
              <div class="label">Total</div>
              <div class="value">${escapeHtml(formatCOP(inv.total))}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div class="badge">Gracias por tu compra</div>
        <div>Conserva este recibo para soporte y seguimiento.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function downloadInvoiceHtml(inv: Invoice): void {
  const html = buildInvoiceHtmlDocument(inv);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = inv.invoiceNumber.replace(/[^\w-]/g, '_');
  a.href = url;
  a.download = `Factura-${safe}.html`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
