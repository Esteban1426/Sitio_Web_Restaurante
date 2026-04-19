/**
 * API Supabase — reemplaza la capa local de localStorage
 */
import type * as db from './localDB';
import { supabase } from './supabaseClient';

// Re-exportar formatCOP para uso en toda la aplicación
export { formatCOP } from './localDB';

function assertOk<T>(res: { data: T | null; error: any }, msg: string): T {
  if (res.error) throw new Error(res.error.message ?? msg);
  if (res.data === null) throw new Error(msg);
  return res.data;
}

// ─── Productos ────────────────────────────────────────────────

export async function getProducts() {
  const res = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  const products = assertOk<db.Product[]>(res, 'No se pudieron cargar productos').map(
    p => ({
      id: p.id,
      name: (p as any).name,
      description: (p as any).description,
      price: Number((p as any).price),
      category: (p as any).category,
      imageUrl: (p as any).image_url ?? (p as any).imageUrl ?? '',
      weight: (p as any).weight ?? undefined,
      origin: (p as any).origin ?? undefined,
      rating: Number((p as any).rating ?? 0),
      inStock: Boolean((p as any).in_stock ?? (p as any).inStock ?? true),
      featured: Boolean((p as any).featured ?? false),
      createdAt: (p as any).created_at ?? new Date().toISOString(),
      updatedAt: (p as any).updated_at ?? (p as any).created_at ?? new Date().toISOString(),
    })
  );

  return { products };
}

export async function getProduct(id: string) {
  const res = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message ?? 'No se pudo cargar el producto');
  if (!res.data) throw new Error('Producto no encontrado');
  const p: any = res.data;
  const product: db.Product = {
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    category: p.category,
    imageUrl: p.image_url ?? p.imageUrl ?? '',
    weight: p.weight ?? undefined,
    origin: p.origin ?? undefined,
    rating: Number(p.rating ?? 0),
    inStock: Boolean(p.in_stock ?? p.inStock ?? true),
    featured: Boolean(p.featured ?? false),
    createdAt: p.created_at ?? new Date().toISOString(),
    updatedAt: p.updated_at ?? p.created_at ?? new Date().toISOString(),
  };
  return { product };
}

export async function createProduct(data: Omit<db.Product, 'id' | 'createdAt' | 'updatedAt'>, _token?: string) {
  const res = await supabase
    .from('products')
    .insert({
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      image_url: data.imageUrl,
      weight: data.weight ?? null,
      origin: data.origin ?? null,
      rating: data.rating,
      in_stock: data.inStock,
      featured: data.featured,
    })
    .select('*')
    .single();

  const p: any = assertOk<any>(res, 'No se pudo crear el producto');
  return {
    product: {
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      category: p.category,
      imageUrl: p.image_url ?? '',
      weight: p.weight ?? undefined,
      origin: p.origin ?? undefined,
      rating: Number(p.rating ?? 0),
      inStock: Boolean(p.in_stock ?? true),
      featured: Boolean(p.featured ?? false),
      createdAt: p.created_at ?? new Date().toISOString(),
      updatedAt: p.updated_at ?? p.created_at ?? new Date().toISOString(),
    } satisfies db.Product,
  };
}

export async function updateProduct(id: string, data: Partial<db.Product>, _token?: string) {
  const patch: any = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.price !== undefined) patch.price = data.price;
  if (data.category !== undefined) patch.category = data.category;
  if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;
  if (data.weight !== undefined) patch.weight = data.weight ?? null;
  if (data.origin !== undefined) patch.origin = data.origin ?? null;
  if (data.rating !== undefined) patch.rating = data.rating;
  if (data.inStock !== undefined) patch.in_stock = data.inStock;
  if (data.featured !== undefined) patch.featured = data.featured;

  const res = await supabase.from('products').update(patch).eq('id', id).select('*').single();
  if (res.error) throw new Error(res.error.message ?? 'No se pudo actualizar el producto');
  if (!res.data) throw new Error('Producto no encontrado');
  const p: any = res.data;
  const product: db.Product = {
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    category: p.category,
    imageUrl: p.image_url ?? '',
    weight: p.weight ?? undefined,
    origin: p.origin ?? undefined,
    rating: Number(p.rating ?? 0),
    inStock: Boolean(p.in_stock ?? true),
    featured: Boolean(p.featured ?? false),
    createdAt: p.created_at ?? new Date().toISOString(),
    updatedAt: p.updated_at ?? p.created_at ?? new Date().toISOString(),
  };
  return { product };
}

export async function deleteProduct(id: string, _token?: string) {
  const res = await supabase.from('products').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message ?? 'No se pudo eliminar el producto');
  return { message: 'Producto eliminado' };
}

// ─── Pedidos ──────────────────────────────────────────────────

