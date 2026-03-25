'use server'
import { createClient } from '@supabase/supabase-js'

// Cliente con privilegios de administrador para saltar RLS y manejar Auth.admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VIRTUAL_DOMAIN = "@dentapro.com";

/**
 * CREAR CUENTA DE STAFF
 */
export async function crearCuentaStaff(formData: any) {
  const { nombre, apellido, username, password, rol, especialidad_id } = formData;
  const nombreCompleto = `${nombre} ${apellido}`;
  
  // Limpieza de username para evitar errores de formato de email
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9.]/g, "");
  const virtualEmail = `${cleanUsername}${VIRTUAL_DOMAIN}`;

  let authUserId: string | null = null;

  try {
    console.log("--- INICIANDO CREACIÓN DE STAFF ---");
    console.log("Email Virtual:", virtualEmail);

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: virtualEmail,
      password: password,
      email_confirm: true,
      user_metadata: { 
        nombre_completo: nombreCompleto, 
        rol: rol, 
        username: cleanUsername 
      }
    })

    if (authError) {
      console.error("Fallo Auth:", authError.message);
      return { error: `Error de Autenticación: ${authError.message}` };
    }
    
    authUserId = authData.user.id;
    console.log("ID generado en Auth:", authUserId);

    // 2. Registro en tabla 'perfiles'
    const { error: perfilError } = await supabaseAdmin
      .from('perfiles')
      .upsert([{ 
        id: authUserId, 
        nombre_completo: nombreCompleto, 
        rol: rol,
        username: cleanUsername 
      }])
    
    if (perfilError) {
      console.error("Fallo Perfiles:", perfilError.message);
      throw new Error(`Error en base de datos (Perfiles): ${perfilError.message}`);
    }

    // 3. Registro en tabla 'profesionales' (Solo si el rol es DENTISTA)
    if (rol === 'DENTISTA') {
      console.log("Registrando en tabla profesionales...");
      const { error: dbError } = await supabaseAdmin
        .from('profesionales')
        .upsert([{
          user_id: authUserId, 
          nombre: nombre.toUpperCase(),
          apellido: apellido.toUpperCase(),
          especialidad_id: especialidad_id || null,
          activo: true
        }], { onConflict: 'user_id' })

      if (dbError) {
        console.error("Fallo Profesionales:", dbError.message);
        throw new Error(`Error en base de datos (Profesionales): ${dbError.message}`);
      }
    }

    console.log("Staff creado exitosamente.");
    return { success: true }

  } catch (error: any) {
    console.error("CATCH ERROR:", error.message);
    // Si algo falló a mitad de camino, borramos el usuario de Auth para no dejar basura
    if (authUserId) {
      console.log("Limpiando usuario Auth por fallo en cascada...");
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
    }
    return { error: error.message }
  }
}

/**
 * ACTUALIZAR CUENTA DE STAFF
 */
export async function actualizarCuentaStaff(id: string, userId: string, formData: any) {
  try {
    const { nombre, apellido, especialidad_id, rol } = formData;
    const nombreCompleto = `${nombre} ${apellido}`
    
    console.log("Actualizando perfil ID:", userId);

    // 1. Actualizar Perfil
    const { error: perfilErr } = await supabaseAdmin
      .from('perfiles')
      .update({ 
        nombre_completo: nombreCompleto, 
        rol: rol 
      })
      .eq('id', userId)
    
    if (perfilErr) throw perfilErr;

    // 2. Actualizar Auth Metadata (para que se refleje en la sesión)
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { nombre_completo: nombreCompleto, rol: rol }
    });

    // 3. Actualizar tabla profesionales si es Dentista
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
    console.error("Error al actualizar:", err.message);
    return { error: err.message }
  }
}

/**
 * ELIMINAR CUENTA DE STAFF
 */
export async function eliminarCuentaStaff(userId: string) {
  try {
    console.log("Eliminando staff ID:", userId);

    // El orden importa para las claves foráneas
    // 1. Borrar de profesionales
    await supabaseAdmin.from('profesionales').delete().eq('user_id', userId);
    
    // 2. Borrar de perfiles
    await supabaseAdmin.from('perfiles').delete().eq('id', userId);
    
    // 3. Borrar de Autenticación
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw authErr;

    return { success: true }
  } catch (err: any) {
    console.error("Error al eliminar:", err.message);
    return { error: err.message }
  }
}