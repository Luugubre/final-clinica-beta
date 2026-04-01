'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  FileText, Plus, Printer, Trash2, Loader2, Save, X, 
  ChevronRight, ArrowLeft, Type, AlignLeft, Image as ImageIcon,
  Minus, Layout, AlignJustify, List, CheckSquare, PenTool
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

export default function DocumentosClinicosPage() {
  const { id: paciente_id } = useParams()
  const [documentos, setDocumentos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [profesionalesFull, setProfesionalesFull] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mostrandoCategorias, setMostrandoCategorias] = useState(false)
  const [docSeleccionado, setDocSeleccionado] = useState<any>(null)
  
  const [bloquesEdicion, setBloquesEdicion] = useState<any[]>([])
  const [tituloEdicion, setTituloEdicion] = useState('')

  useEffect(() => {
    if (paciente_id) {
      fetchDocumentos()
      fetchCategorias()
      fetchDatosEspecialistas()
    }
  }, [paciente_id])

  // FUNCIÓN PARA TRAER NOMBRE, ESPECIALIDAD Y RUT DEL STAFF
  async function fetchDatosEspecialistas() {
    try {
      const { data: profs } = await supabase
        .from('profesionales')
        .select('user_id, nombre, apellido, especialidades(nombre)');
      
      const { data: perfiles } = await supabase
        .from('perfiles')
        .select('id, rut');

      const mapeados = profs?.map(p => ({
        user_id: p.user_id,
        nombre_completo: `Dr/a. ${p.nombre} ${p.apellido}`,
        especialidad: p.especialidades?.nombre || 'Especialista',
        rut: perfiles?.find(perf => perf.id === p.user_id)?.rut || '---'
      }));

      if (mapeados) setProfesionalesFull(mapeados);
    } catch (error) {
      console.error("Error cargando especialistas:", error);
    }
  }

  async function fetchDocumentos() {
    const { data } = await supabase
      .from('documentos_clinicos')
      .select('*')
      .eq('paciente_id', paciente_id)
      .order('fecha_creacion', { ascending: false })
    if (data) setDocumentos(data)
    setCargando(false)
  }

  async function fetchCategorias() {
    const { data } = await supabase.from('documentos_plantillas').select('*, documentos_categorias(nombre)')
    if (data) {
      const categoriasMapeadas = data.map(p => ({
        ...p,
        nombre_display: p.nombre && p.nombre !== 'NUEVO DOCUMENTO CLÍNICO' ? p.nombre : p.documentos_categorias?.nombre
      }))
      setCategorias(categoriasMapeadas)
    }
  }

  const agregarBloqueManual = (tipo: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    let nuevo: any = { id, tipo, label: '', contenido: '', valor_llenado: '' };
    if (['input', 'textarea', 'desplegable', 'seleccion_multiple'].includes(tipo)) nuevo.label = 'NUEVA ETIQUETA';
    if (tipo === 'desplegable' || tipo === 'seleccion_multiple') {
      nuevo.opciones = ['Opción 1', 'Opción 2'];
      nuevo.valor_llenado = tipo === 'seleccion_multiple' ? [] : '';
    }
    if (tipo === 'fila') { nuevo.columnas = 2; nuevo.slots = [null, null]; }
    setBloquesEdicion(prev => [...prev, nuevo]);
  }

  const seleccionarPlantilla = (plantilla: any) => {
    setTituloEdicion((plantilla.nombre_display || plantilla.nombre || "DOCUMENTO CLÍNICO").toUpperCase());
    const contenidoRaw = typeof plantilla.contenido === 'string' ? JSON.parse(plantilla.contenido) : plantilla.contenido;
    setBloquesEdicion(Array.isArray(contenidoRaw) ? JSON.parse(JSON.stringify(contenidoRaw)) : []);
    setDocSeleccionado('NUEVO');
    setMostrandoCategorias(false);
  }

  const crearDocumentoEnBlanco = () => {
    setTituloEdicion("NUEVO DOCUMENTO PERSONALIZADO");
    setBloquesEdicion([
      { id: 't-init', tipo: 'titulo', contenido: 'TÍTULO DEL DOCUMENTO' },
      { id: 'm-init', tipo: 'textarea', label: 'OBSERVACIONES', valor_llenado: '' }
    ]);
    setDocSeleccionado('NUEVO');
    setMostrandoCategorias(false);
  }

  const seleccionarDocumentoGuardado = (doc: any) => {
    if (docSeleccionado?.id === doc.id) {
      setDocSeleccionado(null);
      return;
    }
    const autor = profesionalesFull.find(p => p.user_id === doc.especialista_id);
    setDocSeleccionado({ 
      ...doc, 
      autor_nombre: autor?.nombre_completo || doc.llenado_por,
      autor_rut: autor?.rut || '',
      autor_especialidad: autor?.especialidad || ''
    });
    setTituloEdicion(doc.titulo_documento);
    const contenidoRaw = typeof doc.contenido === 'string' ? JSON.parse(doc.contenido) : doc.contenido;
    setBloquesEdicion(Array.isArray(contenidoRaw) ? JSON.parse(JSON.stringify(contenidoRaw)) : []);
    setMostrandoCategorias(false);
  }

  const guardarDocumentoFinal = async () => {
    if (guardando) return;
    if (!tituloEdicion) return toast.error("El nombre es obligatorio");
    
    setGuardando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('documentos_clinicos').insert([{
        paciente_id,
        especialista_id: user?.id,
        titulo_documento: tituloEdicion,
        contenido: bloquesEdicion,
        llenado_por: 'Personal Clínico' 
      }]);

      if (error) throw error;

      toast.success("Documento guardado");
      setDocSeleccionado(null);
      fetchDocumentos();
    } catch (error: any) {
      toast.error("Error al guardar: " + error.message);
    } finally {
      setGuardando(false);
    }
  }

  const eliminarDocumento = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm("¿Seguro que desea eliminar este documento?")) return;
    try {
      await supabase.from('documentos_clinicos').delete().eq('id', docId);
      toast.success("Documento eliminado");
      if (docSeleccionado?.id === docId) setDocSeleccionado(null);
      fetchDocumentos();
    } catch (error) { toast.error("Error al eliminar"); }
  }

  if (cargando) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>

  return (
    <div className="max-w-7xl mx-auto p-4 pb-20 space-y-8 text-left bg-slate-50 min-h-screen print:bg-white print:p-0 print:m-0">
      
      {/* HEADER PRINCIPAL */}
      <header className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex items-center justify-between print:hidden text-left">
        <div className="text-left">
          <h3 className="text-2xl font-black text-slate-800 uppercase italic leading-none flex items-center gap-3 text-left">
            <FileText className="text-blue-600" /> Documentos
          </h3>
        </div>
        <div className="flex gap-2 text-left">
          {(mostrandoCategorias || docSeleccionado) && (
            <button onClick={() => { setMostrandoCategorias(false); setDocSeleccionado(null); }} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-slate-200 transition-all text-left"><ArrowLeft size={14}/> Volver</button>
          )}
          <button onClick={() => { setMostrandoCategorias(true); setDocSeleccionado(null); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95 text-left"><Plus size={14}/> Nuevo Documento</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start text-left">
        {/* SIDEBAR */}
        <aside className="lg:col-span-1 space-y-4 print:hidden text-left">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 text-left">Historial</h4>
          <div className="space-y-2 text-left">
            {documentos.map(doc => (
              <div key={doc.id} className="relative group text-left">
                <button 
                  onClick={() => seleccionarDocumentoGuardado(doc)} 
                  className={`w-full text-left p-5 pr-12 rounded-[2rem] border transition-all ${docSeleccionado?.id === doc.id ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white text-slate-600 border-slate-100 hover:border-blue-300'}`}
                >
                  <p className="text-[10px] font-black uppercase italic leading-tight text-left">{doc.titulo_documento}</p>
                  <p className="text-[9px] font-bold opacity-60 mt-1 text-left">{new Date(doc.fecha_creacion).toLocaleDateString()}</p>
                </button>
                <button onClick={(e) => eliminarDocumento(e, doc.id)} className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl opacity-0 group-hover:opacity-100 ${docSeleccionado?.id === doc.id ? 'text-white/50' : 'text-slate-300'}`}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </aside>

        {/* ÁREA DE TRABAJO */}
        <main className="lg:col-span-4 flex flex-col md:flex-row gap-6 items-start text-left">
          <AnimatePresence mode="wait">
            {mostrandoCategorias ? (
              <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <button onClick={crearDocumentoEnBlanco} className="bg-slate-900 text-white p-10 rounded-[3rem] text-left hover:bg-black transition-all group border-4 border-transparent hover:border-blue-500/20 text-left">
                   <div className="flex justify-between items-center text-left">
                      <div className="text-left"><span className="text-lg font-black uppercase italic block text-left">Documento Libre</span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left">Sin plantilla</span></div>
                      <PenTool className="text-blue-400" />
                   </div>
                </button>
                {categorias.map(cat => (
                  <button key={cat.id} onClick={() => seleccionarPlantilla(cat)} className="bg-white p-10 rounded-[3rem] border border-slate-100 text-left hover:border-blue-500 transition-all shadow-xl font-black uppercase text-sm text-left">{cat.nombre_display}</button>
                ))}
              </motion.div>
            ) : docSeleccionado ? (
              <div key="editor" className="flex flex-col md:flex-row gap-6 w-full items-start print:block text-left">
                
                {docSeleccionado === 'NUEVO' && (
                  <div className="flex flex-row md:flex-col gap-2 print:hidden sticky top-8 overflow-x-auto pb-2 md:pb-0 z-10 text-left">
                    <ToolBtn icon={<Type size={18}/>} label="Título" onClick={() => agregarBloqueManual('titulo')} />
                    <ToolBtn icon={<AlignLeft size={18}/>} label="Texto" onClick={() => agregarBloqueManual('texto')} />
                    <ToolBtn icon={<Layout size={18}/>} label="Fila" onClick={() => agregarBloqueManual('fila')} />
                    <ToolBtn icon={<Minus size={18}/>} label="Línea" onClick={() => agregarBloqueManual('separador')} />
                    <ToolBtn icon={<AlignJustify size={18}/>} label="Input" onClick={() => agregarBloqueManual('input')} />
                    <ToolBtn icon={<List size={18}/>} label="Drop" onClick={() => agregarBloqueManual('desplegable')} />
                    <ToolBtn icon={<CheckSquare size={18}/>} label="Check" onClick={() => agregarBloqueManual('seleccion_multiple')} />
                  </div>
                )}

                <div className="w-full flex justify-center print:block text-left">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                    style={{ width: '210mm', minHeight: '297mm' }}
                    className="hoja-a4-fisica bg-white shadow-2xl border border-slate-200 relative print:shadow-none print:border-none print:m-0 print:w-full text-left"
                  >
                    <div className="p-16 md:p-20 flex flex-col h-full print:p-[20mm] text-left">
                        
                        <div className="flex items-start gap-8 border-b-2 border-slate-900 pb-10 mb-12 text-left">
                           <img 
                             src="https://yqdpmaopnvrgdqbfaiok.supabase.co/storage/v1/object/public/documentos_imagenes/440749454_122171956712064634_7168698893214813270_n.jpg" 
                             alt="Logo"
                             className="w-24 h-24 rounded-full object-cover print:w-28 print:h-28 shrink-0"
                           />
                           
                           <div className="flex-1 flex flex-col gap-1 text-left">
                              <textarea 
                                className="text-3xl font-black uppercase italic text-slate-900 w-full bg-transparent border-none outline-none p-0 focus:ring-0 resize-none overflow-hidden leading-tight text-left" 
                                value={tituloEdicion} 
                                rows={tituloEdicion.length > 25 ? 2 : 1}
                                onChange={(e) => setTituloEdicion(e.target.value.toUpperCase())} 
                                readOnly={docSeleccionado !== 'NUEVO'}
                              />
                              <div className="flex justify-between items-center mt-2 text-left">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Centro Médico y Dental Dignidad</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase text-left">Fecha: {new Date(docSeleccionado?.fecha_creacion || Date.now()).toLocaleDateString()}</p>
                              </div>
                           </div>
                        </div>

                        <div className="flex-1 space-y-10 break-words text-left">
                          {bloquesEdicion.map((bloque, idx) => (
                              <div key={bloque.id} className="relative group text-left">
                              {docSeleccionado === 'NUEVO' && (
                                  <button onClick={() => setBloquesEdicion(prev => prev.filter(b => b.id !== bloque.id))} className="absolute -left-14 top-0 text-slate-300 opacity-0 group-hover:opacity-100 transition-all p-2 hover:text-red-500 print:hidden"><Trash2 size={18}/></button>
                              )}
                              <RenderDinamico bloque={bloque} isReadOnly={docSeleccionado !== 'NUEVO'} onUpdate={(key, val) => {
                                  const n = [...bloquesEdicion]; n[idx][key] = val; setBloquesEdicion(n);
                              }}/>
                              </div>
                          ))}
                        </div>

                        {/* FIRMAS ACTUALIZADAS */}
                        <div className="mt-20 pt-16 border-t border-slate-100 flex justify-between items-start gap-10 text-center">
                          <div className="flex flex-col items-center flex-1">
                              <div className="h-[1px] bg-slate-400 w-full max-w-[220px] mb-2"/>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Firma del Paciente</p>
                          </div>
                          <div className="flex flex-col items-center flex-1">
                              <div className="h-[1px] bg-slate-400 w-full max-w-[220px] mb-2"/>
                              <div className="text-center">
                                <p className="text-[10px] font-black uppercase text-slate-800 leading-tight text-center">
                                  {docSeleccionado?.autor_nombre || 'Especialista responsable'}
                                </p>
                                <p className="text-[8px] font-bold uppercase text-slate-500 mt-0.5 text-center">
                                  {docSeleccionado?.autor_especialidad}
                                </p>
                                <p className="text-[8px] font-bold uppercase text-slate-400 mt-0.5 text-center">
                                  {docSeleccionado?.autor_rut && `RUT: ${docSeleccionado.autor_rut}`}
                                </p>
                              </div>
                              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-3 text-center border-t border-slate-50 pt-1 w-full">Firma del Especialista</p>
                          </div>
                        </div>
                        
                        <p className="mt-16 text-center text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em] leading-loose text-center">
                          Venancia Leiva 1871, La Pintana • Región Metropolitana • +569 6646 7641
                        </p>
                    </div>

                    <div className="fixed bottom-10 right-10 flex flex-col gap-3 print:hidden">
                       <button onClick={() => window.print()} className="bg-slate-900 text-white p-5 rounded-full shadow-2xl hover:scale-110 transition-all z-50 text-left"><Printer size={24}/></button>
                       {docSeleccionado === 'NUEVO' && (
                         <button 
                            onClick={guardarDocumentoFinal} 
                            disabled={guardando}
                            className={`p-5 rounded-full shadow-2xl transition-all z-50 ${guardando ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:scale-110 text-white'}`}
                         >
                            {guardando ? <Loader2 className="animate-spin" size={24}/> : <Save size={24}/>}
                         </button>
                       )}
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : (
              <div key="empty" className="bg-slate-100 h-[700px] rounded-[4rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center w-full text-center">
                <FileText size={50} className="text-slate-300 mb-4" />
                <p className="text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] text-center">Seleccione un documento</p>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 0mm !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; }
          .print\\:hidden, header, aside, button, .fixed, [data-sonner-toaster], .sonner-toast { display: none !important; visibility: hidden !important; }
          main, .grid, .max-w-7xl { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }
          .hoja-a4-fisica { width: 100% !important; height: auto !important; border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          input, textarea { border: none !important; background: transparent !important; padding: 0 !important; font-family: inherit; color: black !important; }
        }
      `}} />
    </div>
  )
}

function RenderDinamico({ bloque, isReadOnly, onUpdate }: any) {
  const inputStyle = "w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold border-none outline-none transition-all print:bg-transparent print:p-0 print:mt-1 print:font-normal text-left";

  switch (bloque.tipo) {
    case 'titulo':
      return <textarea className="text-2xl font-black uppercase italic text-slate-800 w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-left resize-none overflow-hidden text-left" value={bloque.contenido} rows={bloque.contenido.length > 30 ? 2 : 1} onChange={(e) => onUpdate('contenido', e.target.value)} readOnly={isReadOnly}/>
    case 'texto':
      return <p className="text-sm text-slate-600 leading-relaxed text-justify whitespace-pre-line text-left break-words text-left">{bloque.contenido || '...'}</p>
    case 'separador':
      return <div className="h-[1px] bg-slate-200 w-full my-2"/>
    case 'input':
      return (
        <div className="text-left">
          <label className="text-[10px] font-black uppercase text-blue-600 print:text-slate-500 text-left">{bloque.label}</label>
          <input className={inputStyle} value={bloque.valor_llenado} onChange={(e) => onUpdate('valor_llenado', e.target.value)} disabled={isReadOnly}/>
        </div>
      )
    case 'textarea':
      return (
        <div className="text-left">
          <label className="text-[10px] font-black uppercase text-blue-600 print:text-slate-500 text-left">{bloque.label}</label>
          <textarea className={inputStyle} rows={3} value={bloque.valor_llenado} onChange={(e) => onUpdate('valor_llenado', e.target.value)} disabled={isReadOnly} style={{ resize: 'none' }}/>
        </div>
      )
    case 'desplegable':
      return (
        <div className="text-left">
          <label className="text-[10px] font-black uppercase text-blue-600 print:text-slate-500 text-left">{bloque.label}</label>
          <div className="font-bold text-sm print:font-normal mt-1 text-left">{bloque.valor_llenado || '---'}</div>
          {!isReadOnly && (
            <select className={`${inputStyle} print:hidden text-left`} value={bloque.valor_llenado} onChange={(e) => onUpdate('valor_llenado', e.target.value)}>
              <option value="">Seleccionar...</option>
              {bloque.opciones?.map((o: any, i: number) => <option key={i} value={o}>{o}</option>)}
            </select>
          )}
        </div>
      )
    case 'seleccion_multiple':
      return (
        <div className="text-left">
          <label className="text-[10px] font-black uppercase text-blue-600 print:text-slate-500 block mb-2 text-left">{bloque.label}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-left">
            {bloque.opciones?.map((o: any, i: number) => {
              const checked = Array.isArray(bloque.valor_llenado) && bloque.valor_llenado.includes(o);
              return (
                <div key={i} className="flex items-center gap-2 text-left">
                  <div className={`w-3 h-3 border border-slate-400 rounded-sm flex items-center justify-center shrink-0 ${checked ? 'bg-slate-800' : ''}`}>
                    {checked && <div className="w-1.5 h-1.5 bg-white rounded-full"/>}
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 print:font-normal leading-tight text-left">{o}</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    case 'fila':
      return (
        <div className="grid gap-6 text-left" style={{ gridTemplateColumns: `repeat(${bloque.columnas || 2}, 1fr)` }}>
          {(bloque.slots || []).map((slot: any, i: number) => (
            <div key={i} className="flex-1 text-left">
              {slot ? <RenderDinamico bloque={slot} isReadOnly={isReadOnly} onUpdate={(k:string, v:any) => {
                const n = [...bloque.slots]; n[i] = { ...n[i], [k]: v }; onUpdate('slots', n);
              }} /> : <div className="h-full border border-dashed border-slate-100 rounded-xl print:hidden min-h-[40px] text-left"/>}
            </div>
          ))}
        </div>
      )
    default: return null;
  }
}

function ToolBtn({ icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm w-16 h-16 md:w-20 md:h-20 active:scale-90 shrink-0 text-left">
      <div className="mb-1">{icon}</div>
      <span className="text-[7px] font-black uppercase tracking-widest text-left">{label}</span>
    </button>
  )
}