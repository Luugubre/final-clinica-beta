'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { UserPlus, ArrowLeft, Save, Loader2, CheckCircle2, Info, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NuevoPaciente() {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [exito, setExito] = useState(false)
  const [listaConvenios, setListaConvenios] = useState<string[]>([]) // Estado para convenios dinámicos
  
  const [form, setForm] = useState({
    // Requeridos
    tipo_paciente: '-',
    nombre: '',
    apellido: '',
    rut: '',
    fecha_nacimiento: '',
    
    // Opcionales
    nombre_social: '',
    email: '',
    prevision: 'Sin convenio',
    numero_interno: '',
    sexo: '',
    genero: '',
    ciudad: '',
    comuna: '',
    direccion: '',
    telefono_fijo: '',
    telefono: '', 
    actividad_profesion: '',
    empleador: '',
    observaciones_personales: '',
    apoderado_nombre: '',
    apoderado_rut: '',
    referencia: ''
  })

  // CARGAR CONVENIOS DESDE LA DB AL INICIAR
  useEffect(() => {
    async function fetchConvenios() {
      const { data, error } = await supabase
        .from('convenios')
        .select('nombre_convenio')
        .eq('estado', 'Habilitado')
        .order('nombre_convenio', { ascending: true })

      if (data) {
        const nombres = data.map(c => c.nombre_convenio)
        setListaConvenios(['Sin convenio', ...nombres.filter(n => n !== 'Sin convenio')])
      }
    }
    fetchConvenios()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)

    const rutFinal = form.rut.replace(/\./g, '').toUpperCase().trim()

    const { error } = await supabase
      .from('pacientes')
      .insert([{ ...form, rut: rutFinal }])

    if (error) {
      toast.error("Error al guardar: " + error.message)
      setCargando(false)
    } else {
      setExito(true)
      setTimeout(() => router.push('/pacientes'), 2000)
    }
  }

  if (exito) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-sm w-full border border-slate-100">
        <CheckCircle2 className="text-emerald-500 mx-auto mb-6" size={80} />
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">¡Registrado!</h2>
        <p className="text-slate-500 font-bold mt-2 text-sm uppercase tracking-widest">Paciente guardado con éxito.</p>
      </div>
    </div>
  )

  return (
    <main className="p-6 lg:p-12 max-w-5xl mx-auto min-h-screen bg-slate-50">
      <Link href="/pacientes" className="inline-flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 mb-8 transition-all">
        <ArrowLeft size={14} /> Volver al Directorio
      </Link>

      <header className="mb-12">
        <div className="bg-blue-600 w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-100">
          <UserPlus size={32} />
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">Ficha de Ingreso</h1>
        <p className="text-slate-500 font-medium mt-2 uppercase text-[10px] tracking-[0.2em] italic">Registro de Paciente Nuevo</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* SECCIÓN 1: DATOS REQUERIDOS */}
        <div className="bg-white p-10 lg:p-16 rounded-[4rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-10 text-blue-600">
            <Info size={18} />
            <h2 className="font-black text-[10px] uppercase tracking-[0.3em]">Información Obligatoria</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block mb-2">Tipo de Paciente *</label>
               <select 
                required
                className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 ring-blue-500/20 appearance-none transition-all cursor-pointer"
                value={form.tipo_paciente}
                onChange={(e) => setForm({...form, tipo_paciente: e.target.value})}
               >
                 <option value="-">-</option>
                 <option value="discapacidad">Discapacidad</option>
                 <option value="embarazada">Embarazada</option>
                 <option value="funcionario clinica">Funcionario Clínica</option>
                 <option value="menor de edad">Menor de Edad</option>
                 <option value="paciente adulto mayor">Paciente Adulto Mayor</option>
               </select>
            </div>

            <InputGroupSimple label="Nombre Legal *" value={form.nombre} onChange={(v) => setForm({...form, nombre: v})} required />
            <InputGroupSimple label="Apellidos *" value={form.apellido} onChange={(v) => setForm({...form, apellido: v})} required />
            <InputGroupSimple label="RUT *" placeholder="12345678-9" value={form.rut} onChange={(v) => setForm({...form, rut: v})} required />
            <InputGroupSimple label="Fecha de Nacimiento *" type="date" value={form.fecha_nacimiento} onChange={(v) => setForm({...form, fecha_nacimiento: v})} required />
          </div>
        </div>

        {/* SECCIÓN 2: DATOS OPCIONALES */}
        <div className="bg-white p-10 lg:p-16 rounded-[4rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-10 text-slate-400">
            <UserCircle size={18} />
            <h2 className="font-black text-[10px] uppercase tracking-[0.3em]">Campos Opcionales</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* SELECTOR DE CONVENIOS DINÁMICO */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">Convenio</label>
              <select 
                className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 ring-blue-500/20 appearance-none transition-all cursor-pointer"
                value={form.prevision}
                onChange={(e) => setForm({...form, prevision: e.target.value})}
              >
                {listaConvenios.map(conv => (
                  <option key={conv} value={conv}>{conv}</option>
                ))}
              </select>
            </div>

            <InputGroupSimple label="Nombre Social" value={form.nombre_social} onChange={(v) => setForm({...form, nombre_social: v})} />
            <InputGroupSimple label="Email" type="email" value={form.email} onChange={(v) => setForm({...form, email: v})} />
            <InputGroupSimple label="N° Interno" value={form.numero_interno} onChange={(v) => setForm({...form, numero_interno: v})} />
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">Sexo</label>
              <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none cursor-pointer" value={form.sexo} onChange={(e) => setForm({...form, sexo: e.target.value})}>
                <option value="">Seleccione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <InputGroupSimple label="Género" value={form.genero} onChange={(v) => setForm({...form, genero: v})} />
            <InputGroupSimple label="Ciudad" value={form.ciudad} onChange={(v) => setForm({...form, ciudad: v})} />
            <InputGroupSimple label="Comuna" value={form.comuna} onChange={(v) => setForm({...form, comuna: v})} />
            
            <div className="lg:col-span-2">
              <InputGroupSimple label="Dirección" value={form.direccion} onChange={(v) => setForm({...form, direccion: v})} />
            </div>
            
            <InputGroupSimple label="WhatsApp / Móvil" value={form.telefono} onChange={(v) => setForm({...form, telefono: v})} />
            <InputGroupSimple label="Teléfono Fijo" value={form.telefono_fijo} onChange={(v) => setForm({...form, telefono_fijo: v})} />
            <InputGroupSimple label="Profesión" value={form.actividad_profesion} onChange={(v) => setForm({...form, actividad_profesion: v})} />
            <InputGroupSimple label="Empleador" value={form.empleador} onChange={(v) => setForm({...form, empleador: v})} />
            <InputGroupSimple label="Referencia" value={form.referencia} onChange={(v) => setForm({...form, referencia: v})} />
          </div>

          <div className="mt-10 pt-10 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
            <InputGroupSimple label="Nombre Apoderado" value={form.apoderado_nombre} onChange={(v) => setForm({...form, apoderado_nombre: v})} />
            <InputGroupSimple label="RUT Apoderado" value={form.apoderado_rut} onChange={(v) => setForm({...form, apoderado_rut: v})} />
          </div>

          <div className="mt-8">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block mb-2">Observaciones</label>
            <textarea className="w-full p-6 bg-slate-50 rounded-[2.5rem] font-medium outline-none focus:ring-2 ring-blue-500/10 transition-all shadow-inner" rows={4}
              value={form.observaciones_personales} onChange={(e) => setForm({...form, observaciones_personales: e.target.value})} />
          </div>
        </div>

        {/* BOTÓN CREAR */}
        <div className="pt-6">
          <button 
            type="submit"
            disabled={cargando}
            className="w-full bg-slate-900 text-white py-8 rounded-[3rem] font-black text-2xl shadow-2xl hover:bg-blue-600 transition-all active:scale-[0.98] flex justify-center items-center gap-4 disabled:opacity-50"
          >
            {cargando ? <Loader2 className="animate-spin" size={32} /> : <Save size={32} />}
            {cargando ? 'Registrando...' : 'Crear Ficha de Paciente'}
          </button>
        </div>
      </form>
    </main>
  )
}

// Componente auxiliar para mantener el código limpio
function InputGroupSimple({ label, value, onChange, type = "text", required = false, placeholder = "" }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
      <input 
        required={required}
        type={type}
        placeholder={placeholder}
        className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-blue-500/10 transition-all shadow-inner"
        value={value} 
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}