import type { Module, SubModule, SignItem } from '@/content/types'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseServerClient = SupabaseClient

// No per-sub-module activity-sequence configuration in the teacher UI (kept
// simple) — every custom sub-module gets this same default sequence.
// buildQuizSteps/buildActivitySteps already skip drag-drop-match when there
// are fewer than 3 items, so a short custom sub-module still works fine
// without this being configurable.
const DEFAULT_ACTIVITY_SEQUENCE: SubModule['activitySequence'] = [
  'lesson-card', 'sign-to-picture', 'drag-drop-match', 'spelling',
]

interface CustomSignRow {
  id: string
  submodule_id: string
  label: string
  label_fil: string | null
  video_url: string
  image_url: string | null
  accepted_answers: string[]
}

interface CustomSignVideoRow {
  id: string
  sign_id: string
  video_url: string
  label: string | null
}

function mapSign(row: CustomSignRow, variationsBySignId: Map<string, CustomSignVideoRow[]>): SignItem {
  const variations = variationsBySignId.get(row.id)
  return {
    id: row.id,
    label: row.label,
    labelFil: row.label_fil ?? undefined,
    videoPath: row.video_url,
    imagePath: row.image_url ?? undefined,
    acceptedAnswers: row.accepted_answers,
    videoVariations: variations?.map((v) => ({ id: v.id, url: v.video_url, label: v.label })),
  }
}

async function getVariationsBySignId(supabase: SupabaseServerClient, signIds: string[]): Promise<Map<string, CustomSignVideoRow[]>> {
  const map = new Map<string, CustomSignVideoRow[]>()
  if (signIds.length === 0) return map

  const { data } = await supabase
    .from('custom_sign_videos')
    .select('id, sign_id, video_url, label')
    .in('sign_id', signIds)
    .order('order')

  for (const row of data ?? []) {
    const list = map.get(row.sign_id)
    if (list) list.push(row)
    else map.set(row.sign_id, [row])
  }
  return map
}

/**
 * One custom module's full tree (sub-modules + signs) — used by the
 * Learn/Activity/Quiz pages, which need every item to build their steps.
 * RLS on custom_modules/custom_submodules/custom_signs already scopes
 * this to modules the current user is allowed to see (assigned section
 * for a student, own modules for a teacher) — no extra filtering needed.
 */
export async function getCustomModuleTree(supabase: SupabaseServerClient, moduleId: string): Promise<Module | null> {
  const { data: mod } = await supabase
    .from('custom_modules')
    .select('id, title, description, icon, color, order')
    .eq('id', moduleId)
    .maybeSingle()
  if (!mod) return null

  const { data: submodules } = await supabase
    .from('custom_submodules')
    .select('id, title, short_title, order')
    .eq('module_id', moduleId)
    .order('order')

  const submoduleIds = (submodules ?? []).map((s) => s.id)
  const { data: signs } = submoduleIds.length > 0
    ? await supabase
        .from('custom_signs')
        .select('id, submodule_id, label, label_fil, video_url, image_url, accepted_answers, order')
        .in('submodule_id', submoduleIds)
        .order('order')
    : { data: [] }

  const variationsBySignId = await getVariationsBySignId(supabase, (signs ?? []).map((s) => s.id))

  const subModules: SubModule[] = (submodules ?? []).map((sm) => ({
    id: sm.id,
    moduleId: mod.id,
    title: sm.title,
    shortTitle: sm.short_title,
    items: (signs ?? []).filter((s) => s.submodule_id === sm.id).map((s) => mapSign(s, variationsBySignId)),
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

export interface CustomModuleSummary {
  id: string
  title: string
  icon: string
  subModules: { id: string; title: string }[]
}

/**
 * The custom modules assigned to one section — title/icon and sub-module
 * id/title only (no signs), for the teacher's per-section quiz toggle list.
 */
export async function getCustomModulesForSection(supabase: SupabaseServerClient, sectionId: string): Promise<CustomModuleSummary[]> {
  const { data: assignments } = await supabase
    .from('custom_module_sections')
    .select('module_id')
    .eq('section_id', sectionId)
  const moduleIds = (assignments ?? []).map((a) => a.module_id)
  if (moduleIds.length === 0) return []

  const [{ data: modules }, { data: submodules }] = await Promise.all([
    supabase.from('custom_modules').select('id, title, icon').in('id', moduleIds).order('order'),
    supabase.from('custom_submodules').select('id, module_id, title').in('module_id', moduleIds).order('order'),
  ])

  return (modules ?? []).map((mod) => ({
    id: mod.id,
    title: mod.title,
    icon: mod.icon,
    subModules: (submodules ?? [])
      .filter((sm) => sm.module_id === mod.id)
      .map((sm) => ({ id: sm.id, title: sm.title })),
  }))
}

/**
 * Every custom module visible to the current user, each with its full
 * sub-module/sign tree — used by the "Class" tab's module list.
 */
export async function getAssignedCustomModules(supabase: SupabaseServerClient): Promise<Module[]> {
  const { data: modules } = await supabase
    .from('custom_modules')
    .select('id, title, description, icon, color, order')
    .order('order')
  if (!modules || modules.length === 0) return []

  const moduleIds = modules.map((m) => m.id)
  const { data: submodules } = await supabase
    .from('custom_submodules')
    .select('id, module_id, title, short_title, order')
    .in('module_id', moduleIds)
    .order('order')

  const submoduleIds = (submodules ?? []).map((s) => s.id)
  const { data: signs } = submoduleIds.length > 0
    ? await supabase
        .from('custom_signs')
        .select('id, submodule_id, label, label_fil, video_url, image_url, accepted_answers, order')
        .in('submodule_id', submoduleIds)
        .order('order')
    : { data: [] }

  const variationsBySignId = await getVariationsBySignId(supabase, (signs ?? []).map((s) => s.id))

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
        items: (signs ?? []).filter((s) => s.submodule_id === sm.id).map((s) => mapSign(s, variationsBySignId)),
        activitySequence: DEFAULT_ACTIVITY_SEQUENCE,
      })),
  }))
}
