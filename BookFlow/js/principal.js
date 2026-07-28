    
     document.addEventListener('DOMContentLoaded', () => {
        cargarPrestamosRecientes();
        cargarTopLibros();
        cargarConteo();
    }); 

    // relleno de la tabla de prestamos recientes

    async function cargarPrestamosRecientes() {
        const { data, error } = await sp
        .from('prestamos')
        .select(`
            fecha_prestamo,
            estado,
            lectores ( nombre ),
            libros ( nombre )
            `)
        .order( 'fecha_prestamo', { ascending: false } )
        .limit(6);

        if ( error ){
            console.error('error cargando prestamos:', error)
            return;
        }

        const tbody = document.querySelector(' .table-prin tbody ')
        tbody.innerHTML = '';

        data.forEach(p => {
            const badgeClass = p.estado === 'En curso' ? 'badge-ok'
                                : p.estado === 'Vencido' ? 'badge-warn'
                                : 'badge-done';
            
            const fila = document.createElement ('tr');
            fila.innerHTML = `

                <td class="cell-name">${p.lectores.nombre}</td>
                <td>${p.libros.nombre}</td>
                <td>${new Date(p.fecha_prestamo).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td><span class="badge ${badgeClass}">${p.estado}</span></td>

            `;
            tbody.appendChild(fila)
        });
    } //end cargarPrestamosRecientes

    // top libros goat supreme +1000 de aura
    // nota: para esto hice una vista en supa llamada top_libros

    async function cargarTopLibros(){
        const { data,error } = await sp
        .from( 'top_libros' )
        .select('*');

        if (error) {
            console.error('error cargando top libros:', error);
            return;
        }

        const lista = document.querySelector('.top-books-list');
        lista.innerHTML = '';

        data.forEach(( libro, index )  => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="rank-badge">${index + 1}</span>
                <div>
                <p class="rank-title">${libro.libro}</p>
                <p class="rank-sub">${libro.autor}</p>
                </div>
            `;
        lista.appendChild(li);
        })

    }// end cargar libros
    
    /// conteo de cositas

    async function cargarConteo(){

        const { count: totalLibros } = await sp
        .from('libros')
        .select('*', { count: 'exact', head: true })

        const { count: totalLectores } = await sp
        .from('lectores')
        .select('*', { count: 'exact', head: true })

        const { count: totalPrestamos } = await sp
        .from('prestamos')
        .select('*', { count: 'exact', head: true })

        const { count: totalmultas } = await sp
        .from('multas')
        .select('*', { count: 'exact', head: true })

        document.querySelectorAll('.stats-num')[0].textContent = totalLibros;
        document.querySelectorAll('.stats-num')[1].textContent = totalLectores;
        document.querySelectorAll('.stats-num')[2].textContent = totalPrestamos;
        document.querySelectorAll('.stats-num')[3].textContent = totalmultas;
   
    }// end cargar conteo




