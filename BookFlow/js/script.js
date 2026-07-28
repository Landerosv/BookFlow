const spURL = 'https://kzsxksciruyrlcjkqfqm.supabase.co';
const spK = 'sb_publishable_OkJX5qDnmbMmHgOMRILz8Q_1TVu0IEA';

//Variables 
const sp = window.supabase.createClient(spURL, spK);
const formLogin = document.querySelector('.login-form');

//Eventos y acciones
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('user').value;
    const ps = document.getElementById('password').value;

    const { data: perfil, error: errorbusqueda } = await sp 
        .from('bibliotecarios')
        .select('correo')
        .eq('usuario', user)
        .single();
    
    if(errorbusqueda || !perfil){
        alert("Usuario o contraseña incorrectos");
        return;
    }


    const {data,error} = await sp.auth.signInWithPassword({
        email: perfil.correo,
        password: ps
    });

    if(error){
        alert("Usuario o contraseña incorrecta");
    }else {
        window.location.href = "principal.html";
    }

})