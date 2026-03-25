'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  FileSignature, FileCheck, Plus, Trash2, Loader2, X, 
  ChevronRight, FileText, User, Stethoscope, ClipboardList,
  Clock, CheckCircle2, AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRole } from '@/app/hooks/useRole'

export default function ConsentimientosPacientePage() {
  const { id: pacienteId } = useParams()
  const { isAdmin, user: currentUser } = useRole()
  
  const [consentimientosEmitidos, setConsentimientosEmitidos] = useState<any[]>([])
  const [tiposConsentimientos, setTiposConsentimientos] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<any[]>([])
  const [profesionales, setProfesionales] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [creando, setCreando] = useState(false)

  const [form, setForm] = useState({
    tipo_id: '',
    presupuesto_id: '',
    especialista_id: ''
  })

  useEffect(() => {
    if (pacienteId) fetchData()
  }, [pacienteId])

  async function fetchData() {
    setCargando(true)
    try {
      const [emitidos, tipos, pres, pros] = await Promise.all([
        supabase
          .from('paciente_consentimientos') // <--- CAMBIO A TABLA EXTERNA
          .select('*')
          .eq('paciente_id', pacienteId)
          .order('fecha_creacion', { ascending: false }),
        supabase.from('consentimientos').select('*').eq('estado', 'Sí'),
        supabase.from('presupuestos').select('id, nombre_tratamiento').eq('paciente_id', pacienteId),
        supabase.from('profesionales').select('user_id, nombre, apellido').eq('activo', true)
      ])

      setConsentimientosEmitidos(emitidos.data || [])
      setTiposConsentimientos(tipos.data || [])
      setPresupuestos(pres.data || [])
      setProfesionales(pros.data || [])
    } catch (error) {
      toast.error("Error al cargar datos")
    } finally {
      setCargando(false)
    }
  }

  const handleCrearConsentimiento = async () => {
    if (!form.tipo_id || !form.especialista_id) return toast.error("Faltan datos obligatorios")
    
    setCreando(true)
    try {
      const tipo = tiposConsentimientos.find(t => t.id === form.tipo_id)
      const especialista = profesionales.find(p => p.user_id === form.especialista_id)
      
      const { error } = await supabase
        .from('paciente_consentimientos') // <--- CAMBIO A TABLA EXTERNA
        .insert([{
          paciente_id: pacienteId,
          especialista_id: form.especialista_id,
          presupuesto_id: form.presupuesto_id || null,
          consentimiento_id: form.tipo_id,
          nombre_consentimiento: tipo.nombre,
          contenido_legal: tipo.texto,
          creado_por: `Dr. ${especialista.nombre} ${especialista.apellido}`,
          firma_paciente: 'Pendiente'
        }])

      if (error) throw error
      
      toast.success("Documento creado en la bitácora legal")
      setModalAbierto(false)
      setForm({ tipo_id: '', presupuesto_id: '', especialista_id: '' })
      fetchData()
    } catch (error: any) {
      toast.error("Error: " + error.message)
    } finally {
      setCreando(false)
    }
  }

  const eliminarDocumento = async (id: string) => {
    if (!confirm("¿Eliminar permanentemente este registro legal?")) return
    const { error } = await supabase.from('paciente_consentimientos').delete().eq('id', id)
    if (!error) {
      toast.success("Eliminado")
      fetchData()
    }
  }

  if (cargando) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8 font-sans pb-20">
      <header className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-5 rounded-[2rem] text-white shadow-xl shadow-slate-200">
            <FileSignature size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Consentimientos</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Archivo Legal del Paciente</p>
          </div>
        </div>
        <button onClick={() => setModalAbierto(true)} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase shadow-xl hover:bg-slate-900 transition-all flex items-center gap-3">
          <Plus size={18} /> Generar Registro
        </button>
      </header>

      <div className="bg-white rounded-[3.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest">Documento Legal</th>
              <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-center">Profesional</th>
              <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-center">Firma P.</th>
              <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {consentimientosEmitidos.length === 0 ? (
              <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-black uppercase italic text-xs tracking-widest">No hay registros legales</td></tr>
            ) : (
              consentimientosEmitidos.map((doc) => (
                <tr key={doc.id} className="hover:bg-blue-50/30 transition-all group">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <FileCheck size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 uppercase italic leading-none">{doc.nombre_consentimiento}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1.5 tracking-widest">Creado: {new Date(doc.fecha_creacion).toLocaleDateString('es-CL')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">{doc.creado_por}</span>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="flex justify-center items-center gap-2">
                      {doc.firma_paciente === 'Firmado' 
                        ? <><CheckCircle2 size={20} className="text-emerald-500" /> <span className="text-[9px] font-black text-emerald-600 uppercase">Firmado</span></>
                        : <><Clock size={20} className="text-orange-400" /> <span className="text-[9px] font-black text-orange-500 uppercase">Pendiente</span></>}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-2">
                        {(isAdmin || (currentUser && currentUser.id === doc.especialista_id)) && (
                          <button onClick={() => eliminarDocumento(doc.id)} className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all"><Trash2 size={18} /></button>
                        )}
                        <Link href={`/pacientes/${pacienteId}/consentimientos/${doc.id}`} className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg">
                            <ChevronRight size={20} />
                        </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalAbierto && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[3.5rem] p-10 shadow-2xl relative border border-white">
              <button onClick={() => setModalAbierto(false)} className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-300 hover:text-red-500 rounded-full transition-colors"><X size={24}/></button>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic mb-8 leading-none tracking-tighter text-center">Generar<br/>Consentimiento</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Tipo de Consentimiento</label>
                  <select className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-bold text-xs uppercase outline-none focus:ring-4 ring-blue-500/5 transition-all shadow-inner border-none" value={form.tipo_id} onChange={(e) => setForm({...form, tipo_id: e.target.value})}>
                    <option value="">Seleccione plantilla...</option>
                    {tiposConsentimientos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Vincular a Plan de Tratamiento</label>
                  <select className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-bold text-xs uppercase outline-none focus:ring-4 ring-blue-500/5 transition-all shadow-inner border-none" value={form.presupuesto_id} onChange={(e) => setForm({...form, presupuesto_id: e.target.value})}>
                    <option value="">Opcional: Seleccione presupuesto...</option>
                    {presupuestos.map(p => <option key={p.id} value={p.id}>{p.nombre_tratamiento || 'Sin nombre'}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Especialista a Cargo</label>
                  <select className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-bold text-xs uppercase outline-none focus:ring-4 ring-blue-500/5 transition-all shadow-inner border-none" value={form.especialista_id} onChange={(e) => setForm({...form, especialista_id: e.target.value})}>
                    <option value="">Seleccione doctor...</option>
                    {profesionales.map(p => <option key={p.user_id} value={p.user_id}>Dr. {p.nombre} {p.apellido}</option>)}
                  </select>
                </div>
                <button onClick={handleCrearConsentimiento} disabled={creando || !form.tipo_id || !form.especialista_id} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-[11px] uppercase shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                  {creando ? <Loader2 className="animate-spin" size={18}/> : <FileSignature size={18} />} Crear Documento Legal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}