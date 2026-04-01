'use server'
import { createClient } from '@supabase/supabase-js'

// Cliente con Service Role para saltarse políticas de RLS y gestionar Auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VIRTUAL_DOMAIN = "@dentapro.com";

// RENOMBRADA: De crearCuentaStaff a crearCuentaProfesional
export async function crearCuentaProfesional(formData: any) {
  const { nombre, apellido, username, password, rol, especialidad_id, rut } = formData;
  const nombreCompleto = `${nombre} ${apellido}`;
  
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9.]/g, "");
  const virtualEmail = `${cleanUsername}${VIRTUAL_DOMAIN}`;

  let authUserId: string | null = null;

  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: virtualEmail,
      password: password,
      email_confirm: true,
      user_metadata: { 
        nombre_completo: nombreCompleto, 
        rol: rol, 
        username: cleanUsername,
        rut: rut 
      }
    })

    if (authError) return { error: `Error Auth: ${authError.message}` };
    authUserId = authData.user.id;

    // 2. Registro en tabla 'perfiles'
    const { error: perfilError } = await supabaseAdmin
      .from('perfiles')
      .upsert([{ 
        id: authUserId, 
        nombre_completo: nombreCompleto, 
        rol: rol,
        username: cleanUsername,
        rut: rut 
      }])
    
    if (perfilError) throw new Error(`Error Perfiles: ${perfilError.message}`);

    // 3. Registro en tabla 'profesionales' si es Dentista
    if (rol === 'DENTISTA') {
      const { error: dbError } = await supabaseAdmin
        .from('profesionales')
        .upsert([{
          user_id: authUserId, 
          nombre: nombre.toUpperCase(),
          apellido: apellido.toUpperCase(),
          especialidad_id: especialidad_id || null,
          activo: true
        }])

      if (dbError) throw new Error(`Error Profesionales: ${dbError.message}`);
    }

    return { success: true }

  } catch (error: any) {
    if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return { error: error.message }
  }
}

// RENOMBRADA: De actualizarCuentaStaff a actualizarCuentaProfesional
export async function actualizarCuentaProfesional(id: string, userId: string, formData: any) {
  try {
    const { nombre, apellido, especialidad_id, rol, rut } = formData;
    const nombreCompleto = `${nombre} ${apellido}`
    
    // 1. Actualizar Perfil
    const { error: perfilErr } = await supabaseAdmin
      .from('perfiles')
      .update({ 
        nombre_completo: nombreCompleto, 
        rol: rol,
        rut: rut 
      })
      .eq('id', userId)
    
    if (perfilErr) throw perfilErr;

    // 2. Actualizar Auth Metadata
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { nombre_completo: nombreCompleto, rol: rol, rut: rut }
    });

    if (rol === 'DENTISTA') {
      const { error: profErr } = await supabaseAdmin
        .from('profesionales')
        .update({
          nombre: nombre.toUpperCase(),
          apellido: apellido.toUpperCase(),
          especialidad_id: especialidad_id || null
        })
        .eq('user_id', userId)
      
      if (profErr) throw profErr;
    }

    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

// RENOMBRADA: De eliminarCuentaStaff a eliminarCuentaProfesional
export async function eliminarCuentaProfesional(userId: string) {
  try {
    // Eliminar primero de las tablas de la base de datos por integridad referencial
    await supabaseAdmin.from('profesionales').delete().eq('user_id', userId);
    await supabaseAdmin.from('perfiles').delete().eq('id', userId);
    
    // Finalmente eliminar del sistema de autenticación
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw authErr;

    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}