// A. Consumir el resumen de dinero ingresado hoy
async function cargarResumenFinanciero(token) {
    try {
        // Forzamos un rango manual desde el 1 de junio hasta el fin de mes para ver si aparecen datos
        const response = await fetch(`${API_URL}/resumen?fechaInicio=2026-06-01 00:00:00&fechaFin=2026-06-30 23:59:59`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Salvavidas: Si la ruta no responde un código correcto (200 OK)
        if (!response.ok) {
            throw new Error(`Error en el servidor: código ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.resumen_general) {
            document.getElementById('lbl-ingresos-hoy').innerText = `$${parseFloat(data.resumen_general.ingresos_totales || 0).toFixed(2)}`;
            document.getElementById('lbl-tickets-hoy').innerText = data.resumen_general.total_transacciones || 0;
        }
    } catch (error) {
        console.error('Error al cargar finanzas:', error);
    }
}

// B. Consumir el Top de cafés vendidos
async function cargarTopProductos(token) {
    try {
        const response = await fetch(`${API_URL}/top-productos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`Error en el servidor: código ${response.status}`);
        }

        const data = await response.json();
        const tbody = document.getElementById('table-top-products');
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-stone-400">No hay ventas registradas aún.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-3 font-medium">${item.producto}</td>
                <td class="p-3 text-center">${parseFloat(item.total_amount_sold || item.total_cantidad_vendida || 0)} ${item.unidad_medida || ''}</td>
                <td class="p-3 text-right font-bold text-emerald-600">$${parseFloat(item.total_recaudado || 0).toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error al cargar productos top:', error);
    }
}

// C. Consumir alertas de stock bajo
async function cargarAlertasStock(token) {
    try {
        // 🚨 OJO: Si tras poner esto te da error en la consola del navegador, 
        // revisa en tu app.js de Node si la ruta es exactamente "/alertas-stock"
        const response = await fetch(`${API_URL}/alertas-stock`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`Ruta inválida o caída. Código del servidor: ${response.status}`);
        }

        const data = await response.json();
        
        // Modificado el orden: Primero leemos de forma segura para no causar excepciones si data viene incompleto
        const totalCriticos = data && data.productos_criticos ? data.productos_criticos : 0;
        document.getElementById('lbl-alertas-count').innerText = `${totalCriticos} productos`;
        
        const tbody = document.getElementById('table-stock-alerts');
        tbody.innerHTML = '';

        if(!data || !data.lista || data.lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-emerald-600 font-medium">✅ Todo el inventario está en niveles óptimos.</td></tr>`;
            return;
        }

        data.lista.forEach(item => {
            const row = document.createElement('tr');
            row.className = "bg-red-50 text-red-900 font-medium";
            row.innerHTML = `
                <td class="p-3">${item.nombre}</td>
                <td class="p-3 text-center font-bold">${item.stock_actual} ${item.unidad_medida || ''}</td>
                <td class="p-3 text-center text-stone-500">${item.stock_minimo}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error al cargar alertas:', error);
        // Si falla la petición, al menos colocamos un mensaje amigable en la tabla
        document.getElementById('table-stock-alerts').innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">No se pudieron cargar las alertas. Verifica la ruta en tu Backend.</td></tr>`;
    }
}