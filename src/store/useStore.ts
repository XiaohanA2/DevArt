import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { StyleParams } from '@/lib/style-system'

// 资产类型定义
export interface Asset {
  id: string
  imageUrl: string
  prompt: string
  userPrompt: string     // 用户原始输入
  timestamp: number
  isProcessing?: boolean // 是否正在处理（去背景等）
  transparentUrl?: string // 去背景后的图片URL
  position?: { x: number; y: number } // 画布上的位置
  seed?: number           // 生成使用的 seed（用于重新生成）
  styleParams?: StyleParams // 使用的风格参数（用于锁定风格）
}

// 聊天消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  assets?: string[] // 关联的资产ID
}

// 风格状态 - 使用结构化的 StyleParams
export interface StyleContext {
  isLocked: boolean
  params?: StyleParams      // 锁定的风格参数
  description: string       // 中文描述
  promptFragment: string    // 用于注入的英文 prompt 片段
  lockedFromAssetId?: string // 从哪个资产锁定的
  baseSeed?: number         // 基础种子（用于保持一致性）
}

// 画布视口状态
export interface CanvasViewport {
  x: number
  y: number
  scale: number
}

interface DevArtState {
  // 资产列表
  assets: Asset[]
  addAsset: (asset: Asset) => void
  removeAsset: (id: string) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  clearAssets: () => void
  
  // 选中的资产
  selectedAssetIds: string[]
  selectAsset: (id: string) => void
  deselectAsset: (id: string) => void
  toggleAssetSelection: (id: string) => void
  clearSelection: () => void
  
  // 聊天消息
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  
  // 风格锁定 - 新的结构化版本
  styleContext: StyleContext
  lockStyle: (params: StyleParams, description: string, promptFragment: string, assetId?: string, baseSeed?: number) => void
  unlockStyle: () => void
  
  // 画布背景模式 (dark/light)
  canvasBackground: 'dark' | 'light' | 'grid'
  setCanvasBackground: (mode: 'dark' | 'light' | 'grid') => void
  
  // 画布视口
  canvasViewport: CanvasViewport
  setCanvasViewport: (viewport: Partial<CanvasViewport>) => void
  resetCanvasViewport: () => void
  
  // 生成状态
  isGenerating: boolean
  setIsGenerating: (val: boolean) => void
}

const defaultViewport: CanvasViewport = {
  x: 0,
  y: 0,
  scale: 1
}

export const useStore = create<DevArtState>()(
  persist(
    (set) => ({
      // 资产管理
      assets: [],
      addAsset: (asset) => set((state) => {
        // 如果资产已经指定了位置，直接使用；否则基于当前资产数量计算默认位置
        const newAsset = {
          ...asset,
          position: asset.position || {
            x: 100 + (state.assets.length % 4) * 240,
            y: 100 + Math.floor(state.assets.length / 4) * 240
          }
        }
        console.log('Adding asset:', newAsset.id, 'at position:', newAsset.position)
        return { assets: [newAsset, ...state.assets] }
      }),
      removeAsset: (id) => set((state) => ({ 
        assets: state.assets.filter(a => a.id !== id),
        selectedAssetIds: state.selectedAssetIds.filter(sid => sid !== id)
      })),
      updateAsset: (id, updates) => set((state) => ({
        assets: state.assets.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      clearAssets: () => set({ assets: [], selectedAssetIds: [] }),
      
      // 选中管理
      selectedAssetIds: [],
      selectAsset: (id) => set((state) => ({
        selectedAssetIds: [...new Set([...state.selectedAssetIds, id])]
      })),
      deselectAsset: (id) => set((state) => ({
        selectedAssetIds: state.selectedAssetIds.filter(sid => sid !== id)
      })),
      toggleAssetSelection: (id) => set((state) => ({
        selectedAssetIds: state.selectedAssetIds.includes(id)
          ? state.selectedAssetIds.filter(sid => sid !== id)
          : [...state.selectedAssetIds, id]
      })),
      clearSelection: () => set({ selectedAssetIds: [] }),
      
      // 聊天消息
      messages: [],
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
      })),
      clearMessages: () => set({ messages: [] }),
      
      // 风格锁定 - 新版本使用结构化参数
      styleContext: {
        isLocked: false,
        description: '',
        promptFragment: ''
      },
      lockStyle: (params, description, promptFragment, assetId, baseSeed) => set({
        styleContext: {
          isLocked: true,
          params,
          description,
          promptFragment,
          lockedFromAssetId: assetId,
          baseSeed
        }
      }),
      unlockStyle: () => set({
        styleContext: {
          isLocked: false,
          params: undefined,
          description: '',
          promptFragment: ''
        }
      }),
      
      // 画布背景
      canvasBackground: 'grid',
      setCanvasBackground: (mode) => set({ canvasBackground: mode }),
      
      // 画布视口
      canvasViewport: defaultViewport,
      setCanvasViewport: (viewport) => set((state) => ({
        canvasViewport: { ...state.canvasViewport, ...viewport }
      })),
      resetCanvasViewport: () => set({ canvasViewport: defaultViewport }),
      
      // 生成状态
      isGenerating: false,
      setIsGenerating: (val) => set({ isGenerating: val })
    }),
    {
      name: 'devart-storage',
      // 只持久化部分状态
      partialize: (state) => ({
        assets: state.assets,
        messages: state.messages,
        styleContext: state.styleContext,
        canvasBackground: state.canvasBackground,
        canvasViewport: state.canvasViewport
      })
    }
  )
)
