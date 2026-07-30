const Configuracion = (() => {

    let formCuenta, btnCancelarCuenta, estadoMensajeCuenta, contenedorAlertaCuenta;
    let formPassword, estadoMensajePassword, btnSubmitPassword, contenedorAlertaPassword;
    let correoActivo = null;
    let datosOriginales = {};

    async function init() {
    
        formCuenta = document.getElementById('form-cuenta');
        btnCancelarCuenta = document.getElementById('btn-cancelar-cuenta');
        estadoMensajeCuenta = document.getElementById('estado-mensaje-cuenta');
        contenedorAlertaCuenta = document.getElementById('contenedor-alerta-cuenta');


        formPassword = document.getElementById('form-password');
        estadoMensajePassword = document.getElementById('estado-mensaje-password');
        btnSubmitPassword = document.querySelector('button[form="form-password"]');
        contenedorAlertaPassword = document.getElementById('contenedor-alerta-password');


        formCuenta.addEventListener('input', () => {
            btnCancelarCuenta.disabled = false;
        });
        btnCancelarCuenta.addEventListener('click', cancelarEdicionCuenta);
        formCuenta.addEventListener('submit', guardarCuenta);

        formPassword.addEventListener('submit', guardarPassword);

        iniciarMedidorPassword();

        await cargarDatos();
    } // end init configuracion

    function mostrarMensaje(contenedorAlerta, estadoMensaje, texto, esError) {
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

    function cancelarEdicionCuenta(ocultarAlerta = true) {
        pintarDatos(datosOriginales);
        btnCancelarCuenta.disabled = true;
        mostrarMensaje(contenedorAlertaCuenta, estadoMensajeCuenta, '', false);
    } // end cancelar edicion cuenta

    // ---------- Form de datos de la cuenta ----------
    async function guardarCuenta(e) {
        e.preventDefault();
        mostrarMensaje(contenedorAlertaCuenta, estadoMensajeCuenta, '', false);

        const nombre = document.getElementById('cuenta-nombre').value.trim();
        const correo = document.getElementById('cuenta-correo').value.trim();
        const telefono = document.getElementById('cuenta-telefono').value.trim();
        const usuario = document.getElementById('cuenta-usuario').value.trim();

        const { error } = await sp
            .from('bibliotecarios')
            .update({ nombre, correo, telefono, usuario })
            .eq('correo', correoActivo);

        if (error) {
            mostrarMensaje(contenedorAlertaCuenta, estadoMensajeCuenta, 'No se pudieron guardar los cambios: ' + error.message, true);
            return;
        }

        if (correo !== correoActivo) {
            const { error: errorAuth } = await sp.auth.updateUser({ email: correo });
            if (errorAuth) {
                console.error('Error al actualizar correo en auth:', errorAuth);
                mostrarMensaje(contenedorAlertaCuenta, estadoMensajeCuenta, 'Datos guardados, pero no se pudo actualizar el correo de acceso.', true);                
                return;
            }
        }

        correoActivo = correo;
        datosOriginales = { nombre, correo, telefono, usuario };
        btnCancelarCuenta.disabled = true;

        mostrarMensaje(contenedorAlertaCuenta, estadoMensajeCuenta, 'Cambios guardados correctamente.', false);    
    } // end guardar cuenta

    // ---------- Form de cambio de contraseña ----------
    /*Chat les voy a explicar comno funciona, parece dificil pero no lo es, solo es revoltoso
    //Primero no deja hacer varios clics 
    Verifica las contraseñas, primero checa que coincidan las contraseñas vdd
    Luego verifica que la contraseña actual no sea igual a la que quieras poner vdd
    Despues checa que la contraseñá coincida en el auth de la API de supa
    y ahora si ahora si, si pasó eso ya cambia la contraseña en supa y ya se puede usar la nueva 
    Para hacerlo hace un inicio de sesión solo en el back para traer la contraseña
    asi como lo tengo primero descarta lo obvio para no andar gastando recursos de la API a lo wey
    */
    
    async function guardarPassword(e) {
        e.preventDefault();
        mostrarMensaje(contenedorAlertaPassword, estadoMensajePassword, '', false);
        btnSubmitPassword.disabled = true;

        const passwordActual = document.getElementById('password-actual').value;
        const passwordNueva = document.getElementById('password-nueva').value;
        const passwordConfirmar = document.getElementById('password-confirmar').value;

        const passRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,16}$/;
        if (!passRegex.test(passwordNueva)) {
            mostrarMensaje(contenedorAlertaPassword, estadoMensajePassword, 'La nueva contraseña debe cumplir con todos los requisitos (Seguridad Alta).', true);
            btnSubmitPassword.disabled = false;
            return;
        }

        if (passwordNueva !== passwordConfirmar) {
            mostrarMensaje(contenedorAlertaPassword, estadoMensajePassword, 'Las contraseñas nuevas no coinciden.', true);
            btnSubmitPassword.disabled = false;
            return;
        }

        if (passwordActual === passwordNueva) {
            mostrarMensaje(contenedorAlertaPassword, estadoMensajePassword, 'La nueva contraseña debe ser diferente a la actual.', true);
            btnSubmitPassword.disabled = false;
            return;
        }

        try {

            const { error: errorAuthLocal } = await sp.auth.signInWithPassword({
                email: correoActivo,
                password: passwordActual
            });

            if (errorAuthLocal) {
                mostrarMensaje(contenedorAlertaPassword, estadoMensajePassword, 'La contraseña actual es incorrecta.', true);
                btnSubmitPassword.disabled = false;
                return;
            }

            const { error: errorUpdate } = await sp.auth.updateUser({
                password: passwordNueva
            });

            if (errorUpdate) {
                mostrarMensaje(contenedorAlertaPassword, estadoMensajePassword, 'Error interno al actualizar: ' + errorUpdate.message, true);
            } else {
                mostrarMensaje(contenedorAlertaPassword, estadoMensajePassword, '¡Contraseña actualizada de forma segura!', false);
                formPassword.reset(); 
            }

        } catch (err) {
            mostrarMensaje(contenedorAlertaPassword, estadoMensajePassword, 'Error de conexión con el servidor.', true);
        } finally {
            btnSubmitPassword.disabled = false;
        }
    } // end guardar password

    // Funcion para medir la seguridad
    function iniciarMedidorPassword() {
        const inputNueva = document.getElementById('password-nueva');
        if (!inputNueva) return;

        const bars = [
            document.getElementById('bar-1'),
            document.getElementById('bar-2'),
            document.getElementById('bar-3'),
            document.getElementById('bar-4')
        ];
        const textoNivel = document.getElementById('nivel-seguridad');

        const reglas = {
            length: document.getElementById('regla-length'),
            upper: document.getElementById('regla-upper'),
            number: document.getElementById('regla-number'),
            special: document.getElementById('regla-special')
        };

        inputNueva.addEventListener('input', (e) => {
            const pass = e.target.value;
            let score = 0;

            // 1. Longitud (8 a 16)
            if (pass.length >= 8 && pass.length <= 16) {
                score++;
                reglas.length.classList.add('regla-cumplida');
            } else {
                reglas.length.classList.remove('regla-cumplida');
            }

            // 2. Mayúscula
            if (/[A-Z]/.test(pass)) {
                score++;
                reglas.upper.classList.add('regla-cumplida');
            } else {
                reglas.upper.classList.remove('regla-cumplida');
            }

            // 3. Número
            if (/[0-9]/.test(pass)) {
                score++;
                reglas.number.classList.add('regla-cumplida');
            } else {
                reglas.number.classList.remove('regla-cumplida');
            }

            // 4. Símbolo especial
            if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) {
                score++;
                reglas.special.classList.add('regla-cumplida');
            } else {
                reglas.special.classList.remove('regla-cumplida');
            }


            bars.forEach(bar => bar.className = 'bar');

            // Colorear según el score
            if (pass.length === 0) {
                textoNivel.textContent = 'Nula';
                textoNivel.style.color = '#6b7280';
            } else if (score === 1) {
                bars[0].classList.add('muy-baja');
                textoNivel.textContent = 'Muy baja';
                textoNivel.style.color = '#ef4444';
            } else if (score === 2) {
                bars[0].classList.add('baja');
                bars[1].classList.add('baja');
                textoNivel.textContent = 'Baja';
                textoNivel.style.color = '#f97316';
            } else if (score === 3) {
                bars[0].classList.add('media');
                bars[1].classList.add('media');
                bars[2].classList.add('media');
                textoNivel.textContent = 'Media';
                textoNivel.style.color = '#eab308';
            } else if (score === 4) {
                bars.forEach(bar => bar.classList.add('alta'));
                textoNivel.textContent = 'Alta';
                textoNivel.style.color = '#10b981';
            }
        });
    }

    return { init };

})(); // final del módulo Configuracion