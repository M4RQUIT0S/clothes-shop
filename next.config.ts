import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // ponytail: fotos de stock de Unsplash como marcador. Cuando lleguen las
    // fotos definitivas, súbelas a Supabase Storage y cambia este patrón.
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
}

export default nextConfig
