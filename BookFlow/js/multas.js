const multas = (() => {
    let tablaBody, estadoMensaje, contenedorAlerta;
    let formMulta, btnSubmitMulta, btnCancelarMulta, selectOrden;

    let listaMultas = [];
    let idEnEdicion = null;

    async function init() {
        tablaBody = document.getElementById('tabla-multas-body');
        estadoMensaje = document.getElementById('estado-mensaje-multa');
        contenedorAlerta = document.getElementById('contenedor-alerta-multa')
        
        formMulta = document.getElementById('form-multa');
        btnSubmitMulta = document.querySelector('button[form="form-multa"]');
        btnCancelarMulta = document.getElementById('cancelar-edicion-multa');
        selectOrden = document.getElementById('orden-multas');
        idEnEdicion = null;
        formMulta.addEventListener('submit', guardarMulta);
        btnCancelarMulta.addEventListener("click", cancelarEdicionMulta);
        if (selectOrden) selectOrden.addEventListener('change', renderTabla);
        await cargarMultas();
    }

    //funcion para mostrar alertas y asi
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

    function ordenarMultas(lista) {
    const criterio = selectOrden ? selectOrden.value : '';
    const copia = [...lista];

    switch (criterio) {
        case 'id-asc':
            return copia.sort((a, b) => a.id_multa - b.id_multa);
        case 'id-desc':
            return copia.sort((a, b) => b.id_multa - a.id_multa);
        case 'monto-asc':
            return copia.sort((a, b) => a.monto - b.monto);
        case 'monto-desc':
            return copia.sort((a, b) => b.monto - a.monto);
        case 'fecha':
            return copia.sort((a, b) => new Date(b.fecha_generada) - new Date(a.fecha_generada));
        default:
            return copia;
    }
    } // end ordenar multas según el select

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
        const listaOrdenada = ordenarMultas(listaMultas);
        listaOrdenada.forEach((multa) => {
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
            mostrarMensaje('Esta multa ya fue pagada y el registro está cerrado.', true);
            return;
        }

        idEnEdicion = id;
        if (btnCancelarMulta) btnCancelarMulta.disabled = false; 

        document.getElementById('multa-id').value = multa.id_multa;
        document.getElementById('id-multa-display').value = multa.id_multa;
        
        document.getElementById('status-multa').value = multa.estado;

        formMulta.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function cancelarEdicionMulta(ocultarAlerta = true) {
        if (btnCancelarMulta) btnCancelarMulta.disabled = true; 
        idEnEdicion = null; 
        if (formMulta) formMulta.reset(); 
        
        const inputMultaId = document.getElementById('multa-id');
        if (inputMultaId) inputMultaId.value = '';
        
        const inputMultaDisplay = document.getElementById('id-multa-display');
        if (inputMultaDisplay) inputMultaDisplay.value = '';
        
        const inputStatus = document.getElementById('status-multa');
        if (inputStatus) inputStatus.value = ''; 
        
        if (ocultarAlerta !== false) {
            mostrarMensaje('', false); 
        }
    }

    async function guardarMulta(e) {
        e.preventDefault();

        if (!idEnEdicion) {
            mostrarMensaje('Por favor selecciona una multa de la tabla para editar.', true);
            return;
        }

        const nuevoEstado = document.getElementById('status-multa').value;
        if (!nuevoEstado) {
            mostrarMensaje('Por favor, selecciona un estado (Pendiente o Pagada) para la multa', true);
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
                mostrarMensaje('Error al actualizar: ' + error.message, true);
                return;
            }

            mostrarMensaje('Multa actualizada correctamente.', false);
            
            cancelarEdicionMulta(false);
            cargarMultas();

        } catch (err) {
            console.error("Error en guardarMulta:", err); 
            mostrarMensaje('Hubo un problema interno. Revisa la consola.', true);
        } finally {
            btnSubmitMulta.disabled = false;
        }
    }

    return { init };
})();