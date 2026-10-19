import type { ReactNode } from 'react'

export interface SectionBundle { slots: Record<string, ReactNode>; status?: ReactNode; chrome?: ReactNode }
export type SectionRenderer = (bundle: SectionBundle) => ReactNode
export interface SectionSourceProps { sectionRenderer?: SectionRenderer }

// Pages retain their original standalone rendering while also exposing reusable slots.
export function renderSectionStatus(renderer: SectionRenderer | undefined, status: ReactNode) {
  return renderer ? renderer({ slots: {}, status }) : status
}
