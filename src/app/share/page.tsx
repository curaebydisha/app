"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { supabase } from "@/lib/supabase"
import { Download, Share2, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

type PublicProduct = {
    id: string
    name: string
    image_url: string
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

    useEffect(() => {
        if (!id) return;

        async function load() {
            // Select ONLY public fields to ensure data safety
            const { data, error } = await supabase
                .from('products')
                .select('id, name, image_url, selling_price, notes, quantity, sizes')
                .eq('id', id)
                .single()

            if (data) {
                setProduct(data as PublicProduct)
            }
            setLoading(false)
        }
        load()
    }, [id])

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    if (!product) return <div className="min-h-screen flex items-center justify-center">Product not found</div>

    const downloadImage = async () => {
        try {
            const response = await fetch(product.image_url)
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
                <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                />
                <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-4 right-4 rounded-full bg-black/50 text-white hover:bg-black/70 border-none"
                    onClick={downloadImage}
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
