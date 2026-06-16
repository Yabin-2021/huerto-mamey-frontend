const API_URL = 'http://localhost:3000/api/auth';

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue

    const correo = document.getElementById('correo').value;
    const contrasena = document.getElementById('contrasena').value;
    const alertError = document.getElementById('alert-error');

    // Limpiar alertas previas
    alertError.classList.add('hidden');
    alertError.innerText = '';

    try {
        // Petición POST a tu Backend en Node.js
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ correo, contrasena })
        });

        const data = await response.json();

        if (!response.ok) {
            // Si el servidor responde con un error (401, 500, etc.) lanzado en el Backend
            throw new Error(data.error || 'Ocurrió un error al iniciar sesión');
        }

        // ¡ÉXITO! Guardamos el token y datos del usuario en el navegador
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));

        // Redirección inteligente según el rol del usuario
        if (data.usuario.rol === 'administrador') {
            window.location.href = 'views/dashboard.html';
        } else {
            window.location.href = 'views/pos.html';
        }

    } catch (error) {
        // Mostrar el error en la interfaz gráfica
        alertError.innerText = error.message;
        alertError.classList.remove('hidden');
    }
});