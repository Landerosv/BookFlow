async function cargarDashboard(){
    const [prestamos, topLibros, conteo] = await Promise.all([
        obtenerPrestamosRecientes(),
        obtenerTopLibros(),
        obtenerConteo()
    ]);

    pintarPrestamosRecientes(prestamos);
    pintarTopLibros(topLibros);
    pintarConteo(conteo);
}

// Primero tiene que cargar para que todo pinte al mismo tiempo
async function obtenerPrestamosRecientes() {
    const { data, error } = await sp
        .from('prestamos')
        .select(`
            fecha_prestamo,
            estado,
            lectores ( nombre ),
            libros ( nombre )
            `)
        .order('fecha_prestamo', { ascending: false })
        .limit(6);

    if (error) {
        console.error('error cargando prestamos:', error);
        return [];
    }
    return data;
} //end ObtenerPrestamosRecientes

// relleno de la tabla de prestamos recientes
function pintarPrestamosRecientes(data) {
    const tbody = document.querySelector('.table-prin tbody');
    tbody.innerHTML = '';

    data.forEach(p => {
        const badgeClass = p.estado === 'En curso' ? 'badge-ok'
                            : p.estado === 'Vencido' ? 'badge-warn'
                            : 'badge-done';

        const fila = document.createElement('tr');
        fila.innerHTML = `
                <td class="cell-name">${p.lectores ? p.lectores.nombre : 'Sin lector'}</td>
                <td>${p.libros ? p.libros.nombre : 'Sin libro'}</td>
                <td>${new Date(p.fecha_prestamo).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td><span class="badge ${badgeClass}">${p.estado}</span></td>
        `;
        tbody.appendChild(fila);
    });
}

// Top libros goat supreme +1000 de aura
// nota: para esto hice una vista en supa llamada top_libros
async function obtenerTopLibros() {
    const { data, error } = await sp
        .from('top_libros')
        .select('*');

    if (error) {
        console.error('error cargando top libros:', error);
        return [];
    }
    return data;
}

function pintarTopLibros(data) {
    const lista = document.querySelector('.top-books-list');
    lista.innerHTML = '';

    data.forEach((libro, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="rank-badge">${index + 1}</span>
            <div>
            <p class="rank-title">${libro.libro}</p>
            <p class="rank-sub">${libro.autor}</p>
            </div>
        `;
        lista.appendChild(li);
    });
}

// Conteo de cositas
async function obtenerConteo(){
    const [libros, lectores, prestamos, multas] = await Promise.all([
        sp.from('libros').select('*', { count: 'exact', head: true }),
        sp.from('lectores').select('*', { count: 'exact', head: true }),
        sp.from('prestamos').select('*', { count: 'exact', head: true }),
        sp.from('multas').select('*', { count: 'exact', head: true })
    ]);

    return [libros.count, lectores.count, prestamos.count, multas.count];
}

function pintarConteo(valores){
    document.querySelectorAll('.stats-num').forEach((el, i) => {
        el.textContent = valores[i];
        el.classList.remove('skeleton');
    });
}