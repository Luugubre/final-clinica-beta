'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  X, Search, ChevronLeft, ChevronRight, Loader2, Clock, 
  CalendarDays, Timer, UserCheck, Trash2, Activity, ClipboardList, 
  CheckCircle2, ArrowDown, Plus, Calendar as CalendarIcon, Briefcase, AlertTriangle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner' 
import Link from 'next/link'

export default function AgendaPage() {
  // --- ESTADOS VISTA PRINCIPAL ---
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [citasDia, setCitasDia] = useState<any[]>([])
  const [profesionales, setProfesionales] = useState<any[]>([])
  const [cargandoPagina, setCargandoPagina] = useState(true)
  const [filtroEspecialista, setFiltroEspecialista] = useState('Todos')

  // --- ESTADOS MODAL AGENDAMIENTO ---
  const [modalAbierto, setModalAbierto] = useState(false)
  const [paso, setPaso] = useState(1) 
  const [semanaInicio, setSemanaInicio] = useState(new Date())
  const [filtro, setFiltro] = useState({ profesional_id: '', box_id: 1, duracionDefault: 30 })
  const [horasSeleccionadas, setHorasSeleccionadas] = useState<{fecha: string, hora: string, duracion: number}[]>([])
  const [horariosConfigurados, setHorariosConfigurados] = useState<any[]>([])
  const [citasOcupadas, setCitasOcupadas] = useState<any[]>([])

  // --- ESTADOS PACIENTE / TICKET ---
  const [modoNuevoPaciente, setModoNuevoPaciente] = useState(false)
  const [nuevoPaciente, setNuevoPaciente] = useState({ nombre: '', apellido: '', rut: '', fecha_nacimiento: '', sexo: '' })
  const [busqueda, setBusqueda] = useState('')
  const [pacientesEncontrados, setPacientesEncontrados] = useState<any[]>([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null)
  const [buscando, setBuscando] = useState(false) 
  const [cargandoAccion, setCargandoAccion] = useState(false)
  
  const [nuevoTratamientoNombre, setNuevoTratamientoNombre] = useState('')
  const [tratamientosPaciente, setTratamientosPaciente] = useState<any[]>([])
  const [tratamientoSeleccionadoId, setTratamientoSeleccionadoId] = useState<string | null>(null)
  
  const [mostrarTicket, setMostrarTicket] = useState(false)
  const [citaConfirmadaData, setCitaConfirmadaData] = useState<any>(null)

  const duracionesDisponibles = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450];

  useEffect(() => {
    if (horasSeleccionadas.length > 0) {
      setHorasSeleccionadas(prev => prev.map(cita => ({ ...cita, duracion: filtro.duracionDefault })));
    }
  }, [filtro.duracionDefault]);

  useEffect(() => { cargarBasicos() }, [])
  useEffect(() => { fetchCitasDia() }, [selectedDate, filtroEspecialista])
  
  useEffect(() => {
    if (modalAbierto && filtro.profesional_id) {
        fetchCitasOcupadas();
        fetchHorariosDoctor();
    }
  }, [semanaInicio, modalAbierto, filtro.profesional_id])

  async function cargarBasicos() {
    try {
      const { data: pro } = await supabase.from('profesionales').select('*, especialidades(nombre)').eq('activo', true)
      setProfesionales(pro || [])
      if (pro?.length) setFiltro(prev => ({ ...prev, profesional_id: pro[0].user_id }))
    } finally { setCargandoPagina(false) }
  }

  async function fetchCitasOcupadas() {
    const dias = getDiasLunesSabado();
    const inicioSemana = dias[0].toLocaleDateString('sv-SE') + 'T00:00:00';
    const finSemana = dias[5].toLocaleDateString('sv-SE') + 'T23:59:59';
    const { data } = await supabase.from('citas').select('inicio, fin').eq('profesional_id', filtro.profesional_id).gte('inicio', inicioSemana).neq('estado', 'anulada');
    setCitasOcupadas(data || []);
  }

  async function fetchCitasDia() {
    const f = selectedDate.toLocaleDateString('sv-SE');
    let query = supabase.from('citas').select('*, pacientes(*)').gte('inicio', `${f}T00:00:00`).lte('inicio', `${f}T23:59:59`)
    if (filtroEspecialista !== 'Todos') query = query.eq('profesional_id', filtroEspecialista)
    const { data } = await query.order('inicio', { ascending: true })
    setCitasDia(data || [])
  }

  async function fetchHorariosDoctor() {
    const { data } = await supabase.from('disponibilidad_profesional').select('*').eq('profesional_id', filtro.profesional_id)
    setHorariosConfigurados(data || [])
  }

  const esHorarioLaboral = (fecha: string, hora: string) => {
    const diaSemana = new Date(fecha + 'T00:00:00').getDay()
    return horariosConfigurados.some(h => h.dia_semana === diaSemana && hora >= h.hora_inicio.substring(0,5) && hora < h.hora_fin.substring(0,5))
  }

  const esCitaOcupada = (fecha: string, hora: string) => {
    const slotInicio = `${fecha}T${hora}:00`;
    return citasOcupadas.some(cita => {
      const cI = cita.inicio.replace(' ', 'T');
      const cF = cita.fin.replace(' ', 'T');
      return slotInicio >= cI && slotInicio < cF;
    });
  }

  const buscarPacientes = async (term: string) => {
    if (!term.trim()) { setPacientesEncontrados([]); return; }
    setBuscando(true);
    const { data } = await supabase.from('pacientes').select('*').or(`nombre.ilike.%${term}%,rut.ilike.%${term}%`).limit(5);
    setPacientesEncontrados(data || []);
    setBuscando(false);
  }

  const seleccionarPacienteExistente = async (paciente: any) => {
    setPacienteSeleccionado(paciente);
    setBusqueda(`${paciente.nombre} ${paciente.apellido}`);
    setPacientesEncontrados([]);
    setBuscando(true);
    const { data } = await supabase.from('presupuestos').select('id, nombre_tratamiento').eq('paciente_id', paciente.id).neq('estado', 'finalizado').order('fecha_creacion', { ascending: false });
    setTratamientosPaciente(data || []);
    if (data?.length) { setTratamientoSeleccionadoId(data[0].id); setNuevoTratamientoNombre(data[0].nombre_tratamiento); }
    else { setTratamientoSeleccionadoId('MANUAL'); setNuevoTratamientoNombre(''); }
    setBuscando(false);
  };

  const handleGuardar = async () => {
    if (cargandoAccion) return;
    try {
      let pId = pacienteSeleccionado?.id;
      let pNombreFull = pacienteSeleccionado ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}` : "";

      if (modoNuevoPaciente) {
        if (!nuevoPaciente.nombre.trim() || !nuevoPaciente.rut.trim() || !nuevoPaciente.fecha_nacimiento) {
          toast.error("⚠️ Complete todos los campos obligatorios.");
          return;
        }

        setCargandoAccion(true);
        const rutLimpio = nuevoPaciente.rut.replace(/[^0-9kK]/g, '').toUpperCase().trim();
        const { data: existente } = await supabase.from('pacientes').select('id, nombre, apellido, activo, motivo_deshabilitado').eq('rut', rutLimpio).maybeSingle();

        if (existente) {
          if (existente.activo === false) {
            toast.warning("PACIENTE RESTRINGIDO", {
              description: `El RUT pertenece a ${existente.nombre} ${existente.apellido}, quien está deshabilitado. Motivo: ${existente.motivo_deshabilitado || 'No especificado'}.`,
              duration: 8000,
              icon: <AlertTriangle className="text-amber-500" />
            });
          } else {
            toast.error("EL PACIENTE YA EXISTE", { description: `El RUT ${nuevoPaciente.rut} ya está registrado a nombre de ${existente.nombre} ${existente.apellido}.` });
          }
          setCargandoAccion(false);
          return;
        }

        const { data: pNew, error: pErr } = await supabase.from('pacientes').insert([{ 
          nombre: nuevoPaciente.nombre.toUpperCase().trim(), 
          apellido: nuevoPaciente.apellido.toUpperCase().trim(), 
          rut: rutLimpio,
          fecha_nacimiento: nuevoPaciente.fecha_nacimiento,
          sexo: nuevoPaciente.sexo,
          activo: true
        }]).select().single();
        
        if (pErr) throw pErr;
        pId = pNew.id;
        pNombreFull = `${nuevoPaciente.nombre} ${nuevoPaciente.apellido}`;
      } else {
        if (!pId) { toast.error("⚠️ Debe seleccionar un paciente."); return; }
        setCargandoAccion(true);
      }

      const nuevasCitas = [];
      const toISO = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      };

      for (const s of horasSeleccionadas) {
        const inicioDate = new Date(`${s.fecha}T${s.hora}:00`);
        const finDate = new Date(inicioDate.getTime() + s.duracion * 60000);
        const fInicio = toISO(inicioDate);
        const fFin = toISO(finDate);
        const choca = citasOcupadas.some(c => (fInicio < c.fin.replace(' ','T') && fFin > c.inicio.replace(' ','T')));

        if (choca) {
            alert(`❌ TOPE DE HORARIO:\n\nLa hora de las ${s.hora} ya está ocupada.`);
            setCargandoAccion(false);
            return;
        }

        nuevasCitas.push({ 
          paciente_id: pId, 
          profesional_id: filtro.profesional_id, 
          presupuesto_id: (tratamientoSeleccionadoId && tratamientoSeleccionadoId !== 'MANUAL') ? tratamientoSeleccionadoId : null, 
          inicio: fInicio, 
          fin: fFin, 
          estado: 'programada', 
          motivo: nuevoTratamientoNombre.toUpperCase() || 'CONSULTA' 
        });
      }

      const { error: errorCita } = await supabase.from('citas').insert(nuevasCitas);
      if (errorCita) throw errorCita;

      setCitaConfirmadaData({ paciente: pNombreFull.toUpperCase(), citas: horasSeleccionadas, profesional: profesionales.find(p => p.user_id === filtro.profesional_id), motivo: nuevoTratamientoNombre || 'CONSULTA GENERAL' });
      setMostrarTicket(true);
      fetchCitasDia();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setCargandoAccion(false);
    }
  }

  // --- FUNCIÓN REGISTRAR LLEGADA CON BROADCAST ---
  const registrarLlegada = async (citaId: string) => {
    // 1. Actualizar DB
    const { data: citaActualizada, error } = await supabase
      .from('citas')
      .update({ 
        estado: 'en_espera', 
        llegada_confirmada: true, 
        hora_llegada: new Date().toISOString() 
      })
      .eq('id', citaId)
      .select('*, pacientes(nombre, apellido)')
      .single();

    if (error) return toast.error("Error al registrar llegada");

    // 2. Enviar Broadcast al Dentista (Canal dinámico)
    const canal = supabase.channel(`dentista-${citaActualizada.profesional_id}`);
    
    await canal.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await canal.send({
          type: 'broadcast',
          event: 'PACIENTE_LLEGO',
          payload: { 
            nombre: `${citaActualizada.pacientes.nombre} ${citaActualizada.pacientes.apellido}` 
          },
        });
        // Cerramos el canal temporal de envío
        supabase.removeChannel(canal);
      }
    });

    fetchCitasDia();
    toast.success("Paciente marcado como 'En Espera'");
  }

  const toggleHora = (fecha: string, hora: string) => {
    setHorasSeleccionadas(prev => {
      const existe = prev.find(h => h.fecha === fecha && h.hora === hora);
      if (existe) return prev.filter(h => !(h.fecha === fecha && h.hora === hora));
      return [...prev, { fecha, hora, duracion: filtro.duracionDefault }];
    });
  }

  const actualizarDuracionIndividual = (idx: number, dur: number) => {
    setHorasSeleccionadas(prev => {
      const copy = [...prev];
      if (copy[idx]) copy[idx].duracion = dur;
      return copy;
    });
  }

  const resetEstados = () => {
    setPaso(1); setHorasSeleccionadas([]); setPacienteSeleccionado(null); setBusqueda('');
    setModoNuevoPaciente(false); setNuevoTratamientoNombre(''); setCitasOcupadas([]);
    setTratamientoSeleccionadoId(null); setTratamientosPaciente([]);
    setNuevoPaciente({ nombre: '', apellido: '', rut: '', telefono: '', fecha_nacimiento: '', sexo: '' });
  }

  const getDiasLunesSabado = () => {
    const curr = new Date(semanaInicio); const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    return Array.from({ length: 6 }, (_, i) => new Date(curr.getFullYear(), curr.getMonth(), diff + i))
  }

  const slotsHorarios = useMemo(() => {
    const slots = []; let inicioC = new Date(); inicioC.setHours(8, 30, 0, 0)
    while (inicioC.getHours() < 20) {
      slots.push(inicioC.toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      inicioC.setMinutes(inicioC.getMinutes() + 30)
    }
    return slots
  }, [])

  if (cargandoPagina) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900"><Loader2 className="animate-spin text-blue-500 mb-4" size={40} /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando Agenda...</p></div>

  return (
    <div className="flex h-screen bg-[#FDFDFD] overflow-hidden font-sans text-slate-800">
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-10 py-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-10">
            <div className="space-y-1 text-left">
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">Agenda</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <select className="text-blue-500 text-xs font-bold uppercase bg-transparent outline-none cursor-pointer" value={filtroEspecialista} onChange={(e) => setFiltroEspecialista(e.target.value)}>
                  <option value="Todos">Todos los especialistas</option>
                  {profesionales.map(p => <option key={p.id} value={p.user_id}>Dr. {p.nombre} {p.apellido}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center bg-slate-50 rounded-2xl p-1.5 border border-slate-100/50 shadow-inner">
              <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate()-1)))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft size={18}/></button>
              <span className="px-6 text-xs font-black capitalize min-w-[210px] text-center text-slate-600 tracking-wide">{selectedDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate()+1)))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight size={18}/></button>
            </div>
          </div>
          <button onClick={() => { resetEstados(); setModalAbierto(true); }} className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-bold text-xs uppercase shadow-xl hover:bg-black transition-all flex items-center gap-2 active:scale-95">
            <Plus size={16} /> Agendar Cita
          </button>
        </header>

        <div className="flex-1 p-10 overflow-y-auto space-y-4 bg-[#FAFBFC]">
          {citasDia.length > 0 ? citasDia.map(c => {
            const hInicio = new Date(c.inicio.replace(' ', 'T')).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'});
            const hFin = new Date(c.fin.replace(' ', 'T')).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'});
            return (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} key={c.id} className={`group bg-white p-7 rounded-[2.5rem] border border-slate-100 flex items-center justify-between transition-all hover:shadow-lg ${c.llegada_confirmada ? 'border-l-emerald-500 ring-2 ring-emerald-50' : 'border-l-blue-500 shadow-sm'}`}>
                <div className="flex items-center gap-10">
                  <div className={`w-24 h-24 rounded-[2rem] flex flex-col items-center justify-center font-black transition-colors ${c.llegada_confirmada ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-900 text-white'}`}>
                    <span className="text-xs tracking-tighter">{hInicio}</span>
                    <ArrowDown size={14} className={`my-1 ${c.llegada_confirmada ? 'text-white/40' : 'text-blue-400'}`} strokeWidth={3} />
                    <span className="text-xs tracking-tighter opacity-70">{hFin}</span>
                  </div>
                  <div className="text-left text-slate-900">
                    <h3 className="font-black uppercase text-lg tracking-tight mb-1">{c.pacientes?.nombre} {c.pacientes?.apellido}</h3>
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.pacientes?.rut}</p>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                        <span className={`w-1.5 h-1.5 rounded-full ${c.llegada_confirmada ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`}></span>
                        <span className="text-[9px] font-black uppercase text-slate-500">{c.estado}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-300 italic">{c.motivo}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!c.llegada_confirmada && ( <button onClick={() => registrarLlegada(c.id)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center gap-2 text-[10px] font-black uppercase"><UserCheck size={18} /> Llegó</button> )}
                  <Link href={`/pacientes/${c.paciente_id}`} className="p-4 bg-slate-50 text-slate-400 hover:bg-white hover:text-blue-500 hover:shadow-md rounded-2xl transition-all border border-transparent hover:border-slate-100"><ClipboardList size={20}/></Link>
                  <button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from('citas').delete().eq('id', c.id); fetchCitasDia(); } }} className="p-4 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"><Trash2 size={20}/></button>
                </div>
              </motion.div>
            )
          }) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-slate-900">
                <CalendarIcon size={80} strokeWidth={1} />
                <p className="mt-4 font-bold uppercase text-xs tracking-widest text-center">Sin citas para hoy</p>
            </div>
          )}
        </div>
      </main>

      {/* MODAL Y TICKET (OMITIDOS PARA BREVEDAD, MANTIENEN TU LÓGICA ORIGINAL) */}
      <AnimatePresence>
        {modalAbierto && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white w-full max-w-7xl h-full max-h-[85vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden relative text-slate-900">
              <div className="p-8 border-b border-slate-50 bg-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-3xl bg-blue-500 text-white shadow-xl shadow-blue-100"><CalendarDays size={28} /></div>
                  <div className="text-slate-900 text-left">
                    <h2 className="font-black uppercase text-lg tracking-tight mb-1 leading-none">Reserva de Horas</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Paso {paso} de 2</p>
                  </div>
                </div>
                <button onClick={() => setModalAbierto(false)} className="p-4 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {paso === 1 ? (
                  <>
                    <aside className="w-[320px] border-r border-slate-50 p-10 bg-[#FAFBFC]/50 space-y-8 overflow-y-auto hidden md:block text-left">
                      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
                        <p className="text-[10px] font-bold uppercase mb-2 opacity-50 tracking-widest">Seleccionadas</p>
                        <p className="text-5xl font-black leading-none">{horasSeleccionadas.length}</p>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Especialista</label>
                          <select className="w-full p-5 bg-white border border-slate-100 rounded-3xl font-bold text-xs shadow-sm outline-none text-slate-900" value={filtro.profesional_id} onChange={(e) => setFiltro({...filtro, profesional_id: e.target.value})}>
                            {profesionales.map(p => <option key={p.id} value={p.user_id}>Dr. {p.nombre} {p.apellido}</option>)}
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Duración base</label>
                          <div className="grid grid-cols-2 gap-2">
                             {duracionesDisponibles.slice(0,6).map(m => ( <button key={m} onClick={() => setFiltro({...filtro, duracionDefault: m})} className={`py-4 rounded-2xl text-[10px] font-black border transition-all ${filtro.duracionDefault === m ? 'bg-white text-blue-600 border-blue-500 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>{m >= 60 ? `${m/60}h` : `${m}m`}</button> ))}
                          </div>
                        </div>
                      </div>
                    </aside>
                    <main className="flex-1 p-6 md:p-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-5 bg-white overflow-y-auto text-slate-900">
                      {getDiasLunesSabado().map(dia => {
                        const fStr = dia.toLocaleDateString('sv-SE');
                        return (
                          <div key={fStr} className="space-y-2 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">{dia.toLocaleDateString('es-CL', {weekday: 'short'})} {dia.toLocaleDateString('es-CL', {day: 'numeric'})}</p>
                            <div className="space-y-1.5 text-left">
                                {slotsHorarios.map(h => {
                                  const laboral = esHorarioLaboral(fStr, h);
                                  const ocupado = esCitaOcupada(fStr, h); 
                                  const sel = horasSeleccionadas.some(x => x.fecha === fStr && x.hora === h);
                                  let btnClass = "w-full py-3.5 text-[10px] font-black rounded-2xl border transition-all ";
                                  if (sel) btnClass += "bg-blue-600 text-white border-blue-600 shadow-xl scale-95";
                                  else if (ocupado) btnClass += "bg-red-50 text-red-300 border-red-50 cursor-not-allowed opacity-40";
                                  else if (laboral) btnClass += "bg-white border-slate-100 text-slate-600 hover:border-blue-300 hover:bg-blue-50";
                                  else btnClass += "bg-slate-50/50 text-slate-200 border-transparent cursor-not-allowed opacity-20";

                                  return (
                                      <button key={h} disabled={(!laboral || ocupado) && !sel} onClick={() => toggleHora(fStr, h)} className={btnClass}>{h}</button>
                                  )
                                })}
                            </div>
                          </div>
                        )
                      })}
                    </main>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white text-slate-900">
                    <div className="w-full md:w-1/2 border-r border-slate-50 p-8 md:p-12 bg-[#FAFBFC]/50 overflow-y-auto space-y-6 text-left">
                       <h3 className="text-sm font-black uppercase text-blue-600 flex items-center gap-2"><Timer size={18}/> Ajustar Tiempos</h3>
                       {horasSeleccionadas.map((s, idx) => (
                         <div key={idx} className="bg-white p-7 rounded-[2rem] border border-slate-100 flex items-center justify-between shadow-sm">
                           <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.fecha}</p><p className="text-lg font-black text-slate-700 mt-1">{s.hora} hrs</p></div>
                           <select className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black outline-none text-slate-900" value={s.duracion} onChange={(e) => actualizarDuracionIndividual(idx, Number(e.target.value))}>
                                {duracionesDisponibles.map(d => <option key={d} value={d}>{d} min</option>)}
                                </select>
                         </div>
                       ))}
                    </div>
                    <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto space-y-10 text-left">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">{modoNuevoPaciente ? 'Nuevo Registro' : 'Vincular Paciente'}</h3>
                            <button onClick={() => { setModoNuevoPaciente(!modoNuevoPaciente); setPacienteSeleccionado(null); setBusqueda(''); }} className="text-[10px] font-black text-blue-600 uppercase underline underline-offset-8 decoration-2">{modoNuevoPaciente ? 'Buscar Existente' : '+ Registrar Nuevo'}</button>
                        </div>
                        {modoNuevoPaciente ? (
                            <div className="grid grid-cols-1 gap-4 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                              <input placeholder="Nombre" className="p-5 bg-white rounded-2xl font-bold text-xs uppercase outline-none text-slate-900 shadow-sm" value={nuevoPaciente.nombre} onChange={e => setNuevoPaciente(prev => ({...prev, nombre: e.target.value}))}/>
                              <input placeholder="Apellido" className="p-5 bg-white rounded-2xl font-bold text-xs uppercase outline-none text-slate-900 shadow-sm" value={nuevoPaciente.apellido} onChange={e => setNuevoPaciente(prev => ({...prev, apellido: e.target.value}))}/>
                              <input placeholder="RUT" className="p-5 bg-white rounded-2xl font-bold text-xs uppercase outline-none text-slate-900 shadow-sm" value={nuevoPaciente.rut} onChange={e => setNuevoPaciente(prev => ({...prev, rut: e.target.value}))}/>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase ml-3">Nacimiento</label>
                                  <input type="date" className="w-full p-5 bg-white rounded-2xl font-bold text-xs outline-none border border-white text-slate-900 shadow-sm" value={nuevoPaciente.fecha_nacimiento} onChange={e => setNuevoPaciente(prev => ({...prev, fecha_nacimiento: e.target.value}))}/>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase ml-3">Sexo</label>
                                  <select className="w-full p-5 bg-white rounded-2xl font-bold text-xs outline-none border border-white text-slate-900 shadow-sm" value={nuevoPaciente.sexo} onChange={e => setNuevoPaciente(prev => ({...prev, sexo: e.target.value}))}>
                                    <option value="">Elegir...</option>
                                    <option value="MASCULINO">Masculino</option>
                                    <option value="FEMENINO">Femenino</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                                <input placeholder="Nombre o RUT..." className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-[1.8rem] font-bold text-xs outline-none text-slate-900 shadow-inner" value={busqueda} onChange={e => {setBusqueda(e.target.value); buscarPacientes(e.target.value);}} />
                                {buscando && <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={18} />}
                            </div>
                            {pacientesEncontrados.length > 0 && (
                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                                    {pacientesEncontrados.map(p => (
                                    <button key={p.id} onClick={() => seleccionarPacienteExistente(p)} className="w-full p-6 rounded-[2rem] border-2 border-slate-50 bg-slate-50 hover:border-blue-500 transition-all flex items-center justify-between">
                                        <div className="text-left">
                                            <p className="font-black text-sm uppercase">{p.nombre} {p.apellido}</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{p.rut}</p>
                                        </div>
                                    </button>
                                    ))}
                                </div>
                            )}
                            {pacienteSeleccionado && pacientesEncontrados.length === 0 && (
                                <div className="p-6 rounded-[2rem] border-2 border-blue-500 bg-blue-50/50 flex items-center justify-between animate-in fade-in zoom-in duration-300">
                                    <div className="text-left">
                                        <p className="font-black text-sm uppercase">{pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{pacienteSeleccionado.rut}</p>
                                    </div>
                                    <CheckCircle2 className="text-blue-500" size={20}/>
                                </div>
                            )}
                            </div>
                        )}
                      </div>

                      {(pacienteSeleccionado || modoNuevoPaciente) && ( 
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-8 bg-slate-900 rounded-[2.8rem] shadow-2xl relative overflow-hidden text-white text-left">
                            <h4 className="text-[10px] font-black uppercase text-blue-400 mb-5 tracking-[0.3em] flex items-center gap-2"><Briefcase size={14}/> Procedimiento</h4>
                            {!modoNuevoPaciente && tratamientosPaciente.length > 0 ? (
                              <div className="space-y-4">
                                <label className="text-[9px] font-black text-white/40 uppercase ml-2">Seleccionar plan activo</label>
                                <select 
                                  className="w-full p-5 bg-white/10 rounded-2xl font-black text-xs outline-none border border-white/10 text-white transition-all appearance-none cursor-pointer" 
                                  value={tratamientoSeleccionadoId || ''} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTratamientoSeleccionadoId(val);
                                    if (val !== 'MANUAL') {
                                      const t = tratamientosPaciente.find(x => x.id === val);
                                      setNuevoTratamientoNombre(t?.nombre_tratamiento || '');
                                    } else { setNuevoTratamientoNombre(''); }
                                  }}
                                >
                                  {tratamientosPaciente.map(t => (
                                    <option key={t.id} value={t.id} className="text-slate-900">{t.nombre_tratamiento.toUpperCase()}</option>
                                  ))}
                                  <option value="MANUAL" className="text-slate-900 italic">+ OTRO MOTIVO (ESCRIBIR ABAJO)</option>
                                </select>
                                {tratamientoSeleccionadoId === 'MANUAL' && (
                                  <motion.input initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} placeholder="Especifique el motivo..." className="w-full p-5 bg-white/10 rounded-2xl font-black text-xs outline-none border border-white/10 text-white placeholder:text-white/20 transition-all uppercase" value={nuevoTratamientoNombre} onChange={(e) => setNuevoTratamientoNombre(e.target.value)} />
                                )}
                              </div>
                            ) : (
                              <input placeholder="Ej: Evaluación General..." className="w-full p-5 bg-white/10 rounded-2xl font-black text-xs outline-none border border-white/10 text-white placeholder:text-white/20 transition-all uppercase" value={nuevoTratamientoNombre} onChange={(e) => setNuevoTratamientoNombre(e.target.value)} />
                            )}
                        </motion.div> 
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-50 bg-white flex justify-between items-center shrink-0 px-14">
                <div className="flex items-center gap-4 text-slate-900">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-black border border-slate-100">{horasSeleccionadas.length}</div>
                    <div className="hidden sm:block text-left">
                      <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest leading-none">Confirmación</p>
                      <p className="text-sm font-black text-slate-900 mt-1">Sincronizar turnos</p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                  {paso === 2 && <button onClick={() => setPaso(1)} className="px-8 py-4 font-black text-[11px] uppercase text-slate-400 hover:text-slate-900 transition-colors tracking-widest">Atrás</button>}
                  <button 
                    disabled={cargandoAccion || horasSeleccionadas.length === 0 || (paso === 2 && !modoNuevoPaciente && !pacienteSeleccionado)} 
                    onClick={() => { if(paso === 1) { setPaso(2); } else { handleGuardar(); } }} 
                    className="px-10 md:px-16 py-5 rounded-[1.8rem] font-black bg-blue-600 text-white text-xs uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-200 flex items-center gap-3"
                  >
                    {cargandoAccion ? <Loader2 className="animate-spin" size={18}/> : (paso === 1 ? 'Siguiente' : 'Confirmar Reserva')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TICKET DE CONFIRMACIÓN FINAL */}
      <AnimatePresence>
        {mostrarTicket && (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4">
            <motion.div initial={{ y: 100, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -100, opacity: 0 }} className="relative w-full max-w-sm">
                <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="bg-blue-600 p-10 text-white text-center relative">
                    <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900/80 rounded-full" />
                    <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900/80 rounded-full" />
                    <CheckCircle2 className="mx-auto mb-4" size={50} />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.5em]">Reserva Exitosa</h2>
                </div>
                <div className="p-10 space-y-8 border-b-2 border-dashed border-slate-100 relative text-left">
                    <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Paciente</p>
                    <p className="text-2xl font-black text-slate-800 leading-tight uppercase">{citaConfirmadaData?.paciente}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha</p><p className="font-black text-slate-700">{citaConfirmadaData?.citas[0]?.fecha}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hora</p><p className="font-black text-slate-700">{citaConfirmadaData?.citas[0]?.hora} hrs</p></div>
                    </div>
                </div>
                <div className="p-10 bg-slate-50 flex items-center justify-between">
                    <div className="space-y-1 text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Referencia</p><p className="text-xs font-mono font-bold text-slate-600 tracking-tighter">#DP-{Math.floor(Math.random()*90000) + 10000}</p></div>
                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-3xl flex items-center justify-center shadow-inner"><Activity size={32} className="text-blue-500" /></div>
                </div>
                </div>
                <button onClick={() => { setMostrarTicket(false); setModalAbierto(false); resetEstados(); }} className="w-full mt-6 py-6 bg-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] text-slate-900 shadow-xl hover:bg-slate-50 active:scale-95 transition-all text-center">Finalizar</button>
            </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  )
}