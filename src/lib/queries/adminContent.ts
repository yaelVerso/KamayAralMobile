import type { Module, SubModule, SignItem } from '@/content/types'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseServerClient = SupabaseClient

// Same reasoning as customContent.ts: no per-sub-module activity-sequence
// configuration in the admin UI, every admin sub-module gets the default.
const DEFAULT_ACTIVITY_SEQUENCE: SubModule['activitySequence'] = [
  'lesson-card', 'sign-to-picture', 'drag-drop-match', 'spelling',
]

interface AdminSignRow {
  id: string
  submodule_id: string
  label: string
  label_fil: string | null
  video_url: string
  image_url: string | null
  accepted_answers: string[]
}

// A teacher's override replaces the primary video everywhere (Learn,
// Practice, and Quiz) for their own students — admin's original becomes a
// Learn-mode-only variation instead of just vanishing, reusing the exact
// picker UI already built for a teacher's own custom-sign variations.
function mapSign(row: AdminSignRow, overrideUrl?: string): SignItem {
  if (overrideUrl) {
    return {
      id: row.id,
      label: row.label,
      labelFil: row.label_fil ?? undefined,
      videoPath: overrideUrl,
      imagePath: row.image_url ?? undefined,
      acceptedAnswers: row.accepted_answers,
      videoVariations: [{ id: `${row.id}::admin-original`, url: row.video_url, label: null }],
    }
  }
  return {
    id: row.id,
    label: row.label,
    labelFil: row.label_fil ?? undefined,
    videoPath: row.video_url,
    imagePath: row.image_url ?? undefined,
    acceptedAnswers: row.accepted_answers,
  }
}

/** The current user's teacher, if they're a student — null for a teacher/admin viewer, or an unassigned student. */
export async function getTeacherIdForStudent(supabase: SupabaseServerClient, studentId: string): Promise<string | null> {
  const { data: student } = await supabase.from('students').select('section_id').eq('id', studentId).maybeSingle()
  if (!student?.section_id) return null
  const { data: section } = await supabase.from('sections').select('teacher_id').eq('id', student.section_id).maybeSingle()
  return section?.teacher_id ?? null
}

async function getOverridesBySignId(
  supabase: SupabaseServerClient,
  signIds: string[],
  teacherId: string | null | undefined,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!teacherId || signIds.length === 0) return map

  const { data } = await supabase
    .from('admin_sign_teacher_overrides')
    .select('admin_sign_id, video_url')
    .eq('teacher_id', teacherId)
    .in('admin_sign_id', signIds)
  for (const row of data ?? []) map.set(row.admin_sign_id, row.video_url)
  return map
}

/**
 * One admin module's full tree (sub-modules + signs) — used by the
 * Learn/Activity/Quiz pages. Unlike custom modules, there's no
 * assignment-table check needed: admin_modules/admin_submodules/admin_signs
 * RLS already allows every authenticated user to read every row.
 *
 * teacherId (the viewing student's own teacher, from getTeacherIdForStudent)
 * applies that teacher's sign overrides, if any — omit for teacher/admin
 * viewers, who should always see admin's own original content.
 */
export async function getAdminModuleTree(supabase: SupabaseServerClient, moduleId: string, teacherId?: string | null): Promise<Module | null> {
  const { data: mod } = await supabase
    .from('admin_modules')
    .select('id, title, description, icon, color, order')
    .eq('id', moduleId)
    .maybeSingle()
  if (!mod) return null

  const { data: submodules } = await supabase
    .from('admin_submodules')
    .select('id, title, short_title, order')
    .eq('module_id', moduleId)
    .order('order')

  const submoduleIds = (submodules ?? []).map((s) => s.id)
  const { data: signs } = submoduleIds.length > 0
    ? await supabase
        .from('admin_signs')
        .select('id, submodule_id, label, label_fil, video_url, image_url, accepted_answers, order')
        .in('submodule_id', submoduleIds)
        .order('order')
    : { data: [] }

  const overridesBySignId = await getOverridesBySignId(supabase, (signs ?? []).map((s) => s.id), teacherId)

  const subModules: SubModule[] = (submodules ?? []).map((sm) => ({
    id: sm.id,
    moduleId: mod.id,
    title: sm.title,
    shortTitle: sm.short_title,
    items: (signs ?? []).filter((s) => s.submodule_id === sm.id).map((s) => mapSign(s, overridesBySignId.get(s.id))),
    activitySequence: DEFAULT_ACTIVITY_SEQUENCE,
  }))

  return {
    id: mod.id,
    order: mod.order,
    title: mod.title,
    description: mod.description ?? '',
    icon: mod.icon,
    subModules,
    color: mod.color,
  }
}

export interface AdminModuleSummary {
  id: string
  title: string
  icon: string
  subModules: { id: string; title: string }[]
}

/**
 * Every admin module's title/icon and sub-module id/title — no signs —
 * for the teacher's per-section quiz toggle list.
 */
export async function getAllAdminModules(supabase: SupabaseServerClient): Promise<AdminModuleSummary[]> {
  const { data: modules } = await supabase
    .from('admin_modules')
    .select('id, title, icon')
    .order('order')
  if (!modules || modules.length === 0) return []

  const moduleIds = modules.map((m) => m.id)
  const { data: submodules } = await supabase
    .from('admin_submodules')
    .select('id, module_id, title')
    .in('module_id', moduleIds)
    .order('order')

  return modules.map((mod) => ({
    id: mod.id,
    title: mod.title,
    icon: mod.icon,
    subModules: (submodules ?? [])
      .filter((sm) => sm.module_id === mod.id)
      .map((sm) => ({ id: sm.id, title: sm.title })),
  }))
}

/**
 * Every admin module, each with its full sub-module/sign tree — used by
 * the student-facing module list (admin content is visible to everyone,
 * no per-student/per-section filtering needed beyond applying teacherId's
 * overrides, same as getAdminModuleTree).
 */
export async function getAllAdminModulesWithContent(supabase: SupabaseServerClient, teacherId?: string | null): Promise<Module[]> {
  const { data: modules } = await supabase
    .from('admin_modules')
    .select('id, title, description, icon, color, order')
    .order('order')
  if (!modules || modules.length === 0) return []

  const moduleIds = modules.map((m) => m.id)
  const { data: submodules } = await supabase
    .from('admin_submodules')
    .select('id, module_id, title, short_title, order')
    .in('module_id', moduleIds)
    .order('order')

  const submoduleIds = (submodules ?? []).map((s) => s.id)
  const { data: signs } = submoduleIds.length > 0
    ? await supabase
        .from('admin_signs')
        .select('id, submodule_id, label, label_fil, video_url, image_url, accepted_answers, order')
        .in('submodule_id', submoduleIds)
        .order('order')
    : { data: [] }

  const overridesBySignId = await getOverridesBySignId(supabase, (signs ?? []).map((s) => s.id), teacherId)

  return modules.map((mod) => ({
    id: mod.id,
    order: mod.order,
    title: mod.title,
    description: mod.description ?? '',
    icon: mod.icon,
    color: mod.color,
    subModules: (submodules ?? [])
      .filter((sm) => sm.module_id === mod.id)
      .map((sm) => ({
        id: sm.id,
        moduleId: mod.id,
        title: sm.title,
        shortTitle: sm.short_title,
        items: (signs ?? []).filter((s) => s.submodule_id === sm.id).map((s) => mapSign(s, overridesBySignId.get(s.id))),
        activitySequence: DEFAULT_ACTIVITY_SEQUENCE,
      })),
  }))
}
