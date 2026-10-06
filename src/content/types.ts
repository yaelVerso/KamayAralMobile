export type ActivityType =
  | 'lesson-card'
  | 'sign-to-picture'
  | 'drag-drop-match'
  | 'spelling'

export interface SignItem {
  id: string
  /** Primary display label (e.g. "A", "Hello") */
  label: string
  /** Filipino label if different from label */
  labelFil?: string
  /** The sign's video URL — a YouTube embed URL for admin/custom content. */
  videoPath: string
  /** Optional image URL */
  imagePath?: string
  /**
   * All accepted correct answers for spelling activity.
   * Include English, Filipino, and common variants.
   * Matching is case-insensitive and trims whitespace.
   */
  acceptedAnswers: string[]
  /**
   * Extra video variations beyond the primary videoPath (e.g. a different
   * signer or regional variant) — currently only populated for custom
   * (teacher-authored) content. Learn mode shows a picker when non-empty;
   * Activity/Quiz always use videoPath regardless.
   */
  videoVariations?: { id: string; url: string; label: string | null }[]
}

export interface SubModule {
  id: string
  moduleId: string
  /** Display title, e.g. "A to G" */
  title: string
  /** Short label for nav, e.g. "A–G" */
  shortTitle: string
  items: SignItem[]
  /**
   * Order of activity types in Activity Mode.
   * Quiz Mode uses the same types minus 'lesson-card'.
   */
  activitySequence: ActivityType[]
}

export interface Module {
  id: string
  order: number
  title: string
  description: string
  /** Emoji or icon name for the module card */
  icon: string
  subModules: SubModule[]
  color: string
}
