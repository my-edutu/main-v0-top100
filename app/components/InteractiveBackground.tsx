"use client"

import type React from "react"
import { useEffect, useRef } from "react"

const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) return

    const context = canvasElement.getContext("2d")
    if (!context) return

    let animationFrameId: number
    let mouseX = 0
    let mouseY = 0

    const particles: Particle[] = []
    const particleCount = 100

    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string

      constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly context: CanvasRenderingContext2D,
      ) {
        this.x = Math.random() * this.canvas.width
        this.y = Math.random() * this.canvas.height
        this.size = Math.random() * 5 + 1
        this.speedX = Math.random() * 3 - 1.5
        this.speedY = Math.random() * 3 - 1.5
        this.color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 255, 0.7)`
      }

      update() {
        this.x += this.speedX + (mouseX - this.canvas.width / 2) * 0.01
        this.y += this.speedY + (mouseY - this.canvas.height / 2) * 0.01

        if (this.x < 0 || this.x > this.canvas.width) this.speedX *= -1
        if (this.y < 0 || this.y > this.canvas.height) this.speedY *= -1
      }

      draw() {
        this.context.fillStyle = this.color
        this.context.beginPath()
        this.context.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        this.context.fill()
      }
    }

    const init = () => {
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(canvasElement, context))
      }
    }

    const animate = () => {
      context.clearRect(0, 0, canvasElement.width, canvasElement.height)
      for (const particle of particles) {
        particle.update()
        particle.draw()
      }
      animationFrameId = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      canvasElement.width = window.innerWidth
      canvasElement.height = window.innerHeight
    }

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX
      mouseY = event.clientY
    }

    handleResize()
    init()
    animate()

    window.addEventListener("resize", handleResize)
    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />
}

export default InteractiveBackground