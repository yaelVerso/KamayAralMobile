import type { Module } from '@/content/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdminModuleTree, getTeacherIdForStudent } from '@/lib/queries/adminContent'
import { getCustomModuleTree } from '@/lib/queries/customContent'

export type ContentSource = 'admin' | 'custom'

/** Loads a module's full tree regardless of which of the two mobile content sources it's from. */
export async function getModuleTreeBySource(
  supabase: SupabaseClient,
  source: ContentSource,
  moduleId: string,
  studentId: string,
): Promise<Module | null> {
  if (source === 'custom') {
    return getCustomModuleTree(supabase, moduleId)
  }
  const teacherId = await getTeacherIdForStudent(supabase, studentId)
  return getAdminModuleTree(supabase, moduleId, teacherId)
}
