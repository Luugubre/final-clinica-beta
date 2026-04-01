'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Pill, Plus, Trash2, Loader2, Save, ClipboardList, X, ArrowLeft, Printer
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

export default function RecetasPage() {
  const { id: paciente_id } = useParams()
  const [recetas, setRecetas] = useState<any[]>([])
  const [planes, setPlanes] = useState<any[]>([])
  const [paciente, setPaciente] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [creando, setCreando] = useState(false)
  const [recetaSeleccionada, setRecetaSeleccionada] = useState<any>(null)
  const [nuevaReceta, setNuevaReceta] = useState({ presupuesto_id: '', indicaciones: '' })

  useEffect(() => {
    if (paciente_id) {
      fetchData()
      fetchPaciente()
    }
  }, [paciente_id])

  async function fetchPaciente() {
    const { data } = await supabase.from('pacientes').select('*').eq('id', paciente_id).single()
    if (data) setPaciente(data)
  }

  async function fetchData() {
    try {
      // 1. Traer recetas y presupuestos
      const [recsRes, tratsRes] = await Promise.all([
        supabase.from('recetas').select('*, presupuestos(nombre_tratamiento)').eq('paciente_id', paciente_id).order('fecha_emision', { ascending: false }),
        supabase.from('presupuestos').select('id, nombre_tratamiento').eq('paciente_id', paciente_id)
      ]);

      if (recsRes.error) throw recsRes.error;

      // 2. Traer profesionales cruzando con perfiles (para el RUT) y especialidades (para el nombre)
      const { data: profs } = await supabase
        .from('profesionales')
        .select(`
          user_id, 
          nombre, 
          apellido,
          especialidades ( nombre )
        `);

      // 3. Traer perfiles para obtener el RUT de los especialistas
      const { data: perfiles } = await supabase.from('perfiles').select('id, rut');

      // 4. Unir datos manualmente para construir el perfil completo del doctor
      const recetasCompletas = (recsRes.data || []).map(receta => {
        const prof = profs?.find(p => p.user_id === receta.profesional_id);
        const perf = perfiles?.find(p => p.id === receta.profesional_id);
        
        return {
          ...receta,
          profesional_data: {
            ...prof,
            rut: perf?.rut || '---',
            especialidad_nombre: prof?.especialidades?.nombre || 'Especialista'
          }
        };
      });

      setRecetas(recetasCompletas);
      setPlanes(tratsRes.data || []);
    } catch (error: any) {
      console.error("Error cargando datos:", error.message);
    } finally {
      setCargando(false)
    }
  }

  const calcularEdad = (fechaNac: string) => {
    if (!fechaNac) return "---";
    const hoy = new Date();
    const cumple = new Date(fechaNac);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
    return `${edad} años`;
  }

  const guardarReceta = async () => {
    if (!nuevaReceta.indicaciones.trim()) return toast.error("Escriba las indicaciones");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no válida");

      const { error } = await supabase.from('recetas').insert([{
        paciente_id: paciente_id,
        presupuesto_id: nuevaReceta.presupuesto_id || null,
        indicaciones: nuevaReceta.indicaciones.trim(),
        profesional_id: user.id,
        medicamentos: "Rp." 
      }]);

      if (error) throw error;
      toast.success("Receta guardada");
      setNuevaReceta({ presupuesto_id: '', indicaciones: '' });
      setCreando(false);
      fetchData();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  }

  if (cargando) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8 pb-20 text-left bg-slate-50 min-h-screen print:bg-white print:p-0 print:m-0">
      
      {/* HEADER UI */}
      <header className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex justify-between items-center print:hidden">
        <div className="text-left">
          <h3 className="text-2xl font-black text-slate-800 uppercase italic flex items-center gap-3">
            <Pill className="text-blue-600" /> Recetario Maestro
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Paciente: {paciente?.nombre} {paciente?.apellido}
          </p>
        </div>
        <div className="flex gap-2">
          {(creando || recetaSeleccionada) && (
            <button onClick={() => { setCreando(false); setRecetaSeleccionada(null); }} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-slate-200 transition-all">
              <ArrowLeft size={14}/> Volver
            </button>
          )}
          <button onClick={() => { setCreando(true); setRecetaSeleccionada(null); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
            <Plus size={14}/> Nueva Receta
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start print:block">
        
        {/* SIDEBAR HISTORIAL */}
        <aside className="lg:col-span-1 space-y-4 print:hidden text-left">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 italic">Historial</h4>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {recetas.map(r => (
              <div key={r.id} onClick={() => { setRecetaSeleccionada(r); setCreando(false); }}
                className={`p-5 rounded-[2rem] border cursor-pointer transition-all text-left ${recetaSeleccionada?.id === r.id ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'bg-white text-slate-600 border-slate-100 hover:border-blue-300'}`}
              >
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black uppercase opacity-60">{new Date(r.fecha_emision).toLocaleDateString()}</span>
                </div>
                <p className="text-[10px] font-bold uppercase truncate">{r.presupuestos?.nombre_tratamiento || 'Atención General'}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* ÁREA DE RECETA */}
        <main className="lg:col-span-3 print:block print:w-full">
          <AnimatePresence mode="wait">
            {creando ? (
              <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 text-left print:hidden">
                <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-8">Nueva Prescripción</h4>
                <div className="space-y-6">
                  <div className="text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Vincular Tratamiento</label>
                    <select className="w-full bg-slate-50 p-5 rounded-2xl text-xs font-bold border-none shadow-inner" value={nuevaReceta.presupuesto_id} onChange={(e) => setNuevaReceta({...nuevaReceta, presupuesto_id: e.target.value})}>
                      <option value="">Atención General</option>
                      {planes.map(p => <option key={p.id} value={p.id}>{p.nombre_tratamiento}</option>)}
                    </select>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block italic">Rp. Indicaciones</label>
                    <textarea rows={10} className="w-full bg-slate-50 p-8 rounded-[2.5rem] text-sm font-bold border-none shadow-inner text-slate-700 outline-none focus:ring-2 ring-blue-500/10 leading-relaxed" value={nuevaReceta.indicaciones} onChange={(e) => setNuevaReceta({...nuevaReceta, indicaciones: e.target.value})} placeholder="Rp. \nMedicamento..."/>
                  </div>
                  <button onClick={guardarReceta} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xs uppercase shadow-xl transition-all hover:bg-slate-900">Guardar Receta</button>
                </div>
              </motion.div>
            ) : recetaSeleccionada ? (
              <div className="w-full flex justify-center print:block print:w-full print:m-0">
                <div className="hoja-a4-fisica bg-white shadow-2xl relative print:shadow-none print:w-full">
                  <div className="hoja-inner p-12 md:p-16 flex flex-col h-full print:p-[10mm]">
                    
                    {/* ENCABEZADO MÉDICO CON RUT Y ESPECIALIDAD */}
                    <div className="text-left border-b-2 border-slate-900 pb-6 mb-8 flex items-center gap-6">
                      <img src="https://yqdpmaopnvrgdqbfaiok.supabase.co/storage/v1/object/public/documentos_imagenes/440749454_122171956712064634_7168698893214813270_n.jpg" 
                           className="w-20 h-20 rounded-full object-cover logo-imprimible shrink-0" alt="Logo" />
                      <div className="flex-1 text-left">
                        <h1 className="text-lg font-black text-slate-900 leading-tight">CENTRO MEDICO Y DENTAL DIGNIDAD SPA</h1>
                        <p className="text-[13px] font-black text-slate-800 uppercase mt-1">
                          Dr. {recetaSeleccionada.profesional_data?.nombre} {recetaSeleccionada.profesional_data?.apellido}
                        </p>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed">
                          {recetaSeleccionada.profesional_data?.especialidad_nombre}
                          {recetaSeleccionada.profesional_data?.rut && ` • RUT: ${recetaSeleccionada.profesional_data.rut}`}
                        </p>
                      </div>
                    </div>

                    <h2 className="text-2xl font-black uppercase italic text-center border-y border-slate-100 py-3 mb-8">Receta Médica</h2>

                    {/* DATOS DEL PACIENTE */}
                    <div className="bg-slate-50 p-6 rounded-[2rem] mb-10 border border-slate-100 print:bg-white print:border-slate-200">
                      <div className="grid grid-cols-2 gap-y-4 gap-x-10 text-left">
                          <div><p className="text-[8px] font-black text-slate-400 uppercase">Nombre Paciente</p><p className="text-xs font-bold text-slate-900 uppercase">{paciente?.nombre} {paciente?.apellido}</p></div>
                          <div><p className="text-[8px] font-black text-slate-400 uppercase">RUT</p><p className="text-xs font-bold text-slate-900">{paciente?.rut || '---'}</p></div>
                          <div><p className="text-[8px] font-black text-slate-400 uppercase">Edad</p><p className="text-xs font-bold text-slate-900">{calcularEdad(paciente?.fecha_nacimiento)}</p></div>
                          <div><p className="text-[8px] font-black text-slate-400 uppercase">Sexo</p><p className="text-xs font-bold text-slate-900 uppercase">{paciente?.sexo || '---'}</p></div>
                          <div className="col-span-2"><p className="text-[8px] font-black text-slate-400 uppercase">Fecha Emisión</p><p className="text-xs font-bold text-slate-900">{new Date(recetaSeleccionada.fecha_emision).toLocaleDateString('es-CL')}</p></div>
                      </div>
                    </div>

                    {/* RP. CUERPO */}
                    <div className="flex-1 min-h-[420px] text-left">
                      <h3 className="text-3xl font-black text-slate-900 mb-6 italic opacity-10">Rp.</h3>
                      <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap font-medium pl-6 border-l-2 border-slate-200">
                        {recetaSeleccionada.indicaciones}
                      </p>
                    </div>

                    {/* FIRMA COMPLETA */}
                    <div className="mt-10 flex justify-end">
                      <div className="text-center w-80 flex flex-col items-center">
                        <div className="h-[1px] bg-slate-900 w-full mb-3"/>
                        <p className="text-[11px] font-black uppercase text-slate-900 leading-tight">
                          Dr. {recetaSeleccionada.profesional_data?.nombre} {recetaSeleccionada.profesional_data?.apellido}
                        </p>
                        <p className="text-[9px] font-bold uppercase text-slate-500">{recetaSeleccionada.profesional_data?.especialidad_nombre}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">RUT: {recetaSeleccionada.profesional_data?.rut}</p>
                      </div>
                    </div>
                    
                    <p className="mt-12 text-center text-[8px] font-bold text-slate-300 uppercase tracking-[0.4em] print:text-slate-400">
                      Venancia Leiva 1871, La Pintana • +569 6646 7641
                    </p>
                  </div>
                  
                  <button onClick={() => window.print()} className="fixed bottom-10 right-10 bg-slate-900 text-white p-6 rounded-full shadow-2xl print:hidden hover:scale-110 transition-all z-50">
                    <Printer size={28}/>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[600px] flex flex-col items-center justify-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 text-center print:hidden">
                <ClipboardList size={60} className="text-slate-100 mb-6" />
                <p className="text-slate-300 font-black uppercase text-xs tracking-widest italic">Seleccione una receta</p>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hoja-a4-fisica { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; }
        
        @media print {
          body * { visibility: hidden !important; }
          .hoja-a4-fisica, .hoja-a4-fisica * { visibility: visible !important; }
          
          .hoja-a4-fisica {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }

          @page {
            size: A4;
            margin: 0mm !important;
          }

          .logo-imprimible { display: block !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          p, h1, h2, h3, span { color: black !important; }
        }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  )
}