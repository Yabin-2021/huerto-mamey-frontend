const API_URL = 'https://huerto-mamey-backend.onrender.com/api';
let productosCache = [];
let carrito = [];

// 🛡️ 1. SEGURIDAD: Verificar sesión activa al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const usuarioJson = localStorage.getItem('usuario');

    if (!token || !usuarioJson) {
        window.location.href = '../index.html';
        return;
    }

    const usuario = JSON.parse(usuarioJson);
    document.getElementById('user-display').innerText = `${usuario.nombre} (${usuario.rol})`;

    // Cargar catálogo de café inicial
    cargarProductos();
});

// 🔄 2. API: Cargar productos desde el Backend de Node.js

async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        productosCache = await response.json();
        renderizarProductos(productosCache);
    } catch (error) {
        alert('Error al conectar con el servidor de productos.');
    }
}

// 🎨 3. INTERFAZ: Pintar tarjetas de café en la grilla
function renderizarProductos(lista) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    lista.forEach(prod => {
        const card = document.createElement('div');
        card.className = `p-4 rounded-xl border transition shadow-xs flex flex-col justify-between ${
            prod.stock_actual <= prod.stock_minimo ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'
        }`;

        card.innerHTML = `
            <div>
                <span class="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-sm">${prod.categoria_nombre}</span>
                <h3 class="font-bold text-stone-800 mt-1.5 text-base">${prod.nombre}</h3>
                <p class="text-xs text-stone-500">Unidad: ${prod.unidad_medida}</p>
            </div>
            <div class="mt-4 flex justify-between items-center">
                <span class="text-lg font-black text-stone-900">$${parseFloat(prod.precio_venta).toFixed(2)}</span>
                <button onclick="agregarAlCarrito(${prod.id})" 
                    class="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer">
                    + Añadir
                </button>
            </div>
            <div class="mt-2 text-[11px] text-right text-stone-500">Stock: ${prod.stock_actual}</div>
        `;
        grid.appendChild(card);
    });
}

// 🔍 4. BUSCADOR: Filtrado en tiempo real
document.getElementById('search-input').addEventListener('input', (e) => {
    const busqueda = e.target.value.toLowerCase();
    const filtrados = productosCache.filter(p => p.nombre.toLowerCase().includes(busqueda));
    renderizarProductos(filtrados);
});

// 🛒 5. CARRITO: Lógica interna de adición con validación de Stock
window.agregarAlCarrito = function(id) {
    const producto = productosCache.find(p => p.id === id);
    const itemEnCarrito = carrito.find(item => item.id === id);
    const cantidadActualEnCarrito = itemEnCarrito ? itemEnCarrito.cantidad : 0;

    // REGLA DE NEGOCIO: Validar que haya existencias disponibles
    if (producto.stock_actual <= 0) {
        alert(`⚠️ El producto "${producto.nombre}" está agotado en el almacén.`);
        return;
    }

    if (cantidadActualEnCarrito + 1 > producto.stock_actual) {
        alert(`⚠️ No puedes agregar más unidades. El stock disponible de "${producto.nombre}" es de solo ${producto.stock_actual} ${producto.unidad_medida}.`);
        return;
    }

    if (itemEnCarrito) {
        itemEnCarrito.cantidad += 1;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio_venta: parseFloat(producto.precio_venta),
            cantidad: 1
        });
    }
    actualizarCarritoUI();
};

function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    actualizarCarritoUI();
}

function cambiarCantidad(id, nuevaCantidad) {
    const producto = productosCache.find(p => p.id === id);
    const item = carrito.find(item => item.id === id);
    
    if (item) {
        const cantidadNumerica = parseFloat(nuevaCantidad) || 0;

        if (cantidadNumerica <= 0) {
            eliminarDelCarrito(id);
            return;
        }

        // REGLA DE NEGOCIO: Validar stock al editar manualmente el renglón
        if (cantidadNumerica > producto.stock_actual) {
            alert(`⚠️ Inventario insuficiente. Solo quedan ${producto.stock_actual} ${producto.unidad_medida} disponibles de "${producto.nombre}".`);
            // Revertimos el valor de la caja de texto al máximo disponible
            item.cantidad = producto.stock_actual;
        } else {
            item.cantidad = cantidadNumerica;
        }
    }
    actualizarCarritoUI();
}

