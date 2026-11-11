'use client'

import { useState } from 'react'
import { copyText } from '@/lib/clipboard'

/** Copies text and reports `copied` for 2 s as confirmation – stays false if copying failed. */
export function useCopy(): [copied: boolean, copy: (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false)
  const copy = async (text: string) => {
    if (!(await copyText(text))) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return [copied, copy]
}
