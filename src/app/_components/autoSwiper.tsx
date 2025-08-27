"use client"
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"

export default function AutoSwiper({ className = "" }) {
  const slides = [
    { id: 1, image: "/images/teamPhotos/TMR1.JPG" },
    { id: 2, image: "/images/teamPhotos/TMR.JPG" },
    { id: 3, image: "/images/teamPhotos/Home.JPG" },
    { id: 4, image: "/images/teamPhotos/Home2.JPG" },
    { id: 5, image: "/images/teamPhotos/LARCFULL.JPG" },
    { id: 6, image: "/images/teamPhotos/VSSS_resize.jpg" },
    { id: 7, image: "/images/teamPhotos/LightWeight.JPG" },
    { id: 8, image: "/images/teamPhotos/Open.JPG" },
    { id: 9, image: "/images/teamPhotos/Maze.JPG" },
  ]

  const extendedSlides = [...slides, slides[0]]

  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setCurrentSlide((prev) => prev + 1)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (currentSlide === slides.length) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false)
        setCurrentSlide(0)
      }, 800) 

      return () => clearTimeout(timeout)
    }
  }, [currentSlide, slides.length])

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div className="relative w-full h-full">
        <motion.div
          className="flex w-full h-full"
          animate={{ x: `-${currentSlide * 100}%` }}
          transition={{
            duration: isTransitioning ? 0.8 : 0,
            ease: isTransitioning ? [0.4, 0, 0.2, 1] : "linear",
          }}
        >
          {extendedSlides.map((slide, index) =>
            slide ? (
              <div key={`${slide.id}-${index}`} className="min-w-full h-full relative">
                <img
                  src={slide.image}
                  alt={`Slide ${slide.id}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
            ) : null
          )}
        </motion.div>
      </div>
    </div>
  )
}