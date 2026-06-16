const API_URL = 'https://huerto-mamey-backend.onrender.com/';
let modoEdicion = false;

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../index.html';
        return;
    }
    
    // Cargar la tabla al iniciar
    listarProductos();
});

// 1. OBTENER Y RENDERIZAR PRODUCTOS
async function listarProductos() {
    try {
        const response = await fetch(API_URL);
        const productos = await response.json();
        
        const tbody = document.getElementById('table-inventory');
        tbody.innerHTML = '';

        productos.forEach(p => {
            const esStockBajo = p.stock_actual <= p.stock_minimo;
            const row = document.createElement('tr');
            row.className = esStockBajo ? 'bg-amber-50/70' : 'hover:bg-stone-50';
            
            row.innerHTML = `
                <td class="p-3 font-medium text-stone-900">
                    ${p.nombre}
                    <div class="text-[11px] text-stone-400 font-normal">U.M: ${p.unidad_medida}</div>
                </td>
                <td class="p-3 text-center"><span class="bg-stone-100 px-2 py-0.5 rounded text-xs text-stone-600 font-medium">${p.categoria_nombre}</span></td>
                <td class="p-3 text-right font-bold">$${parseFloat(p.precio_venta).toFixed(2)}</td>
                <td class="p-3 text-center">
                    <span class="font-bold ${esStockBajo ? 'text-red-600 font-black' : 'text-stone-700'}">
                        ${p.stock_actual}
                    </span>
                </td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="prepararEdicion(${JSON.stringify(p).replace(/"/g, '&quot;')})" 
                        class="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-2 py-1 rounded transition cursor-pointer">✏️ Editar</button>
                    <button onclick="eliminarProducto(${p.id})" 
                        class="text-red-600 hover:text-red-800 font-medium text-xs bg-red-50 px-2 py-1 rounded transition cursor-pointer">🗑️ Baja</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error al listar inventario:', error);
    }
}

// 2. ENVIAR FORMULARIO (CREAR O EDITAR)
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const id = document.getElementById('producto-id').value;
    const payload = {
        nombre: document.getElementById('nombre').value,
        categoria_id: parseInt(document.getElementById('categoria_id').value),
        unidad_medida: document.getElementById('unidad_medida').value,
        precio_compra: parseFloat(document.getElementById('precio_compra').value),
        precio_venta: parseFloat(document.getElementById('precio_venta').value),
        stock_actual: parseFloat(document.getElementById('stock_actual').value),
        stock_minimo: parseFloat(document.getElementById('stock_minimo').value)
    };

    let url = API_URL;
    let method = 'POST';

    if (modoEdicion) {
        url = `${API_URL}/${id}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert(modoEdicion ? '☕ Producto actualizado con éxito' : '☕ Producto agregado al inventario');
            limpiarFormulario();
            listarProductos();
        } else {
            const data = await response.json();
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        alert('Error en la comunicación con el servidor.');
    }
});

// 3. PREPARAR LOS CAMPOS PARA EDICIÓN
window.prepararEdicion = function(p) {
    modoEdicion = true;
    document.getElementById('form-title').innerText = '✏️ Editar Datos de Café';
    document.getElementById('btn-guardar').innerText = 'Actualizar Cambios';
    document.getElementById('btn-cancelar').classList.remove('hidden');

    document.getElementById('producto-id').value = p.id;
    document.getElementById('nombre').value = p.nombre;
    document.getElementById('categoria_id').value = p.categoria_id;
    document.getElementById('unidad_medida').value = p.unidad_medida;
    document.getElementById('precio_compra').value = p.precio_compra;
    document.getElementById('precio_venta').value = p.precio_venta;
    document.getElementById('stock_actual').value = p.stock_actual;
    document.getElementById('stock_minimo').value = p.stock_minimo;
};

// 4. ELIMINACIÓN LOGICA (BAJA)
window.eliminarProducto = async function(id) {
    if (!confirm('¿Estás seguro de que deseas dar de baja este producto del catálogo?')) return;
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert('Producto removido con éxito.');
            listarProductos();
        }
    } catch (error) {
        console.error('Error al remover producto:', error);
    }
};

document.getElementById('btn-cancelar').addEventListener('click', limpiarFormulario);

function limpiarFormulario() {
    modoEdicion = false;
    document.getElementById('product-form').reset();
    document.getElementById('producto-id').value = '';
    document.getElementById('form-title').innerText = '🌱 Registrar Nuevo Café';
    document.getElementById('btn-guardar').innerText = 'Guardar Producto';
    document.getElementById('btn-cancelar').classList.add('hidden');
}

// Cierre de sesión
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '../index.html';
});