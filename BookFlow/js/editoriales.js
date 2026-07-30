const Editoriales = (() => {

    let formEditorial, btnSubmit, estadoMensaje, tablaBody, btnCancelar;
    let editoriales = [];
    let idEnEdicion = null;

    async function init() {
        formEditorial = document.getElementById('form-editorial');
        btnSubmit = document.querySelector('button[form="form-editorial"]');
        btnCancelar = document.getElementById('cancelar-edicion-editorial');
        estadoMensaje = document.getElementById('estado-mensaje-editorial');
        tablaBody = document.getElementById('tabla-editoriales-body');

        idEnEdicion = null;
        formEditorial.addEventListener('submit', guardarEditorial);
        btnCancelar.addEventListener('click', cancelarEdicion);

        await cargarEditoriales();
    } ///end init editoriales (la chingadera que lo une con principal)

    function mostrarMensaje(texto, esError) {
        estadoMensaje.textContent = texto;
        estadoMensaje.classList.remove('ok', 'error');
        estadoMensaje.classList.add(esError ? 'error' : 'ok');
    } //end mostrar mensajes de error

    function escapeHTML(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    } //end escapar HTML (evita inyección en la tabla)

    function normalizarEspacios(texto) {
        return texto.trim().replace(/\s+/g, ' ');
    } //end normalizar espacios repetidos

    async function cargarEditoriales() {
        try {
            const { data, error } = await sp
                .from('editorial')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) {
                mostrarMensaje('Error al cargar editoriales: ' + error.message, true);
                return;
            }

            editoriales = data;
            renderTabla();
        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        }
    } // end cargar editoriales

    function renderTabla() {
        tablaBody.innerHTML = '';

        editoriales.forEach((editorial) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${editorial.id}</td>
                <td>${escapeHTML(editorial.nombre)}</td>
                <td>${escapeHTML(editorial.idioma)}</td>

                <td class="acciones-cell">
                    <button
                        type="button"
                        class="icon-btn editar"
                        data-id="${editorial.id}"
                        title="Editar">

                        <i data-lucide="square-pen"></i>

                    </button>
                    <button
                        type="button"
                        class="icon-btn borrar"
                        data-id="${editorial.id}"
                        title="Eliminar">

                        <i data-lucide="trash-2"></i>

                    </button>

                </td>
            `;
            tablaBody.appendChild(fila);

        });
        lucide.createIcons();

        tablaBody.querySelectorAll('.editar').forEach((btn) =>
            btn.addEventListener('click', () => cargarEditorialEnFormulario(Number(btn.dataset.id)))
        );
        tablaBody.querySelectorAll('.borrar').forEach((btn) =>
            btn.addEventListener('click', () => borrarEditorial(Number(btn.dataset.id)))
        );
    } ///end render tabla

    async function guardarEditorial(e) {
        e.preventDefault();

        const nombre = normalizarEspacios(document.getElementById('nombre-editorial').value);
        const idioma = document.getElementById('idioma').value.trim();

        if (!nombre) {
            mostrarMensaje('El nombre de la editorial es obligatorio.', true);
            return;
        }

        if (!/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/.test(nombre)) {
            mostrarMensaje('El nombre de la editorial debe contener al menos una letra.', true);
            return;
        }

        if (!idioma) {
            mostrarMensaje('Selecciona un idioma.', true);
            return;
        }

        const yaExiste = editoriales.some(
            (ed) => normalizarEspacios(ed.nombre ?? '').toLowerCase() === nombre.toLowerCase() && ed.id !== idEnEdicion
        );

        if (yaExiste) {
            mostrarMensaje('Ya existe una editorial con ese nombre.', true);
            return;
        }

        btnSubmit.disabled = true;

        try {
            let error;

            if (idEnEdicion) {
                ({ error } = await sp
                    .from('editorial')
                    .update({ nombre, idioma })
                    .eq('id', idEnEdicion));
            } else {
                ({ error } = await sp
                    .from('editorial')
                    .insert({ nombre, idioma }));
            }

            if (error) {
                // Violación de unicidad (nombre repetido)
                if (error.code === '23505') {
                    mostrarMensaje('Ya existe una editorial con ese nombre.', true);
                } else {
                    mostrarMensaje('Error al guardar: ' + error.message, true);
                }
                return;
            }

            mostrarMensaje(idEnEdicion ? 'Editorial actualizada.' : 'Editorial agregada.', false);
            cancelarEdicion();
            cargarEditoriales();

        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        } finally {
            btnSubmit.disabled = false;
        }
    } //end guardar editorial

    function cargarEditorialEnFormulario(id) {
        const editorial = editoriales.find((ed) => ed.id === id);
        if (!editorial) return;

        idEnEdicion = id;
        btnCancelar.disabled = false;

        document.getElementById('nombre-editorial').value = editorial.nombre ?? '';
        document.getElementById('idioma').value = editorial.idioma ?? '';

        formEditorial.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } //end cargar editorial en formulario

    function cancelarEdicion() {
        btnCancelar.disabled = true;
        idEnEdicion = null;
        formEditorial.reset();
    } // cancelar edicion

    async function borrarEditorial(id) {
        const confirmar = confirm('¿Borrar esta editorial?');
        if (!confirmar) return;

        const boton = tablaBody.querySelector(`.borrar[data-id="${id}"]`);
        if (boton) boton.disabled = true;

        try {
            const { error } = await sp.from('editorial').delete().eq('id', id);

            if (error) {
                // Violación de llave foránea: la editorial tiene libros asociados
                if (error.code === '23503') {
                    mostrarMensaje('No se puede borrar: hay libros registrados con esta editorial.', true);
                } else {
                    mostrarMensaje('Error al borrar: ' + error.message, true);
                }
                return;
            }

            mostrarMensaje('Editorial borrada.', false);

            if (idEnEdicion === id) cancelarEdicion();
            cargarEditoriales();
        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        } finally {
            if (boton) boton.disabled = false;
        }
    } //borrar editorial

        return { init }

    })(); //final de la const global