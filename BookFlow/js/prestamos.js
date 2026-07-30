const prestamos = (() => {
    let formPrestamo, btnSubmitPrestamo, btnCancelarPrestamo;
    let tablaBody, estadoMensaje, contenedorAlerta;
    let listaPrestamos = [];
    let idEnEdicion = null;


    async function init() {
        tablaBody = document.getElementById('tabla-prestamos-body');
        estadoMensaje = document.getElementById('estado-mensaje-prestamo');
        contenedorAlerta = document.getElementById('contenedor-alerta');
        formPrestamo = document.getElementById('form-prestamo');
        btnSubmitPrestamo = document.querySelector('button[form="form-prestamo"]');
        btnCancelarPrestamo = document.getElementById('cancelar-edicion-prestamo');
        idEnEdicion = null;

        btnCancelarPrestamo.addEventListener("click", cancelarEdicionPrestamo);
        formPrestamo.addEventListener('submit', guardarPrestamo);

        await cargarPrestamos();
    } 

    function mostrarMensaje(texto, esError) {
        if (!estadoMensaje || !contenedorAlerta) return;

        if (!texto) {
            contenedorAlerta.style.display = 'none';
            return;
        }

        estadoMensaje.textContent = texto;
        contenedorAlerta.style.display = 'flex';

        contenedorAlerta.classList.remove('alerta-error', 'alerta-exito');

        if (esError) {
            contenedorAlerta.classList.add('alerta-error');
        } else {
            contenedorAlerta.classList.add('alerta-exito');
            
            setTimeout(() => {
                contenedorAlerta.style.display = 'none';
            }, 3000);
        }
    }

    function escapeHTML(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    async function cargarPrestamos() {
        try {
            const { data, error } = await sp
                .from('prestamos')
                .select('*')
                .order('fecha_prestamo', { ascending: false });

            if (error) {
                mostrarMensaje('Error: ' + error.message, true);
                return;
            }
            listaPrestamos = data;
            renderTabla();
        } catch (err) {
            mostrarMensaje('Error de conexión.', true);
        }
    }

function renderTabla() {
        if (!tablaBody) return;
        tablaBody.innerHTML = '';

        const fechaActual = new Date();
        const hoy = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}-${String(fechaActual.getDate()).padStart(2, '0')}`;

        listaPrestamos.forEach((prestamo) => {
            const fila = document.createElement('tr');

            let estadoVisual = escapeHTML(prestamo.estado);
            if (prestamo.estado === 'En curso' && prestamo.fecha_devolucion < hoy) {
                estadoVisual = '<span style="color: #dc2626; font-weight: bold;">Atrasado</span>';
            }

            fila.innerHTML = `
                <td>${escapeHTML(prestamo.id)}</td>
                <td>${escapeHTML(prestamo.id_lector)}</td>
                <td>${escapeHTML(prestamo.isbn)}</td>
                <td>${escapeHTML(prestamo.fecha_prestamo)}</td>
                <td>${escapeHTML(prestamo.fecha_devolucion)}</td>
                <td>${estadoVisual}</td>
                <td class="acciones-cell">
                    ${prestamo.estado === 'Devuelto' 
                        ? `<button type="button" class="icon-btn" disabled style="opacity: 0.5; cursor: not-allowed;" title="Préstamo finalizado">
                                <i data-lucide="square-pen"></i>
                           </button>`
                        : `<button type="button" class="icon-btn editar" data-id="${prestamo.id}" title="Editar">
                                <i data-lucide="square-pen"></i>
                           </button>`
                    }
                </td>
            `;
            tablaBody.appendChild(fila);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();

        tablaBody.querySelectorAll('.editar').forEach((btn) =>
            btn.addEventListener('click', () => cargarPrestamoEnFormulario(btn.dataset.id))
        );
    }

    async function guardarPrestamo(e) {  
        e.preventDefault(); 

        const idLector = document.getElementById('usuario-id').value.trim();
        const isbn = document.getElementById('libro-isbn').value.trim();
        const fechaPrestamo = document.getElementById('fecha-prestamo').value;
        const fechaDevolucion = document.getElementById('fecha-devolucion').value;
        const estadoDevolucion = document.getElementById('estado-devolucion').value;
        
        const fechaActual = new Date();
        const año = fechaActual.getFullYear();
        const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaActual.getDate()).padStart(2, '0');
        const fechaHoy = `${año}-${mes}-${dia}`;

        if (estadoDevolucion === 'Devuelto' && fechaHoy < fechaDevolucion) {
            mostrarMensaje('No puedes marcar como devuelto un libro antes de su fecha límite.', true);
            return;
        }

        if (!idLector || !isbn || !fechaPrestamo || !fechaDevolucion || !estadoDevolucion) {
            mostrarMensaje('Todos los campos son obligatorios. Por favor, llénalos todos.', true);
            return;
        }

        if (!idEnEdicion && fechaPrestamo < fechaHoy) {
            mostrarMensaje('La fecha de préstamo no puede ser anterior al día de hoy.', true);
            return;
        }

        if (fechaDevolucion < fechaPrestamo) {
            mostrarMensaje('La fecha de devolución no puede ser anterior a la de préstamo.', true);
            return;
        }

        let generarMulta = false;
        let montoMulta = 0;

        if (estadoDevolucion === 'Devuelto' && fechaHoy > fechaDevolucion) {
            const fLimite = new Date(fechaDevolucion + 'T00:00:00'); 
            const fHoy = new Date(fechaHoy + 'T00:00:00');
            const msPorDia = 1000 * 60 * 60 * 24; 
            
            const diasRetraso = Math.floor((fHoy - fLimite) / msPorDia);
            
            generarMulta = true;
            montoMulta = diasRetraso * 25; 
        }

        btnSubmitPrestamo.disabled = true;
    
        try {
            const datosPrestamo = {
                id_lector: idLector,
                isbn: isbn,
                fecha_prestamo: fechaPrestamo,
                fecha_devolucion: fechaDevolucion,
                estado: estadoDevolucion
            };

            let errorSupabase;
            let prestamoIdGenerado = idEnEdicion; 

            if (idEnEdicion) {
                const { error } = await sp
                    .from('prestamos')
                    .update(datosPrestamo)
                    .eq('id', idEnEdicion);
                errorSupabase = error;
            } else {

                const { data, error } = await sp
                    .from('prestamos')
                    .insert([datosPrestamo])
                    .select();
                errorSupabase = error;
                if (data && data.length > 0) {
                    prestamoIdGenerado = data[0].id;
                }
            }
 
            if (errorSupabase) {
                if (errorSupabase.code === '23503') {
                    mostrarMensaje('Error: El ISBN o el Lector no existen en la base de datos.', true);
                } else {
                    mostrarMensaje('Error al guardar: ' + errorSupabase.message, true);
                }
                return;
            }

            if (!errorSupabase && generarMulta) {
                // Obtenemos el ID del préstamo actual de forma segura
                const idParaMulta = prestamoIdGenerado || document.getElementById('prestamo-id').value;

                const { error: errorMulta } = await sp
                    .from('multas')
                    .insert([{
                        id_prestamo: idParaMulta,
                        monto: montoMulta,
                        fecha_generada: fechaHoy,
                        estado: 'Pendiente' // <-- Corregido al nombre real de tu columna
                    }]);
                
                if (errorMulta) {
                    console.error("Error al insertar multa en Supabase:", errorMulta.message);
                    mostrarMensaje('Préstamo actualizado, pero falló la generación de la multa: ' + errorMulta.message, true);
                } else {
                    mostrarMensaje(`Devolución registrada con retraso. Se generó una multa de $${montoMulta} pesos.`, false);
                }
            } else {
                mostrarMensaje(idEnEdicion ? 'Préstamo actualizado correctamente.' : 'Préstamo registrado.', false);
            }
 
            cancelarEdicionPrestamo(); 
            cargarPrestamos();         

        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        } finally {
            btnSubmitPrestamo.disabled = false; 
        }
    }


    function cargarPrestamoEnFormulario(id) {
        const prestamo = listaPrestamos.find((p) => String(p.id) === String(id));
        if (!prestamo) return;

        if (prestamo.estado === 'Devuelto') {
            mostrarMensaje('Este préstamo ya finalizó y no puede ser modificado.', true);
            return;
        }
 
        idEnEdicion = id;
        btnCancelarPrestamo.disabled = false; 

        document.getElementById('prestamo-id').value = prestamo.id;
        document.getElementById('usuario-id').value = prestamo.id_lector;
        document.getElementById('libro-isbn').value = prestamo.isbn;
        document.getElementById('fecha-prestamo').value = prestamo.fecha_prestamo;
        document.getElementById('fecha-devolucion').value = prestamo.fecha_devolucion;
        document.getElementById('estado-devolucion').value = prestamo.estado;
        
        const usuarioInput = document.getElementById("usuario-id"); 
        usuarioInput.disabled = true; 
        
        const isbnInput = document.getElementById("libro-isbn"); 
        isbnInput.disabled = true; 

        const fechaPrestamo = document.getElementById("fecha-prestamo");
        fechaPrestamo.disabled = true;

        const fechaDev = document.getElementById("fecha-devolucion");
        fechaDev.disabled = true;
 
        formPrestamo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

function cancelarEdicionPrestamo() {
        btnCancelarPrestamo.disabled = true; 
        
        const usuarioInput = document.getElementById("usuario-id"); 
        usuarioInput.disabled = false; 
        usuarioInput.style.cursor = "text"; 

        const isbnInput = document.getElementById("libro-isbn"); 
        isbnInput.disabled = false; 
        isbnInput.style.cursor = "text";
        
        const fechaPrestamo = document.getElementById("fecha-prestamo");
        fechaPrestamo.disabled = false;
        fechaPrestamo.style.cursor = "text";

        const fechaDev = document.getElementById("fecha-devolucion");
        fechaDev.disabled = false;
        fechaDev.style.cursor = "text";
        
        idEnEdicion = null; 
        formPrestamo.reset(); 

        document.getElementById('prestamo-id').value = '';

        document.getElementById('estado-devolucion').value = 'Selecciona un estado';
        mostrarMensaje('', false); 
    }

    return { init };

})();