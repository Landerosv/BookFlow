//Variables 
const sp = window.supabase.createClient(spURL, spK);
const formLogin = document.querySelector('.login-form');
const errorLogin = document.getElementById('msj-error');

//Eventos y acciones
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('user').value;
    const ps = document.getElementById('password').value;

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
        window.location.href = "principal.html";
    }

})