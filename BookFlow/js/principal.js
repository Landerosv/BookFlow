const spURL = 'https://kzsxksciruyrlcjkqfqm.supabase.co';
const spK = 'sb_publishable_OkJX5qDnmbMmHgOMRILz8Q_1TVu0IEA';

//Variables 
const sp = window.supabase.createClient(spURL, spK);

const vistas = {
    dashboard: {
        titulo: null,
        placeholder: null,
        init: async () => {
            await inicioSesion();
            await cargarDashboard();
        }
    },

    libros: {
        titulo: "Libros",
        placeholder: "Buscar por ISBN, nombre o autor...",
        init: () => Libros.init()
    },

    lectores: {
        titulo: "Lectores",
        placeholder: "Buscar por nombre o teléfono...",
        init: () => Lectores.init()
    },

    autores: {
        titulo: "Autores",
        placeholder: "Buscar por nombre o nacionalidad...",
        init: null
    },

    editoriales: {
        titulo: "Editoriales",
        placeholder: "Buscar por nombre o idioma...",
        init: () => Editoriales.init()
    },

    prestamos: {
        titulo: "Préstamos",
        placeholder: "Buscar por lector o ISBN...",
        init: () => prestamos.init()
    },

    multas: {
        titulo: "Multas",
        placeholder: "Buscar por préstamo...",
        init: () => multas.init()
    },

    administradores: {
        titulo: "Administradores",
        placeholder: "Buscar por nombre, usuario o teléfono...",
        init: null
    },

    bibliotecarios: {
        titulo: "Bibliotecarios",
        placeholder: "Buscar por nombre, usuario o teléfono...",
        init: null
    }
};

document.addEventListener("DOMContentLoaded", async ()=>{
    lucide.createIcons();
    initSidebar();
    initBuscador();

    const vistaInicial = location.hash.replace('#', '') || 'dashboard';
    await cargarVista(vistaInicial);
});

window.addEventListener('hashchange', () => {
    const vista = location.hash.replace('#', '') || 'dashboard';
    cargarVista(vista);
});

//funcion
async function inicioSesion() {
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
        document.getElementById('tb-header').textContent = `Hola, ${nombre} - Biblioteca Principal`;
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

function initSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const backdrop = document.getElementById('sidebarBackdrop');
    const sidebar = document.getElementById('sidebar');

    function abrirSidebar() {
        document.body.classList.add('sidebar-open');
    }

    function cerrarSidebar() {
        document.body.classList.remove('sidebar-open');
    }

    menuToggle.addEventListener('click', abrirSidebar);
    sidebarClose.addEventListener('click', cerrarSidebar);
    backdrop.addEventListener('click', cerrarSidebar);

    sidebar.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', cerrarSidebar);
    });
}

function configurarHeader(titulo, placeholder){
    document.getElementById("tb-header").textContent = titulo;
    const buscador = document.getElementById("buscador");
    buscador.value = "";
    buscador.placeholder = placeholder;

}

//buscador megaaaaaa 
function initBuscador(){
    const buscador = document.getElementById('buscador');
    const resultados = document.getElementById('resultados');
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

            const librosEncontrados = resLibros.data || [];
            const lectoresEncontrados = resLectores.data || [];
            const autoresEncontrados = resAutores.data || [];
            

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
}

async function cargarVista(nombreVista){
    const cfg = vistas[nombreVista];
    marcarActivo(nombreVista);
    if (!cfg) {
        console.error(`La vista "${nombreVista}" no existe en vistas`);
        return;
    }

    const contenedor = document.getElementById("contenido");
    let respuesta;

    try {
        respuesta = await fetch(`vistas/${nombreVista}.html`);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    } catch (err) {
        console.error(`No se pudo cargar vistas/${nombreVista}.html`, err);
        contenedor.innerHTML = `<p>No se pudo cargar esta sección.</p>`;
        return;
    }

    contenedor.innerHTML = await respuesta.text();
    lucide.createIcons();

    if (cfg.titulo) configurarHeader(cfg.titulo, cfg.placeholder);
    if (cfg.init) await cfg.init();
}

function marcarActivo(nombreVista){
    document.querySelectorAll('.nav-link[data-vista]').forEach(link => {
        link.classList.toggle('active', link.dataset.vista === nombreVista);
    });
}