export async function getOrders(_token?: string) {
  const res = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  const rows = assertOk<any[]>(res, 'No se pudieron cargar pedidos');
  const orders: db.Order[] = rows.map(o => ({
    id: o.id,
    orderNumber: o.order_number,
    customer: o.customer,
    items: o.items,
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    deliveryFee: Number(o.delivery_fee),
    total: Number(o.total),
    status: o.status,
    deliveryMethod: o.delivery_method,
    paymentMethod: o.payment_method,
    notes: o.notes ?? '',
    createdAt: o.created_at,
    updatedAt: o.updated_at ?? o.created_at,
  }));
  return { orders };
}

export async function getOrder(id: string) {
  const res = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message ?? 'No se pudo cargar el pedido');
  if (!res.data) throw new Error('Pedido no encontrado');
  const o: any = res.data;
  const order: db.Order = {
    id: o.id,
    orderNumber: o.order_number,
    customer: o.customer,
    items: o.items,
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    deliveryFee: Number(o.delivery_fee),
    total: Number(o.total),
    status: o.status,
    deliveryMethod: o.delivery_method,
    paymentMethod: o.payment_method,
    notes: o.notes ?? '',
    createdAt: o.created_at,
    updatedAt: o.updated_at ?? o.created_at,
  };
  return { order };
}

export async function createOrder(data: Parameters<typeof db.createOrder>[0]) {
  // Mantener misma lógica de totales que la app ya usa
  const DELIVERY_FEE = 15000;
  const TAX_RATE = 0.08;

  const subtotal = data.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const deliveryFee = data.deliveryMethod === 'domicilio' ? DELIVERY_FEE : 0;
  const total = subtotal + tax + deliveryFee;

  const orderInsert = await supabase
    .from('orders')
    .insert({
      customer: data.customer,
      items: data.items,
      subtotal,
      tax,
      delivery_fee: deliveryFee,
      total,
      status: 'pendiente',
      delivery_method: data.deliveryMethod,
      payment_method: data.paymentMethod,
      notes: data.notes ?? '',
    })
    .select('*')
    .single();

  const o: any = assertOk<any>(orderInsert, 'No se pudo crear el pedido');
  const order: db.Order = {
    id: o.id,
    orderNumber: o.order_number,
    customer: o.customer,
    items: o.items,
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    deliveryFee: Number(o.delivery_fee),
    total: Number(o.total),
    status: o.status,
    deliveryMethod: o.delivery_method,
    paymentMethod: o.payment_method,
    notes: o.notes ?? '',
    createdAt: o.created_at,
    updatedAt: o.updated_at ?? o.created_at,
  };

  const invoiceInsert = await supabase
    .from('invoices')
    .insert({
      order_id: order.id,
      order_number: order.orderNumber,
      tracking_id: order.id,
      customer: order.customer,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      delivery_fee: order.deliveryFee,
      total: order.total,
      payment_method: order.paymentMethod,
    })
    .select('*')
    .single();

  const inv: any = assertOk<any>(invoiceInsert, 'No se pudo crear la factura');
  const invoice: db.Invoice = {
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    trackingId: inv.tracking_id ?? undefined,
    orderId: inv.order_id,
    orderNumber: inv.order_number,
    customer: inv.customer,
    items: inv.items,
    subtotal: Number(inv.subtotal),
    tax: Number(inv.tax),
    deliveryFee: Number(inv.delivery_fee),
    total: Number(inv.total),
    paymentMethod: inv.payment_method,
    createdAt: inv.created_at,
  };

  return { order, invoice };
}

export async function updateOrderStatus(id: string, status: db.OrderStatus, _token?: string) {
  const res = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (res.error) throw new Error(res.error.message ?? 'No se pudo actualizar el pedido');
  if (!res.data) throw new Error('Pedido no encontrado');
  const o: any = res.data;
  const order: db.Order = {
    id: o.id,
    orderNumber: o.order_number,
    customer: o.customer,
    items: o.items,
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    deliveryFee: Number(o.delivery_fee),
    total: Number(o.total),
    status: o.status,
    deliveryMethod: o.delivery_method,
    paymentMethod: o.payment_method,
    notes: o.notes ?? '',
    createdAt: o.created_at,
    updatedAt: o.updated_at ?? o.created_at,
  };
  return { order };
}

// ─── Facturas ─────────────────────────────────────────────────

export async function getInvoices(_token?: string) {
  const res = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });
  const rows = assertOk<any[]>(res, 'No se pudieron cargar facturas');
  const invoices: db.Invoice[] = rows.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    trackingId: inv.tracking_id ?? undefined,
    orderId: inv.order_id,
    orderNumber: inv.order_number,
    customer: inv.customer,
    items: inv.items,
    subtotal: Number(inv.subtotal),
    tax: Number(inv.tax),
    deliveryFee: Number(inv.delivery_fee),
    total: Number(inv.total),
    paymentMethod: inv.payment_method,
    createdAt: inv.created_at,
  }));
  return { invoices };
}

