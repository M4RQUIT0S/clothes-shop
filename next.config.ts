import type { NextConfig } from 'next'

// Fotos que suben los vendedores desde el panel: bucket público «prendas» de Supabase Storage.
const garmentPhotos = new URL('/storage/v1/object/public/prendas/**', process.env.NEXT_PUBLIC_SUPABASE_URL)

const nextConfig: NextConfig = {
  images: {
    // ponytail: las fotos de stock de Unsplash siguen de marcador en las prendas sembradas.
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }, garmentPhotos],
    // Supabase local (`supabase start`) sirve las fotos desde 127.0.0.1; en producción es false.
    dangerouslyAllowLocalIP: ['127.0.0.1', 'localhost'].includes(garmentPhotos.hostname),
  },
}

export default nextConfig
