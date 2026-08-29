import { create } from "zustand"

export type AppTab = "present" | "growth" | "review"

interface AppUiState {
  activeTab: AppTab
  isChatOpen: boolean
  isProfileOpen: boolean
  isOnboardingOpen: boolean
  isLoginOpen: boolean
  setActiveTab: (tab: AppTab) => void
  setIsChatOpen: (isOpen: boolean) => void
  setIsProfileOpen: (isOpen: boolean) => void
  setIsOnboardingOpen: (isOpen: boolean) => void
  setIsLoginOpen: (isOpen: boolean) => void
}

export const useAppUiStore = create<AppUiState>((set) => ({
  activeTab: "present",
  isChatOpen: false,
  isProfileOpen: false,
  isOnboardingOpen: false,
  isLoginOpen: false,
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsChatOpen: (isChatOpen) => set({ isChatOpen }),
  setIsProfileOpen: (isProfileOpen) => set({ isProfileOpen }),
  setIsOnboardingOpen: (isOnboardingOpen) => set({ isOnboardingOpen }),
  setIsLoginOpen: (isLoginOpen) => set({ isLoginOpen }),
}))
