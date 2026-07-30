const spURL = 'https://kzsxksciruyrlcjkqfqm.supabase.co';
const spK = 'sb_publishable_OkJX5qDnmbMmHgOMRILz8Q_1TVu0IEA';

//Variables 
const sp = window.supabase.createClient(spURL, spK);
const formLogin = document.querySelector('.login-form');
const errorLogin = document.getElementById('msj-error');

document.addEventListener('DOMContentLoaded', () => {
    const usuarioGuardado = localStorage.getItem('bookflow_recordar_usuario');
    if (usuarioGuardado) {
        document.getElementById('user').value = usuarioGuardado;
        document.getElementById('remember').checked = true;
    }
});

//Eventos y acciones
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('user').value;
    const ps = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    errorLogin.classList.remove('error-visible');
    errorLogin.classList.add('error-hidden');
    void errorLogin.offsetWidth;
    
    const { data: perfil, error: errorbusqueda } = await sp 
        .from('bibliotecarios')
        .select('correo')
        .eq('usuario', user)
        .single();
    
    if(errorbusqueda || !perfil){
        errorLogin.classList.remove('error-hidden');
        errorLogin.classList.add('error-visible');
        return;
    }


    const {data,error} = await sp.auth.signInWithPassword({
        email: perfil.correo,
        password: ps
    });

    if(error){
        errorLogin.classList.remove('error-hidden');
        errorLogin.classList.add('error-visible');
    }else {
        if (remember) {
            localStorage.setItem('bookflow_recordar_usuario', user);
        } else {
            localStorage.removeItem('bookflow_recordar_usuario');
        }
        
        window.location.href = "principal.html";
    }

})