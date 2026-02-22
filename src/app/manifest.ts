import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Curae Sourcing App',
        short_name: 'Curae',
        description: 'Streamlined product sourcing for Curae',
        start_url: '/app/',
        display: 'standalone',
        background_color: '#1a202c',
        theme_color: '#d4af37',
        icons: [
            {
                src: '/app/icon.png',
                sizes: 'any',
                type: 'image/png',
            },
        ],
    }
}
