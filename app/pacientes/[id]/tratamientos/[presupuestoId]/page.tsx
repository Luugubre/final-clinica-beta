'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Activity, X, ChevronLeft, Stethoscope, Search, Plus, Trash2, CheckCircle2, 
  ChevronDown, ChevronUp, DollarSign, Wallet2, Loader2, Edit3,
  Banknote, CreditCard, Landmark, User, ShieldCheck, HelpCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRole } from '@/app/hooks/useRole'

// Configuración de arcadas (IDs de dientes)
const c1 = [18, 17, 16, 15, 14, 13, 12, 11];
const c2 = [21, 22, 23, 24, 25, 26, 27, 28];
const c3 = [48, 47, 46, 45, 44, 43, 42, 41];
const c4 = [31, 32, 33, 34, 35, 36, 37, 38];

const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo', icon: <Banknote size={16}/> },
  { id: 'debito', label: 'T. Débito', icon: <CreditCard size={16}/> },
  { id: 'credito', label: 'T. Crédito', icon: <CreditCard size={16}/> },
  { id: 'transferencia', label: 'Transferencia', icon: <Landmark size={16}/> },
];

const ICONOS_DISPONIBLES = [
  { id: 'carie', label: 'Carie / Obturación' },
  { id: 'corona', label: 'Corona' },
  { id: 'endodoncia', label: 'Endodoncia' },
  { id: 'extraccion', label: 'Extracción Indicada' },
  { id: 'ausente', label: 'Pieza Ausente' },
  { id: 'implante', label: 'Implante' },
  { id: 'perno', label: 'Perno Muñón' },
  { id: 'sellante', label: 'Sellante (S)' },
  { id: 'ortodoncia', label: 'Ortodoncia' },
  { id: 'erupcion', label: 'Erupción' },
  { id: 'giroversion', label: 'Giroversión' },
  { id: 'incluido', label: 'Diente Incluido' },
  { id: 'otro', label: 'Otro (Punto)' },
];

