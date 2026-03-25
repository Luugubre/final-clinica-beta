'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Save, Loader2, Clock, Calendar, User, Trash2, 
  Stethoscope, LayoutGrid, ChevronRight, AlertCircle 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const DIAS = [
  { id: 1, label: 'Lunes' }, { id: 2, label: 'Martes' }, { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' }, { id: 5, label: 'Viernes' }, { id: 6, label: 'Sábado' }, { id: 0, label: 'Domingo' }
];

export default function BoxConfigPage() {
  const [profesionales, setProfesionales] = useState<any[]>([])
  const [profesionalId, setProfesionalId] = useState('')
  const [disponibilidad, setDisponibilidad] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [nuevoBloque, setNuevoBloque] = useState({ dia_semana: 1, hora_inicio: '09:00', hora_fin: '13:00', box_id: 1 })

  useEffect(() => {
    fetchInicial()
  }, [])

  useEffect(() => {
    if (profesionalId) fetchDisponibilidad()
  }, [profesionalId])

  async function fetchInicial() {
    const { data, error } = await supabase
      .from('profesionales')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    
    if (data && data.length > 0) {
      setProfesionales(data)
      setProfesionalId(data[0].user_id)
    }
    setCargando(false)
  }

  async function fetchDisponibilidad() {
    const { data } = await supabase
      .from('disponibilidad_profesional')
      .select('*')
      .eq('profesional_id', profesionalId)
      .order('dia_semana', { ascending: true })
      .order('hora_inicio', { ascending: true })
    setDisponibilidad(data || [])
  }

  const agregarBloque = async () => {
    if (nuevoBloque.hora_inicio >= nuevoBloque.hora_fin) {
      return toast.error("La hora de inicio debe ser menor a la de fin");
    }
    setGuardando(true)
    const { error } = await supabase.from('disponibilidad_profesional').insert([{
      profesional_id: profesionalId,
      ...nuevoBloque
    }])
    
    if (!error) {
      toast.success("Horario asignado correctamente");
      fetchDisponibilidad();
    } else {
      toast.error("Error al guardar horario");
    }
    setGuardando(false)
  }

  const eliminarBloque = async (id: string) => {
    const { error } = await supabase.from('disponibilidad_profesional').delete().eq('id', id)
    if (!error) {
      toast.success("Bloque eliminado");
      fetchDisponibilidad();
    }
  }

  if (cargando) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 text-slate-900">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-slate-900">Sincronizando Boxes...</p>
    </div>
  )

  const profesionalSeleccionado = profesionales.find(p => p.user_id === profesionalId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-10 text-slate-900">
        
        {/* HEADER ESTILIZADO */}
        <header className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          
          <div className="relative z-10 flex items-center gap-6 text-slate-900">
            <div className="bg-slate-900 p-5 rounded-[2rem] text-white shadow-xl">
              <LayoutGrid size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 uppercase italic leading-none">Gestión de Boxes</h1>
              {/* CORREGIDO: div en lugar de p para evitar error de hidratación */}
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse text-slate-900"></div>
                Planificación Semanal de Sillones
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-4 w-full md:w-auto text-slate-900">
            <div className="bg-slate-50 p-2 rounded-[2rem] border border-slate-100 flex items-center pr-6 gap-4 shadow-inner w-full">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg font-black text-lg">
                {profesionalSeleccionado?.nombre?.[0]}
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-slate-900">Especialista</span>
                <select 
                  className="bg-transparent font-black text-sm text-slate-700 uppercase outline-none cursor-pointer"
                  value={profesionalId}
                  onChange={(e) => setProfesionalId(e.target.value)}
                >
                  {profesionales.map(p => <option key={p.id} value={p.user_id}>Dr. {p.nombre} {p.apellido}</option>)}
                </select>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-900">
          {/* FORMULARIO AGREGAR - IZQUIERDA */}
          <div className="lg:col-span-4 space-y-6 text-slate-900">
            <motion.div 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-8"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Clock size={24}/>
                </div>
                <h2 className="font-black text-sm uppercase italic text-slate-800 tracking-tight">Nuevo Bloque Horario</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Día de la semana</label>
                  <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-xs outline-none border-none shadow-inner appearance-none text-slate-600" 
                    value={nuevoBloque.dia_semana} onChange={(e) => setNuevoBloque({...nuevoBloque, dia_semana: Number(e.target.value)})}>
                    {DIAS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 text-slate-900">Desde</label>
                    <input type="time" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-xs outline-none shadow-inner text-slate-600"
                      value={nuevoBloque.hora_inicio} onChange={(e) => setNuevoBloque({...nuevoBloque, hora_inicio: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Hasta</label>
                    <input type="time" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-xs outline-none shadow-inner text-slate-600"
                      value={nuevoBloque.hora_fin} onChange={(e) => setNuevoBloque({...nuevoBloque, hora_fin: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Sillón / Box de Atención</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button 
                        key={n}
                        onClick={() => setNuevoBloque({...nuevoBloque, box_id: n})}
                        className={`py-4 rounded-2xl text-xs font-black transition-all ${nuevoBloque.box_id === n ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-white'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={agregarBloque}
                  disabled={guardando}
                  className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:bg-slate-300 active:scale-95"
                >
                  {guardando ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                  Vincular al Especialista
                </button>
              </div>
            </motion.div>

            <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 flex gap-4">
              <AlertCircle className="text-amber-500 shrink-0" size={20} />
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-tight leading-relaxed italic">
                Evite solapar horarios de diferentes especialistas en el mismo sillón para mantener la integridad de la agenda.
              </div>
            </div>
          </div>

          {/* VISTA CALENDARIO SEMANAL - DERECHA */}
          <div className="lg:col-span-8 bg-white p-10 rounded-[4rem] shadow-sm border border-slate-100 relative overflow-hidden text-slate-900">
             <div className="space-y-2">
                {DIAS.map((dia, index) => {
                  const bloquesDia = disponibilidad.filter(b => b.dia_semana === dia.id);
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={dia.id} 
                      className="flex flex-col md:flex-row items-center gap-6 p-6 hover:bg-slate-50 rounded-[2.5rem] transition-all border-b border-slate-50 last:border-0 group"
                    >
                      <div className="w-32 shrink-0 text-center md:text-left text-slate-900">
                        <span className="text-xs font-black uppercase text-slate-800 italic group-hover:text-blue-600 transition-colors">{dia.label}</span>
                      </div>
                      
                      <div className="flex-1 flex flex-wrap gap-4 justify-center md:justify-start">
                        <AnimatePresence>
                          {bloquesDia.length === 0 ? (
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest py-3 italic">Libre</span>
                          ) : bloquesDia.map(b => (
                            <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                              key={b.id} 
                              className="bg-white border border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-all group/item text-slate-900"
                            >
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Horario</span>
                                <span className="text-xs font-black text-slate-700">
                                  {b.hora_inicio.substring(0,5)} - {b.hora_fin.substring(0,5)}
                                </span>
                              </div>
                              
                              <div className="h-8 w-[1px] bg-slate-100 text-slate-900"></div>

                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black border border-blue-100">
                                  S{b.box_id}
                                </div>
                                <button 
                                  onClick={() => eliminarBloque(b.id)} 
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={14}/>
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="text-slate-200" size={20} />
                      </div>
                    </motion.div>
                  )
                })}
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}