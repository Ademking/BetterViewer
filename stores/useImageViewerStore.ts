import { create } from "zustand";

interface ImageViewerState {
  persistedImageUrl: string | null;
  isEditorOpen: boolean;
  isCropperOpen: boolean;
  isColorPickerOpen: boolean;
  isAboutOpen: boolean;
  isTldrawOpen: boolean;
  isHotKeysEnabled: boolean;
  setPersistedImageUrl: (url: string | null) => void;
  setIsEditorOpen: (isOpen: boolean) => void;
  setIsCropperOpen: (isOpen: boolean) => void;
  setIsColorPickerOpen: (isOpen: boolean) => void;
  setIsAboutOpen: (isOpen: boolean) => void;
  setIsTldrawOpen: (isOpen: boolean) => void;
  setIsHotKeysEnabled: (isEnabled: boolean) => void;
}

const useImageViewerStore = create<ImageViewerState>((set) => ({
  persistedImageUrl: null,
  isEditorOpen: false,
  isCropperOpen: false,
  isColorPickerOpen: false,
  isAboutOpen: false,
  isTldrawOpen: false,
  isHotKeysEnabled: true,
  setPersistedImageUrl: (url) => set({ persistedImageUrl: url }),
  setIsEditorOpen: (isOpen) => set({ isEditorOpen: isOpen }),
  setIsCropperOpen: (isOpen) => set({ isCropperOpen: isOpen }),
  setIsColorPickerOpen: (isOpen) => set({ isColorPickerOpen: isOpen }),
  setIsAboutOpen: (isOpen) => set({ isAboutOpen: isOpen }),
  setIsTldrawOpen: (isOpen) => set({ isTldrawOpen: isOpen }),
  setIsHotKeysEnabled: (isEnabled) => set({ isHotKeysEnabled: isEnabled }),
}));

export default useImageViewerStore;
