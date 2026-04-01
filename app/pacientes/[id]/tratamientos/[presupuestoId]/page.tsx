'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Activity, X, ChevronLeft, Stethoscope, Search, Plus, Trash2, CheckCircle2, 
  ChevronDown, ChevronUp, DollarSign, Wallet2, Loader2, Edit3,
  Banknote, CreditCard, Landmark, User, ShieldCheck, HelpCircle, Save
} from 'lucide-center'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRole } from '@/app/hooks/useRole'

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
  const params = useParams()
  const pacienteId = params.id
  const presupuestoId = params.presupuestoId
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

  const inicializado = useRef(false);

  useEffect(() => {
    if (pacienteId && presupuestoId) {
      fetchTodo()
      fetchPrestaciones()
      fetchProfesionales()
    }
  }, [pacienteId, presupuestoId, user])

  useEffect(() => {
    if (!inicializado.current) {
      if (Object.keys(dentadura).length > 0) inicializado.current = true;
      return;
    }
    const guardarOdonto = async () => {
      await supabase.from('presupuestos').update({ odontograma_estado: dentadura }).eq('id', presupuestoId);
    };
    const timer = setTimeout(guardarOdonto, 1500); 
    return () => clearTimeout(timer);
  }, [dentadura, presupuestoId]);

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
      const { data: pres } = await supabase.from('presupuestos').select('*').eq('id', presupuestoId).maybeSingle()
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

  const marcarComoRealizado = async (item: any) => {
    const nuevoEstado = item.estado === 'realizado' ? 'pendiente' : 'realizado';
    const { error } = await supabase.from('presupuesto_items').update({ estado: nuevoEstado }).eq('id', item.id);
    if (!error) {
      setItems(items.map(i => i.id === item.id ? { ...i, estado: nuevoEstado } : i));
      toast.success(nuevoEstado === 'realizado' ? "Finalizado" : "Pendiente");
    }
  }

  const handleSeleccionarTratamiento = (prestacion: any) => {
    if (prestacion.icono_tipo) ejecutarInsercion(prestacion);
    else setPrestacionSinIcono(prestacion);
  }

  const guardarIconoPermanenteYAgregar = async (tipoIcono: string) => {
    await supabase.from('prestaciones').update({ icono_tipo: tipoIcono }).eq('id', prestacionSinIcono.id);
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
      setItems([...items, data]);
      setDienteSeleccionado(null);
      toast.success("Tratamiento agregado");
    }
  }

  const guardarAbono = async () => {
    if (!itemParaAbonar || montoAbono === '') return
    setGuardandoAbono(true)
    try {
      const { data: cajasOpen } = await supabase.from('sesiones_caja').select('id').eq('estado', 'abierta').order('fecha_apertura', { ascending: false }).limit(1);
      if (!cajasOpen || cajasOpen.length === 0) {
        setGuardandoAbono(false);
        return toast.error("No hay caja abierta para procesar pagos");
      }
      
      await supabase.from('pagos').insert([{
        paciente_id: pacienteId, presupuesto_id: presupuestoId, item_id: itemParaAbonar.id,
        monto: Number(montoAbono), metodo_pago: metodoSeleccionado, profesional_id: itemParaAbonar.profesional_id, 
        caja_id: cajasOpen[0].id, fecha_pago: new Date().toISOString()
      }]);

      const nuevoAbonoItem = Number(itemParaAbonar.abonado || 0) + Number(montoAbono);
      const nuevoEstado = nuevoAbonoItem >= itemParaAbonar.precio_pactado ? 'realizado' : itemParaAbonar.estado;
      await supabase.from('presupuesto_items').update({ abonado: nuevoAbonoItem, estado: nuevoEstado }).eq('id', itemParaAbonar.id);
      
      setItems(items.map(i => i.id === itemParaAbonar.id ? { ...i, abonado: nuevoAbonoItem, estado: nuevoEstado } : i));
      setItemParaAbonar(null);
      setMontoAbono('');
      toast.success("Abono registrado con éxito");
    } catch (e: any) { toast.error(e.message) } finally { setGuardandoAbono(false) }
  }

  const eliminarItem = async (itemId: string) => {
    if (typeof window !== 'undefined' && window.confirm("¿Deseas eliminar esta prestación del plan?")) {
      const { error } = await supabase.from('presupuesto_items').delete().eq('id', itemId);
      if (!error) setItems(items.filter(i => i.id !== itemId));
    }
  }

  const normalizarTexto = (texto: string) => String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

  if (cargando) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando Expediente...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative font-sans text-slate-900 pb-20 text-left">
      <AnimatePresence>
        {prestacionSinIcono && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[10002] flex items-center justify-center p-4 text-left">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl">
              <h3 className="text-xl font-black uppercase italic mb-6">Definir Icono Clínico</h3>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                {ICONOS_DISPONIBLES.map(ico => (
                  <button key={ico.id} onClick={() => guardarIconoPermanenteYAgregar(ico.id)} className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all font-black text-[9px] uppercase text-left group">
                    {ico.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setPrestacionSinIcono(null)} className="w-full mt-6 py-4 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
            </motion.div>
          </div>
        )}

        {itemParaAbonar && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md z-[10001] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3.5rem] p-12 max-w-md w-full shadow-2xl border border-slate-100 text-left">
              <h3 className="text-2xl font-black uppercase italic mb-8">Cobrar Prestación</h3>
              <div className="space-y-6">
                <input type="number" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} placeholder="$ 0" className="w-full p-6 bg-slate-50 rounded-[2rem] text-3xl font-black outline-none border-none shadow-inner text-slate-900" />
                <div className="grid grid-cols-2 gap-2">
                  {METODOS_PAGO.map(m => (
                    <button key={m.id} onClick={() => setMetodoSeleccionado(m.id)} className={`p-4 rounded-2xl border-2 font-black text-[9px] uppercase flex items-center gap-3 transition-all ${metodoSeleccionado === m.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
                <button onClick={guardarAbono} disabled={guardandoAbono || !montoAbono} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xs uppercase shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                  {guardandoAbono ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Confirmar Pago
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className={`flex-1 p-10 max-md:p-4 transition-all duration-500 ${dienteSeleccionado ? 'ml-[450px] max-lg:ml-0 blur-sm scale-[0.98] pointer-events-none' : ''}`}>
        <div className="max-w-6xl mx-auto space-y-12 pt-4 text-left">
          <Link href={`/pacientes/${pacienteId}`} className="group inline-flex items-center gap-3 font-black text-[10px] text-slate-400 uppercase hover:text-blue-600 transition-all">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-blue-50"><ChevronLeft size={16}/></div> 
            Volver a la ficha
          </Link>

          <section className="bg-white p-12 max-md:p-6 rounded-[3rem] shadow-sm border border-slate-100 relative">
            <div className="flex flex-col items-center gap-16 overflow-x-auto no-scrollbar py-4">
                <div className="flex gap-8">
                  <div className="flex gap-1 border-r-2 border-slate-100 pr-8">
                    {c1.map(pid => <DienteVisual key={pid} id={pid} itemsDiente={items.filter(i => i.diente_id === pid)} onSelect={() => setDienteSeleccionado(pid)} />)}
                  </div>
                  <div className="flex gap-1 pl-8">
                    {c2.map(pid => <DienteVisual key={pid} id={pid} itemsDiente={items.filter(i => i.diente_id === pid)} onSelect={() => setDienteSeleccionado(pid)} />)}
                  </div>
                </div>
                <div className="flex gap-8">
                  <div className="flex gap-1 border-r-2 border-slate-100 pr-8">
                    {c3.map(pid => <DienteVisual key={pid} id={pid} itemsDiente={items.filter(i => i.diente_id === pid)} onSelect={() => setDienteSeleccionado(pid)} invert />)}
                  </div>
                  <div className="flex gap-1 pl-8">
                    {c4.map(pid => <DienteVisual key={pid} id={pid} itemsDiente={items.filter(i => i.diente_id === pid)} onSelect={() => setDienteSeleccionado(pid)} invert />)}
                  </div>
                </div>
            </div>
          </section>

          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden text-left">
             <div className="p-10 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                <h4 className="text-2xl font-black uppercase italic tracking-tighter">Plan de Tratamiento</h4>
                <div className="text-right max-md:text-center font-black">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Monto del Tratamiento</p>
                    <span className="text-4xl font-black text-emerald-400 tracking-tighter italic">${items.reduce((acc: number, curr: any) => acc + Number(curr.price_pactado || curr.precio_pactado || 0), 0).toLocaleString('es-CL')}</span>
                </div>
             </div>
             <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <tbody className="divide-y divide-slate-50">
                  {items.map((item) => {
                    const prof = item.profesionales as any;
                    const prest = item.prestaciones as any;
                    return (
                      <tr key={item.id} className="group hover:bg-blue-50/30 transition-all">
                        <td className="px-10 py-8 text-left">
                           <div className="flex items-center gap-6">
                               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shadow-sm transition-all shrink-0 ${item.estado === 'realizado' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                                 {item.diente_id || 'G'}
                               </div>
                               <div className="text-left">
                                   <p className={`text-[14px] font-black uppercase italic leading-none mb-2 ${item.estado === 'realizado' ? 'text-blue-600' : 'text-slate-800'}`}>{prest?.["Nombre Accion"]}</p>
                                   <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase italic">Dr/a. {prof?.nombre} {prof?.apellido}</span>
                                      {item.estado === 'realizado' && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[7px] font-black uppercase border border-blue-100">Hecho</span>}
                                   </div>
                               </div>
                           </div>
                        </td>
                        <td className="px-6 py-8 text-right font-black">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Abono</p>
                          <p className="text-sm font-black text-emerald-600">${Number(item.abonado || 0).toLocaleString('es-CL')}</p>
                        </td>
                        <td className="px-6 py-8 text-right font-black">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Precio</p>
                          <p className="text-lg font-black text-slate-900">${Number(item.precio_pactado || 0).toLocaleString('es-CL')}</p>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="flex items-center justify-end gap-2">
                              <button onClick={() => marcarComoRealizado(item)} className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-sm border ${item.estado === 'realizado' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-300 hover:text-blue-600'}`}><CheckCircle2 size={20} /></button>
                              <button onClick={() => { setItemParaAbonar(item); setMontoAbono(''); }} className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-600 hover:text-white transition-all">Pagar</button>
                              {(isAdmin || user?.id === item.profesional_id) && (
                                <button onClick={() => eliminarItem(item.id)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-300 hover:text-red-500 rounded-xl transition-all"><Trash2 size={16}/></button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {dienteSeleccionado && (
          <motion.aside 
            initial={{ x: -450, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: -450, opacity: 0 }} 
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-28 max-lg:top-0 left-4 max-lg:left-0 h-[calc(100vh-8rem)] max-lg:h-full w-[420px] max-lg:w-full bg-white shadow-2xl z-[9999] flex flex-col border border-white rounded-[3rem] max-lg:rounded-none overflow-hidden text-left"
          >
            <div className="pt-20 pb-8 px-10 bg-slate-900 text-white relative text-left">
              <div className="flex justify-between items-center">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl italic">{dienteSeleccionado}</div>
                <button 
                  onClick={() => setDienteSeleccionado(null)} 
                  className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-500 transition-all active:scale-90"
                >
                  <X size={20}/>
                </button>
              </div>
              <h3 className="text-2xl font-black uppercase italic mt-4">Nuevo Tratamiento</h3>
            </div>

            <div className="p-8 space-y-6 text-left">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Médico Responsable</label>
                    <select className="w-full p-5 rounded-3xl font-black text-[11px] uppercase bg-slate-50 border-none outline-none shadow-inner text-slate-900 appearance-none cursor-pointer" value={profesionalSeleccionado} onChange={(e) => setProfesionalSeleccionado(e.target.value)}>
                        <option value="">Seleccionar Especialista...</option>
                        {profesionales.map(p => <option key={p.user_id} value={p.user_id}>Dr. {p.nombre} {p.apellido}</option>)}
                    </select>
                </div>
                <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    <input type="text" placeholder="Buscar prestación..." className="w-full p-5 pl-14 rounded-3xl font-bold text-xs bg-slate-50 outline-none border-none text-slate-900 focus:bg-white transition-all shadow-inner" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar space-y-2 text-left">
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
                            <button key={p.id} onClick={() => handleSeleccionarTratamiento(p)} className="w-full text-left p-4 hover:bg-white rounded-2xl transition-all group flex justify-between items-center">
                               <div className="max-w-[70%] text-left">
                                 <p className="text-[10px] font-black uppercase text-slate-700 group-hover:text-blue-600 leading-tight">{p["Nombre Accion"]}</p>
                                 <p className="text-[9px] font-bold text-emerald-600 mt-1">${Number(p["Precio"]).toLocaleString('es-CL')}</p>
                               </div>
                               <Plus size={14} className="text-slate-200 group-hover:text-blue-600"/>
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
    tipo: (i.prestaciones as any)?.icono_tipo,
    realizado: i.estado === 'realizado'
  }));

  // CORRECCIÓN: (ico: any) añadido para el build de Vercel
  const colorPrimario = (tipo: string) => {
    const item = iconos.find((ico: any) => ico.tipo === tipo);
    return item?.realizado ? "#2563eb" : "#f43f5e";
  };

  const isMolar = [18, 17, 16, 26, 27, 28, 36, 37, 38, 46, 47, 48].includes(id);

  const getDientePath = () => {
    if (isMolar) return "M20,20 L80,20 L85,80 Q85,100 50,100 Q15,100 15,80 Z";
    if ([12, 11, 21, 22, 31, 32, 41, 42].includes(id)) return "M35,20 L65,20 L68,85 Q68,100 50,100 Q32,100 32,85 Z";
    if ([13, 23, 33, 43].includes(id)) return "M35,30 L50,15 L65,30 L68,85 Q68,100 50,100 Q32,100 32,85 Z";
    return "M30,20 L70,20 L75,80 Q75,100 50,100 Q25,100 25,80 Z";
  };

  return (
    <div className={`flex flex-col items-center gap-2 group ${invert ? 'flex-col-reverse' : ''}`}>
      <span className="text-[9px] font-black text-slate-300 italic">{id}</span>
      <div onClick={onSelect} className={`relative w-14 h-18 rounded-2xl border-2 cursor-pointer transition-all duration-500 ${iconos.length > 0 ? 'bg-white border-blue-100 shadow-md shadow-blue-500/5' : 'bg-white border-slate-50 hover:border-blue-200'}`}>
        <svg viewBox="0 0 100 120" className={`w-full h-full p-2 ${invert ? 'rotate-180' : ''}`}>
          <path d={getDientePath()} fill="#fff" stroke={iconos.length > 0 ? "#cbd5e1" : "#f1f5f9"} strokeWidth="2" />
          
          {iconos.some((i: any) => i.tipo === 'endodoncia') && (
            <path d="M50,25 L50,90" stroke={colorPrimario('endodoncia')} strokeWidth="12" strokeLinecap="round" opacity="0.8" />
          )}

          {iconos.some((i: any) => i.tipo === 'carie') && (
            <path d={isMolar ? "M25,35 L45,35 L45,65 L25,65 Z" : "M35,45 L50,45 L50,75 L35,75 Z"} fill={colorPrimario('carie')} />
          )}

          {iconos.some((i: any) => i.tipo === 'ausente') && (
            <g stroke={colorPrimario('ausente')} strokeWidth="10" strokeLinecap="round" opacity="0.6">
              <line x1="10" y1="10" x2="90" y2="110" /><line x1="90" y1="10" x2="10" y2="110" />
            </g>
          )}
          {iconos.some((i: any) => i.tipo === 'extraccion') && (
            <g stroke={colorPrimario('extraccion')} strokeWidth="10" strokeLinecap="round" opacity="0.9">
              <line x1="10" y1="10" x2="90" y2="110" /><line x1="90" y1="10" x2="10" y2="110" />
            </g>
          )}

          {iconos.some((i: any) => i.tipo === 'implante') && (
            <g fill={colorPrimario('implante')}>
              <rect x="40" y="70" width="20" height="40" rx="2" />
              <path d="M40,80 L60,80 M40,90 L60,90 M40,100 L60,100" stroke="white" strokeWidth="2" />
            </g>
          )}

          {iconos.some((i: any) => i.tipo === 'corona') && (
            <circle cx="50" cy="35" r="45" fill="none" stroke={colorPrimario('corona')} strokeWidth="5" strokeDasharray="8 4" />
          )}

          {iconos.some((i: any) => i.tipo === 'sellante') && (
            <text x="50" y="55" textAnchor="middle" fontSize="42" fontWeight="900" fill={colorPrimario('sellante')} style={{ userSelect: 'none' }}>S</text>
          )}

          {iconos.some((i: any) => i.tipo === 'otro') && (
            <circle cx="80" cy="25" r="8" fill={colorPrimario('otro')} stroke="white" strokeWidth="2" />
          )}
        </svg>
      </div>
    </div>
  )
}
