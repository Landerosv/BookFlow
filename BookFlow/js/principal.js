const spURL = 'https://kzsxksciruyrlcjkqfqm.supabase.co';
const spK = 'sb_publishable_OkJX5qDnmbMmHgOMRILz8Q_1TVu0IEA';

//Variables 
const sp = window.supabase.createClient(spURL, spK);
const buscador = document.getElementById('buscador');
const resultados = document.getElementById('resultados');

//funcion
async function dashboard() {
    const {data: {session}, error: errorSesion} = await sp.auth.getSession();
        if(!session){
            console.warn("No hay sesión activa, redirigiendo al login");
            window.location.href = "index.html";
            return;
        }

    const correoActivo = session.user.email;

    const {data: perfil , error: errorPerfil} = await sp
        .from('bibliotecarios')
        .select('nombre')
        .eq('correo', correoActivo)
        .single();

    if(perfil){
        const nombre = perfil.nombre.split(' ') [0];
        document.getElementById('saludo-header').textContent = `Hola, ${nombre} - Biblioteca Principal`;
        document.getElementById('nombre').textContent = perfil.nombre;
    }else{
        console.error("No se pudo cargar el perfil", errorPerfil);
    }

    const propiedadesFecha = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    const fecha = new Date().toLocaleDateString('es-ES', propiedadesFecha);
    document.getElementById('fecha').textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);

}

dashboard();

//buscador megaaaaaa 
if(buscador && resultados){
    buscador.addEventListener('input', async (e) => {
        const texto = e.target.value.trim();

        if(texto===""){
            resultados.innerHTML = '';
            resultados.style.display = 'none';
            return;
        }

        const [resLibros, resLectores, resAutores] =  await Promise.all([
            sp.from('libros').select('nombre').ilike('nombre',`%${texto}%`),
            sp.from('lectores').select('nombre').ilike('nombre',`%${texto}%`),
            sp.from('autores').select('nombre').ilike('nombre',`%${texto}%`)
        ]);

        const autoresEncontrados = resAutores.data || [];
        const librosEncontrados = resLibros.data || [];
        const lectoresEncontrados = resLectores.data || [];

        resultados.innerHTML = '';

        if( autoresEncontrados.length === 0 && librosEncontrados.length === 0 && lectoresEncontrados.length === 0){
            resultados.innerHTML = `
                                    <div style="padding: 12px; text-align: center; color: #666;">No se encontraron coincidencias para "${texto}"</div>
                                    `;
            resultados.style.display = 'block';
            return;
        }

        //Autores
        autoresEncontrados.forEach(autor => {
            resultados.innerHTML += `
                <div style="padding: 10px 15px; border-bottom: 1px solid #eee; cursor: pointer;">
                    <strong> Autor:</strong> ${autor.nombre}
                </div>
            `;
        });

        //Libros
        librosEncontrados.forEach(libro => {
            resultados.innerHTML += `
                <div style="padding: 10px 15px; border-bottom: 1px solid #eee; cursor: pointer;">
                    <strong> Libro:</strong> ${libro.nombre}
                </div>
            `;
        });

        //lectores
        lectoresEncontrados.forEach(lector => {
            resultados.innerHTML += `
                <div style="padding: 10px 15px; border-bottom: 1px solid #eee; cursor: pointer;">
                    <strong> Lector:</strong> ${lector.nombre}
                </div>
            `;
        });

        resultados.style.display = 'block';

    });

    //se oculta si se hace clic afuera del buscador jejej
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.buscar')) {
            resultados.style.display = 'none';
        }
    });

}