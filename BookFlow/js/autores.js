const Autores = (() => {

    let formAutor, btnSubmit, btnCancelar, estadoMensaje, tablaBody;
    let autores = [];
    let idEnEdicion = null;

    async function init() {
        formAutor = document.getElementById('form-autor');
        btnSubmit = document.querySelector('button[form="form-autor"]');
        btnCancelar = document.getElementById('cancelar-edicion-autor');
        estadoMensaje = document.getElementById('estado-mensaje-autor');
        tablaBody = document.getElementById('tabla-autores-body');

        idEnEdicion = null;
        formAutor.addEventListener('submit', guardarAutor);
        btnCancelar.addEventListener('click', cancelarEdicion);

        await cargarAutores();
    } // end init autores

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

    async function cargarAutores() {
        try {
            const { data, error } = await sp
                .from('autores')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) {
                mostrarMensaje('Error al cargar autores: ' + error.message, true);
                return;
            }

            autores = data;
            renderTabla();
        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        }
    } // end cargar autores

    function renderTabla() {
        tablaBody.innerHTML = '';

        autores.forEach((autor) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${autor.id}</td>
                <td>${escapeHTML(autor.nombre)}</td>
                <td>${escapeHTML(autor.nacionalidad)}</td>

                <td class="acciones-cell">
                    <button
                        type="button"
                        class="icon-btn editar"
                        data-id="${autor.id}"
                        title="Editar">

                        <i data-lucide="square-pen"></i>

                    </button>
                    <button
                        type="button"
                        class="icon-btn borrar"
                        data-id="${autor.id}"
                        title="Eliminar">

                        <i data-lucide="trash-2"></i>

                    </button>
                </td>
            `;
            tablaBody.appendChild(fila);
        });
        lucide.createIcons();

        tablaBody.querySelectorAll('.editar').forEach((btn) =>
            btn.addEventListener('click', () => cargarAutorEnFormulario(Number(btn.dataset.id)))
        );
        tablaBody.querySelectorAll('.borrar').forEach((btn) =>
            btn.addEventListener('click', () => borrarAutor(Number(btn.dataset.id)))
        );
    } // end render tabla

    async function guardarAutor(e) {
        e.preventDefault();

        const nombre = normalizarEspacios(document.getElementById('nombre-autor').value);
        const nacionalidad = document.getElementById('nacionalidad').value.trim();

        if (!nombre) {
            mostrarMensaje('El nombre del autor es obligatorio.', true);
            return;
        }

        if (!/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/.test(nombre)) {
            mostrarMensaje('El nombre del autor debe contener al menos una letra.', true);
            return;
        }

        if (!nacionalidad) {
            mostrarMensaje('Selecciona una nacionalidad.', true);
            return;
        }

        const yaExiste = autores.some(
            (a) => normalizarEspacios(a.nombre ?? '').toLowerCase() === nombre.toLowerCase() && a.id !== idEnEdicion
        );

        if (yaExiste) {
            mostrarMensaje('Ya existe un autor registrado con ese nombre.', true);
            return;
        }

        btnSubmit.disabled = true;

        try {
            const payload = { nombre, nacionalidad };
            let error;

            if (idEnEdicion) {
                ({ error } = await sp.from('autores').update(payload).eq('id', idEnEdicion));
            } else {
                ({ error } = await sp.from('autores').insert(payload));
            }

            if (error) {
                // Violación de unicidad: ya existe un autor con ese nombre
                if (error.code === '23505') {
                    mostrarMensaje('Ya existe un autor registrado con ese nombre.', true);
                } else {
                    mostrarMensaje('Error al guardar: ' + error.message, true);
                }
                return;
            }

            mostrarMensaje(idEnEdicion ? 'Autor actualizado.' : 'Autor agregado.', false);
            cancelarEdicion();
            cargarAutores();

        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        } finally {
            btnSubmit.disabled = false;
        }
    } // end guardar autor

    function cargarAutorEnFormulario(id) {
        const autor = autores.find((a) => a.id === id);
        if (!autor) return;

        idEnEdicion = id;
        btnCancelar.disabled = false;

        document.getElementById('nombre-autor').value = autor.nombre ?? '';
        document.getElementById('nacionalidad').value = autor.nacionalidad ?? '';

        formAutor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } // end cargar autor en formulario

    function cancelarEdicion() {
        btnCancelar.disabled = true;
        idEnEdicion = null;
        formAutor.reset();
    } // end cancelar edicion

    async function borrarAutor(id) {
        const confirmar = confirm('¿Borrar este autor?');
        if (!confirmar) return;

        const boton = tablaBody.querySelector(`.borrar[data-id="${id}"]`);
        if (boton) boton.disabled = true;

        try {
            const { error } = await sp.from('autores').delete().eq('id', id);

            if (error) {
                // Violación de llave foránea: el autor tiene libros asociados
                if (error.code === '23503') {
                    mostrarMensaje('No se puede borrar: hay libros registrados con este autor.', true);
                } else {
                    mostrarMensaje('Error al borrar: ' + error.message, true);
                }
                return;
            }

            mostrarMensaje('Autor borrado.', false);

            if (idEnEdicion === id) cancelarEdicion();
            cargarAutores();
        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        } finally {
            if (boton) boton.disabled = false;
        }
    } // end borrar autor

    return { init };

})(); // final del módulo Autores