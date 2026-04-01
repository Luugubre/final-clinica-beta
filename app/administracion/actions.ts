'use server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VIRTUAL_DOMAIN = "@dentapro.com";

// --- FUNCIÓN PARA CREAR ---
export async function crearCuentaProfesional(formData: any) {
  const { nombre, apellido, username, password, rol, especialidad_id, rut } = formData;
  const nombreCompleto = `${nombre} ${apellido}`;
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9.]/g, "");
  const virtualEmail = `${cleanUsername}${VIRTUAL_DOMAIN}`;
  let authUserId: string | null = null;

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: virtualEmail,
      password: password,
      email_confirm: true,
      user_metadata: { nombre_completo: nombreCompleto, rol: rol, username: cleanUsername, rut: rut }
    })
    if (authError) return { error: `Error Auth: ${authError.message}` };
    authUserId = authData.user.id;

    await supabaseAdmin.from('perfiles').upsert([{ 
      id: authUserId, nombre_completo: nombreCompleto, rol: rol, username: cleanUsername, rut: rut 
    }])
    
    if (rol === 'DENTISTA') {
      await supabaseAdmin.from('profesionales').upsert([{
        user_id: authUserId, nombre: nombre.toUpperCase(), apellido: apellido.toUpperCase(),
        especialidad_id: especialidad_id || null, activo: true
      }])
    }
    return { success: true }
  } catch (error: any) {
    if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return { error: error.message }
  }
}

// --- FUNCIÓN PARA ACTUALIZAR ---
export async function actualizarCuentaProfesional(id: string, userId: string, formData: any) {
  try {
    const { nombre, apellido, especialidad_id, rol, rut } = formData;
    const nombreCompleto = `${nombre} ${apellido}`
    
    await supabaseAdmin.from('perfiles').update({ 
      nombre_completo: nombreCompleto, rol: rol, rut: rut 
    }).eq('id', userId)
    
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { nombre_completo: nombreCompleto, rol: rol, rut: rut }
    });

    if (rol === 'DENTISTA') {
      await supabaseAdmin.from('profesionales').update({
        nombre: nombre.toUpperCase(), apellido: apellido.toUpperCase(),
        especialidad_id: especialidad_id || null
      }).eq('user_id', userId)
    }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

// --- FUNCIÓN PARA ELIMINAR ---
export async function eliminarCuentaProfesional(userId: string) {
  try {
    await supabaseAdmin.from('profesionales').delete().eq('user_id', userId);
    await supabaseAdmin.from('perfiles').delete().eq('id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

// --- ALIAS PARA COMPATIBILIDAD (Esto evita el error de Vercel) ---
export const crearCuentaStaff = crearCuentaProfesional;
export const actualizarCuentaStaff = actualizarCuentaProfesional;
export const eliminarCuentaStaff = eliminarCuentaProfesional;