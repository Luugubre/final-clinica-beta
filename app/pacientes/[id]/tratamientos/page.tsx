'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Save, X, Loader2, Stethoscope, Wallet, 
  Calendar, FileText, ChevronRight, CheckCircle2, Trash2 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

export default function ListaTratamientosPage() {
  const params = useParams()
  const paciente_id = params.id
  const router = useRouter()
  const [planes, setPlanes] = useState<any[]>([])
  const [profesionales, setProfesionales] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  
  const [modalNuevoPlan, setModalNuevoPlan] = useState(false)
  const [creandoPlan, setCreandoPlan] = useState(false)
  const [nuevoPlan, setNuevoPlan] = useState({
    nombre: '',
    especialista_id: ''
  })

  useEffect(() => {
    if (paciente_id) {
      fetchInicial()
    }
  }, [paciente_id])

  async function fetchInicial() {
    setCargando(true)
    try {
      await Promise.all([fetchPlanes(), fetchProfesionales()])
    } catch (error) {
      console.error("Error en carga inicial:", error)
    } finally {
      setCargando(false)
    }
  }

  async function fetchProfesionales() {
    const { data } = await supabase
      .from('profesionales')
      .select('*, especialidades(nombre)')
      .eq('activo', true)
    setProfesionales(data || [])
  }

  async function fetchPlanes() {
    const { data, error } = await supabase
      .from('presupuestos')
      .select(`
        id,
        nombre_tratamiento,
        total,
        total_abonado,
        estado,
        especialista_id,
        profesionales(nombre, apellido, especialidades(nombre))
      `)
      .eq('paciente_id', paciente_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Error al traer planes:", error.message)
    } else {
      setPlanes(data || [])
    }
  }

  const handleEliminarPlan = async (e: React.MouseEvent, planId: string, nombre: string) => {
    e.stopPropagation() 
    e.preventDefault()
    
    if (typeof window !== 'undefined' && window.confirm(`¿Estás seguro de eliminar el plan "${nombre}"?\n\nEsta acción eliminará todos los tratamientos y abonos asociados de forma permanente.`)) {
        try {
          const { error } = await supabase
            .from('presupuestos')
            .delete()
            .eq('id', planId);

          if (error) throw error;

          toast.success("Plan eliminado correctamente");
          setPlanes((prev) => prev.filter(p => p.id !== planId));

        } catch (error: any) {
          if (error.code === '23503') {
            toast.error("Error de integridad", {
              description: "No se puede eliminar el plan porque tiene pagos registrados. Elimina primero los abonos."
            });
          } else {
            toast.error("Error al eliminar");
          }
        }
    }
  }

  const handleCrearPlan = async () => {
    if (!nuevoPlan.nombre || !nuevoPlan.especialista_id) {
      return toast.error("Datos incompletos", { description: "Completa el nombre y selecciona un especialista" })
    }
    
    setCreandoPlan(true)
    try {
      const { error } = await supabase
        .from('presupuestos')
        .insert([{
          paciente_id: paciente_id,
          nombre_tratamiento: nuevoPlan.nombre.toUpperCase(),
          especialista_id: nuevoPlan.especialista_id,
          estado: 'borrador',
          total: 0,
          total_abonado: 0 
        }])

      if (error) throw error

      setNuevoPlan({ nombre: '', especialista_id: '' })
      setModalNuevoPlan(false)
      fetchPlanes()
      toast.success("Plan creado correctamente");
    } catch (error: any) {
      toast.error("Error de creación");
    } finally {
      setCreandoPlan(false)
    }
  }

  if (cargando) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4 bg-white/50 rounded-[3rem]">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Sincronizando Planes...</p>
    </div>
  )

  return (
    <div className="space-y-8 text-left">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 gap-6 text-left">
        <div className="text-left">
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic flex items-center justify-center md:justify-start gap-3 leading-none text-left">
            <Wallet className="text-blue-600" size={24} /> Planes de Tratamiento
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1 text-left">Gestión y Seguimiento Financiero</p>
        </div>
        <button 
          onClick={() => setModalNuevoPlan(true)}
          className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase shadow-xl shadow-blue-100 hover:bg-slate-900 transition-all flex items-center gap-3 active:scale-95 text-left"
        >
          <Plus size={20}/> Nuevo Plan Clínico
        </button>
      </div>

      {/* GRILLA DE PLANES */}
      <div className="grid grid-cols-1 gap-4 text-left">
        <AnimatePresence mode="popLayout">
          {planes.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white p-24 rounded-[4rem] text-center border-2 border-dashed border-slate-100"
            >
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                 <FileText size={40} />
              </div>
              <p className="text-slate-400 font-black uppercase text-[11px] tracking-[0.2em] text-center">No hay planes diseñados</p>
            </motion.div>
          ) : (
            planes.map((plan) => {
              const saldoPendiente = (plan.total || 0) - (plan.total_abonado || 0);
              const estaPagado = saldoPendiente <= 0 && plan.total > 0;
              const prof = plan.profesionales as any;

              return (
                <motion.div 
                  key={plan.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => router.push(`/pacientes/${paciente_id}/tratamientos/${plan.id}`)}
                  className="group bg-white p-7 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-blue-400 hover:shadow-2xl transition-all cursor-pointer relative text-left"
                >
                  <div className="flex items-center gap-6 w-full md:w-auto text-left">
                    <div className="bg-slate-50 w-20 h-20 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner shrink-0">
                      <span className="text-[8px] font-black uppercase opacity-50 mb-1">Folio</span>
                      <span className="text-lg font-black leading-none italic">#{plan.id.substring(0, 4)}</span>
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors text-left">
                        {plan.nombre_tratamiento || 'Plan de Salud Bucal'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-left">
                        <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5 text-left">
                          <Stethoscope size={12} className="text-blue-600" /> 
                          {prof ? `Dr/a. ${prof.nombre} ${prof.apellido}` : 'Sin asignar'}
                        </span>
                        <span className="text-[9px] font-black text-blue-500 uppercase italic text-left">
                          {prof?.especialidades?.nombre || 'General'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Estado de Cuenta</p>
                      {estaPagado ? (
                        <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-emerald-100">
                          <CheckCircle2 size={14} /> Saldado
                        </div>
                      ) : (
                        <p className={`text-lg font-black leading-none text-right ${saldoPendiente > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                          ${Number(saldoPendiente || 0).toLocaleString('es-CL')}
                          <span className="text-[9px] block text-slate-400 font-bold uppercase mt-1">Pendiente</span>
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => handleEliminarPlan(e, plan.id, plan.nombre_tratamiento)}
                        className="p-4 rounded-2xl text-slate-200 hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                      >
                        <Trash2 size={22} />
                      </button>
                      <div className="bg-slate-50 p-4 rounded-2xl text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ChevronRight size={24} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* MODAL NUEVO PLAN */}
      <AnimatePresence>
        {modalNuevoPlan && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl relative overflow-hidden border border-slate-100 text-left"
            >
              <div className="bg-slate-900 p-10 text-white relative text-left">
                <button onClick={() => setModalNuevoPlan(false)} className="absolute top-8 right-8 text-slate-400 hover:text-white transition-colors p-2"><X size={28}/></button>
                <div className="bg-blue-600 w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20"><Plus size={32} strokeWidth={3} /></div>
                <h2 className="text-3xl font-black tracking-tighter uppercase italic leading-none text-left">Nuevo Tratamiento</h2>
              </div>

              <div className="p-10 space-y-8 bg-white text-left">
                <div className="space-y-3 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block italic text-left">Nombre del Plan</label>
                  <input 
                    className="w-full p-6 bg-slate-50 rounded-[1.5rem] font-bold border-none outline-none focus:ring-2 ring-blue-500/20 transition-all shadow-inner text-lg text-slate-900"
                    placeholder="Ej: Rehabilitación Oral"
                    value={nuevoPlan.nombre}
                    onChange={(e) => setNuevoPlan({...nuevoPlan, nombre: e.target.value})}
                  />
                </div>

                <div className="space-y-3 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block italic text-left">Responsable Clínico</label>
                  <select 
                    className="w-full p-6 bg-slate-50 rounded-[1.5rem] font-bold border-none outline-none focus:ring-2 ring-blue-500/20 transition-all shadow-inner text-lg text-slate-900 appearance-none cursor-pointer"
                    value={nuevoPlan.especialista_id}
                    onChange={(e) => setNuevoPlan({...nuevoPlan, especialista_id: e.target.value})}
                  >
                    <option value="">Seleccionar Doctor...</option>
                    {profesionales.map((p: any) => (
                      <option key={p.id} value={p.user_id}>Dr/a. {p.nombre} {p.apellido}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex gap-4 text-left">
                  <button onClick={() => setModalNuevoPlan(false)} className="flex-1 py-6 rounded-[1.5rem] font-black text-[10px] uppercase text-slate-400 hover:bg-slate-50 transition-all tracking-widest">Descartar</button>
                  <button 
                    onClick={handleCrearPlan}
                    disabled={creandoPlan}
                    className="flex-[2] bg-slate-900 text-white py-6 rounded-[1.5rem] font-black text-xs uppercase shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:bg-slate-200"
                  >
                    {creandoPlan ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    {creandoPlan ? 'Procesando...' : 'Confirmar Registro'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
