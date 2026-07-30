const spURL = 'https://kzsxksciruyrlcjkqfqm.supabase.co';
const spK = 'sb_publishable_OkJX5qDnmbMmHgOMRILz8Q_1TVu0IEA';

//Variables 
const sp = window.supabase.createClient(spURL, spK);
let saludoHeader = "Biblioteca Principal"; // se actualiza en inicioSesion() con el nombre real
const vistas = {
    dashboard: {
        titulo: null,
        placeholder: null,
        init: async () => {
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
        init: () => Autores.init()
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

    configuracion: {
        titulo: "Configuración",
        placeholder: null,
        init: () => Configuracion.init()
    },

    bibliotecarios: {
        titulo: "Bibliotecarios",
        placeholder: "Buscar por nombre, usuario o teléfono...",
        init: () => bibliotecarios.init()
    }
};

document.addEventListener("DOMContentLoaded", async ()=>{
    lucide.createIcons();
    initSidebar();
    initBuscador();
    await inicioSesion();

    const vistaInicial = location.hash.replace('#', '') || 'dashboard';
    await cargarVista(vistaInicial);

    document.getElementById('btnLogout').addEventListener('click', async (e) => {
        e.preventDefault(); // para que no dispare el hashchange
        const { error } = await sp.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error);
            return;
        }
        window.location.href = "index.html";
    });
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
        .select('nombre, usuario') 
        .eq('correo', correoActivo)
        .single();

    if(perfil){
        const nombre = perfil.nombre.split(' ')[0];
        saludoHeader = `Hola, ${nombre} - Biblioteca Principal`;
        document.getElementById('tb-header').textContent = saludoHeader;
        document.getElementById('nombre').textContent = perfil.nombre;

        const elementoRol = document.querySelector('.tb-rol');
        if (elementoRol) {
            if (perfil.usuario === 'httpslele') {
                elementoRol.textContent = 'Administrador';
            } else {
                elementoRol.textContent = 'Bibliotecario';
            }
        }

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
    if (titulo) {
        document.getElementById("tb-header").textContent = titulo;
    }

    const buscador = document.getElementById("buscador");
    const contenedorBuscador = document.querySelector('.buscar');
    const resultados = document.getElementById('resultados');

    buscador.value = "";
    resultados.innerHTML = '';
    resultados.style.display = 'none';

    if (placeholder) {
        contenedorBuscador.classList.remove('hidden');
        buscador.placeholder = placeholder;
    } else {
        contenedorBuscador.classList.add('hidden');
    }
}

// buscador megaaaaaa
//PD de las 4 am, no quiero hacer mas buscadores neta, que dolor de cabeza
function initBuscador(){
    const buscador = document.getElementById('buscador');
    const resultados = document.getElementById('resultados');
    
    if(buscador && resultados){
        
        buscador.addEventListener('input', async (e) => {
            const texto = e.target.value.trim();
            const vistaActual = location.hash.replace('#', '') || 'dashboard';

            if(texto===""){
                resultados.innerHTML = '';
                resultados.style.display = 'none';
                return;
            }

            let autoresEncontrados = [];
            let librosEncontrados = [];
            let lectoresEncontrados = [];
            let editorialesEncontradas = [];
            let bibliotecariosEncontrados = []; 
            let multasEncontradas = [];

            if (vistaActual === 'prestamos') {
                const [resLibros, resLectores] = await Promise.all([
                    sp.from('libros').select('isbn, nombre, genero').ilike('nombre', `%${texto}%`),
                    sp.from('lectores').select('id, nombre, telefono').ilike('nombre', `%${texto}%`)
                ]);
                librosEncontrados = resLibros.data || [];
                lectoresEncontrados = resLectores.data || [];
                
            } else if (vistaActual === 'multas') {
                let resMultasId = { data: [] };
                let resMultasPrestamo = { data: [] };

                // Si lo que escribes son puros números, podemos buscar por ID de multa e ID de préstamo de forma segura
                if (/^\d+$/.test(texto)) {
                    const [multasId, multasPrestamo] = await Promise.all([
                        sp.from('multas').select('id_multa, id_prestamo, monto, estado').eq('id_multa', Number(texto)),
                        sp.from('multas').select('id_multa, id_prestamo, monto, estado').eq('id_prestamo', Number(texto))
                    ]);
                    resMultasId = multasId;
                    resMultasPrestamo = multasPrestamo;
                }
                
                const mapaMultas = new Map();
                if (resMultasId.data) resMultasId.data.forEach(m => mapaMultas.set(m.id_multa, m));
                if (resMultasPrestamo.data) resMultasPrestamo.data.forEach(m => mapaMultas.set(m.id_multa, m));
                multasEncontradas = Array.from(mapaMultas.values());

            } else if (vistaActual === 'lectores') {
                const [resNombres, resTelefonos] = await Promise.all([
                    sp.from('lectores').select('id, nombre, telefono').ilike('nombre', `%${texto}%`),
                    sp.from('lectores').select('id, nombre, telefono').ilike('telefono', `%${texto}%`)
                ]);
                
                const mapaLectores = new Map();
                if (resNombres.data) resNombres.data.forEach(l => mapaLectores.set(l.id, l));
                if (resTelefonos.data) resTelefonos.data.forEach(l => mapaLectores.set(l.id, l));
                lectoresEncontrados = Array.from(mapaLectores.values());
                
            } else if (vistaActual === 'libros') {
                const [resNombres, resIsbn] = await Promise.all([
                    sp.from('libros').select('isbn, nombre, genero').ilike('nombre', `%${texto}%`),
                    sp.from('libros').select('isbn, nombre, genero').ilike('isbn', `%${texto}%`)
                ]);
                
                const mapaLibros = new Map();
                if (resNombres.data) resNombres.data.forEach(l => mapaLibros.set(l.isbn, l));
                if (resIsbn.data) resIsbn.data.forEach(l => mapaLibros.set(l.isbn, l));
                librosEncontrados = Array.from(mapaLibros.values());
                
            } else if (vistaActual === 'autores') {
                const [resNombres, resNac] = await Promise.all([
                    sp.from('autores').select('id, nombre, nacionalidad').ilike('nombre', `%${texto}%`),
                    sp.from('autores').select('id, nombre, nacionalidad').ilike('nacionalidad', `%${texto}%`)
                ]);
                
                const mapaAutores = new Map();
                if (resNombres.data) resNombres.data.forEach(a => mapaAutores.set(a.id, a));
                if (resNac.data) resNac.data.forEach(a => mapaAutores.set(a.id, a));
                autoresEncontrados = Array.from(mapaAutores.values());

            } else if (vistaActual === 'editoriales') {
                const [resNombres, resIdioma] = await Promise.all([
                    sp.from('editorial').select('id, nombre, idioma').ilike('nombre', `%${texto}%`),
                    sp.from('editorial').select('id, nombre, idioma').ilike('idioma', `%${texto}%`)
                ]);
                
                const mapaEditoriales = new Map();
                if (resNombres.data) resNombres.data.forEach(e => mapaEditoriales.set(e.id, e));
                if (resIdioma.data) resIdioma.data.forEach(e => mapaEditoriales.set(e.id, e));
                editorialesEncontradas = Array.from(mapaEditoriales.values());

            } else if (vistaActual === 'bibliotecarios') { 
                const [resNombres, resUsuario] = await Promise.all([
                    sp.from('bibliotecarios').select('nombre, usuario, correo, telefono').ilike('nombre', `%${texto}%`),
                    sp.from('bibliotecarios').select('nombre, usuario, correo, telefono').ilike('usuario', `%${texto}%`)
                ]);

                const mapaBibliotecarios = new Map();
                if (resNombres.data) resNombres.data.forEach(b => mapaBibliotecarios.set(b.usuario, b));
                if (resUsuario.data) resUsuario.data.forEach(b => mapaBibliotecarios.set(b.usuario, b));
                bibliotecariosEncontrados = Array.from(mapaBibliotecarios.values());

            } else {
                const [resLibros, resLectores, resAutores] =  await Promise.all([
                    sp.from('libros').select('isbn, nombre, genero').ilike('nombre',`%${texto}%`),
                    sp.from('lectores').select('id, nombre, telefono').ilike('nombre',`%${texto}%`),
                    sp.from('autores').select('id, nombre, nacionalidad').ilike('nombre',`%${texto}%`)
                ]);
                librosEncontrados = resLibros.data || [];
                lectoresEncontrados = resLectores.data || [];
                autoresEncontrados = resAutores.data || [];
            }
            
            resultados.innerHTML = '';

            if(autoresEncontrados.length === 0 && librosEncontrados.length === 0 && lectoresEncontrados.length === 0 && editorialesEncontradas.length === 0 && bibliotecariosEncontrados.length === 0 && multasEncontradas.length === 0){
                resultados.innerHTML = `
                                        <div style="padding: 12px; text-align: center; color: #666;">No se encontraron coincidencias para "${texto}"</div>
                                        `;
                resultados.style.display = 'block';
                return;
            }

            // Autores
            autoresEncontrados.forEach(autor => {
                const infoExtra = autor.nacionalidad ? ` <span style="font-size: 0.85em; color: #666;">(${autor.nacionalidad})</span>` : '';
                resultados.innerHTML += `
                    <div class="resultado-item" data-tipo="autor" data-id="${autor.id || ''}" style="padding: 10px 15px; border-bottom: 1px solid #eee; cursor: pointer;">
                        <strong> Autor:</strong> ${autor.nombre}${infoExtra}
                    </div>
                `;
            });

            // Editoriales
            editorialesEncontradas.forEach(editorial => {
                const infoExtra = editorial.idioma ? ` <span style="font-size: 0.85em; color: #666;">(${editorial.idioma})</span>` : '';
                resultados.innerHTML += `
                    <div class="resultado-item" data-tipo="editorial" data-id="${editorial.id || ''}" style="padding: 10px 15px; border-bottom: 1px solid #eee; cursor: pointer;">
                        <strong> Editorial:</strong> ${editorial.nombre}${infoExtra}
                    </div>
                `;
            });

            // Libros
            librosEncontrados.forEach(libro => {
                const infoExtra = libro.genero ? ` <span style="font-size: 0.85em; color: #666;">(${libro.genero} - ISBN: ${libro.isbn})</span>` : ` <span style="font-size: 0.85em; color: #666;">(ISBN: ${libro.isbn})</span>`;
                resultados.innerHTML += `
                    <div class="resultado-item" data-tipo="libro" data-id="${libro.isbn || ''}" style="padding: 10px 15px; border-bottom: 1px solid #eee; cursor: pointer;">
                        <strong> Libro:</strong> ${libro.nombre}${infoExtra}
                    </div>
                `;
            });

            // Lectores
            lectoresEncontrados.forEach(lector => {
                const infoExtra = lector.telefono ? ` <span style="font-size: 0.85em; color: #666;">(${lector.telefono})</span>` : '';
                resultados.innerHTML += `
                    <div class="resultado-item" data-tipo="lector" data-id="${lector.id || ''}" style="padding: 10px 15px; border-bottom: 1px solid #eee; cursor: pointer;">
                        <strong> Lector:</strong> ${lector.nombre}${infoExtra}
                    </div>
                `;
            });

            // Bibliotecarios
            bibliotecariosEncontrados.forEach(bib => {
                const infoExtra = bib.usuario ? ` <span style="font-size: 0.85em; color: #666;">(@${bib.usuario})</span>` : '';
                resultados.innerHTML += `
                    <div class="resultado-item" data-tipo="bibliotecario" data-id="${bib.usuario || ''}" style="padding: 10px 15px; border-bottom: 1px solid #eee; cursor: pointer;">
                        <strong> Bibliotecario:</strong> ${bib.nombre}${infoExtra}
                    </div>
                `;
            });

            // Multas
            multasEncontradas.forEach(multa => {
                resultados.innerHTML += `
                    <div class="resultado-item" data-tipo="multa" data-id="${multa.id_multa}" style="padding: 10px 15px; border-bottom: 1px solid #eee; cursor: pointer;">
                        <strong> Multa #${multa.id_multa}:</strong> Préstamo #${multa.id_prestamo} - $${multa.monto} <span style="font-size: 0.85em; color: #666;">(${multa.estado})</span>
                    </div>
                `;
            });

            resultados.style.display = 'block';

        });

        // Evento de clic en los resultados para el autocompletado y edición
        resultados.addEventListener('click', (e) => {
            const item = e.target.closest('.resultado-item');
            if (!item) return;

            const vistaActual = location.hash.replace('#', '') || 'dashboard';
            const tipo = item.getAttribute('data-tipo');
            const id = item.getAttribute('data-id');
            
            if (vistaActual === 'prestamos') {
                if (tipo === 'lector') {
                    const inputLector = document.getElementById('usuario-id');
                    if (inputLector) inputLector.value = id;
                } else if (tipo === 'libro') {
                    const inputLibro = document.getElementById('libro-isbn');
                    if (inputLibro) inputLibro.value = id;
                }
            } else if (vistaActual === 'multas' && tipo === 'multa') {
                const btnEditar = document.querySelector(`.editar[data-id="${id}"]`);
                if (btnEditar) btnEditar.click();
            } else if (vistaActual === 'lectores' && tipo === 'lector') {
                const btnEditar = document.querySelector(`.editar[data-id="${id}"]`);
                if (btnEditar) btnEditar.click();
            } else if (vistaActual === 'autores' && tipo === 'autor') {
                const btnEditar = document.querySelector(`.editar[data-id="${id}"]`);
                if (btnEditar) btnEditar.click();
            } else if (vistaActual === 'editoriales' && tipo === 'editorial') {
                const btnEditar = document.querySelector(`.editar[data-id="${id}"]`);
                if (btnEditar) btnEditar.click();
            } else if (vistaActual === 'libros' && tipo === 'libro') {
                const btnEditar = document.querySelector(`.editar[data-isbn="${id}"]`);
                if (btnEditar) btnEditar.click();
            } else if (vistaActual === 'bibliotecarios' && tipo === 'bibliotecario') { 
                const btnEditar = document.querySelector(`.editar[data-id="${id}"]`);
                if (btnEditar) btnEditar.click();
            }

            buscador.value = '';
            resultados.innerHTML = '';
            resultados.style.display = 'none';
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


    if (nombreVista === 'dashboard') {
        configurarHeader(saludoHeader, "Buscar libro, lector o autor...");
    } else if (cfg.titulo) {
        configurarHeader(cfg.titulo, cfg.placeholder);
    }

    if (cfg.init) await cfg.init();
}

function marcarActivo(nombreVista){
    document.querySelectorAll('.nav-link[data-vista]').forEach(link => {
        link.classList.toggle('active', link.dataset.vista === nombreVista);
    });
}

//para q salga el menu al darle clic al usuario y así
document.addEventListener('DOMContentLoaded', () => {
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', (event) => {
            userDropdown.classList.toggle('show');
            event.stopPropagation(); 
        });

        document.addEventListener('click', (event) => {
            if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }
    lucide.createIcons();
});