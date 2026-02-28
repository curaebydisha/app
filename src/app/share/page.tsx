"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { supabase } from "@/lib/supabase"
import { Download, Share2, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

type PublicProduct = {
    id: string
    name: string
    image_url: string // retained for backwards safety
    images: string[]
    selling_price: number | null
    notes: string | null
    quantity: number
    sizes: string | null
    store_name: string // Some users might want this, but user asked to hide "buy price". Store Name might be okay? User said "from app which opens entire product listing...". I'll include it but can hide if requested. Actually, often dropshippers want to hide the source. I'll OMIT store_name for now to be safe.
    // actually, I'll fetch it but not display it prominent unless needed.
    // Update: User said "nicer share with ... name, color, price, misc details".
}

function ShareContent() {
    const searchParams = useSearchParams()
    const id = searchParams.get('id')
    const [product, setProduct] = useState<PublicProduct | null>(null)
    const [loading, setLoading] = useState(true)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    useEffect(() => {
        let currentId = id;

        // Fallback to native window.location.search if Next.js router drops it during static export hydration
        if (!currentId && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            currentId = params.get('id');
        }

        if (!currentId) {
            setLoading(false)
            return;
        }

        async function load() {
            try {
                // Select ONLY public fields to ensure data safety
                const { data, error } = await supabase
                    .from('products')
                    .select('id, name, image_url, selling_price, notes, quantity, sizes')
                    .eq('id', currentId)
                    .single()

                if (data) {
                    let parsedImages: string[] = []
                    try {
                        parsedImages = JSON.parse(data.image_url)
                        if (!Array.isArray(parsedImages)) {
                            parsedImages = data.image_url ? [data.image_url] : []
                        }
                    } catch {
                        parsedImages = data.image_url ? [data.image_url] : []
                    }

                    setProduct({
                        ...data,
                        images: parsedImages.length > 0 ? parsedImages : (data.image_url ? [data.image_url] : [])
                    } as PublicProduct)
                } else if (error) {
                    console.error("Supabase fetch error:", error)
                }
            } catch (err) {
                console.error("Unexpected error:", err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

    if (loading) return <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4"><div className="w-8 h-8 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-muted-foreground animate-pulse">Loading Product...</p></div>
    if (!product) return <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">Product not found or unavailable.</div>

    const downloadImage = async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `product-${product.name.replace(/\s+/g, '-').toLowerCase()}.jpg`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error downloading image:', error)
        }
    }

    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

    return (
        <div className="min-h-screen bg-background font-[family-name:var(--font-geist-sans)] pb-10">
            {/* Image Section */}
            <div className="relative w-full aspect-[4/5] bg-muted">
                <div className="w-full h-full overflow-x-auto snap-x snap-mandatory flex scrollbar-hide">
                    {product.images.map((img, idx) => (
                        <div key={idx} className="min-w-full h-full snap-center relative">
                            <img
                                src={img}
                                alt={`${product.name} ${idx + 1}`}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    ))}
                </div>

                {product.images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {product.images.map((_, idx) => (
                            <div key={idx} className="h-1.5 w-1.5 rounded-full bg-white/80 shadow-sm"></div>
                        ))}
                    </div>
                )}

                <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-4 right-4 rounded-full bg-black/50 text-white hover:bg-black/70 border-none z-10"
                    onClick={() => downloadImage(product.images[0])}
                >
                    <Download className="h-5 w-5" />
                </Button>
            </div>

            {/* Details Section */}
            <div className="p-6 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">{product.name}</h1>
                        {product.sizes && (
                            <div className="text-sm text-muted-foreground">Size: {product.sizes}</div>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-green-700">
                            {/* If selling_price is 0 or null, we might show 'Price on Request' or just 0? 
                                Assuming it's set as per previous features. */}
                            ₹{product.selling_price || 0}
                        </div>
                        {product.quantity > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                                {product.quantity} Available
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes/Description */}
                {product.notes && (
                    <div className="bg-muted/30 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2 text-sm">Description</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {product.notes}
                        </p>
                    </div>
                )}

                {/* Share Button (Contextual) */}
                <Button
                    className="w-full gap-2 bg-[#d4af37] hover:bg-[#b5952f] text-black mt-4"
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: product.name,
                                text: `Check out ${product.name} for ₹${product.selling_price || 0}`,
                                url: shareUrl
                            })
                        } else {
                            // Fallback copy to clipboard
                            navigator.clipboard.writeText(shareUrl)
                            alert("Link copied to clipboard!")
                        }
                    }}
                >
                    <Share2 className="h-4 w-4" /> Share Product
                </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground mt-8 opacity-50">
                Shared via Curae
            </div>
        </div>
    )
}

export default function SharePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ShareContent />
        </Suspense>
    )
}