// 🧾 6. INTERFAZ: Renderizar la lista del Ticket actual
function actualizarCarritoUI() {
    const tbody = document.getElementById('cart-table-body');
    tbody.innerHTML = '';
    let total = 0;
    let totalArticulos = 0;

    carrito.forEach(item => {
        const subtotal = item.cantidad * item.precio_venta;
        total += subtotal;
        totalArticulos += item.cantidad;

        const row = document.createElement('tr');
        row.className = "border-b border-stone-100 hover:bg-stone-50";
        row.innerHTML = `
            <td class="p-3 font-medium text-stone-800">${item.nombre}</td>
            <td class="p-3 text-center">
                <input type="number" value="${item.cantidad}" min="0.1" step="0.1"
                    class="w-16 border border-stone-300 rounded text-center py-0.5 focus:outline-none"
                    onchange="cambiarCantidad(${item.id}, this.value)">
            </td>
            <td class="p-3 text-right font-bold">$${subtotal.toFixed(2)}</td>
            <td class="p-3 text-center">
                <button onclick="eliminarDelCarrito(${item.id})" class="text-red-500 hover:text-red-700 font-bold">✕</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
    document.getElementById('items-count').innerText = `${totalArticulos} artículos`;
}

// 💳 7. COBRO: Enviar la transacción de venta completa al Servidor
document.getElementById('btn-checkout').addEventListener('click', async () => {
    if (carrito.length === 0) {
        alert('El ticket está vacío.');
        return;
    }

    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const totalText = document.getElementById('cart-total').innerText;
    const total = parseFloat(totalText.replace('$', ''));
    const metodo_pago = document.getElementById('payment-method').value;
    const monto_pagado = parseFloat(document.getElementById('cash-received').value) || total;

    if (metodo_pago === 'efectivo' && monto_pagado < total) {
        alert('El dinero recibido es menor al total de la venta.');
        return;
    }

    // Estructuramos el JSON exactamente como lo pide nuestro Backend
    const ventaPayload = {
        usuario_id: usuario.id,
        cliente_id: null, // Público general
        total: total,
        metodo_pago: metodo_pago,
        monto_pagado: monto_pagado,
        detalles: carrito.map(item => ({
            producto_id: item.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_venta
        }))
    };

    try {
        const response = await fetch(`${API_URL}/ventas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Mandamos el token para pasar el middleware
            },
            body: JSON.stringify(ventaPayload)
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || data.detalles);

        // 1. Clonamos temporalmente el carrito actual antes de vaciarlo para poder enviarlo al ticket
        const productosVendidos = [...carrito];
        const cambioEntregado = data.cambio || 0;

        // 2. Disparamos la apertura automática del ticket visual
        abrirTicketVisual(data, productosVendidos, metodo_pago, total, cambioEntregado);
        
        // Resetear caja
        carrito = [];
        document.getElementById('cash-received').value = '';
        actualizarCarritoUI();
        cargarProductos(); // Recargar catálogo para ver el stock actualizado

    } catch (error) {
        alert(`Error al procesar la venta: ${error.message}`);
    }
});

