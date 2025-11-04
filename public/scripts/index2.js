let isAdmin = false;

// Toggle menú móvil
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        
        // Cerrar menú al hacer click en un enlace
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }
});

// Verificar autenticación y obtener datos del usuario al cargar la página
async function verificarAuth() {
    try {
        const response = await fetch('/perfil');
        
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        
        const data = await response.json();
        isAdmin = data.isAdmin;
        
        // Actualizar todos los displays de username (desktop y mobile)
        const usernameDisplays = document.querySelectorAll('#username-display');
        usernameDisplays.forEach(display => {
            display.textContent = `Hola, ${data.usuario}`;
        });
        
    } catch (error) {
        console.error('Error:', error);
        window.location.href = '/';
    }
}

// Función para cargar todos los pedidos (ADMIN)
async function cargarPedidos() {
    try {
        const response = await fetch('/api/pedidos');
        
        if (!response.ok) {
            throw new Error('Error al cargar pedidos');
        }
        
        const pedidos = await response.json();
        const container = document.getElementById('pedidos-container');
        
        if (pedidos.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-2xl text-stone-600 mb-4">📦</p>
                    <p class="text-lg text-stone-600">No hay pedidos registrados</p>
                </div>
            `;
            actualizarEstadisticas([]);
            return;
        }
        
        // Actualizar estadísticas
        actualizarEstadisticas(pedidos);
        
        // Agrupar pedidos por usuario_id y fecha_pedido (hasta el minuto)
        const pedidosAgrupados = {};
        pedidos.forEach(pedido => {
            const usuarioId = pedido.usuario_id || 0;
            const usuarioNombre = pedido.username || 'Invitado';
            const fechaPedido = pedido.fecha_pedido;
            
            // Agrupar por fecha hasta el minuto (ignorar segundos y milisegundos)
            const fechaObj = new Date(fechaPedido);
            const fechaKey = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth()+1).padStart(2,'0')}-${String(fechaObj.getDate()).padStart(2,'0')} ${String(fechaObj.getHours()).padStart(2,'0')}:${String(fechaObj.getMinutes()).padStart(2,'0')}`;
            const key = `${usuarioId}_${fechaKey}`;
            
            if (!pedidosAgrupados[key]) {
                pedidosAgrupados[key] = {
                    usuario: usuarioNombre,
                    usuario_id: usuarioId,
                    fecha: fechaObj.toLocaleString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    fecha_raw: fechaPedido,
                    items: [],
                    total: 0
                };
            }
            
            pedidosAgrupados[key].items.push({
                id: pedido.id,
                nombre: pedido.nombre,
                precio: parseFloat(pedido.precio),
                cantidad: parseInt(pedido.cantidad)
            });
            pedidosAgrupados[key].total += parseFloat(pedido.precio) * parseInt(pedido.cantidad);
        });
        
        const pedidosArray = Object.values(pedidosAgrupados).sort((a, b) => 
            new Date(b.fecha_raw) - new Date(a.fecha_raw)
        );
        
        container.innerHTML = `
            <table class="w-full">
                <thead class="bg-stone-100">
                    <tr>
                        <th class="px-4 py-3 text-left text-sm font-light">Usuario</th>
                        <th class="px-4 py-3 text-left text-sm font-light">Fecha</th>
                        <th class="px-4 py-3 text-left text-sm font-light">Productos</th>
                        <th class="px-4 py-3 text-right text-sm font-light">Total</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-stone-200">
                    ${pedidosArray.map((pedido, index) => `
                        <tr class="hover:bg-stone-50">
                            <td class="px-4 py-3">
                                <span class="font-light">${pedido.usuario_id === 0 ? '👤 Invitado' : '👤 ' + pedido.usuario}</span>
                                <span class="text-xs text-stone-500 block">${pedido.usuario_id === 0 ? 'Sin cuenta' : 'ID: ' + pedido.usuario_id}</span>
                            </td>
                            <td class="px-4 py-3 text-sm text-stone-600">${pedido.fecha}</td>
                            <td class="px-4 py-3">
                                <button onclick="toggleDetalles(${index})" class="text-blue-600 hover:text-blue-800 text-sm">
                                    📋 Ver ${pedido.items.length} producto(s)
                                </button>
                                <div id="detalles-${index}" class="hidden mt-2 pl-4 border-l-2 border-blue-200">
                                    ${pedido.items.map(item => `
                                        <div class="text-sm py-1">
                                            <span class="font-light">${item.nombre}</span>
                                            <span class="text-stone-600"> x${item.cantidad}</span>
                                            <span class="text-stone-500"> ($${item.precio.toFixed(2)} c/u)</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </td>
                            <td class="px-4 py-3 text-right">
                                <span class="text-lg font-light text-green-700">$${pedido.total.toFixed(2)}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        window.pedidosCache = pedidosArray;
        
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        document.getElementById('pedidos-container').innerHTML = `
            <div class="text-center py-12">
                <p class="text-red-600">Error al cargar los pedidos. Intenta recargar la página.</p>
            </div>
        `;
    }
}

function actualizarEstadisticas(pedidos) {
    const pedidosUnicos = {};
    pedidos.forEach(p => {
        const key = `${p.usuario_id || 0}_${p.fecha_pedido}`;
        if (!pedidosUnicos[key]) {
            pedidosUnicos[key] = { usuario_id: p.usuario_id || 0 };
        }
    });
    
    const totalPedidos = Object.keys(pedidosUnicos).length;
    const totalProductos = pedidos.reduce((sum, p) => sum + parseInt(p.cantidad || 0), 0);
    const clientesUnicos = new Set(pedidos.map(p => p.usuario_id).filter(id => id && id !== 0));
    const totalClientes = clientesUnicos.size;
    const totalIngresos = pedidos.reduce((sum, p) => sum + (parseFloat(p.precio || 0) * parseInt(p.cantidad || 0)), 0);
    
    document.getElementById('total-pedidos').textContent = totalPedidos;
    document.getElementById('total-productos-vendidos').textContent = totalProductos;
    document.getElementById('total-clientes').textContent = totalClientes;
    document.getElementById('total-ingresos').textContent = `$${totalIngresos.toFixed(2)}`;
}

function toggleDetalles(index) {
    const detalles = document.getElementById(`detalles-${index}`);
    detalles.classList.toggle('hidden');
}

function editarProducto(id, nombre, descripcion, precio, cantidad, imagen_url) {
    document.getElementById('form-titulo').textContent = 'Editar Pan';
    document.getElementById('producto-id').value = id;
    document.getElementById('nombre').value = nombre;
    document.getElementById('descripcion').value = descripcion || '';
    document.getElementById('precio').value = precio;
    document.getElementById('cantidad').value = cantidad;
    document.getElementById('imagen_url').value = imagen_url || '';
    document.getElementById('agregarBtn').textContent = 'Actualizar Pan';
    document.getElementById('cancelarBtn').classList.remove('hidden');
    document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('cancelarBtn').addEventListener('click', cancelarEdicion);

function cancelarEdicion() {
    document.getElementById('agregarPanForm').reset();
    document.getElementById('producto-id').value = '';
    document.getElementById('form-titulo').textContent = 'Agregar Nuevo Pan';
    document.getElementById('agregarBtn').textContent = 'Agregar Pan';
    document.getElementById('cancelarBtn').classList.add('hidden');
    document.getElementById('mensaje').classList.add('hidden');
}

async function eliminarProducto(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"?`)) return;

    try {
        const response = await fetch(`/api/productos/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.mensaje || 'Producto eliminado correctamente');
            await cargarProductos();
        } else {
            alert(data.error || 'Error al eliminar el producto');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

async function cargarProductos() {
    try {
        const response = await fetch('/api/productos');
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const productos = await response.json();
        const container = document.getElementById('productos-container');
        container.innerHTML = '';
        
        productos.forEach(producto => {
            const article = document.createElement('article');
            article.className = 'bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow';
            const cantidadDisponible = producto.cantidad || 0;
            const agotado = cantidadDisponible <= 0;
            
            const nombreEscapado = producto.nombre.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const descripcionEscapada = (producto.descripcion || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const imagenUrl = producto.imagen_url || '';
            
            article.innerHTML = `
                <div class="aspect-square overflow-hidden bg-stone-100 relative">
                    <img src="${producto.imagen_url || 'https://via.placeholder.com/400?text=Sin+Imagen'}" 
                         alt="${producto.nombre}" 
                         class="w-full h-full object-cover hover:scale-105 transition-transform duration-500 ${agotado ? 'opacity-50' : ''}"
                         onerror="this.src='https://via.placeholder.com/400?text=Sin+Imagen'">
                    ${agotado ? '<div class="absolute inset-0 flex items-center justify-center bg-black/50"><span class="text-white text-2xl font-bold">AGOTADO</span></div>' : ''}
                </div>
                <div class="p-6">
                    <h3 class="text-2xl font-light mb-2">${producto.nombre}</h3>
                    <p class="text-stone-600 mb-2">${producto.descripcion || 'Sin descripción disponible'}</p>
                    <p class="text-sm ${agotado ? 'text-red-600 font-semibold' : 'text-green-600'} mb-4">
                        ${agotado ? 'Sin stock' : `Disponible: ${cantidadDisponible} unidades`}
                    </p>
                    <div class="flex justify-between items-center mb-4">
                        <p class="text-xl font-light">$${parseFloat(producto.precio).toFixed(2)}</p>
                    </div>
                    ${isAdmin ? `
                        <div class="flex gap-2">
                            <button data-id="${producto.id}" data-nombre="${nombreEscapado}" data-descripcion="${descripcionEscapada}" data-precio="${producto.precio}" data-cantidad="${cantidadDisponible}" data-imagen="${imagenUrl}" class="btn-editar flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">✏️ Editar</button>
                            <button data-id="${producto.id}" data-nombre="${nombreEscapado}" class="btn-eliminar flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">🗑️ Eliminar</button>
                        </div>
                    ` : ''}
                </div>
            `;
            
            container.appendChild(article);
        });
        
        // Agregar event listeners a los botones
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const nombre = this.dataset.nombre.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
                const descripcion = this.dataset.descripcion.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
                const precio = this.dataset.precio;
                const cantidad = this.dataset.cantidad;
                const imagen = this.dataset.imagen;
                
                editarProducto(id, nombre, descripcion, precio, cantidad, imagen);
            });
        });
        
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const nombre = this.dataset.nombre.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
                
                eliminarProducto(id, nombre);
            });
        });
        
        if (productos.length === 0) {
            container.innerHTML = '<p class="text-center text-stone-600 col-span-full text-lg">No hay productos disponibles.</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('productos-container').innerHTML = '<p class="text-center text-red-600 col-span-full text-lg">Error al cargar productos.</p>';
    }
}

// Función para cerrar sesión (usando delegación de eventos)
async function cerrarSesion(e) {
    e.preventDefault();
    if (!confirm('¿Cerrar sesión?')) return;
    
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.mensaje || 'Sesión cerrada');
            window.location.href = '/';
        } else {
            alert('Error al cerrar sesión');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

// Usar delegación de eventos para manejar clicks en botones de logout (desktop y móvil)
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'logoutBtn') {
        cerrarSesion(e);
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    await verificarAuth();
    await cargarProductos();
    await cargarPedidos();
});

document.getElementById('agregarPanForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const productoId = document.getElementById('producto-id').value;
    const isEditing = productoId !== '';
    const url = isEditing ? `/api/productos/${productoId}` : '/api/productos';
    const method = isEditing ? 'PUT' : 'POST';
    const agregarBtn = document.getElementById('agregarBtn');
    const mensajeDiv = document.getElementById('mensaje');
    
    agregarBtn.disabled = true;
    agregarBtn.textContent = isEditing ? 'Actualizando...' : 'Agregando...';
    agregarBtn.classList.add('opacity-50', 'cursor-not-allowed');
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nombre: document.getElementById('nombre').value,
                descripcion: document.getElementById('descripcion').value,
                precio: parseFloat(document.getElementById('precio').value),
                cantidad: parseInt(document.getElementById('cantidad').value),
                imagen_url: document.getElementById('imagen_url').value
            })
        });
        
        const data = await response.json();
        mensajeDiv.classList.remove('hidden');
        
        if (response.ok) {
            mensajeDiv.className = 'mb-4 p-3 rounded-lg bg-green-100 text-green-800 border border-green-300';
            mensajeDiv.textContent = data.mensaje || (isEditing ? 'Actualizado' : 'Agregado');
            cancelarEdicion();
            await cargarProductos();
            setTimeout(() => mensajeDiv.classList.add('hidden'), 3000);
        } else {
            mensajeDiv.className = 'mb-4 p-3 rounded-lg bg-red-100 text-red-800 border border-red-300';
            mensajeDiv.textContent = data.error || 'Error';
        }
    } catch (error) {
        console.error('Error:', error);
        mensajeDiv.classList.remove('hidden');
        mensajeDiv.className = 'mb-4 p-3 rounded-lg bg-red-100 text-red-800 border border-red-300';
        mensajeDiv.textContent = 'Error al conectar con el servidor';
    } finally {
        agregarBtn.disabled = false;
        agregarBtn.textContent = isEditing ? 'Actualizar Pan' : 'Agregar Pan';
        agregarBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});
