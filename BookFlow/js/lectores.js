const Lectores = (() => {

    let formLector, btnSubmit, btnCancelar, estadoMensaje, tablaBody;
    let lectores = [];
    let idEnEdicion = null;

    async function init() {
        formLector = document.getElementById('form-lector');
        btnSubmit = document.querySelector('button[form="form-lector"]');
        btnCancelar = document.getElementById('cancelar-edicion-lector');
        estadoMensaje = document.getElementById('estado-mensaje-lector');
        tablaBody = document.getElementById('tabla-lectores-body');

        idEnEdicion = null;
        formLector.addEventListener('submit', guardarLector);
        btnCancelar.addEventListener('click', cancelarEdicion);

        await cargarLectores();
    } // end init lectores

    function mostrarMensaje(texto, esError) {
        estadoMensaje.textContent = texto;
        estadoMensaje.classList.remove('ok', 'error');
        estadoMensaje.classList.add(esError ? 'error' : 'ok');
    } // end mostrar mensaje

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

        lectores.forEach((lector) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${lector.id}</td>
                <td>${lector.nombre ?? ''}</td>
                <td>${lector.telefono ?? ''}</td>

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

        const nombre = document.getElementById('nombre-lector').value.trim();
        const telefono = document.getElementById('telefono-lector').value.trim();

        if (!nombre) {
            mostrarMensaje('El nombre es obligatorio.', true);
            return;
        }

        if (!/^\d{10}$/.test(telefono)) {
            mostrarMensaje('El teléfono debe ser numérico y tener exactamente 10 dígitos.', true);
            return;
        }

        const yaExiste = lectores.some((l) =>
            l.nombre.trim().toLowerCase() === nombre.toLowerCase() &&
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

        btnSubmit.textContent = 'Guardar cambios';
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