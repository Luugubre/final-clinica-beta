'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/app/hooks/useRole'
import { 
  User, Search, Trash2, Loader2, UserPlus, 
  ArrowLeft, Phone, Hash, CreditCard, 
  Activity, ChevronRight, Ban, UserCheck 
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

export default function ListaPacientes() {
  const { isAdmin } = useRole()
  const [pacientes, setPacientes] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [verDeshabilitados, setVerDeshabilitados] = useState(false)

  useEffect(() => {
    fetchPacientes()
  }, [])

  async function fetchPacientes() {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select(`
          *,
          presupuestos (
            total,
            total_abonado
          )
        `)
        .order('apellido', { ascending: true })
      
      if (error) throw error

      const procesados = data.map(p => {
        const totalTratamientos = p.presupuestos?.length || 0
        const totalDeuda = p.presupuestos?.reduce((acc: number, pres: any) => 
          acc + (Number(pres.total || 0) - Number(pres.total_abonado || 0)), 0) || 0
        
        return { 
          ...p, 
          totalTratamientos, 
          totalDeuda,
          activo: p.activo ?? true // Si es null en la BD, asumimos true
        }
      })
      
      setPacientes(procesados)
    } catch (error: any) {
      console.error("Error:", error.message)
      toast.error("Error al sincronizar datos")
    } finally {
      setCargando(false)
    }
  }

  const toggleEstadoPaciente = async (id: string, estadoActual: boolean, nombre: string) => {
    const accion = estadoActual ? 'restringir' : 'rehabilitar'
    if (confirm(`¿Deseas ${accion} a ${nombre}?`)) {
      const { error } = await supabase
        .from('pacientes')
        .update({ activo: !estadoActual })
        .eq('id', id)

      if (error) {
        toast.error("Error al cambiar estado")
      } else {
        toast.success(`Paciente ${estadoActual ? 'enviado a lista negra' : 'rehabilitado'}`)
        setPacientes(pacientes.map(p => p.id === id ? { ...p, activo: !estadoActual } : p))
      }
    }
  }

  const handleEliminar = async (id: string, nombre: string) => {
    if (confirm(`¿Eliminar permanentemente a ${nombre}? Esta acción es irreversible.`)) {
      const { error } = await supabase.from('pacientes').delete().eq('id', id)
      if (error) toast.error("Error: " + error.message)
      else {
        toast.success("Paciente borrado")
        setPacientes(pacientes.filter(p => p.id !== id))
      }
    }
  }

  const pacientesFiltrados = pacientes.filter(p => {
    const cumpleBusqueda = `${p.nombre} ${p.apellido} ${p.rut}`.toLowerCase().includes(busqueda.toLowerCase())
    const cumpleEstado = p.activo === !verDeshabilitados
    return cumpleBusqueda && cumpleEstado
  })

  if (cargando) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFDFD]">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Sincronizando Base de Datos...</p>
    </div>
  )

  return (
    <main className="p-10 max-w-7xl mx-auto min-h-screen bg-[#FDFDFD] font-sans text-slate-800">
      
      {/* HEADER PREMIUM */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
        <div className="space-y-2">
          <Link href="/" className="group flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-all">
            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-50 transition-colors"><ArrowLeft size={14} /></div>
            Panel de Control
          </Link>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            {verDeshabilitados ? 'Usuarios' : 'Directorio'} <br />
            <span className={verDeshabilitados ? 'text-red-500' : 'text-blue-600'}>
              {verDeshabilitados ? 'Restringidos' : 'Pacientes'}
            </span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setVerDeshabilitados(!verDeshabilitados)}
                className={`px-8 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 ${
                    verDeshabilitados 
                    ? 'bg-emerald-500 text-white shadow-emerald-100' 
                    : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500'
                }`}
            >
                {verDeshabilitados ? <UserCheck size={18}/> : <Ban size={18}/>}
                {verDeshabilitados ? 'Ver Activos' : 'Lista Negra'}
            </button>
            {!verDeshabilitados && (
                <Link href="/pacientes/nuevo" className="bg-slate-900 text-white px-8 py-5 rounded-[2rem] font-black flex items-center gap-3 hover:bg-black shadow-2xl transition-all active:scale-95 text-xs uppercase tracking-widest">
                    <UserPlus size={18} /> Registrar nuevo
                </Link>
            )}
        </div>
      </header>

      {/* BUSCADOR */}
      <div className="relative mb-12 group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={22} />
        <input 
          type="text" 
          placeholder={verDeshabilitados ? "BUSCAR EN LISTA NEGRA..." : "BUSCAR POR NOMBRE, RUT O ID..."}
          className="w-full p-7 pl-16 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-100/50 outline-none focus:ring-4 ring-blue-50 transition-all font-bold text-sm"
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* LISTADO DE FICHAS */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode='popLayout'>
          {pacientesFiltrados.map((p) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={p.id}
              className={`group bg-white p-2 pl-8 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between hover:border-blue-200 hover:shadow-2xl transition-all duration-500 ${!p.activo ? 'bg-slate-50/50 grayscale-[0.5]' : ''}`}
            >
              {/* INFO PRINCIPAL */}
              <div className="flex items-center gap-8 py-4">
                <div className={`hidden md:flex flex-col items-center justify-center w-16 h-16 rounded-[1.5rem] border border-slate-100 transition-all duration-500 ${!p.activo ? 'bg-red-50 text-red-400' : 'bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-300'}`}>
                  <User size={24} />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                     <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${!p.activo ? 'bg-red-500 text-white' : 'bg-blue-50 text-blue-500'}`}>
                        ID: {p.rut?.split('-')[0] || '---'}
                     </span>
                     <h4 className="font-black text-slate-900 text-xl uppercase tracking-tighter">{p.nombre} {p.apellido}</h4>
                  </div>
                  <div className="flex items-center gap-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Hash size={12} /> {p.rut}</span>
                    {p.telefono && <span className="flex items-center gap-1"><Phone size={12} /> {p.telefono}</span>}
                  </div>
                </div>
              </div>

              {/* INDICADORES FINANCIEROS */}
              <div className="flex flex-wrap items-center gap-3 md:gap-6 px-6 py-4">
                 <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 min-w-[120px]">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Activity size={10}/> Presupuestos</p>
                    <p className="text-sm font-black text-slate-700">{p.totalTratamientos} <span className="text-[10px] text-slate-300">TOTAL</span></p>
                 </div>
                 
                 <div className={`px-5 py-3 rounded-2xl border min-w-[140px] transition-colors duration-500 ${p.totalDeuda > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <p className={`text-[8px] font-black uppercase tracking-widest mb-1 flex items-center gap-1 ${p.totalDeuda > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                      <CreditCard size={10}/> {p.totalDeuda > 0 ? 'Saldo Pendiente' : 'Al día'}
                    </p>
                    <p className={`text-sm font-black ${p.totalDeuda > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ${p.totalDeuda.toLocaleString('es-CL')}
                    </p>
                 </div>

                 {/* ACCIONES */}
                 <div className="flex items-center gap-2 ml-4">
                    <button 
                        onClick={() => toggleEstadoPaciente(p.id, p.activo, p.nombre)}
                        className={`p-4 rounded-full transition-all ${
                            p.activo 
                            ? 'text-slate-300 hover:text-red-500 hover:bg-red-50' 
                            : 'text-red-500 hover:text-emerald-500 hover:bg-emerald-50'
                        }`}
                        title={p.activo ? "Mover a Lista Negra" : "Rehabilitar"}
                    >
                        {p.activo ? <Ban size={22} /> : <UserCheck size={22} />}
                    </button>

                    {isAdmin && verDeshabilitados && (
                      <button 
                        onClick={() => handleEliminar(p.id, p.nombre)}
                        className="p-4 text-slate-300 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}

                    <Link 
                      href={`/pacientes/${p.id}`} 
                      className="flex items-center gap-2 bg-slate-900 text-white pl-6 pr-4 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl"
                    >
                      Ver Ficha <ChevronRight size={16} />
                    </Link>
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {pacientesFiltrados.length === 0 && (
        <div className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
          <User className="mx-auto text-slate-100 mb-4" size={64} />
          <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">
            {verDeshabilitados ? 'No hay usuarios restringidos' : 'No se encontraron resultados'}
          </p>
        </div>
      )}
    </main>
  )
}