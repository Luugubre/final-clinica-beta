'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LogIn, Loader2, ShieldCheck, UserCircle, Lock } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cargando) return
    setCargando(true)
    setError('')

    try {
      // 1. LIMPIEZA: Al igual que en el registro, quitamos espacios y caracteres raros
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9.]/g, "");
      
      // 2. CONSTRUCCIÓN: Usamos el mismo dominio que en actions.ts (@dentapro.com)
      const virtualEmail = `${cleanUsername}@dentapro.com`;

      // 3. AUTENTICACIÓN
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: virtualEmail, 
        password 
      })

      if (authError) {
        setError('Usuario o contraseña incorrectos')
        setCargando(false)
        return
      }

      if (data?.session) {
        // Redirección total para limpiar estados y cargar cookies frescas
        window.location.href = '/'
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
      setCargando(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-slate-100 transition-all">
        
        {/* Encabezado */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="bg-slate-900 p-5 rounded-[2rem] text-white mb-6 shadow-2xl shadow-slate-200">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Denta<span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.4em] mt-3">SISTEMA DE GESTIÓN CLÍNICA</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            
            {/* Campo: Nombre de Usuario */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest flex items-center gap-2">
                <UserCircle size={14}/> Identificador de Usuario
              </label>
              <input 
                type="text" 
                placeholder="ej: dr.vargas" 
                className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none text-slate-900 font-bold transition-all placeholder:text-slate-300"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
                autoComplete="username"
              />
            </div>

            {/* Campo: Contraseña */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest flex items-center gap-2">
                <Lock size={14}/> Contraseña
              </label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none text-slate-900 font-bold transition-all placeholder:text-slate-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                autoComplete="current-password"
              />
            </div>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-600 text-[11px] font-black uppercase text-center bg-red-50 p-4 rounded-2xl border border-red-100"
            >
              {error}
            </motion.div>
          )}

          <div className="pt-2">
            <button 
              type="submit"
              disabled={cargando}
              className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex justify-center items-center gap-3 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {cargando ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Validando Identidad...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Acceder al Panel</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-12 text-center space-y-4">
          <p className="text-slate-300 text-[9px] font-bold uppercase tracking-[0.2em]">
            Desarrollado para Tania y Daniel
          </p>
          <div className="w-10 h-1 bg-slate-100 mx-auto rounded-full" />
        </div>
      </div>
    </main>
  )
}