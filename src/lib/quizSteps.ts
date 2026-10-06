import type { ActivityType, SignItem, SubModule } from '@/content/types'
import { shuffle } from '@/lib/shuffle'

export interface QuizStep {
  type: ActivityType
  item: SignItem
  groupItems?: SignItem[]
  distractors?: SignItem[]
  occurrence?: number
  groupOccurrences?: number[]
}

const QUIZ_SIGN_TO_PICTURE_COUNT = 5
const QUIZ_SPELLING_COUNT = 4
const QUIZ_DRAG_DROP_GROUP_COUNT = 2

export function getQuizQuestionCount(submodule: SubModule): number {
  const hasDragDrop = submodule.activitySequence.includes('drag-drop-match') && submodule.items.length >= 3
  return QUIZ_SIGN_TO_PICTURE_COUNT + QUIZ_SPELLING_COUNT + (hasDragDrop ? QUIZ_DRAG_DROP_GROUP_COUNT : 0)
}

export function stepPoints(step: QuizStep): number {
  if (step.type === 'lesson-card') return 0
  if (step.type === 'drag-drop-match') return step.groupItems?.length ?? 3
  return 1
}

// cycles through pool in order instead of random draw, so every student gets
// the same items for a submodule — keeps section-wide data comparable
function pickItemsCoveringAll(pool: SignItem[], count: number): SignItem[] {
  if (pool.length === 0) return []
  return Array.from({ length: count }, (_, i) => pool[i % pool.length])
}

// fixed quiz shape: 5 sign-to-picture, 4 spelling, 2 drag-drop-match groups.
// Only presentation (question order, distractors, layout) is randomized per
// attempt — occurrence numbers are assigned before that shuffle, from the
// deterministic pool composition, to distinguish legitimate repeat items.
export function buildQuizSteps(submodule: SubModule): QuizStep[] {
  const hasDragDrop = submodule.activitySequence.includes('drag-drop-match')
  const steps: QuizStep[] = []
  const occurrenceCounters = new Map<string, number>()
  function nextOccurrence(type: string, itemId: string): number {
    const key = `${type}::${itemId}`
    const n = occurrenceCounters.get(key) ?? 0
    occurrenceCounters.set(key, n + 1)
    return n
  }

  const identificationPool = pickItemsCoveringAll(submodule.items, QUIZ_SIGN_TO_PICTURE_COUNT + QUIZ_SPELLING_COUNT)
  const signToPictureTuples = identificationPool
    .slice(0, QUIZ_SIGN_TO_PICTURE_COUNT)
    .map((item) => ({ item, occurrence: nextOccurrence('sign-to-picture', item.id) }))
  const spellingTuples = identificationPool
    .slice(QUIZ_SIGN_TO_PICTURE_COUNT)
    .map((item) => ({ item, occurrence: nextOccurrence('spelling', item.id) }))

  for (const { item, occurrence } of shuffle(signToPictureTuples)) {
    const distractors = shuffle(submodule.items.filter((it) => it.id !== item.id))
    steps.push({ type: 'sign-to-picture', item, distractors, occurrence })
  }

  for (const { item, occurrence } of shuffle(spellingTuples)) {
    steps.push({ type: 'spelling', item, occurrence })
  }

  if (hasDragDrop && submodule.items.length >= 3) {
    const dragDropPool = pickItemsCoveringAll(submodule.items, QUIZ_DRAG_DROP_GROUP_COUNT * 3)
    for (let g = 0; g < QUIZ_DRAG_DROP_GROUP_COUNT; g++) {
      const group = dragDropPool.slice(g * 3, g * 3 + 3)
      const groupOccurrences = group.map((it) => nextOccurrence('drag-drop-match', it.id))
      steps.push({ type: 'drag-drop-match', item: group[0], groupItems: group, groupOccurrences })
    }
  }

  return steps
}
