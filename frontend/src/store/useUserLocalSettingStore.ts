import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FontSize = 'sm' | 'base' | 'lg' | 'xl'
export type ContentWidth = 'normal' | 'wide' | 'full'

interface UserLocalSettingState {
  fontSize: FontSize
  contentWidth: ContentWidth
  setFontSize: (size: FontSize) => void
  setContentWidth: (width: ContentWidth) => void
}

export const useUserLocalSettingStore = create<UserLocalSettingState>()(
  persist(
    (set) => ({
      fontSize: 'base',
      contentWidth: 'normal',
      setFontSize: (fontSize) => set({ fontSize }),
      setContentWidth: (contentWidth) => set({ contentWidth }),
    }),
    {
      name: 'userLocalSetting', // 로컬 스토리지 저장 키 이름
    }
  )
)
