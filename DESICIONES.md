# Decisiones de diseño

Registro de las decisiones tomadas para migrar caso_base de localStorage a Supabase y para soportar más de una carrera. Cada punto refleja lo acordado entre el usuario y el equipo; si algo cambia, se actualiza acá.

## 1. Alcance y datos actuales

- Los datos guardados en localStorage **se descartan** al migrar a la base de datos. No hay migración de sesiones ni exámenes viejos.
- El plan de la carrera actual (Licenciatura en Ciencias de la Computación) queda como **plan precargado**. Es la primera opción al crear una carrera.

## 2. Carreras

- Cada carrera es una entidad propia con: nombre, sigla y orden de creación.
- **Sigla:** editable en cualquier momento. Entre 2 y 6 caracteres, letras y números. Única dentro de las carreras del mismo usuario.
- Al crear una carrera, la sigla queda vacía con un texto de ayuda ("Por ejemplo, LCC"). La app no inventa siglas.
- La sigla se usa para diferenciar materias en el selector del Pomodoro y en el ranking.
- **Borrar una carrera** borra todo: sus materias, sesiones, exámenes y totales. Requiere confirmación.

## 3. Materias

### Identificadores

- **`id`**: UUID generado en el cliente. Nunca cambia. Es la clave en la base de datos y en la sincronización.
- **`codigo`**: identificador dinámico, interno. Sirve para ubicar la materia en su año y semestre y para ordenar. Tiene la forma `{letra de carrera}{año}{semestre}{número}`. La letra depende de la posición de la carrera (primera, segunda…), pero se fija al crear la carrera y no se reutiliza.
- **El `codigo` es invisible para el usuario.** Son identificadores inventados por la app y no se muestran en ninguna pantalla.
- **`codigo_original`**: solo para el plan precargado (por ejemplo, SO = 322). Queda congelado como historial y no se edita.

### Alta

- Las materias se cargan **de abajo hacia arriba**: primero las que no tienen correlativas, después las que dependen de ellas.
- Formulario mínimo: nombre, año y semestre.
- Sección plegable "Información adicional" dentro de cada materia, para datos que no son esenciales.
- El campo **"depende de"** arranca vacío en las materias nuevas. Solo ofrece materias ya cargadas en la misma carrera.

### Edición

- **Año y semestre son editables.** Los cambios se reflejan en toda la app.
- Al mover una materia de año o semestre, **solo cambia el `codigo` de esa materia**. Las demás no se renumeran.
- **Una materia no puede cambiar de carrera.** Solo se edita dentro de su carrera.

### Dependencias (correlativas)

- Se **impide** guardar una dependencia que genere un ciclo. Antes de guardar, se verifica que la materia de destino no dependa, directa o indirectamente, de la materia que se está editando.
- Como las dependencias se validan al guardar, la app no llega a tener ciclos.

### Borrado

- Borrar una materia la elimina **por completo**: sus sesiones, exámenes y totales.
- Si otras materias la tienen como correlativa, esa dependencia se quita. Antes de confirmar, se muestra la lista de materias afectadas.
- Si el Pomodoro está corriendo con esa materia, se detiene antes de borrarla.
- Con la sincronización offline, el borrado se encola y se aplica como borrado físico, según la regla de sincronización.

## 4. Selección para el Pomodoro

- Cada materia tiene un estado **activa / no activa** para el Pomodoro.
- **Las materias nuevas no se activan automáticamente.** El usuario las activa en la pestaña de materias.
- **Deseleccionar** una materia la saca del selector del Pomodoro, pero **no la borra**. Sus sesiones y registros pasados siguen mostrando su nombre.
- El **Comodín** (id 0) es una opción fija del Pomodoro. No pertenece a ninguna carrera y no se puede borrar ni editar.

## 5. Formato de tiempos

- Totales de foco: `hh:mm`, con dos dígitos en las horas (01:37).
- Valores con segundos (cronómetros): `hh:mm:ss`.

## 6. Sincronización (ya definido)

- Iniciar sesión es obligatorio para usar la app.
- Las escrituras sin conexión se guardan en una cola local (IndexedDB) y se sincronizan al volver la conexión.
- Conflictos: **gana la última escritura** (last write wins).
- Los ids (UUID) se generan en el cliente, así que las altas funcionan sin conexión.
- Los borrados son físicos en la base de datos.
- Las sesiones en curso y el foco acumulado se guardan durante la ejecución.
- Cerrar sesión funciona sin conexión; eliminar la cuenta requiere conexión.

## 7. Pendiente, fuera de alcance por ahora

- **Importar planes desde archivos.** Primero, una plantilla CSV con columnas fijas (nombre, año, semestre, depende de). Un PDF o un asistente de extracción queda para una etapa posterior.
- **Ranking por carrera.** Se usará la sigla para diferenciar, pero el diseño del ranking no está definido.
- **Tema claro/oscuro en la cuenta.** Hoy se guarda en el dispositivo. Sincronizarlo con la cuenta queda para cuando exista la sincronización de preferencias.
