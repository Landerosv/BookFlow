const spURL = 'https://kzsxksciruyrlcjkqfqm.supabase.co';
const spK = 'sb_publishable_OkJX5qDnmbMmHgOMRILz8Q_1TVu0IEA';

//Variables 
const sp = window.supabase.createClient(spURL, spK);


document.addEventListener('DOMContentLoaded', () => {
    dashboard();
    initBuscador();
    cargarPrestamosRecientes();
    cargarTopLibros();
    cargarConteo();
});

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


    // relleno de la tabla de prestamos recientes

    async function cargarPrestamosRecientes() {
        const { data, error } = await sp
        .from('prestamos')
        .select(`
            fecha_prestamo,
            estado,
            lectores ( nombre ),
            libros ( nombre )
            `)
        .order( 'fecha_prestamo', { ascending: false } )
        .limit(6);

        if ( error ){
            console.error('error cargando prestamos:', error)
            return;
        }

        const tbody = document.querySelector(' .table-prin tbody ')
        tbody.innerHTML = '';

        data.forEach(p => {
            const badgeClass = p.estado === 'En curso' ? 'badge-ok'
                                : p.estado === 'Vencido' ? 'badge-warn'
                                : 'badge-done';
            
            const fila = document.createElement ('tr');
            fila.innerHTML = `
                    <td class="cell-name">${p.lectores ? p.lectores.nombre : 'Sin lector'}</td>
                    <td>${p.libros ? p.libros.nombre : 'Sin libro'}</td>
                    <td>${new Date(p.fecha_prestamo).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td><span class="badge ${badgeClass}">${p.estado}</span></td>

            `;
            tbody.appendChild(fila)
        });
    } //end cargarPrestamosRecientes

    // top libros goat supreme +1000 de aura
    // nota: para esto hice una vista en supa llamada top_libros

    async function cargarTopLibros(){
        const { data,error } = await sp
        .from( 'top_libros' )
        .select('*');

        if (error) {
            console.error('error cargando top libros:', error);
            return;
        }

        const lista = document.querySelector('.top-books-list');
        lista.innerHTML = '';

        data.forEach(( libro, index )  => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="rank-badge">${index + 1}</span>
                <div>
                <p class="rank-title">${libro.libro}</p>
                <p class="rank-sub">${libro.autor}</p>
                </div>
            `;
        lista.appendChild(li);
        })

    }// end cargar libros
    
    /// conteo de cositas

    async function cargarConteo(){

        const { count: totalLibros } = await sp
        .from('libros')
        .select('*', { count: 'exact', head: true })

        const { count: totalLectores } = await sp
        .from('lectores')
        .select('*', { count: 'exact', head: true })

        const { count: totalPrestamos } = await sp
        .from('prestamos')
        .select('*', { count: 'exact', head: true })

        const { count: totalmultas } = await sp
        .from('multas')
        .select('*', { count: 'exact', head: true })

        document.querySelectorAll('.stats-num')[0].textContent = totalLibros;
        document.querySelectorAll('.stats-num')[1].textContent = totalLectores;
        document.querySelectorAll('.stats-num')[2].textContent = totalPrestamos;
        document.querySelectorAll('.stats-num')[3].textContent = totalmultas;
   
    }// end cargar conteo