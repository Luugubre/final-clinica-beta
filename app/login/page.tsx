'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LogIn, Loader2, ShieldCheck, UserCircle, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
      // 1. LIMPIEZA: Estandarizamos el input para que coincida con el registro
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9.]/g, "");
      
      if (!cleanUsername) {
        setError('Ingrese un nombre de usuario válido')
        setCargando(false)
        return
      }

      // 2. CONSTRUCCIÓN: Dominio virtual consistente
      const virtualEmail = `${cleanUsername}@dentapro.com`;

      // 3. AUTENTICACIÓN
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: virtualEmail, 
        password 
      })

      if (authError) {
        // Mensaje amigable pero claro
        setError('Credenciales inválidas o cuenta inexistente')
        setCargando(false)
        return
      }

      if (data?.session) {
        // Redirección forzada para asegurar que el middleware de Next.js detecte la sesión
        window.location.replace('/')
      }
    } catch (err) {
      setError('Error de comunicación con el servidor')
      setCargando(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-slate-100 text-left"
      >
        
        {/* Encabezado */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="bg-slate-900 p-5 rounded-[2rem] text-white mb-6 shadow-2xl shadow-blue-100">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none text-center">
            Denta<span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.4em] mt-3 text-center">SISTEMA DE GESTIÓN CLÍNICA</p>
        </div>

        {/* Formulario con onSubmit para manejar el 'Enter' automáticamente */}
        <form onSubmit={handleLogin} className="space-y-6 text-left">
          <div className="space-y-4 text-left">
            
            {/* Campo: Identificador */}
            <div className="space-y-2 text-left">
              <label htmlFor="username" className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest flex items-center gap-2 text-left">
                <UserCircle size={14}/> Identificador de Usuario
              </label>
              <input 
                id="username"
                type="text" 
                name="username"
                placeholder="ej: dr.vargas" 
                className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none text-slate-900 font-bold transition-all placeholder:text-slate-300"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
                autoComplete="username"
              />
            </div>

            {/* Campo: Contraseña */}
            <div className="space-y-2 text-left">
              <label htmlFor="password" className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest flex items-center gap-2 text-left">
                <Lock size={14}/> Contraseña
              </label>
              <input 
                id="password"
                type="password" 
                name="password"
                placeholder="••••••••" 
                className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none text-slate-900 font-bold transition-all placeholder:text-slate-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                autoComplete="current-password"
              />
            </div>
          </div>
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-600 text-[10px] font-black uppercase text-center bg-red-50 p-4 rounded-2xl border border-red-100"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={cargando}
              className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-95 flex justify-center items-center gap-3 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {cargando ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Autenticando...</span>
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
      </motion.div>
    </main>
  )
}
