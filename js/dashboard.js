const API_URL = 'http://localhost:3000/api/reportes';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const usuarioJson = localStorage.getItem('usuario');

    // 1. Verificar protección de la página en el Frontend
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

    // Cargar los reportes financieros e inventarios de XAMPP
    cargarResumenFinanciero(token);
    cargarTopProductos(token);
    cargarAlertasStock(token);
});

// A. Consumir el resumen de dinero ingresado hoy
async function cargarResumenFinanciero(token) {
    try {
        const response = await fetch(`${API_URL}/resumen`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('lbl-ingresos-hoy').innerText = `$${parseFloat(data.resumen_general.ingresos_totales).toFixed(2)}`;
            document.getElementById('lbl-tickets-hoy').innerText = data.resumen_general.total_transacciones;
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
        const data = await response.json();
        
        const tbody = document.getElementById('table-top-products');
        tbody.innerHTML = '';

        if(data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-stone-400">No hay ventas registradas aún.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-3 font-medium">${item.producto}</td>
                <td class="p-3 text-center">${parseFloat(item.total_amount_sold || item.total_cantidad_vendida)} ${item.unidad_medida}</td>
                <td class="p-3 text-right font-bold text-emerald-600">$${parseFloat(item.total_recaudado).toFixed(2)}</td>
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
        const data = await response.json();
        
        document.getElementById('lbl-alertas-count').innerText = `${data.productos_criticos} productos`;
        
        const tbody = document.getElementById('table-stock-alerts');
        tbody.innerHTML = '';

        if(data.lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-emerald-600 font-medium">✅ Todo el inventario está en niveles óptimos.</td></tr>`;
            return;
        }

        data.lista.forEach(item => {
            const row = document.createElement('tr');
            row.className = "bg-red-50 text-red-900 font-medium";
            row.innerHTML = `
                <td class="p-3">${item.nombre}</td>
                <td class="p-3 text-center font-bold">${item.stock_actual} ${item.unidad_medida}</td>
                <td class="p-3 text-center text-stone-500">${item.stock_minimo}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error al cargar alertas:', error);
    }
}

// Botón de Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '../index.html';
});