export default function DetalleTratamientoPage() {
  const { id: pacienteId, presupuestoId } = useParams()
  const { isAdmin, user } = useRole()
  
  const [items, setItems] = useState<any[]>([])
  const [dentadura, setDentadura] = useState<Record<number, any>>({})
  const [secciones, setSecciones] = useState<Record<string, any[]>>({})
  const [cargando, setCargando] = useState(true)
  const [dienteSeleccionado, setDienteSeleccionado] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoriasAbiertas, setCategoriasAbiertas] = useState<Record<string, boolean>>({})
  
  const [profesionales, setProfesionales] = useState<any[]>([])
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<string>('')
  const [prestacionSinIcono, setPrestacionSinIcono] = useState<any>(null);
  const [itemParaAbonar, setItemParaAbonar] = useState<any>(null)
  const [montoAbono, setMontoAbono] = useState<string>('')
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<string>('efectivo')
  const [guardandoAbono, setGuardandoAbono] = useState(false)
  const [numBoleta, setNumBoleta] = useState('')
  const [numReferencia, setNumReferencia] = useState('')

  const inicializado = useRef(false);

  useEffect(() => {
    if (pacienteId && presupuestoId) {
      fetchTodo()
      fetchPrestaciones()
      fetchProfesionales()
    }
  }, [pacienteId, presupuestoId, user])

  // Autoguardado del odontograma (caries/restauraciones manuales)
  useEffect(() => {
    if (!inicializado.current) {
      if (Object.keys(dentadura).length > 0) inicializado.current = true;
      return;
    }
    const guardarOdonto = async () => {
      await supabase.from('presupuestos').update({ odontograma_estado: dentadura }).eq('id', presupuestoId);
    };
    const timer = setTimeout(guardarOdonto, 1000); 
    return () => clearTimeout(timer);
  }, [dentadura]);

  async function fetchProfesionales() {
    const { data } = await supabase.from('profesionales').select('user_id, nombre, apellido').eq('activo', true)
    if (data) setProfesionales(data)
  }

  async function fetchPrestaciones() {
    const { data } = await supabase.from('prestaciones').select('*').order('Nombre Accion', { ascending: true });
    if (data) {
      const filtradas = data.filter(p => String(p.Habilitado).toLowerCase() !== 'no');
      const agrupado = filtradas.reduce((acc: any, curr: any) => {
        const cat = curr["Nombre Categoria"] || "OTROS";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
      }, {});
      setSecciones(agrupado);
    }
  }

  async function fetchTodo() {
    setCargando(true)
    try {
      const { data: pres } = await supabase.from('presupuestos').select('*').eq('id', presupuestoId).single()
      const { data: listaItems } = await supabase
        .from('presupuesto_items')
        .select(`*, prestaciones:prestacion_id(icono_tipo, "Nombre Accion"), profesionales:profesional_id(nombre, apellido)`)
        .eq('presupuesto_id', presupuestoId)

      if (pres) {
        setDentadura(pres.odontograma_estado || {})
        if (!isAdmin && user) setProfesionalSeleccionado(user.id)
        else setProfesionalSeleccionado(pres.especialista_id || '')
      }
      if (listaItems) setItems(listaItems)
    } catch (error) { console.error(error) } 
    finally { setCargando(false) }
  }

  const handleSeleccionarTratamiento = (prestacion: any) => {
    if (prestacion.icono_tipo) {
      ejecutarInsercion(prestacion);
    } else {
      setPrestacionSinIcono(prestacion);
    }
  }

  const guardarIconoPermanenteYAgregar = async (tipoIcono: string) => {
    const { error } = await supabase.from('prestaciones').update({ icono_tipo: tipoIcono }).eq('id', prestacionSinIcono.id);
    if (error) return toast.error("Error al guardar icono");
    await ejecutarInsercion({ ...prestacionSinIcono, icono_tipo: tipoIcono });
    setPrestacionSinIcono(null);
    fetchPrestaciones();
  }

  const ejecutarInsercion = async (prestacion: any) => {
    if (!profesionalSeleccionado) return toast.error("Seleccione un profesional")

    const { data, error } = await supabase
      .from('presupuesto_items')
      .insert([{
        presupuesto_id: presupuestoId,
        prestacion_id: prestacion.id,
        diente_id: dienteSeleccionado,
        precio_pactado: prestacion["Precio"],
        abonado: 0,
        estado: 'pendiente',
        profesional_id: profesionalSeleccionado 
      }])
      .select('*, prestaciones:prestacion_id(icono_tipo, "Nombre Accion"), profesionales:profesional_id(nombre, apellido)') 
      .single()
    
    if (!error && data) {
      const nuevosItems = [...items, data];
      setItems(nuevosItems);
      actualizarGlobalPresupuesto(nuevosItems);
      setDienteSeleccionado(null);
      toast.success("Agregado al plan");
    }
  }

  const guardarAbono = async () => {
    if (!itemParaAbonar || montoAbono === '') return
    setGuardandoAbono(true)
    try {
      const { data: cajasOpen } = await supabase.from('sesiones_caja').select('id').eq('estado', 'abierta').order('fecha_apertura', { ascending: false }).limit(1);
      if (!cajasOpen || cajasOpen.length === 0) return toast.error("No hay caja abierta");
      
      const { data: paciente } = await supabase.from('pacientes').select('prevision').eq('id', pacienteId).single();
      
      const { error: errorPago } = await supabase.from('pagos').insert([{
        paciente_id: pacienteId,
        presupuesto_id: presupuestoId,
        item_id: itemParaAbonar.id,
        monto: Number(montoAbono),
        metodo_pago: metodoSeleccionado,
        profesional_id: itemParaAbonar.profesional_id, 
        caja_id: cajasOpen[0].id,
        convenio: paciente?.prevision || 'Particular',
        numero_boleta: numBoleta,
        numero_referencia: numReferencia,
        fecha_pago: new Date().toISOString()
      }]);

      if (errorPago) throw errorPago;

      const nuevoAbonoItem = Number(itemParaAbonar.abonado || 0) + Number(montoAbono);
      const nuevoEstado = nuevoAbonoItem >= itemParaAbonar.precio_pactado ? 'realizado' : 'pendiente';

      await supabase.from('presupuesto_items').update({ abonado: nuevoAbonoItem, estado: nuevoEstado }).eq('id', itemParaAbonar.id);

      const nuevosItems = items.map(i => i.id === itemParaAbonar.id ? { ...i, abonado: nuevoAbonoItem, estado: nuevoEstado } : i);
      setItems(nuevosItems);
      actualizarGlobalPresupuesto(nuevosItems);
      setItemParaAbonar(null);
      toast.success("Abono registrado");
    } catch (e: any) { toast.error(e.message) } finally { setGuardandoAbono(false) }
  }

  const eliminarItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item.abonado > 0 && !isAdmin) return toast.error("Item con abonos bloqueado");
    if(!confirm("¿Eliminar?")) return;
    const { error } = await supabase.from('presupuesto_items').delete().eq('id', itemId);
    if (!error) {
      const nuevosItems = items.filter(i => i.id !== itemId);
      setItems(nuevosItems);
      actualizarGlobalPresupuesto(nuevosItems);
    }
  }

  const actualizarGlobalPresupuesto = async (nuevosItems: any[]) => {
    const nuevoTotal = nuevosItems.reduce((acc, curr) => acc + (Number(curr.precio_pactado) || 0), 0);
    const nuevoTotalAbonado = nuevosItems.reduce((acc, curr) => acc + (Number(curr.abonado) || 0), 0);
    await supabase.from('presupuestos').update({ total: nuevoTotal, total_abonado: nuevoTotalAbonado }).eq('id', presupuestoId);
  }

  const normalizarTexto = (texto: string) => String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

  if (cargando) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-blue-600" size={50} strokeWidth={3} />
        <p className="font-black text-xs text-slate-400 uppercase tracking-widest">Cargando Plan Clínico...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative font-sans text-slate-900 pb-20 selection:bg-blue-100 selection:text-blue-600">
      
      <AnimatePresence>
        {prestacionSinIcono && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[10002] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white/90 rounded-[3rem] p-10 max-w-lg w-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-white">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200"><HelpCircle size={28}/></div>
                <div>
                    <h3 className="text-xl font-black uppercase italic leading-none">Asignar Icono</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-2 tracking-widest">Procedimiento sin logo gráfico</p>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-600 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                Selecciona un símbolo para: <span className="text-blue-600">"{prestacionSinIcono["Nombre Accion"]}"</span>. Se guardará para siempre en la base de datos.
              </p>
              
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {ICONOS_DISPONIBLES.map(ico => (
                  <button key={ico.id} onClick={() => guardarIconoPermanenteYAgregar(ico.id)} className="flex items-center gap-3 p-4 bg-white hover:bg-slate-900 hover:text-white rounded-2xl transition-all font-black text-[9px] uppercase border border-slate-100 text-left group shadow-sm hover:shadow-md hover:-translate-y-0.5">
                    <div className="w-6 h-6 bg-slate-50 group-hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors"><CheckCircle2 size={14} className="text-blue-500"/></div>
                    {ico.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setPrestacionSinIcono(null)} className="w-full mt-8 py-4 text-slate-400 font-black text-[10px] uppercase hover:text-red-500 transition-colors tracking-widest">Cancelar operación</button>
            </motion.div>
          </div>
        )}

        {itemParaAbonar && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md z-[10001] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white rounded-[3.5rem] p-12 max-w-md w-full shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-2xl font-black uppercase italic text-slate-800 leading-none">Abono</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Transacción de caja</p>
                </div>
                <button onClick={() => setItemParaAbonar(null)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <div className="space-y-6">
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-3xl">$</span>
                  <input type="number" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} placeholder="0" className="w-full p-6 pl-14 bg-slate-50 rounded-[2rem] text-3xl font-black outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all shadow-inner" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {METODOS_PAGO.map(m => (
                        <button key={m.id} onClick={() => setMetodoSeleccionado(m.id)} className={`p-4 rounded-2xl border-2 font-black text-[9px] uppercase flex items-center gap-3 transition-all ${metodoSeleccionado === m.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                          <div className={metodoSeleccionado === m.id ? 'text-emerald-500' : ''}>{m.icon}</div> {m.label}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-4">N° Boleta</label>
                    <input type="text" value={numBoleta} onChange={(e) => setNumBoleta(e.target.value)} placeholder="0000" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold shadow-inner outline-none border border-slate-100" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Ref. Transbank</label>
                    <input type="text" value={numReferencia} onChange={(e) => setNumReferencia(e.target.value)} placeholder="####" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold shadow-inner outline-none border border-slate-100" />
                  </div>
                </div>
                <button onClick={guardarAbono} disabled={guardandoAbono} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xs uppercase shadow-xl hover:bg-emerald-600 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                    {guardandoAbono ? <Loader2 className="animate-spin" size={18}/> : 'Finalizar Transacción'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className={`flex-1 p-10 transition-all duration-500 ${dienteSeleccionado ? 'ml-[450px] blur-sm scale-[0.98] pointer-events-none' : ''}`}>
        <div className="max-w-6xl mx-auto space-y-12 pt-4">
          <Link href={`/pacientes/${pacienteId}`} className="group inline-flex items-center gap-3 font-black text-[10px] text-slate-400 uppercase hover:text-blue-600 transition-all">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-200"><ChevronLeft size={16}/></div> 
            Volver a la ficha
          </Link>

          {/* ODONTOGRAMA REALISTA */}
          <section className="bg-white p-16 rounded-[4rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-50"></div>
            <div className="flex flex-col items-center gap-16">
                {/* Arcada Superior */}
                <div className="flex gap-8 relative">
                  <div className="flex gap-1 border-r-2 border-slate-100 pr-8">{c1.map(pid => <DienteVisual key={pid} id={pid} itemsDiente={items.filter(i => i.diente_id === pid)} onSelect={() => setDienteSeleccionado(pid)} />)}</div>
                  <div className="flex gap-1 pl-8">{c2.map(pid => <DienteVisual key={pid} id={pid} itemsDiente={items.filter(i => i.diente_id === pid)} onSelect={() => setDienteSeleccionado(pid)} />)}</div>
                </div>
                {/* Arcada Inferior */}
                <div className="flex gap-8 relative">
                  <div className="flex gap-1 border-r-2 border-slate-100 pr-8">{c3.map(pid => <DienteVisual key={pid} id={pid} itemsDiente={items.filter(i => i.diente_id === pid)} onSelect={() => setDienteSeleccionado(pid)} invert />)}</div>
                  <div className="flex gap-1 pl-8">{c4.map(pid => <DienteVisual key={pid} id={pid} itemsDiente={items.filter(i => i.diente_id === pid)} onSelect={() => setDienteSeleccionado(pid)} invert />)}</div>
                </div>
            </div>
          </section>

          {/* LISTA TRATAMIENTOS ESTILO APPLE */}
          <div className="bg-white rounded-[3.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
             <div className="p-10 bg-slate-900 text-white flex justify-between items-end relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><Stethoscope size={120} strokeWidth={1} /></div>
                <div className="relative z-10">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2 italic">Presupuesto Clínico</h4>
                    <p className="text-3xl font-black uppercase tracking-tighter">Plan de Tratamiento</p>
                </div>
                <div className="text-right relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Inversión Total</p>
                    <span className="text-5xl font-black text-emerald-400 italic tracking-tighter leading-none">${items.reduce((a,b)=>a+Number(b.precio_pactado),0).toLocaleString('es-CL')}</span>
                </div>
             </div>
             <table className="w-full text-left border-separate border-spacing-0">
               <tbody className="divide-y divide-slate-50">
                 {items.length === 0 ? (
                   <tr><td className="p-20 text-center text-slate-300 font-black uppercase italic text-xs tracking-widest">No hay tratamientos asignados aún</td></tr>
                 ) : items.map((item) => (
                    <tr key={item.id} className="group hover:bg-blue-50/50 transition-all">
                      <td className="px-10 py-8">
                         <div className="flex items-center gap-6">
                             <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-lg font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-blue-200">
                                {item.diente_id || 'G'}
                             </div>
                             <div>
                                 <span className="text-[14px] font-black uppercase italic text-slate-800 tracking-tight leading-none group-hover:text-blue-600 transition-colors">{item.prestaciones?.["Nombre Accion"]}</span>
                                 <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full group-hover:bg-white">
                                        <User size={10} className="text-slate-400"/>
                                        <span className="text-[9px] font-black text-slate-500 uppercase italic">Dr. {item.profesionales?.nombre} {item.profesionales?.apellido}</span>
                                    </div>
                                    {user?.id === item.profesional_id && (
                                        <span className="text-[8px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-md uppercase tracking-tighter">Mío</span>
                                    )}
                                 </div>
                             </div>
                         </div>
                      </td>
                      <td className="px-6 py-8 text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Abonado</p>
                        <p className="text-sm font-black text-emerald-600">${Number(item.abonado || 0).toLocaleString('es-CL')}</p>
                      </td>
                      <td className="px-6 py-8 text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Item</p>
                        <p className="text-lg font-black text-slate-900 tracking-tighter">${Number(item.precio_pactado).toLocaleString('es-CL')}</p>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setItemParaAbonar(item); setMontoAbono(''); }} className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-emerald-100 transition-all active:scale-95">Cobrar</button>
                            {(isAdmin || user?.id === item.profesional_id) && (
                            <button onClick={() => eliminarItem(item.id)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"><Trash2 size={16}/></button>
                            )}
                        </div>
                      </td>
                    </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {dienteSeleccionado && (
          <motion.aside initial={{ x: -450, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -450, opacity: 0 }} transition={{ type: 'spring', damping: 25 }} className="fixed top-4 left-4 h-[calc(100vh-2rem)] w-[420px] bg-white/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] z-[9999] flex flex-col border border-white rounded-[3.5rem] overflow-hidden">
            <div className="pt-12 pb-8 px-10 bg-slate-900 text-white relative">
              <div className="absolute top-0 right-0 p-8 opacity-5"><Activity size={100}/></div>
              <div className="flex justify-between items-center mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl italic shadow-lg shadow-blue-900/20">{dienteSeleccionado}</div>
                <button onClick={() => setDienteSeleccionado(null)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-500 transition-all"><X size={20}/></button>
              </div>
              <h3 className="text-2xl font-black uppercase italic leading-none">Nueva Prestación</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Configuración de tratamiento</p>
            </div>

            <div className="p-8 space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4 flex items-center gap-2">
                        <ShieldCheck size={12} className="text-blue-500"/> Dr. Responsable
                    </label>
                    <select 
                        disabled={!isAdmin} 
                        className="w-full p-5 rounded-3xl font-black text-[11px] uppercase bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all disabled:opacity-70 shadow-inner"
                        value={profesionalSeleccionado}
                        onChange={(e) => setProfesionalSeleccionado(e.target.value)}
                    >
                        <option value="">Seleccionar Especialista...</option>
                        {profesionales.map(p => <option key={p.user_id} value={p.user_id}>Dr. {p.nombre} {p.apellido}</option>)}
                    </select>
                </div>

                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18}/>
                    <input type="text" placeholder="Buscar procedimiento..." className="w-full p-5 pl-14 rounded-3xl font-bold text-xs bg-slate-50 outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar space-y-2">
               {Object.keys(secciones).sort().map(cat => {
                 const filtrados = secciones[cat].filter(p => normalizarTexto(p["Nombre Accion"]).includes(normalizarTexto(busqueda)));
                 if (busqueda && filtrados.length === 0) return null;
                 const isOpen = categoriasAbiertas[cat] || busqueda.length > 0;
                 return (
                   <div key={cat} className="space-y-1">
                     <button onClick={() => setCategoriasAbiertas(prev => ({...prev, [cat]: !prev[cat]}))} className={`w-full flex justify-between items-center p-4 rounded-2xl font-black text-[10px] uppercase transition-all ${isOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-500'}`}>
                       {cat} {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                     </button>
                     {isOpen && (
                       <div className="space-y-1 pl-2">
                         {filtrados.map(p => (
                           <button key={p.id} onClick={() => handleSeleccionarTratamiento(p)} className="w-full text-left p-4 hover:bg-white rounded-2xl transition-all group border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 flex justify-between items-center">
                             <div className="max-w-[70%]">
                                <p className="text-[10px] font-black uppercase text-slate-700 group-hover:text-blue-600 leading-tight">{p["Nombre Accion"]}</p>
                                <p className="text-[9px] font-bold text-emerald-600 mt-1">${Number(p["Precio"]).toLocaleString('es-CL')}</p>
                             </div>
                             <div className="w-8 h-8 bg-slate-50 group-hover:bg-blue-600 group-hover:text-white rounded-xl flex items-center justify-center transition-all"><Plus size={14}/></div>
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                 )
               })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}

function DienteVisual({ id, onSelect, invert = false, itemsDiente = [] }: any) {
  const iconos = itemsDiente.map((i: any) => ({
    tipo: i.prestaciones?.icono_tipo,
    realizado: i.estado === 'realizado'
  }));

  const colorPrimario = (tipo: string) => {
    const item = iconos.find(ico => ico.tipo === tipo);
    return item?.realizado ? "#2563eb" : "#f43f5e"; // Azul Real / Rosa-Rojo Intenso
  };

  // Lógica de forma del diente según ID
  const isMolar = [18, 17, 16, 26, 27, 28, 36, 37, 38, 46, 47, 48].includes(id);
  const isIncisivo = [12, 11, 21, 22, 31, 32, 41, 42].includes(id);
  const isCanino = [13, 23, 33, 43].includes(id);

  const getDientePath = () => {
    if (isMolar) return "M20,20 L80,20 L85,80 Q85,100 50,100 Q15,100 15,80 Z";
    if (isIncisivo) return "M35,20 L65,20 L68,85 Q68,100 50,100 Q32,100 32,85 Z";
    if (isCanino) return "M35,30 L50,15 L65,30 L68,85 Q68,100 50,100 Q32,100 32,85 Z";
    return "M30,20 L70,20 L75,80 Q75,100 50,100 Q25,100 25,80 Z"; // Premolar / Default
  };

  return (
    <div className={`flex flex-col items-center gap-2 transition-all duration-300 hover:translate-y-[-5px] ${invert ? 'flex-col-reverse' : ''}`}>
      <span className="text-[10px] font-black text-slate-300 italic group-hover:text-blue-500">{id}</span>
      <div onClick={onSelect} className={`relative group w-14 h-18 flex items-center justify-center rounded-2xl border-2 cursor-pointer transition-all duration-500 ${iconos.length > 0 ? 'bg-white border-blue-100 shadow-md shadow-blue-50' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
        {/* Sombra de fondo sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white rounded-2xl opacity-50"></div>
        
        <svg viewBox="0 0 100 120" className={`w-full h-full p-2 relative z-10 ${invert ? 'rotate-180' : ''}`}>
          {/* DEFINICIONES DE GRADIENTES */}
          <defs>
            <linearGradient id={`gradSano-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#f1f5f9', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="shadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.1"/>
            </filter>
          </defs>

          {/* Diente Base con Forma Diferenciada */}
          <path 
            d={getDientePath()} 
            fill={`url(#gradSano-${id})`} 
            stroke={iconos.length > 0 ? "#cbd5e1" : "#e2e8f0"} 
            strokeWidth="2.5" 
            filter="url(#shadow)"
          />

          {/* RELLENOS CLÍNICOS (Caries / Obturación) */}
          {iconos.some(i => i.tipo === 'carie') && (
            <path 
                d={isMolar ? "M30,30 L70,30 L70,70 L30,70 Z" : "M40,40 L60,40 L60,70 L40,70 Z"} 
                fill={colorPrimario('carie')} 
                fillOpacity="0.8" 
                className="animate-pulse"
            />
          )}

          {/* CAPAS DE ICONOS */}
          {iconos.some(i => i.tipo === 'otro') && (
            <circle cx="50" cy="50" r="10" fill={colorPrimario('otro')} stroke="white" strokeWidth="2" />
          )}
          {iconos.some(i => i.tipo === 'ausente') && (
            <g stroke="#334155" strokeWidth="10" strokeLinecap="round" opacity="0.8">
              <line x1="20" y1="20" x2="80" y2="100" /><line x1="80" y1="20" x2="20" y2="100" />
            </g>
          )}
          {iconos.some(i => i.tipo === 'extraccion') && (
            <g stroke="#ef4444" strokeWidth="10" strokeLinecap="round">
              <line x1="20" y1="20" x2="80" y2="100" /><line x1="80" y1="20" x2="20" y2="100" />
            </g>
          )}
          {iconos.some(i => i.tipo === 'implante') && (
            <g fill="#475569">
              <rect x="42" y="45" width="16" height="45" rx="2" />
              <path d="M42,55 L58,55 M42,65 L58,65 M42,75 L58,75" stroke="white" strokeWidth="2" />
              <path d="M40,45 L60,45" stroke="#475569" strokeWidth="4" />
            </g>
          )}
          {iconos.some(i => i.tipo === 'endodoncia') && (
            <path d="M50,30 L50,90" stroke={colorPrimario('endodoncia')} strokeWidth="7" strokeLinecap="round" />
          )}
          {iconos.some(i => i.tipo === 'perno') && (
            <g stroke={colorPrimario('perno')} strokeWidth="6" strokeLinecap="round">
              <line x1="50" y1="40" x2="50" y2="75" />
              <line x1="30" y1="40" x2="70" y2="40" />
            </g>
          )}
          {iconos.some(i => i.tipo === 'corona') && (
            <circle cx="50" cy="40" r="38" fill="none" stroke={colorPrimario('corona')} strokeWidth="4" strokeDasharray="6 3" />
          )}
          {iconos.some(i => i.tipo === 'sellante') && (
            <text x="50" y="55" textAnchor="middle" fontSize="38" fontWeight="900" fill={colorPrimario('sellante')} style={{ userSelect: 'none' }}>S</text>
          )}
          {iconos.some(i => i.tipo === 'ortodoncia') && (
            <g stroke="#334155" strokeWidth="3">
              <line x1="5" y1="45" x2="95" y2="45" />
              <rect x="35" y="35" width="30" height="20" rx="2" fill="white" strokeWidth="2"/>
            </g>
          )}
          {iconos.some(i => i.tipo === 'erupcion') && (
            <path d="M50,5 L50,115 M35,20 L50,5 L65,20" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {iconos.some(i => i.tipo === 'giroversion') && (
            <path d="M25,25 Q50,-10 75,25" fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" />
          )}
          {iconos.some(i => i.tipo === 'incluido') && (
            <circle cx="50" cy="55" r="48" fill="none" stroke={colorPrimario('incluido')} strokeWidth="3" strokeDasharray="2 2" />
          )}
        </svg>
      </div>
    </div>
  )
}
