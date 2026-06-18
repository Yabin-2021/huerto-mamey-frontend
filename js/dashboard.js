// 1. URL BASE: Apuntando correctamente al prefijo /api/reportes de tu Backend
const API_URL = 'https://huerto-mamey-backend.onrender.com/api/reportes';

// Variables globales para retener los datos de exportación
let datosUltimaConsulta = null;
let nombreArchivoReporte = "reporte.csv";

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const usuarioJson = localStorage.getItem('usuario');

    // Verificar protección de la página en el Frontend
    if (!token || !usuarioJson) {
        window.location.href = '../index.html';
        return;
    }

    const usuario = JSON.parse(usuarioJson);
    if (usuario.role !== 'administrador' && usuario.rol !== 'administrador') {
        alert('Acceso denegado. Se requieren permisos de administrador.');
        window.location.href = 'pos.html';
        return;
    }

    // Ejecutar la carga inicial de datos de "Hoy" enviando el token de autorización
    cargarResumenFinanciero(token);
    cargarTopProductos(token);
    cargarAlertasStock(token);
});

// A. Consumir el resumen de dinero ingresado hoy (Dinámico)
async function cargarResumenFinanciero(token) {
    try {
        const response = await fetch(`${API_URL}/resumen`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
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
        const response = await fetch(`${API_URL}/alertas-stock`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`Ruta inválida o caída. Código del servidor: ${response.status}`);
        }

        const data = await response.json();
        
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
        document.getElementById('table-stock-alerts').innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">No se pudieron cargar las alertas. Verifica la ruta en tu Backend.</td></tr>`;
    }
}

// D. NUEVO: Consultar totales acumulados por rangos (Semana, Mes, Año)
async function consultarPeriodo(tipo) {
    const token = localStorage.getItem('token');
    const hoy = new Date(Date.now() - 6 * 60 * 60 * 1000); // Forzar ajuste horario de México
    let inicio = new Date(hoy);
    let fin = new Date(hoy);

    if (tipo === 'semanal') {
        const diaSemana = hoy.getDay();
        const distanciaAlLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
        inicio.setDate(hoy.getDate() + distanciaAlLunes);
        nombreArchivoReporte = `Reporte_Semanal_${hoy.toISOString().slice(0, 10)}.csv`;
    } else if (tipo === 'mensual') {
        inicio.setDate(1);
        nombreArchivoReporte = `Reporte_Mensual_${hoy.toISOString().slice(0, 7)}.csv`;
    } else if (tipo === 'anual') {
        inicio.setMonth(0, 1);
        nombreArchivoReporte = `Reporte_Anual_${hoy.getFullYear()}.csv`;
    }

    const fechaInicioStr = `${inicio.toISOString().slice(0, 10)} 00:00:00`;
    const fechaFinStr = `${fin.toISOString().slice(0, 10)} 23:59:59`;

    try {
        const response = await fetch(`${API_URL}/resumen?fechaInicio=${fechaInicioStr}&fechaFin=${fechaFinStr}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Error al consultar el periodo histórico.");
        
        const data = await response.json();
        datosUltimaConsulta = data; 

        // Actualizar etiquetas en la interfaz
        document.getElementById('lbl-periodo-ingresos').innerText = `$${parseFloat(data.resumen_general.ingresos_totales || 0).toFixed(2)}`;
        document.getElementById('lbl-periodo-tickets').innerText = data.resumen_general.total_transacciones || 0;
        
        // Habilitar botón de descarga si existen transacciones en el rango
        document.getElementById('btn-descargar-csv').disabled = (data.resumen_general.total_transacciones === 0);

    } catch (error) {
        console.error("Error en reporte histórico:", error);
    }
}

// E. NUEVO: Procesar la descarga de datos en formato Excel (CSV)
function descargarCSV() {
    if (!datosUltimaConsulta) return;

    const { periodo, resumen_general, desglose_pagos } = datosUltimaConsulta;

    // Prefijo \uFEFF para forzar codificación UTF-8 en Excel con acentos y caracteres especiales
    let csvContent = "\uFEFF"; 
    csvContent += `REPORTE DE VENTAS - HUERTO EL MAMEY\n`;
    csvContent += `Periodo:,${periodo.desde} al ${periodo.hasta}\n\n`;
    csvContent += `RESUMEN GENERAL\n`;
    csvContent += `Total Transacciones:,${resumen_general.total_transacciones}\n`;
    csvContent += `Ingresos Totales:,$${parseFloat(resumen_general.ingresos_totales).toFixed(2)}\n\n`;
    
    csvContent += `DESGLOSE POR MÉTODO DE PAGO\n`;
    csvContent += `Método de Pago,Cantidad de Ventas,Total Ingresado\n`;
    
    desglose_pagos.forEach(pago => {
        csvContent += `"${pago.metodo_pago}",${pago.cantidad_ventas},$${parseFloat(pago.total_ingresado).toFixed(2)}\n`;
    });

    // Inyección temporal de descarga en navegador
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", nombreArchivoReporte);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Botón de Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '../index.html';
});