export async function getInvoice(id: string, _token?: string) {
  const res = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (res.error) throw new Error(res.error.message ?? 'No se pudo cargar la factura');
  if (!res.data) throw new Error('Factura no encontrada');
  const inv: any = res.data;
  const invoice: db.Invoice = {
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    trackingId: inv.tracking_id ?? undefined,
    orderId: inv.order_id,
    orderNumber: inv.order_number,
    customer: inv.customer,
    items: inv.items,
    subtotal: Number(inv.subtotal),
    tax: Number(inv.tax),
    deliveryFee: Number(inv.delivery_fee),
    total: Number(inv.total),
    paymentMethod: inv.payment_method,
    createdAt: inv.created_at,
  };
  return { invoice };
}

// ─── Reservas ─────────────────────────────────────────────────

export async function getReservations(_token?: string) {
  const res = await supabase
    .from('reservations')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });
  const rows = assertOk<any[]>(res, 'No se pudieron cargar reservas');
  const reservations: db.Reservation[] = rows.map(r => ({
    id: r.id,
    reservationNumber: r.reservation_number,
    name: r.name,
    email: r.email,
    phone: r.phone,
    date: r.date,
    time: r.time,
    guests: Number(r.guests),
    occasion: r.occasion ?? '',
    notes: r.notes ?? '',
    status: r.status,
    createdAt: r.created_at,
  }));
  return { reservations };
}

export async function createReservation(data: Parameters<typeof db.createReservation>[0]) {
  const res = await supabase
    .from('reservations')
    .insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      date: data.date,
      time: data.time,
      guests: data.guests,
      occasion: data.occasion,
      notes: data.notes,
      status: 'confirmada',
    })
    .select('*')
    .single();

  const r: any = assertOk<any>(res, 'No se pudo crear la reserva');
  const reservation: db.Reservation = {
    id: r.id,
    reservationNumber: r.reservation_number,
    name: r.name,
    email: r.email,
    phone: r.phone,
    date: r.date,
    time: r.time,
    guests: Number(r.guests),
    occasion: r.occasion ?? '',
    notes: r.notes ?? '',
    status: r.status,
    createdAt: r.created_at,
  };
  return { reservation };
}

export async function updateReservationStatus(id: string, status: db.ReservationStatus, _token?: string) {
  const res = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (res.error) throw new Error(res.error.message ?? 'No se pudo actualizar la reserva');
  if (!res.data) throw new Error('Reserva no encontrada');
  const r: any = res.data;
  const reservation: db.Reservation = {
    id: r.id,
    reservationNumber: r.reservation_number,
    name: r.name,
    email: r.email,
    phone: r.phone,
    date: r.date,
    time: r.time,
    guests: Number(r.guests),
    occasion: r.occasion ?? '',
    notes: r.notes ?? '',
    status: r.status,
    createdAt: r.created_at,
  };
  return { reservation };
}

// ─── Estadísticas ─────────────────────────────────────────────

export async function getStats(_token?: string) {
  const [{ orders }, { products }, { reservations }, { invoices }] = await Promise.all([
    getOrders(),
    getProducts(),
    getReservations(),
    getInvoices(),
  ]);

  const activeOrders = orders.filter(o => o.status !== 'cancelado');
  const totalRevenue = activeOrders.reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'pendiente').length;
  const preparingOrders = orders.filter(o => o.status === 'preparando').length;
  const deliveredOrders = orders.filter(o => o.status === 'entregado').length;

  const now = new Date();
  const monthlySales = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const monthName = d.toLocaleString('es-CO', { month: 'short' });
    const year = d.getFullYear();
    const month = d.getMonth();
    const revenue = orders
      .filter(o => {
        const od = new Date(o.createdAt);
        return (
          od.getFullYear() === year &&
          od.getMonth() === month &&
          o.status !== 'cancelado'
        );
      })
      .reduce((s, o) => s + o.total, 0);
    return { month: monthName.charAt(0).toUpperCase() + monthName.slice(1), revenue };
  });

  return {
    totalRevenue,
    totalOrders: orders.length,
    pendingOrders,
    preparingOrders,
    deliveredOrders,
    totalProducts: products.length,
    totalReservations: reservations.length,
    totalInvoices: invoices.length,
    monthlySales,
  };
}

// ─── Imágenes (sin upload real — usar URL directa) ─────────────

export async function uploadImage(_base64: string, _fileName: string, _mimeType: string, _token?: string) {
  throw new Error('Carga de imágenes por archivo no está disponible en modo local. Usa una URL de imagen directamente.');
}

// ─── Admin ────────────────────────────────────────────────────

export async function checkAdminSetup() {
  // Con Supabase Auth, la configuración depende de que exista al menos un usuario admin.
  return { configured: true };
}

export async function setupAdmin() {
  return {
    message:
      'Crea el admin desde Supabase Auth (Email/Password) y usa esas credenciales aquí.',
  };
}

export async function seedProducts(_token?: string) {
  const countRes = await supabase.from('products').select('id', { count: 'exact', head: true });
  if (countRes.error) throw new Error(countRes.error.message ?? 'No se pudo verificar productos');
  const count = countRes.count ?? 0;
  if (count > 0) return { message: 'Los productos ya existen' };
  return {
    message:
      'La siembra automática fue desactivada al migrar a Supabase. Inserta productos desde el panel Admin.',
  };
}
