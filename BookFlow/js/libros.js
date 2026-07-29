    
    const Libros = (() => {
        
    let formLibro, btnSubmit, estadoMensaje, tablaBody;
    let libros = [];
    let isbnEnEdicion = null;
    let autores = [];
    let editoriales = [];
    let btnCancelar;
 
    async function init() {
        formLibro = document.getElementById('form-libro');
        btnSubmit = formLibro.querySelector('.btn-primary');
        btnCancelar = document.getElementById("cancelar-edicion");
        estadoMensaje = document.getElementById('estado-mensaje');
        tablaBody = document.getElementById('tabla-libros-body');
 
        isbnEnEdicion = null;
        formLibro.addEventListener('submit', guardarLibro);
        btnCancelar.addEventListener("click", cancelarEdicion);
 
        await cargarAutores();
        await cargarEditoriales();
        await cargarLibros(); 
    } ///end init libros (la chingadera que lo une con principal)
 
    function mostrarMensaje(texto, esError) {
        estadoMensaje.textContent = texto;
        estadoMensaje.classList.remove('ok', 'error');
        estadoMensaje.classList.add(esError ? 'error' : 'ok');
    } //end mostrar mensajes de error
    
async function cargarAutores() {
    const { data, error } = await sp
        .from("autores")
        .select("*")
        .order("nombre");

    if (error) {
        mostrarMensaje(error.message, true);
        return;
    }

    autores = data;
    const select = document.getElementById("autor");

    select.innerHTML = `
        <option value="">Selecciona un autor</option>
    `;

    autores.forEach(autor => {
        select.innerHTML += `
            <option value="${autor.id}">
                ${autor.nombre}
            </option>
        `;
    });

}

async function cargarEditoriales() {
    const { data, error } = await sp
        .from("editorial")
        .select("*")
        .order("nombre");

    if (error) {
        mostrarMensaje(error.message, true);
        return;
    }

    editoriales = data;
    const select = document.getElementById("editorial");

    select.innerHTML = `
        <option value="">Selecciona una editorial</option>
    `;

    editoriales.forEach(editorial => {
        select.innerHTML += `
            <option value="${editorial.id}">
                ${editorial.nombre}
            </option>
        `;
    });
}

    async function cargarLibros() {
        try {
            const { data, error } = await sp
                .from('libros')
                .select('*')
                .order('nombre', { ascending: true });
 
        if (error) {
            mostrarMensaje('Error al cargar libros: ' + error.message, true);
            return;
        }
 
        libros = data;
        renderTabla();
        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        }
    } // end cargar libros

    function renderTabla() {
        tablaBody.innerHTML = '';
 
        libros.forEach((libro) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${libro.isbn}</td>
                <td>${libro.nombre ?? ''}</td>
                <td>${libro.autor ?? ''}</td>
                <td>${libro.genero ?? ''}</td>
                <td>${libro.editorial ?? ''}</td>
                <td>${libro.stock ?? 0}</td>
                
                <td class="acciones-cell">
                    <button
                        type="button"
                        class="icon-btn editar"
                        data-isbn="${libro.isbn}"
                        title="Editar">

                        <i data-lucide="square-pen"></i>

                    </button>
                    <button
                        type="button"
                        class="icon-btn borrar"
                        data-isbn="${libro.isbn}"
                        title="Eliminar">

                        <i data-lucide="trash-2"></i>

                    </button>

                </td>
            `;
            tablaBody.appendChild(fila);
        
        });
        lucide.createIcons();
    
        tablaBody.querySelectorAll('.editar').forEach((btn) =>
            btn.addEventListener('click', () => cargarLibroEnFormulario(btn.dataset.isbn))
        );
        tablaBody.querySelectorAll('.borrar').forEach((btn) =>
            btn.addEventListener('click', () => borrarLibro(btn.dataset.isbn))
        );
    } ///end render tabla
 
    async function guardarLibro(e) {  
        e.preventDefault();

        const isbn = document.getElementById('isbn').value.trim();
        const nombre = document.getElementById('nombre-libro').value.trim();
        const genero = document.getElementById('genero').value.trim();
        const idAutor = Number(document.getElementById("autor").value);
        const idEditorial = Number(document.getElementById("editorial").value);
        const stockTexto = document.getElementById('stock').value;
 
        if (!/^\d{10,13}$/.test(isbn)) {
            mostrarMensaje('El ISBN debe ser numérico y tener exactamente entre 10 y 13 dígitos.', true);
            return;
        }
 
        if (!isbnEnEdicion && libros.some((l) => l.isbn === isbn)) {
            mostrarMensaje('Ese ISBN ya existe. Usa el botón "Editar" en la tabla para modificarlo.', true);
            return;
        }
 
        const stock = Number(stockTexto);
    
        if (!Number.isInteger(stock) || stock < 0) {
            mostrarMensaje('El stock debe ser un número entero mayor o igual a 0.', true);
            return;
        }
 
        if (Number.isNaN(idAutor) || Number.isNaN(idEditorial)) {
            mostrarMensaje('Autor y Editorial deben ser el ID numérico de esas tablas.', true);
            return;
        }
 
        btnSubmit.disabled = true;
    
        try {
            const [{ data: autorExiste }, { data: editorialExiste }] = await Promise.all([
                sp.from('autores').select('id').eq('id', idAutor).maybeSingle(),
                sp.from('editorial').select('id').eq('id', idEditorial).maybeSingle()
            ]);
 
            if (!autorExiste) {
                mostrarMensaje(`No existe ningún autor con ID ${idAutor}.`, true);
                return;
            }
            if (!editorialExiste) {
                mostrarMensaje(`No existe ninguna editorial con ID ${idEditorial}.`, true);
                return;
            }

            const nombreAutor = autores.find(a => a.id === idAutor)?.nombre;
            const nombreEditorial = editoriales.find(e => e.id === idEditorial)?.nombre;
 
            const { error } = await sp.from('libros').upsert({
                isbn,
                nombre,
                genero,
                stock,

                autor: nombreAutor,
                editorial: nombreEditorial,

                id_autor: idAutor,
                id_editorial: idEditorial
            });
 
            if (error) {
                mostrarMensaje('Error al guardar: ' + error.message, true);
                return;
            }
 
            mostrarMensaje(isbnEnEdicion ? 'Libro actualizado.' : 'Libro agregado.', false);
            cancelarEdicion();
            cargarLibros();

    } catch (err) {
        mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
    } finally {
        btnSubmit.disabled = false;
    }
    } //end guardar libro
 
    function cargarLibroEnFormulario(isbn) {
        const libro = libros.find((l) => l.isbn === isbn);
        if (!libro) return;
 
        isbnEnEdicion = isbn;
        btnCancelar.disabled=false;

        document.getElementById('isbn').value = libro.isbn;
        document.getElementById('isbn').disabled = true; // el ISBN es la llave, no se cambia en edición
        document.getElementById('nombre-libro').value = libro.nombre ?? '';
        document.getElementById('genero').value = libro.genero ?? '';
        document.getElementById("autor").value = libro.id_autor;
        document.getElementById("editorial").value = libro.id_editorial;
        document.getElementById('stock').value = libro.stock ?? 0;
        
        const isbnInput=document.getElementById("isbn");
        isbnInput.disabled=true;
 
        btnSubmit.textContent = 'Guardar cambios';
        formLibro.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } //end cargar libro formulario
 
    function cancelarEdicion() {
        btnCancelar.disabled=true;
        const isbn=document.getElementById("isbn");
        
        isbn.disabled=false;
        isbn.style.cursor="text";
        
        isbnEnEdicion = null;
        formLibro.reset();
        document.getElementById("autor").selectedIndex = 0;
        document.getElementById("editorial").selectedIndex = 0;
        document.getElementById('isbn').disabled = false;
        btnSubmit.textContent = 'Agregar';  
    } // cancelar edicion
 
    async function borrarLibro(isbn) {
        const confirmar = confirm(`¿Borrar el libro con ISBN ${isbn}?`);
        if (!confirmar) return;
 
        const boton = tablaBody.querySelector(`.borrar[data-isbn="${isbn}"]`);
        if (boton) boton.disabled = true;
 
        try {
            const { error } = await sp.from('libros').delete().eq('isbn', isbn);
 
            if (error) {
                // Violación de llave foránea: el libro tiene préstamos asociados
                if (error.code === '23503') {
                    mostrarMensaje('No se puede borrar: este libro tiene préstamos asociados.', true);
                } else {
                    mostrarMensaje('Error al borrar: ' + error.message, true);
                }
            return;
            }
 
        mostrarMensaje('Libro borrado.', false);

        if (isbnEnEdicion === isbn) cancelarEdicion();
            cargarLibros();
        } catch (err) {
            mostrarMensaje('No se pudo conectar con el servidor. Revisa tu conexión.', true);
        } finally {
            if (boton) boton.disabled = false;
        }
    } //borrar libro
    
        return {init}

    })(); //final de la const global