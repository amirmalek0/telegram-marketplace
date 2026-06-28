import { useMemo } from 'react'
import { retrieveLaunchParams } from '@telegram-apps/sdk'

export interface TelegramUser {
  id: number
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  languageCode?: string
}

export interface UseTelegramAuthResult {
  user: TelegramUser | null
  initDataRaw: string | null
  isAvailable: boolean
}

export function useTelegramAuth(): UseTelegramAuthResult {
  return useMemo(() => {
    try {
      const launchParams = retrieveLaunchParams()
      
      if (!launchParams.initData) {
        return { user: null, initDataRaw: null, isAvailable: false }
      }

      const { initData, initDataRaw } = launchParams
      const telegramUser = initData.user

      if (!telegramUser) {
        return { user: null, initDataRaw: initDataRaw || null, isAvailable: true }
      }

      const user: TelegramUser = {
        id: telegramUser.id,
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName,
        username: telegramUser.username,
        photoUrl: telegramUser.photoUrl,
        languageCode: telegramUser.languageCode,
      }

      return { user, initDataRaw: initDataRaw || null, isAvailable: true }
    } catch {
      return { user: null, initDataRaw: null, isAvailable: false }
    }
  }, [])
}
