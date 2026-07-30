const multas = (() => {
    let tablaBody, estadoMensaje;
    let formMulta, btnSubmitMulta, btnCancelarMulta;
    let listaMultas = [];
    let idEnEdicion = null;

    async function init() {
        tablaBody = document.getElementById('tabla-multas-body');
        estadoMensaje = document.getElementById('estado-mensaje-multa');
        
        formMulta = document.getElementById('form-multa');
        btnSubmitMulta = document.querySelector('button[form="form-multa"]');
        btnCancelarMulta = document.getElementById('cancelar-edicion-multa');
        
        idEnEdicion = null;

        formMulta.addEventListener('submit', guardarMulta);
        btnCancelarMulta.addEventListener("click", cancelarEdicionMulta);

        await cargarMultas();
    }

    function escapeHTML(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    async function cargarMultas() {
        try {

            const { data, error } = await sp
                .from('multas')
                .select('*')
                .order('id_multa', { ascending: false });

            if (error) {
                console.error('Error al cargar multas:', error.message);
                return;
            }
            
            listaMultas = data;
            renderTabla();
        } catch (err) {
            console.error('Error de conexión:', err);
        }
    }

    function renderTabla() {
        if (!tablaBody) return;
        tablaBody.innerHTML = '';

        listaMultas.forEach((multa) => {
            const fila = document.createElement('tr');
            

            const fechaPagadaText = multa.fecha_pagada ? escapeHTML(multa.fecha_pagada) : '---';
            

            let estadoVisual = escapeHTML(multa.estado);
            if (multa.estado === 'Pendiente') {
                estadoVisual = `<span style="color: #ea580c; font-weight: bold;">Pendiente</span>`;
            } else if (multa.estado === 'Pagada') {
                estadoVisual = `<span style="color: #16a34a; font-weight: bold;">Pagada</span>`;
            }


            fila.innerHTML = `
                <td>${escapeHTML(multa.id_multa)}</td>
                <td>${escapeHTML(multa.id_prestamo)}</td>
                <td>$${escapeHTML(multa.monto)}</td>
                <td>${escapeHTML(multa.fecha_generada)}</td>
                <td>${fechaPagadaText}</td>
                <td>${estadoVisual}</td>
                <td class="acciones-cell">
                    ${multa.estado === 'Pagada' 
                        ? `<button type="button" class="icon-btn" disabled style="opacity: 0.5; cursor: not-allowed;" title="Multa saldada">
                                <i data-lucide="square-pen"></i>
                           </button>`
                        : `<button type="button" class="icon-btn editar" data-id="${multa.id_multa}" title="Editar estado">
                                <i data-lucide="square-pen"></i>
                           </button>`
                    }
                </td>
            `;
            tablaBody.appendChild(fila);
        });


        if (typeof lucide !== 'undefined') lucide.createIcons();

        tablaBody.querySelectorAll('.editar').forEach((btn) =>
            btn.addEventListener('click', () => cargarMultaEnFormulario(btn.dataset.id))
        );
    }

    function cargarMultaEnFormulario(id) {
        const multa = listaMultas.find((m) => String(m.id_multa) === String(id));
        if (!multa) return;

        if (multa.estado === 'Pagada') {
            estadoMensaje.textContent = 'Esta multa ya fue pagada y el registro está cerrado.';
            estadoMensaje.className = 'error';
            return;
        }

        idEnEdicion = id;
        if (btnCancelarMulta) btnCancelarMulta.disabled = false; 

        document.getElementById('multa-id').value = multa.id_multa;
        document.getElementById('id-multa-display').value = multa.id_multa;
        
        document.getElementById('status-multa').value = multa.estado;

        formMulta.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function cancelarEdicionMulta() {
        if (btnCancelarMulta) btnCancelarMulta.disabled = true; 
        idEnEdicion = null; 
        formMulta.reset(); 
        
        document.getElementById('multa-id').value = '';
        document.getElementById('id-multa-display').value = '';
        document.getElementById('status-multa').value = ''; 
    }

    async function guardarMulta(e) {
        e.preventDefault();

        if (!idEnEdicion) {
            estadoMensaje.textContent = 'Por favor selecciona una multa de la tabla para editar.';
            estadoMensaje.className = 'error';
            return;
        }

        const nuevoEstado = document.getElementById('status-multa').value;
        if (!nuevoEstado) {
            estadoMensaje.textContent = 'Por favor, selecciona un estado (Pendiente o Pagada) para la multa.';
            estadoMensaje.className = 'error';
            btnSubmitMulta.disabled = false;
            return;
        }
        let fechaPagadaUpdate = null;

        if (nuevoEstado === 'Pagada') {
            const fechaActual = new Date();
            const año = fechaActual.getFullYear();
            const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
            const dia = String(fechaActual.getDate()).padStart(2, '0');
            fechaPagadaUpdate = `${año}-${mes}-${dia}`;
        }

        btnSubmitMulta.disabled = true;

        try {
            const { error } = await sp
                .from('multas')
                .update({ 
                    estado: nuevoEstado, 
                    fecha_pagada: fechaPagadaUpdate 
                })
                .eq('id_multa', idEnEdicion);

            if (error) {
                estadoMensaje.textContent = 'Error al actualizar: ' + error.message;
                estadoMensaje.className = 'error';
                return;
            }

            estadoMensaje.textContent = 'Multa actualizada correctamente.';
            estadoMensaje.className = 'ok';
            

            cancelarEdicionMulta();
            cargarMultas();

        } catch (err) {
            estadoMensaje.textContent = 'No se pudo conectar con el servidor.';
            estadoMensaje.className = 'error';
        } finally {
            btnSubmitMulta.disabled = false;
        }
    }

    return { init };
})();