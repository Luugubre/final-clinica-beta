'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  ChevronLeft, Printer, RotateCcw, 
  ShieldCheck, Loader2, Activity,
  CheckCircle2, AlertTriangle
} from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'

export default function DetalleConsentimientoPage() {
  const { id: pacienteId, docId } = useParams()
  const sigCanvas = useRef<any>(null)

  const [documento, setDocumento] = useState<any>(null)
  const [paciente, setPaciente] = useState<any>(null)
  const [especialista, setEspecialista] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorCritico, setErrorCritico] = useState<string | null>(null)

  useEffect(() => {
    if (docId) fetchDatos()
  }, [docId])

  async function fetchDatos() {
    setCargando(true)
    try {
      // 1. Obtener el consentimiento
      const { data: doc, error: docErr } = await supabase
        .from('paciente_consentimientos') 
        .select('*')
        .eq('id', docId)
        .maybeSingle()

      if (docErr) throw docErr
      if (!doc) {
        setErrorCritico("El registro no existe.")
        return
      }

      // 2. Obtener datos del paciente
      const { data: pac } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', pacienteId)
        .maybeSingle()

      // 3. Obtener datos extendidos del especialista (Nombre, RUT, Especialidad)
      if (doc.especialista_id) {
        const [profRes, perfRes] = await Promise.all([
          supabase.from('profesionales').select('nombre, apellido, especialidades(nombre)').eq('user_id', doc.especialista_id).maybeSingle(),
          supabase.from('perfiles').select('rut').eq('id', doc.especialista_id).maybeSingle()
        ])

        if (profRes.data) {
          setEspecialista({
            nombre_completo: `Dr/a. ${profRes.data.nombre} ${profRes.data.apellido}`,
            especialidad: profRes.data.especialidades?.nombre || 'Especialista',
            rut: perfRes.data?.rut || '---'
          })
        }
      }

      setDocumento(doc)
      setPaciente(pac)
    } catch (error: any) {
      setErrorCritico(error.message)
    } finally {
      setCargando(false)
    }
  }

  const guardarFirmaEspecialista = async () => {
    if (sigCanvas.current.isEmpty()) return toast.error("El especialista debe firmar antes de finalizar")
    setGuardando(true)
    try {
      const dataFirma = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
      
      const { error } = await supabase
        .from('paciente_consentimientos')
        .update({ 
          firma_profesional: 'Firmado', 
          img_firma_especialista: dataFirma, 
          fecha_firma_especialista: new Date().toISOString()
        })
        .eq('id', docId)

      if (error) throw error
      toast.success("Firma del especialista registrada correctamente")
      fetchDatos()
    } catch (error: any) {
      toast.error("Error al guardar la firma")
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>

  return (
    <div className="min-h-screen bg-slate-200 font-sans print:bg-white text-left">
      
      {/* NAVBAR WEB */}
      <nav className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center z-50 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-all">
            <ChevronLeft size={24} />
          </button>
          <div className="text-left">
            <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Documento Clínico</h2>
            <p className="text-sm font-bold text-slate-800 uppercase italic tracking-tighter">{documento?.nombre_consentimiento}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-black text-[10px] uppercase hover:bg-slate-50 flex items-center gap-2 shadow-sm">
            <Printer size={14} /> Imprimir
          </button>
          {documento?.firma_profesional !== 'Firmado' && (
            <button onClick={guardarFirmaEspecialista} disabled={guardando} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-2xl hover:bg-blue-600 transition-all">
               {guardando ? <Loader2 className="animate-spin" size={14}/> : <ShieldCheck size={14} />} Validar y Firmar
            </button>
          )}
        </div>
      </nav>

      <main className="w-full flex flex-col items-center p-4 md:p-12 print:p-0 print:block">
        
        <div id="hoja-imprimible" className="w-full max-w-[850px] bg-white shadow-2xl rounded-sm flex flex-col mx-auto print:shadow-none print:w-full text-left">
          
          <div className="p-10 sm:p-16 md:p-20 flex flex-col flex-grow print:p-0">
            
            {/* CABECERA */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-10">
              <div className="flex items-start gap-4">
                <img 
                  src="https://yqdpmaopnvrgdqbfaiok.supabase.co/storage/v1/object/public/documentos_imagenes/440749454_122171956712064634_7168698893214813270_n.jpg" 
                  alt="Logo" className="h-20 w-auto object-contain" 
                />
                <div className="mt-2 text-left">
                  <h1 className="text-lg font-black uppercase text-slate-900 leading-tight">Centro Médico y Dental Dignidad</h1>
                </div>
              </div>
              <div className="text-right mt-2">
                <h2 className="text-[10px] font-black uppercase text-blue-600 tracking-tighter mb-1">Consentimiento Informado</h2>
                <p className="text-sm font-black text-slate-900 uppercase italic leading-none">{documento?.nombre_consentimiento}</p>
              </div>
            </div>

            {/* INFO PACIENTE Y ESPECIALISTA */}
            <div className="grid grid-cols-2 gap-8 mb-12 bg-slate-50 p-8 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200 print:mb-8 text-left">
              <div className="space-y-1 text-left">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Datos del Paciente</span>
                <p className="text-sm font-black text-slate-800 uppercase leading-none">{paciente?.nombre} {paciente?.apellido}</p>
                <p className="text-xs text-slate-500 font-bold mt-1">RUT: {paciente?.rut || '---'}</p>
              </div>
              <div className="text-right space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Especialista Responsable</span>
                <p className="text-sm font-black text-slate-800 uppercase leading-none">{especialista?.nombre_completo || documento?.creado_por}</p>
                <p className="text-xs text-slate-500 font-bold mt-1">{especialista?.especialidad} • RUT: {especialista?.rut}</p>
              </div>
            </div>

            {/* CUERPO DEL TEXTO */}
            <div className="relative flex-grow print:overflow-visible text-left">
              <div 
                className="prose prose-slate max-w-full text-slate-700 text-sm leading-[1.8] text-justify break-words print:text-black print:text-[11pt]"
                dangerouslySetInnerHTML={{ __html: documento?.contenido_legal }} 
              />
            </div>

            {/* PIE DE FIRMAS */}
            <div className="mt-20 grid grid-cols-2 gap-20 pt-10 border-t-2 border-slate-100 print:mt-10 print:break-inside-avoid">
              
              {/* FIRMA ESPECIALISTA */}
              <div className="text-center flex flex-col items-center">
                <div className="w-full h-24 border-b border-slate-200 mb-4 flex items-center justify-center bg-blue-50/5 overflow-hidden print:bg-transparent">
                  {documento?.img_firma_especialista ? (
                    <img src={documento.img_firma_especialista} alt="Firma Especialista" className="max-h-full object-contain mix-blend-multiply scale-110" />
                  ) : (
                    <span className="text-[10px] text-slate-200 font-black uppercase italic">Pendiente Firma Médico</span>
                  )}
                </div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Firma Especialista</p>
                <p className="text-[10px] font-bold text-slate-800 uppercase mt-2">{especialista?.nombre_completo || documento?.creado_por}</p>
                <p className="text-[8px] text-slate-400 uppercase">{especialista?.especialidad}</p>
              </div>

              {/* FIRMA PACIENTE */}
              <div className="text-center flex flex-col items-center">
                <div className="w-full h-24 border-b border-slate-200 mb-4 flex items-center justify-center bg-slate-50/50 print:bg-transparent">
                  {documento?.img_firma_paciente ? (
                    <img src={documento.img_firma_paciente} alt="Firma Paciente" className="max-h-full object-contain mix-blend-multiply" />
                  ) : (
                    <span className="text-[10px] text-slate-300 font-black uppercase italic">Firma del Paciente</span>
                  )}
                </div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Aceptación Paciente</p>
                <p className="text-[10px] font-bold text-slate-800 uppercase mt-2 italic">{paciente?.nombre} {paciente?.apellido}</p>
                <p className="text-[8px] text-slate-400 uppercase">RUT: {paciente?.rut}</p>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DE FIRMA */}
        {documento?.firma_profesional !== 'Firmado' && (
          <aside className="w-full max-w-[400px] mt-10 print:hidden mx-auto">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-slate-900">
              <h3 className="text-sm font-black uppercase italic text-slate-800 mb-6 flex items-center gap-2">
                 <ShieldCheck size={20} className="text-blue-600" /> Registrar Firma Médica
              </h3>
              <div className="bg-slate-100 rounded-[2rem] border-2 border-dashed border-slate-200 overflow-hidden mb-6 h-64">
                <SignatureCanvas ref={sigCanvas} penColor='#000' canvasProps={{className: 'w-full h-full'}} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => sigCanvas.current.clear()} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase hover:bg-red-50 hover:text-red-500 transition-all">
                    Limpiar
                </button>
                <button onClick={guardarFirmaEspecialista} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                    Registrar Firma
                </button>
              </div>
            </div>
          </aside>
        )}
      </main>

      <style jsx global>{`
        @media print {
          @page { margin: 0mm; size: A4; }
          body { background: white !important; margin: 0 !important; }
          nav, aside, button, .print\\:hidden { display: none !important; }
          #hoja-imprimible {
            width: 100% !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  )
}