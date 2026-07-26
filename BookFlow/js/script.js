const spURL = https://kzsxksciruyrlcjkqfqm.supabase.co;
const spK = sb_publishable_OkJX5qDnmbMmHgOMRILz8Q_1TVu0IEA;

const sp = window.supabase.createClient(spURL, spK);

async function cargarLibros() {
    try {
        const { data, error } = await supabase
            .from('libros') 
            .select('*');
        if (error) {
            console.error("Hubo un problema al consultar la base de datos:", error.message);
            return;
        }

        console.log("¡Conexión exitosa a Supabase!");
        console.log("Datos obtenidos:", data);
    } catch (err) {
        console.error("Error inesperado en el sistema:", err);
    }
}

cargarLibros();