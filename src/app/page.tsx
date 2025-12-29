'use client'

import { useEffect, useState } from 'react'
import { InfiniteCanvas } from '@/components/InfiniteCanvas'
import { AgentSidebar } from '@/components/AgentSidebar'

export default function Home() {
  // 处理 hydration 问题（因为使用了 localStorage persist）
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return (
      <main className="h-screen w-screen flex overflow-hidden bg-[#0a0a12]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white/30 text-sm">加载中...</div>
        </div>
      </main>
    )
  }
  
  return (
    <main className="h-screen w-screen flex overflow-hidden bg-[#0a0a12]">
      {/* 左侧: 无限画布 */}
      <InfiniteCanvas />
      
      {/* 右侧: 智能控制台 */}
      <AgentSidebar />
    </main>
  )
}
