// Lee la carrera del usuario desde Supabase y la devuelve con la misma forma que devolvía la API,
// para que la interfaz no tenga que cambiar.
import { supabase } from './supabase'
import type { Comision, Correlativa, Materia, MateriaOverview } from '../stores/materias'

interface FilaMateria {
  id: string
  nombre: string
  anio: number
  cuatrimestre: number
  anual: boolean
  codigo_original: string | null
  descripcion: string | null
  area: string | null
  programa_url: string | null
  sitio_url: string | null
  campus_url: string | null
}

interface FilaComision {
  id: string
  materia_id: string
  semestre: string | null
  dia: number
  inicio: string
  fin: string
  aulas: string[]
  sede: string | null
  modalidad: string | null
  notas: string | null
}

interface FilaDependencia {
  materia_id: string
  depende_de_id: string
  requisito: string
}

// Id numérico estable para la interfaz: "r112" -> 112. Si el código no tiene ese formato, se deriva del uuid.
function idDeMateria(fila: Pick<FilaMateria, 'id' | 'codigo_original'>): number {
  const numero = fila.codigo_original?.match(/^r(\d+)$/i)
  return numero ? Number(numero[1]) : idDeUuid(fila.id)
}

function idDeUuid(uuid: string): number {
  return parseInt(uuid.replace(/-/g, '').slice(0, 8), 16)
}

// Mapa uuid → id numérico de la última carga. Permite que los componentes de escritura
// resuelvan el uuid de una materia a partir de su id numérico visible en la UI.
export const uuidPorIdNumerico = new Map<number, string>()

// Carga una carrera del usuario, con sus materias, horarios y correlativas.
// Si no se pasa carreraId, usa la primera carrera del usuario.
export async function cargarCarreraDb(carreraId?: string): Promise<{ disponibles: Materia[]; overviews: Record<number, MateriaOverview> }> {
  let idCarrera = carreraId
  if (!idCarrera) {
    const { data: carreras, error: errorCarrera } = await supabase
      .from('carreras')
      .select('id')
      .order('creada_en', { ascending: true })
      .limit(1)
    if (errorCarrera) throw new Error(errorCarrera.message)
    if (!carreras?.length) return { disponibles: [], overviews: {} }
    idCarrera = carreras[0].id
  }

  const { data: filasMaterias, error: errorMaterias } = await supabase
    .from('materias')
    .select('id, nombre, anio, cuatrimestre, anual, codigo_original, descripcion, area, programa_url, sitio_url, campus_url')
    .eq('carrera_id', idCarrera)
  if (errorMaterias) throw new Error(errorMaterias.message)

  const materias = (filasMaterias ?? []) as FilaMateria[]
  const ids = materias.map(m => m.id)
  if (!ids.length) return { disponibles: [], overviews: {} }

  const [{ data: filasComisiones, error: errorComisiones }, { data: filasDeps, error: errorDeps }] = await Promise.all([
    supabase
      .from('comisiones')
      .select('id, materia_id, semestre, dia, inicio, fin, aulas, sede, modalidad, notas')
      .in('materia_id', ids),
    supabase.from('dependencias').select('materia_id, depende_de_id, requisito').in('materia_id', ids),
  ])
  if (errorComisiones) throw new Error(errorComisiones.message)
  if (errorDeps) throw new Error(errorDeps.message)

  const idPorUuid = new Map(materias.map(m => [m.id, idDeMateria(m)] as const))
  const materiaPorUuid = new Map(materias.map(m => [m.id, m] as const))

  // Actualiza el mapa global para que los componentes de escritura resuelvan el uuid.
  uuidPorIdNumerico.clear()
  for (const m of materias) uuidPorIdNumerico.set(idDeMateria(m), m.id)

  const disponibles: Materia[] = materias.map(m => ({
    id: idDeMateria(m),
    career_id: 1,
    name: m.nombre,
    code: m.codigo_original,
    year: m.anio,
    term: m.cuatrimestre,
    kind: 'obligatoria',
    anual: m.anual,
  }))

  const overviews: Record<number, MateriaOverview> = {}
  for (const m of materias) {
    const id = idDeMateria(m)
    const sesiones: Comision[] = (filasComisiones as FilaComision[] | null ?? [])
      .filter(c => c.materia_id === m.id)
      .map(c => ({
        id: idDeUuid(c.id),
        subject_id: id,
        semester: c.semestre,
        weekday: c.dia,
        start_time: c.inicio.slice(0, 5),
        end_time: c.fin.slice(0, 5),
        rooms: c.aulas ?? [],
        campus: c.sede,
        campus_id: null,
        mode: c.modalidad,
        notes: c.notas,
      }))
    const prerequisitos: Correlativa[] = (filasDeps as FilaDependencia[] | null ?? [])
      .filter(d => d.materia_id === m.id)
      .map(d => {
        const origen = materiaPorUuid.get(d.depende_de_id)
        return {
          id: idPorUuid.get(d.depende_de_id) ?? idDeUuid(d.depende_de_id),
          code: origen?.codigo_original ?? null,
          name: origen?.nombre ?? '',
          requirement: d.requisito,
        }
      })

    overviews[id] = {
      id,
      career_id: 1,
      name: m.nombre,
      code: m.codigo_original,
      year: m.anio,
      term: m.cuatrimestre,
      kind: 'obligatoria',
      anual: m.anual,
      description: m.descripcion,
      syllabus_pdf_url: m.programa_url,
      campus_url: m.campus_url,
      website_url: m.sitio_url,
      area: m.area,
      area_id: null,
      sessions: sesiones,
      exam_count: 0,
      solution_count: 0,
      material_count: 0,
      prerequisites: prerequisitos,
    }
  }

  return { disponibles, overviews }
}
