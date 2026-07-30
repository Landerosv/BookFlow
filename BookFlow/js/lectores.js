const Lectores = (() => {

    let formLector, btnSubmit, btnCancelar, estadoMensaje, tablaBody, selectOrden;
    let lectores = [];
    let idEnEdicion = null;

    async function init() {
        formLector = document.getElementById('form-lector');
        btnSubmit = document.querySelector('button[form="form-lector"]');
        btnCancelar = document.getElementById('cancelar-edicion-lector');
        estadoMensaje = document.getElementById('estado-mensaje-lector');
        tablaBody = document.getElementById('tabla-lectores-body');

        selectOrden = document.getElementById('orden-lectores');
        idEnEdicion = null;
        formLector.addEventListener('submit', guardarLector);
        btnCancelar.addEventListener('click', cancelarEdicion);
        if (selectOrden) selectOrden.addEventListener('change', renderTabla);

        await cargarLectores();
    } // end init lectores

    function mostrarMensaje(texto, esError) {
        estadoMensaje.textContent = texto;
        estadoMensaje.classList.remove('ok', 'error');
        estadoMensaje.classList.add(esError ? 'error' : 'ok');
    } // end mostrar mensaje

    function escapeHTML(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    } // end escapar HTML (evita inyección en la tabla)

    function normalizarEspacios(texto) {
        return texto.trim().replace(/\s+/g, ' ');
    } // end normalizar espacios repetidos

    function ordenarLectores(lista) {
    const criterio = selectOrden ? selectOrden.value : '';
    const copia = [...lista];

    switch (criterio) {
        case 'id-asc':
            return copia.sort((a, b) => a.id - b.id);
        case 'id-desc':
            return copia.sort((a, b) => b.id - a.id);
        case 'nombre-asc':
            return copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
        case 'nombre-desc':
            return copia.sort((a, b) => b.nombre.localeCompare(a.nombre));
        default:
            return copia;
    }
} // end ordenar lectores según el select

    async function cargarLectores() {
        try {
            const { data, error } = await sp
                .from('lectores')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) {
                mostrarMensaje('Error al cargar lectores: ' + error.message, true);
                return;
            }

            lectores = data;
            renderTabla();
        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        }
    } // end cargar lectores

    function renderTabla() {
        tablaBody.innerHTML = '';
        const listaOrdenada = ordenarLectores(lectores);
        listaOrdenada.forEach((lector) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${lector.id}</td>
                <td>${escapeHTML(lector.nombre)}</td>
                <td>${escapeHTML(lector.telefono)}</td>

                <td class="acciones-cell">
                    <button
                        type="button"
                        class="icon-btn editar"
                        data-id="${lector.id}"
                        title="Editar">

                        <i data-lucide="square-pen"></i>

                    </button>
                    <button
                        type="button"
                        class="icon-btn borrar"
                        data-id="${lector.id}"
                        title="Eliminar">

                        <i data-lucide="trash-2"></i>

                    </button>
                </td>
            `;
            tablaBody.appendChild(fila);
        });
        lucide.createIcons();

        tablaBody.querySelectorAll('.editar').forEach((btn) =>
            btn.addEventListener('click', () => cargarLectorEnFormulario(btn.dataset.id))
        );
        tablaBody.querySelectorAll('.borrar').forEach((btn) =>
            btn.addEventListener('click', () => borrarLector(btn.dataset.id))
        );
    } // end render tabla

    async function guardarLector(e) {
        e.preventDefault();

        const nombre = normalizarEspacios(document.getElementById('nombre-lector').value);
        const telefono = document.getElementById('telefono-lector').value.trim();

        if (!nombre) {
            mostrarMensaje('El nombre es obligatorio.', true);
            return;
        }

        if (!/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/.test(nombre)) {
            mostrarMensaje('El nombre debe contener al menos una letra.', true);
            return;
        }

        if (!/^\d{10}$/.test(telefono)) {
            mostrarMensaje('El teléfono debe ser numérico y tener exactamente 10 dígitos.', true);
            return;
        }

        const yaExiste = lectores.some((l) =>
            normalizarEspacios(l.nombre ?? '').toLowerCase() === nombre.toLowerCase() &&
            String(l.id) !== String(idEnEdicion)
        );

        if (yaExiste) {
            mostrarMensaje('Ya existe un lector registrado con ese nombre.', true);
            return;
        }

        btnSubmit.disabled = true;

        try {
            const payload = { nombre, telefono };
            let error;

            if (idEnEdicion) {
                ({ error } = await sp.from('lectores').update(payload).eq('id', idEnEdicion));
            } else {
                ({ error } = await sp.from('lectores').insert(payload));
            }

            if (error) {
                // Violación de unicidad: ya existe un lector con ese nombre
                if (error.code === '23505') {
                    mostrarMensaje('Ya existe un lector registrado con ese nombre.', true);
                } else {
                    mostrarMensaje('Error al guardar: ' + error.message, true);
                }
                return;
            }

            mostrarMensaje(idEnEdicion ? 'Lector actualizado.' : 'Lector agregado.', false);
            cancelarEdicion();
            cargarLectores();

        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        } finally {
            btnSubmit.disabled = false;
        }
    } // end guardar lector

    function cargarLectorEnFormulario(id) {
        const lector = lectores.find((l) => String(l.id) === String(id));
        if (!lector) return;

        idEnEdicion = id;
        btnCancelar.disabled = false;

        document.getElementById('lector-id').value = lector.id;
        document.getElementById('nombre-lector').value = lector.nombre ?? '';
        document.getElementById('telefono-lector').value = lector.telefono ?? '';

        formLector.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } // end cargar lector formulario

    function cancelarEdicion() {
        btnCancelar.disabled = true;
        idEnEdicion = null;

        formLector.reset();
        document.getElementById('lector-id').value = '';
    } // end cancelar edicion

    async function borrarLector(id) {
        const confirmar = confirm(`¿Borrar el lector con ID ${id}?`);
        if (!confirmar) return;

        const boton = tablaBody.querySelector(`.borrar[data-id="${id}"]`);
        if (boton) boton.disabled = true;

        try {
            const { error } = await sp.from('lectores').delete().eq('id', id);

            if (error) {
                // Violación de llave foránea: el lector tiene préstamos asociados
                if (error.code === '23503') {
                    mostrarMensaje('No se puede borrar: este lector tiene préstamos asociados.', true);
                } else {
                    mostrarMensaje('Error al borrar: ' + error.message, true);
                }
                return;
            }

            mostrarMensaje('Lector borrado.', false);

            if (String(idEnEdicion) === String(id)) cancelarEdicion();
            cargarLectores();
        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        } finally {
            if (boton) boton.disabled = false;
        }
    } // end borrar lector

    return { init };

})(); // final del módulo Lectores