// 🧾 8. VISUALIZACIÓN E IMPRESIÓN DEL TICKET DE VENTA
function abrirTicketVisual(dataVenta, productosVendidos, metodoPago, total, cambio) {
    // Configurar dimensiones aproximadas para una ventana de ticket (80mm)
    const opcionesVentana = 'width=400,height=600,top=100,left=100,toolbars=no,scrollbars=yes,status=no,resizable=yes';
    const ventanaTicket = window.open('', '_blank', opcionesVentana);

    // Obtener la fecha y hora actual formateada
    const fechaActual = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

    // Construir las filas del desglose de productos vendidos
    let filasProductos = '';
    productosVendidos.forEach(item => {
        const subtotal = item.cantidad * item.precio_venta;
        filasProductos += `
            <tr>
                <td style="padding: 5px 0;">${item.nombre}<br><small>${item.cantidad} x $${item.precio_venta.toFixed(2)}</small></td>
                <td style="text-align: right; padding: 5px 0; vertical-align: bottom;">$${subtotal.toFixed(2)}</td>
            </tr>
        `;
    });

    // Inyectar el HTML y los estilos en la nueva ventana
    ventanaTicket.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Ticket #${dataVenta.venta_id || '000'}</title>
            <style>
                @page { margin: 0; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    color: #000;
                    margin: 10px;
                    width: 260px; /* Optimizado para ancho estándar de ticketera */
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .linea-divisoria {
                    border-top: 1px dashed #000;
                    margin: 8px 0;
                }
                .titulo {
                    font-size: 14px;
                    font-weight: bold;
                    margin: 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .total-seccion {
                    font-weight: bold;
                    font-size: 13px;
                }
                .btn-imprimir {
                    background-color: #000;
                    color: #fff;
                    border: none;
                    padding: 8px 15px;
                    width: 100%;
                    font-weight: bold;
                    margin-top: 15px;
                    cursor: pointer;
                }
                /* Ocultar el botón al momento de imprimir en papel */
                @media print {
                    .btn-imprimir { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="text-center">
                <p class="titulo">CAFÉ HUERTO EL MAMEY</p>
                <p style="margin: 3px 0;">Heroica Ciudad de Tlaxiaco<br>Oaxaca, México</p>
                <p style="font-size: 11px; margin: 4px 0;">¡Del huerto a su taza!</p>
            </div>

            <div class="linea-divisoria"></div>

            <div>
                <p style="margin: 3px 0;"><b>Ticket:</b> #${dataVenta.venta_id || 'N/A'}</p>
                <p style="margin: 3px 0;"><b>Fecha:</b> ${fechaActual}</p>
                <p style="margin: 3px 0;"><b>Atendió:</b> Admin/Cajero</p>
            </div>

            <div class="linea-divisoria"></div>

            <table>
                <thead>
                    <tr style="border-b: 1px dashed #000;">
                        <th style="text-align: left; padding-bottom: 5px;">Descripción</th>
                        <th style="text-align: right; padding-bottom: 5px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasProductos}
                </tbody>
            </table>

            <div class="linea-divisoria"></div>

            <table class="total-seccion">
                <tr>
                    <td>TOTAL A PAGAR:</td>
                    <td class="text-right">$${total.toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="font-size: 11px; font-weight: normal;">Método de Pago:</td>
                    <td class="text-right" style="font-size: 11px; font-weight: normal;">${metodoPago.toUpperCase()}</td>
                </tr>
                ${metodoPago === 'efectivo' ? `
                <tr>
                    <td style="font-size: 11px; font-weight: normal;">Efectivo Recibido:</td>
                    <td class="text-right" style="font-size: 11px; font-weight: normal;">$${(total + cambio).toFixed(2)}</td>
                </tr>
                <tr>
                    <td>SU CAMBIO:</td>
                    <td class="text-right">$${cambio.toFixed(2)}</td>
                </tr>
                ` : ''}
            </table>

            <div class="linea-divisoria"></div>

            <div class="text-center" style="margin-top: 10px; font-size: 11px;">
                <p>Gracias por su compra</p>
                <p><b>Café Huerto el Mamey</b></p>
            </div>

            <button class="btn-imprimir" onclick="window.print();">🖨️ Imprimir Ticket</button>
        </body>
        </html>
    `);
    
    ventanaTicket.document.close();

    // 🔥 NUEVO: Hace que la ventana mande a imprimir automáticamente a la ticketera
    setTimeout(() => {
        ventanaTicket.print();
    }, 300);
}

// Ocultar campo de efectivo si pagan por tarjeta/transferencia
document.getElementById('payment-method').addEventListener('change', (e) => {
    const cashGroup = document.getElementById('cash-payment-group');
    if (e.target.value === 'efectivo') {
        cashGroup.classList.remove('flex'); // Fuerza el comportamiento flexible 
    } else {
        cashGroup.classList.add('none'); // Lo oculta de verdad sin importar las clases
    }
});

// Botón de Salir (Logout)
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '../index.html';
});

// 🗑️ REGLA DE NEGOCIO: Cancelar el ticket actual por completo
window.vaciarTicket = function() {
    if (carrito.length === 0) return;
    
    if (confirm('¿Estás seguro de que deseas cancelar la venta actual y vaciar el ticket?')) {
        carrito = [];
        document.getElementById('cash-received').value = '';
        actualizarCarritoUI();
    }
};