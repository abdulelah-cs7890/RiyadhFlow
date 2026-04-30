'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'riyadhFlowOnboarded'

export interface UseOnboardingResult {
  isOpen: boolean;
  stepIndex: number;
  next: () => void;
  skip: () => void;
  totalSteps: number;
}

export function useOnboarding(totalSteps: number): UseOnboardingResult {
  const [isOpen, setIsOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (!seen) {
        // Defer one tick so the DOM has anchors data-onboarding attributes mounted.
        const t = setTimeout(() => setIsOpen(true), 600)
        return () => clearTimeout(t)
      }
    } catch { /* private mode / disabled storage */ }
  }, [])

  const complete = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* */ }
    setIsOpen(false)
    setStepIndex(0)
  }, [])

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= totalSteps) {
        complete()
        return 0
      }
      return i + 1
    })
  }, [totalSteps, complete])

  const skip = useCallback(() => {
    complete()
  }, [complete])

  return { isOpen, stepIndex, next, skip, totalSteps }
}
