'use client'
import { useEffect, useRef } from 'react'
import { useSquadStore } from '@/store/useSquadStore'

interface OfficeViewerProps {
  squadName: string
}

export default function OfficeViewer({ squadName }: OfficeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<import('phaser').Game | null>(null)
  const state = useSquadStore(s => s.activeStates[squadName])

  useEffect(() => {
    if (!containerRef.current) return
    let game: import('phaser').Game | undefined

    void import('phaser').then(({ default: Phaser }) => {
      void import('@/components/office/phaser/OfficeScene').then(({ OfficeScene }) => {
        if (!containerRef.current) return
        game = new Phaser.Game({
          type: Phaser.AUTO,
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
          backgroundColor: '#1a1420',
          parent: containerRef.current,
          scene: [OfficeScene],
        })
        gameRef.current = game
      })
    })

    return () => { game?.destroy(true); gameRef.current = null }
  }, [])

  useEffect(() => {
    if (!gameRef.current || !state) return
    const scene = gameRef.current.scene.getScene('OfficeScene')
    scene?.events.emit('stateUpdate', state)
  }, [state])

  return <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />
}
