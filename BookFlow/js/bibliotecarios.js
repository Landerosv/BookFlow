const bibliotecarios = (() => {
    let formBibliotecario, btnSubmitBibliotecario, btnCancelarBibliotecario;
    let tablaBody, estadoMensaje;
    let listaBibliotecarios = [];
    let idEnEdicion = null;
    let usuarioActual = null;
    let esSuperAdmin = false;

    async function init() {
        tablaBody = document.getElementById('tabla-bibliotecarios-body');
        estadoMensaje = document.getElementById('estado-mensaje');
        formBibliotecario = document.querySelector('.form-crud'); 
        btnSubmitBibliotecario = document.querySelector('button[form="form-crud"]');
        btnCancelarBibliotecario = document.querySelector('.panel-actions .btn-secondary');
        
        idEnEdicion = null;

        if (btnCancelarBibliotecario) {
            btnCancelarBibliotecario.addEventListener("click", cancelarEdicion);
        }
        if (formBibliotecario) {
            formBibliotecario.addEventListener('submit', guardarBibliotecario);
        }

        await verificarPermisos();
        await cargarBibliotecarios();
    }

    async function verificarPermisos() {
        const { data: { session } } = await sp.auth.getSession();
        
        if (session) {
            const { data } = await sp
                .from('bibliotecarios')
                .select('usuario')
                .eq('correo', session.user.email)
                .single();

            if (data) {
                usuarioActual = data.usuario;
                esSuperAdmin = (usuarioActual === 'httpslele');
            }
        }

        if (!esSuperAdmin) {
            document.querySelectorAll('#form-crud input').forEach(input => {
                input.disabled = true;
                input.style.cursor = 'not-allowed';
            });
            
            btnSubmitBibliotecario.style.display = 'none';
            if (btnCancelarBibliotecario) btnCancelarBibliotecario.style.display = 'none';
            
            mostrarMensaje('Modo de solo lectura. Solo el administrador principal puede editar o registrar.', true);
        }
    }

    function mostrarMensaje(texto, esError) {
        if (!estadoMensaje) return;
        estadoMensaje.textContent = texto;
        estadoMensaje.className = esError ? 'error' : 'ok';
    }

    function escapeHTML(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    async function cargarBibliotecarios() {
        try {
            const { data, error } = await sp
                .from('bibliotecarios')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) {
                mostrarMensaje('Error al cargar bibliotecarios: ' + error.message, true);
                return;
            }
            
            listaBibliotecarios = data;
            renderTabla();
        } catch (err) {
            mostrarMensaje('Error de conexión al cargar datos.', true);
        }
    }

    function renderTabla() {
        if (!tablaBody) return;
        tablaBody.innerHTML = '';

        listaBibliotecarios.forEach((bib) => {
            const fila = document.createElement('tr');
            
            fila.innerHTML = `
                <td>${escapeHTML(bib.nombre)}</td>
                <td>${escapeHTML(bib.correo)}</td>
                <td>${escapeHTML(bib.telefono)}</td>
                <td>${escapeHTML(bib.usuario)}</td>
                <td class="acciones-cell">
                        ${esSuperAdmin 
                        ? `<button type="button" class="icon-btn editar" data-id="${escapeHTML(bib.usuario)}" title="Editar bibliotecario">
                                <i data-lucide="square-pen"></i>
                           </button>`
                        : `<button type="button" class="icon-btn" disabled style="opacity: 0.3; cursor: not-allowed;" title="Sin permisos">
                                <i data-lucide="lock"></i>
                           </button>`
                    }
                </td>
            `;
            tablaBody.appendChild(fila);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();

        tablaBody.querySelectorAll('.editar').forEach((btn) =>
            btn.addEventListener('click', () => cargarEnFormulario(btn.dataset.id))
        );
    }

    async function guardarBibliotecario(e) {
        e.preventDefault();

        const nombre = document.getElementById('bib-nombre').value.trim();
        const usuario = document.getElementById('bib-usuario').value.trim();
        const correo = document.getElementById('bib-correo').value.trim();
        const password = document.getElementById('bib-password').value;
        const telefono = document.getElementById('bib-telefono').value.trim();

        if (!nombre || !usuario || (!idEnEdicion && (!correo || !password))) {
            mostrarMensaje('Por favor, llena todos los campos obligatorios.', true);
            return;
        }

        btnSubmitBibliotecario.disabled = true;

        try {
            if (idEnEdicion) {
                const { error: dbError } = await sp
                    .from('bibliotecarios')
                    .update({
                        nombre: nombre,
                        telefono: telefono
                    })
                    .eq('usuario', idEnEdicion);

                if (dbError) {
                    mostrarMensaje('Error al actualizar datos: ' + dbError.message, true);
                    return;
                }
                mostrarMensaje('Bibliotecario actualizado correctamente.', false);

            } else {
                // 1. Crear en Supabase Auth
                const { data: authData, error: authError } = await sp.auth.signUp({
                    email: correo,
                    password: password
                });

                if (authError) {
                    mostrarMensaje('Error al registrar credenciales: ' + authError.message, true);
                    btnSubmitBibliotecario.disabled = false;
                    return;
                }

                // 2. Crear en la tabla pública
                const { error: dbError } = await sp
                    .from('bibliotecarios')
                    .insert([{
                        nombre: nombre,
                        usuario: usuario,
                        correo: correo,
                        telefono: telefono
                    }]);

                if (dbError) {
                    mostrarMensaje('Usuario creado en Auth, pero falló en BD: ' + dbError.message, true);
                    btnSubmitBibliotecario.disabled = false;
                    return;
                }
                
                mostrarMensaje('Bibliotecario registrado correctamente.', false);
            }

            cancelarEdicion();
            cargarBibliotecarios();

        } catch (err) {
            mostrarMensaje('Error de conexión con el servidor.', true);
        } finally {
            btnSubmitBibliotecario.disabled = false;
        }
    }

    function cargarEnFormulario(usuarioId) {
        const bib = listaBibliotecarios.find((b) => String(b.usuario) === String(usuarioId));
        if (!bib) return;

        idEnEdicion = bib.usuario;
        
        if (btnCancelarBibliotecario) btnCancelarBibliotecario.disabled = false;

        document.getElementById('bib-nombre').value = bib.nombre;
        document.getElementById('bib-usuario').value = bib.usuario;
        document.getElementById('bib-correo').value = bib.correo;
        document.getElementById('bib-telefono').value = bib.telefono;
        document.getElementById('bib-password').value = ''; 

        document.getElementById('bib-usuario').disabled = true;
        document.getElementById('bib-correo').disabled = true;
  
        const inputPassword = document.getElementById('bib-password');
        inputPassword.disabled = true;
        inputPassword.required = false;

        formBibliotecario.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function cancelarEdicion() {
        idEnEdicion = null;
        if (btnCancelarBibliotecario) btnCancelarBibliotecario.disabled = true;
        if (formBibliotecario) formBibliotecario.reset();

        document.getElementById('bib-usuario').disabled = false;
        document.getElementById('bib-correo').disabled = false;
        
        const inputPassword = document.getElementById('bib-password');
        inputPassword.disabled = false;
        inputPassword.required = true;
    }

    return { init };
})();