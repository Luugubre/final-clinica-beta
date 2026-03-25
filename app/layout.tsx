'use client'
import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, Search, Calendar, Users, 
  Briefcase, BarChart3, Settings, LogOut,
  LayoutGrid, ShieldCheck, ChevronDown,
  Building2, Stethoscope, Package, Beaker,
  Calculator, DoorOpen, BadgeDollarSign,
  Library, FileSignature, Ban, FileText,
  TrendingUp, FileSpreadsheet, PieChart, 
  ArrowRightLeft, UserMinus, Trophy,
  FileSearch, Users2, ChevronRight,
  Receipt, HeartPulse, Loader2, User 
} from 'lucide-react'
import Link from 'next/link'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  
  const isAuthPage = pathname === '/login' || pathname === '/register'
  
  const [session, setSession] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<any[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarResultados, setMostrarResultados] = useState(false)

  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const [showReportMenu, setShowReportMenu] = useState(false)
  const [hoverGraficos, setHoverGraficos] = useState(false)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const adminMenuRef = useRef<HTMLDivElement>(null)
  const reportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) setShowAdminMenu(false)
      if (reportMenuRef.current && !reportMenuRef.current.contains(event.target as Node)) setShowReportMenu(false)
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setMostrarResultados(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (busqueda.length > 2) ejecutarBusqueda(busqueda)
      else { setResultados([]); setMostrarResultados(false); }
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [busqueda])

  async function ejecutarBusqueda(term: string) {
    setBuscando(true)
    setMostrarResultados(true)
    const { data } = await supabase
      .from('pacientes')
      .select('id, nombre, apellido, rut')
      .or(`nombre.ilike.%${term}%,rut.ilike.%${term}%,apellido.ilike.%${term}%`)
      .limit(6)
    setResultados(data || [])
    setBuscando(false)
  }

  useEffect(() => {
    const getUserData = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      setSession(currentSession)
      if (currentSession) {
        const { data } = await supabase.from('perfiles').select('*').eq('id', currentSession.user.id).single()
        setPerfil(data)
      }
    }
    getUserData()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) setPerfil(null)
      else getUserData()
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const modulos = [
    { href: '/agenda', label: 'Agenda', icon: <Calendar size={16}/>, roles: ['ADMIN', 'RECEPCIONISTA', 'DENTISTA'] },
    { href: '/pacientes', label: 'Pacientes', icon: <Users size={16}/>, roles: ['ADMIN', 'RECEPCIONISTA', 'DENTISTA'] },
    { href: '/cajas', label: 'Cajas', icon: <Briefcase size={16}/>, roles: ['ADMIN', 'RECEPCIONISTA'] },
  ]

  return (
    <html lang="es">
      <body className="bg-slate-50 h-screen flex flex-col font-sans antialiased overflow-hidden text-slate-800">
        
        {!isAuthPage && session && (
          <div className="flex flex-col shrink-0">
            {/* HEADER SUPERIOR */}
            <header className="w-full h-20 bg-slate-950 text-white flex items-center justify-between px-8 shadow-2xl z-[40] relative print:hidden border-b border-white/5">
              <div className="flex items-center gap-12">
                <Link href="/" className="flex items-center gap-4 group transition-all">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/10 shadow-lg group-hover:scale-105 transition-transform">
                      <img 
                        src="https://yqdpmaopnvrgdqbfaiok.supabase.co/storage/v1/object/public/documentos_imagenes/440749454_122171956712064634_7168698893214813270_n.jpg" 
                        alt="Logo Clínica"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] leading-none mb-1.5 opacity-80">Centro Médico y Dental</span>
                    <span className="text-2xl font-black tracking-tighter uppercase italic leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                      Dignidad
                    </span>
                  </div>
                </Link>

                <div className="relative hidden xl:block" ref={searchRef}>
                  <div className="relative">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${buscando ? 'text-blue-500' : 'text-slate-500'}`} size={16} />
                    <input 
                      type="text" 
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar paciente por nombre o RUT..." 
                      className="w-[450px] bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-xs text-slate-100 outline-none focus:bg-white/10 focus:ring-2 ring-blue-500/50 transition-all font-medium" 
                    />
                    {buscando && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={16} />}
                  </div>

                  <AnimatePresence>
                    {mostrarResultados && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-[115%] left-0 w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-3 z-[50] overflow-hidden">
                        {resultados.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {resultados.map((p) => (
                              <button key={p.id} onClick={() => { router.push(`/pacientes/${p.id}`); setMostrarResultados(false); setBusqueda(''); }} className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 transition-all group text-left w-full text-slate-900">
                                <div className="flex items-center gap-3.5">
                                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100"><User size={16}/></div>
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-tight leading-none mb-1.5">{p.nombre} {p.apellido}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{p.rut}</p>
                                  </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase italic">Sin resultados</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 bg-white/5 pl-5 pr-2 py-2 rounded-[1.5rem] border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-slate-100 uppercase tracking-tight leading-none">{perfil?.nombre_completo || session.user.email?.split('@')[0]}</span>
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-md">
                      {perfil?.rol === 'ADMIN' && <ShieldCheck size={10} className="text-blue-400" />}
                      {perfil?.rol || 'Cargando...'}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-sm border border-white/20">
                    {perfil?.nombre_completo?.[0] || 'U'}
                  </div>
                  <button onClick={handleSignOut} className="p-2 text-slate-500 hover:text-red-400 transition-all rounded-xl hover:bg-red-500/10"><LogOut size={20} /></button>
                </div>
              </div>
            </header>

            {/* BARRA DE NAVEGACIÓN */}
            <nav className="w-full h-14 bg-white border-b border-slate-200 flex items-center px-8 gap-10 shadow-sm z-[30] relative print:hidden">
              {modulos.filter(m => m.roles.includes(perfil?.rol)).map((m) => (
                <ModuleLink key={m.href} href={m.href} label={m.label} icon={m.icon} active={pathname.startsWith(m.href)} />
              ))}

              {/* MENU REPORTES RESTAURADO */}
              {perfil?.rol === 'ADMIN' && (
                <div className="relative h-full" ref={reportMenuRef}>
                  <button onClick={() => { setShowReportMenu(!showReportMenu); setShowAdminMenu(false); }} className={`flex items-center gap-2.5 px-1 h-full border-b-2 transition-all group ${showReportMenu || pathname.startsWith('/reportes') ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-400 hover:text-slate-800'}`}>
                    <BarChart3 size={18} />
                    <span className="text-[11px] font-black uppercase tracking-wider">Reportes</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${showReportMenu ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showReportMenu && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-[100%] left-0 bg-white shadow-2xl rounded-[2rem] border border-slate-100 p-5 z-[100] w-[300px] mt-1">
                        <div className="flex flex-col gap-1.5 text-slate-900">
                          <MenuOption href="/reportes/desempeno" label="Panel de Desempeño" icon={<TrendingUp size={14}/>} onClick={() => setShowReportMenu(false)} />
                          <MenuOption href="/reportes/excel" label="Reportes Excel" icon={<FileSpreadsheet size={14}/>} onClick={() => setShowReportMenu(false)} />
                          
                          <div className="relative" onMouseEnter={() => setHoverGraficos(true)} onMouseLeave={() => setHoverGraficos(false)}>
                            <div className={`flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer group ${hoverGraficos ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}>
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl shadow-sm ${hoverGraficos ? 'bg-blue-500' : 'bg-slate-100 group-hover:bg-blue-600 group-hover:text-white'}`}><PieChart size={16}/></div>
                                <span className="text-[11px] font-black uppercase tracking-tight">Reportes Gráficos</span>
                              </div>
                              <ChevronRight size={14} />
                            </div>
                            <AnimatePresence>
                              {hoverGraficos && (
                                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="absolute top-0 left-[105%] bg-white shadow-2xl rounded-[2rem] border border-slate-100 p-5 w-[280px] z-[120]">
                                  <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 pl-2 italic">Categorías Disponibles</h3>
                                  <div className="grid gap-1 h-[350px] overflow-y-auto pr-2 custom-scrollbar text-slate-900">
                                    {[
                                      { href: "/reportes/graficos/resultados", label: "Resultados", icon: <BarChart3 size={12}/> },
                                      { href: "/reportes/graficos/flujos", label: "Flujos de dinero", icon: <ArrowRightLeft size={12}/> },
                                      { href: "/reportes/graficos/pacientes", label: "Análisis de pacientes", icon: <Users size={12}/> },
                                      { href: "/reportes/graficos/gastos", label: "Gastos", icon: <BadgeDollarSign size={12}/> },
                                      { href: "/reportes/graficos/eficiencia", label: "Eficiencia por profesional", icon: <Stethoscope size={12}/> },
                                      { href: "/reportes/graficos/ventas-prestacion", label: "Ventas por prestación", icon: <Receipt size={12}/> },
                                      { href: "/reportes/graficos/ventas-categoria", label: "Ventas por categoría", icon: <LayoutGrid size={12}/> },
                                      { href: "/reportes/graficos/captacion", label: "Eficiencia captación", icon: <FileSearch size={12}/> },
                                      { href: "/reportes/graficos/recaudacion", label: "Informe recaudación diario", icon: <Calculator size={12}/> },
                                      { href: "/reportes/graficos/ranking", label: "Ranking profesionales", icon: <Trophy size={12}/> },
                                      { href: "/reportes/graficos/morosos", label: "Pacientes morosos", icon: <UserMinus size={12}/> },
                                      { href: "/reportes/graficos/financiamientos", label: "Estado financiamientos", icon: <BadgeDollarSign size={12}/> },
                                      { href: "/reportes/graficos/planilla", label: "Descuentos por planilla", icon: <Calculator size={12}/> },
                                      { href: "/reportes/graficos/derivacion", label: "Derivación de pacientes", icon: <ArrowRightLeft size={12}/> },
                                      { href: "/reportes/graficos/capturados", label: "Presupuestos capturados", icon: <ShieldCheck size={12}/> },
                                      { href: "/reportes/graficos/estadisticas", label: "Estadísticas de pacientes", icon: <Users2 size={12}/> },
                                    ].map((item) => (
                                      <MenuOption key={item.href} {...item} onClick={() => { setShowReportMenu(false); setHoverGraficos(false); }} />
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* MENU ADMINISTRACION RESTAURADO */}
              {perfil?.rol === 'ADMIN' && (
                <div className="relative h-full" ref={adminMenuRef}>
                  <button onClick={() => { setShowAdminMenu(!showAdminMenu); setShowReportMenu(false); }} className={`flex items-center gap-2.5 px-1 h-full border-b-2 transition-all group ${showAdminMenu || pathname.startsWith('/administracion') ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-400 hover:text-slate-800'}`}>
                    <LayoutGrid size={18} />
                    <span className="text-[11px] font-black uppercase tracking-wider">Administración</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${showAdminMenu ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showAdminMenu && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-[100%] left-0 bg-white shadow-2xl rounded-[2.5rem] border border-slate-100 p-8 z-[100] w-[600px] mt-1 overflow-hidden">
                        <div className="grid grid-cols-2 gap-10">
                          <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4 pl-2">Panel Administrativo</h3>
                            <div className="grid gap-1">
                              <MenuOption href="/administracion/convenios" label="Convenios" icon={<Building2 size={14}/>} onClick={() => setShowAdminMenu(false)} />
                              <MenuOption href="/administracion/profesionales" label="Profesionales" icon={<Users size={14}/>} onClick={() => setShowAdminMenu(false)} />
                              <MenuOption href="/administracion/especialidades" label="Especialidades" icon={<Stethoscope size={14}/>} onClick={() => setShowAdminMenu(false)} />
                              <MenuOption href="/administracion/inventario" label="Inventario" icon={<Package size={14}/>} onClick={() => setShowAdminMenu(false)} />
                              <MenuOption href="/administracion/laboratorios" label="Laboratorios" icon={<Beaker size={14}/>} onClick={() => setShowAdminMenu(false)} />
                              <MenuOption href="/administracion/liquidaciones" label="Liquidaciones" icon={<Calculator size={14}/>} onClick={() => setShowAdminMenu(false)} />
                              <MenuOption href="/administracion/box" label="Planificación Box" icon={<DoorOpen size={14}/>} onClick={() => setShowAdminMenu(false)} />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 pl-2">Configuración Sistema</h3>
                            <div className="grid gap-1">
                              <MenuOption href="/administracion/configuracion/aranceles" label="Arancel Precios" icon={<BadgeDollarSign size={14}/>} onClick={() => setShowAdminMenu(false)} />
                              <MenuOption href="/administracion/configuracion/bancos" label="Bancos y Entidades" icon={<Library size={14}/>} onClick={() => setShowAdminMenu(false)} />
                              <MenuOption href="/administracion/configuracion/documentos" label="Docs Clínicos" icon={<FileText size={14}/>} onClick={() => setShowAdminMenu(false)} />
                              <MenuOption href="/administracion/configuracion/consentimientos" label="Consentimientos" icon={<FileSignature size={14}/>} onClick={() => setShowAdminMenu(false)} />
                              <MenuOption href="/administracion/configuracion/pagos-pendientes" label="Pagos Pendientes" icon={<Ban size={14}/>} onClick={() => setShowAdminMenu(false)} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-slate-50 relative z-0 print:overflow-visible print:h-auto print:bg-white custom-scrollbar">
          {children}
        </main>
      </body>
    </html>
  )
}

function MenuOption({ href, label, icon, onClick }: any) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100 text-slate-900">
      <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm shrink-0">
        {icon}
      </div>
      <span className="text-[11px] font-black uppercase tracking-tight group-hover:text-slate-900 transition-colors leading-tight">
        {label}
      </span>
    </Link>
  )
}

function ModuleLink({ href, label, icon, active }: any) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-1 h-full border-b-2 transition-all group ${active ? 'border-blue-600 text-blue-600 font-black scale-105' : 'border-transparent text-slate-400 hover:text-slate-800'}`}>
      {icon}
      <span className="text-[11px] font-black uppercase tracking-wider">{label}</span>
    </Link>
  )
}