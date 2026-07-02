import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FontSize = 'sm' | 'base' | 'lg' | 'xl'
export type ContentWidth = 'normal' | 'wide' | 'full'
export type ThemeMode = 'light' | 'dark'

interface UserLocalSettingState {
  fontSize: FontSize
  contentWidth: ContentWidth
  theme: ThemeMode
  setFontSize: (size: FontSize) => void
  setContentWidth: (width: ContentWidth) => void
  setTheme: (theme: ThemeMode) => void
}

export const useUserLocalSettingStore = create<UserLocalSettingState>()(
  persist(
    (set) => ({
      fontSize: 'base',
      contentWidth: 'normal',
      theme: 'light',
      setFontSize: (fontSize) => set({ fontSize }),
      setContentWidth: (contentWidth) => set({ contentWidth }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'userLocalSetting', // 로컬 스토리지 저장 키 이름
    }
  )
)
