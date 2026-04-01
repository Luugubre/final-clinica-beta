'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Activity, Save, Loader2, X, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const c1 = [18, 17, 16, 15, 14, 13, 12, 11];
const c2 = [21, 22, 23, 24, 25, 26, 27, 28];
const c3 = [48, 47, 46, 45, 44, 43, 42, 41];
const c4 = [31, 32, 33, 34, 35, 36, 37, 38];

export default function OdontogramaPage() {
  const { id } = useParams()
  const [dentadura, setDentadura] = useState<Record<number, any>>({})
  const [itemsGlobales, setItemsGlobales] = useState<any[]>([]) 
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (id) {
        fetchTodo();
    }
  }, [id])

  async function fetchTodo() {
    setCargando(true)
    try {
      const { data: odonto } = await supabase
        .from('odontogramas')
        .select('dentadura')
        .eq('paciente_id', id)
        .maybeSingle()
      
      const { data: presIds } = await supabase.from('presupuestos').select('id').eq('paciente_id', id);
      
      if (presIds && presIds.length > 0) {
        const { data: items } = await supabase
          .from('presupuesto_items')
          .select('*, prestaciones:prestacion_id(icono_tipo)')
          .in('presupuesto_id', presIds.map(p => p.id))

        if (items) setItemsGlobales(items)
      }

      if (odonto) setDentadura(odonto.dentadura || {})
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  const cambiarEstadoCara = (piezaId: number, cara: string) => {
    const d = dentadura[piezaId] || {};
    const estados = ['sano', 'caries', 'restauracion'];
    const proximo = estados[(estados.indexOf(d[cara] || 'sano') + 1) % estados.length];
    setDentadura({ ...dentadura, [piezaId]: { ...d, [cara]: proximo } })
  }

  const cambiarEstadoGeneral = (piezaId: number) => {
    const d = dentadura[piezaId] || {};
    const proximo = d.estado_general === 'ausente' ? 'presente' : 'ausente';
    setDentadura({ ...dentadura, [piezaId]: { ...d, estado_general: proximo } });
  }

  const guardarOdontograma = async () => {
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('odontogramas')
        .upsert({ 
          paciente_id: id, 
          dentadura: dentadura, 
          ultima_actualizacion: new Date().toISOString() 
        }, { onConflict: 'paciente_id' })

      if (error) throw error
      toast.success("Ficha Maestra actualizada")
    } catch (e) {
      toast.error("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analizando Piezas Dentales...</p>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 text-left">
      <div className="flex justify-between items-center mb-10 text-left">
        <div className="text-left">
          <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 text-left text-slate-800">
            <Activity size={24} className="text-blue-600"/> Odontograma Clínico Maestro
          </h3>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 text-left">Estado permanente consolidado del paciente</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="hidden md:flex gap-4 bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100">
            <LegendItem color="bg-red-500" label="Caries (M)" />
            <LegendItem color="bg-blue-500" label="Restauración (M)" />
            <LegendItem color="bg-emerald-500" label="Realizado (P)" />
          </div>
          <button 
            onClick={guardarOdontograma} 
            disabled={guardando} 
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:bg-black transition-all disabled:bg-slate-300"
          >
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} 
            Guardar Ficha
          </button>
        </div>
      </div>

      <div className="bg-slate-50/30 p-10 rounded-[3rem] border-2 border-slate-100 overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] flex flex-col gap-14 items-center">
          <div className="flex justify-center items-end gap-1">
            <div className="flex gap-1 border-r-4 border-slate-100 pr-4">
              {c1.map(pid => <DienteMaestro key={pid} id={pid} datos={dentadura[pid]} itemsDiente={itemsGlobales.filter(i => i.diente_id === pid)} onClickCara={cambiarEstadoCara} onDienteClick={cambiarEstadoGeneral} superior />)}
            </div>
            <div className="flex gap-1 pl-4">
              {c2.map(pid => <DienteMaestro key={pid} id={pid} datos={dentadura[pid]} itemsDiente={itemsGlobales.filter(i => i.diente_id === pid)} onClickCara={cambiarEstadoCara} onDienteClick={cambiarEstadoGeneral} superior />)}
            </div>
          </div>

          <div className="flex justify-center items-start gap-1">
            <div className="flex gap-1 border-r-4 border-slate-100 pr-4">
              {c3.map(pid => <DienteMaestro key={pid} id={pid} datos={dentadura[pid]} itemsDiente={itemsGlobales.filter(i => i.diente_id === pid)} onClickCara={cambiarEstadoCara} onDienteClick={cambiarEstadoGeneral} superior={false} />)}
            </div>
            <div className="flex gap-1 pl-4">
              {c4.map(pid => <DienteMaestro key={pid} id={pid} datos={dentadura[pid]} itemsDiente={itemsGlobales.filter(i => i.diente_id === pid)} onClickCara={cambiarEstadoCara} onDienteClick={cambiarEstadoGeneral} superior={false} />)}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function DienteMaestro({ id, datos, onClickCara, onDienteClick, superior = false, itemsDiente = [] }: any) {
  const estadoGeneral = datos?.estado_general || 'presente';
  
  const iconosTratamientos = itemsDiente.map((i: any) => ({
    tipo: (i.prestaciones as any)?.icono_tipo,
    realizado: i.estado === 'realizado'
  }));

  const colorTratamiento = (tipo: string) => {
    const item = iconosTratamientos.find((ico: any) => ico.tipo === tipo);
    return item?.realizado ? "#10b981" : "#f43f5e"; 
  };

  const getClaseCara = (cara: string) => {
    const e = datos?.[cara] || 'sano';
    if (e === 'caries') return 'fill-red-500 stroke-red-700';
    if (e === 'restauracion') return 'fill-blue-500 stroke-blue-700';
    return 'fill-white stroke-slate-200';
  };

  const isMolar = [18, 17, 16, 26, 27, 28, 36, 37, 38, 46, 47, 48].includes(id);
  const isIncisivo = [12, 11, 21, 22, 31, 32, 41, 42].includes(id);
  const isCanino = [13, 23, 33, 43].includes(id);

  const getDientePath = () => {
    if (isMolar) return "M20,20 L80,20 L85,80 Q85,100 50,100 Q15,100 15,80 Z";
    if (isIncisivo) return "M35,20 L65,20 L68,85 Q68,100 50,100 Q32,100 32,85 Z";
    if (isCanino) return "M35,30 L50,15 L65,30 L68,85 Q68,100 50,100 Q32,100 32,85 Z";
    return "M30,20 L70,20 L75,80 Q75,100 50,100 Q25,100 25,80 Z";
  };

  return (
    <div className={`flex items-center gap-2 group relative ${superior ? 'flex-col' : 'flex-col-reverse'}`}>
      <span className="text-[10px] font-black text-slate-400 italic">{id}</span>
      
      <div className={`relative w-12 h-18 flex items-center justify-center transition-all ${estadoGeneral === 'ausente' ? 'grayscale opacity-20' : 'hover:scale-110'}`}>
        <button onClick={(e) => { e.stopPropagation(); onDienteClick(id); }} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white p-1 rounded-full shadow-lg z-20">
            {estadoGeneral === 'ausente' ? <RotateCcw size={8}/> : <X size={8}/>}
        </button>

        <svg viewBox="0 0 100 120" className={`w-full h-full ${!superior ? 'rotate-180' : ''}`}>
           <path d={getDientePath()} fill="white" stroke={iconosTratamientos.length > 0 ? "#3b82f6" : "#cbd5e1"} strokeWidth="4"/>
           
           {iconosTratamientos.some((i: any) => i.tipo === 'endodoncia') && (
             <path d="M50,25 L50,90" stroke={colorTratamiento('endodoncia')} strokeWidth="10" strokeLinecap="round" opacity="0.8" />
           )}

           {iconosTratamientos.some((i: any) => i.tipo === 'implante') && (
             <g fill={colorTratamiento('implante')}>
               <rect x="40" y="75" width="20" height="35" rx="2" />
               <path d="M40,85 L60,85 M40,95 L60,95" stroke="white" strokeWidth="2" />
             </g>
           )}

           {iconosTratamientos.some((i: any) => i.tipo === 'corona') && (
             <circle cx="50" cy="35" r="42" fill="none" stroke={colorTratamiento('corona')} strokeWidth="4" strokeDasharray="6 3" />
           )}

           {iconosTratamientos.some((i: any) => i.tipo === 'perno') && (
             <g stroke={colorTratamiento('perno')} strokeWidth="6" strokeLinecap="round">
               <line x1="50" y1="35" x2="50" y2="60" />
               <line x1="35" y1="35" x2="65" y2="35" />
             </g>
           )}

           {iconosTratamientos.some((i: any) => i.tipo === 'sellante') && (
             <text x="50" y="55" textAnchor="middle" fontSize="35" fontWeight="900" fill={colorTratamiento('sellante')} style={{ userSelect: 'none' }}>S</text>
           )}

           {estadoGeneral === 'ausente' && (
             <g stroke="#ef4444" strokeWidth="10" strokeLinecap="round">
               <line x1="10" y1="10" x2="90" y2="110" />
               <line x1="90" y1="10" x2="10" y2="110" />
             </g>
           )}
        </svg>
      </div>

      <div className={`relative transition-all ${estadoGeneral === 'ausente' ? 'opacity-0 pointer-events-none' : ''}`}>
        <svg width="32" height="32" viewBox="0 0 100 100" className="cursor-pointer drop-shadow-sm">
          <path d="M10,10 L90,10 L70,30 L30,30 Z" className={getClaseCara('top')} onClick={() => onClickCara(id, 'top')} />
          <path d="M10,90 L90,90 L70,70 L30,70 Z" className={getClaseCara('bottom')} onClick={() => onClickCara(id, 'bottom')} />
          <path d="M10,10 L30,30 L30,70 L10,90 Z" className={getClaseCara('left')} onClick={() => onClickCara(id, 'left')} />
          <path d="M90,10 L70,30 L70,70 L90,90 Z" className={getClaseCara('right')} onClick={() => onClickCara(id, 'right')} />
          <path d="M30,30 L70,30 L70,70 L30,70 Z" className={getClaseCara('center')} onClick={() => onClickCara(id, 'center')} />
        </svg>
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
    </div>
  )
}
