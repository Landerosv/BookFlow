const Configuracion = (() => {

    let formCuenta, btnCancelarCuenta, mensajeCuenta;
    let correoActivo = null;
    let datosOriginales = {};

    async function init() {
        formCuenta = document.getElementById('form-cuenta');
        btnCancelarCuenta = document.getElementById('btn-cancelar-cuenta');
        mensajeCuenta = document.getElementById('estado-mensaje-cuenta');

        formCuenta.addEventListener('input', () => {
            btnCancelarCuenta.disabled = false;
        });
        btnCancelarCuenta.addEventListener('click', cancelarEdicionCuenta);
        formCuenta.addEventListener('submit', guardarCuenta);

        await cargarDatos();
    } // end init configuracion

    function mostrarMensaje(elemento, texto, esError) {
        elemento.textContent = texto;
        elemento.classList.remove('ok', 'error');
        elemento.classList.add(esError ? 'error' : 'ok');
    } // end mostrar mensaje

    // ---------- Cargar datos del bibliotecario ----------
    async function cargarDatos() {
        const { data: { session } } = await sp.auth.getSession();
        if (!session) return;

        correoActivo = session.user.email;

        const { data: perfil, error } = await sp
            .from('bibliotecarios')
            .select('nombre, correo, telefono, usuario')
            .eq('correo', correoActivo)
            .single();

        if (error || !perfil) {
            console.error('No se pudo cargar el perfil:', error);
            return;
        }

        datosOriginales = { ...perfil };
        pintarDatos(perfil);
    } // end cargar datos

    function pintarDatos(perfil) {
        const campos = {
            'cuenta-nombre': perfil.nombre,
            'cuenta-correo': perfil.correo,
            'cuenta-telefono': perfil.telefono,
            'cuenta-usuario': perfil.usuario
        };

        Object.entries(campos).forEach(([id, valor]) => {
            const input = document.getElementById(id);
            input.value = valor ?? '';
            input.classList.remove('skeleton');
        });
    } // end pintar datos

    function cancelarEdicionCuenta() {
        pintarDatos(datosOriginales);
        btnCancelarCuenta.disabled = true;
        mensajeCuenta.textContent = '';
    } // end cancelar edicion cuenta

    // ---------- Form de datos de la cuenta ----------
    async function guardarCuenta(e) {
        e.preventDefault();
        mensajeCuenta.textContent = '';

        const nombre = document.getElementById('cuenta-nombre').value.trim();
        const correo = document.getElementById('cuenta-correo').value.trim();
        const telefono = document.getElementById('cuenta-telefono').value.trim();
        const usuario = document.getElementById('cuenta-usuario').value.trim();

        const { error } = await sp
            .from('bibliotecarios')
            .update({ nombre, correo, telefono, usuario })
            .eq('correo', correoActivo);

        if (error) {
            mostrarMensaje(mensajeCuenta, 'No se pudieron guardar los cambios: ' + error.message, true);
            return;
        }

        // si el correo cambió, hay que actualizarlo también en supabase auth
        if (correo !== correoActivo) {
            const { error: errorAuth } = await sp.auth.updateUser({ email: correo });
            if (errorAuth) {
                console.error('Error al actualizar correo en auth:', errorAuth);
                mostrarMensaje(mensajeCuenta, 'Datos guardados, pero no se pudo actualizar el correo de acceso.', true);
                return;
            }
        }

        correoActivo = correo;
        datosOriginales = { nombre, correo, telefono, usuario };
        btnCancelarCuenta.disabled = true;

        mostrarMensaje(mensajeCuenta, 'Cambios guardados correctamente.', false);
    } // end guardar cuenta

    return { init };

})(); // final del módulo Configuracion