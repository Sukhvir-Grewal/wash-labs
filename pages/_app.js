import '@/styles/globals.css'
import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    AOS.init({ duration: 800, once: true }) // smooth animations
  }, [])

  return <Component {...pageProps} />
}
