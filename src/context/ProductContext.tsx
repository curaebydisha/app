"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export type Product = {
    id: string
    image: string // Kept for backwards compatibility / primary image
    images: string[] // New array for multiple images
    price: string
    currency: string
    priceInr: string
    exchangeRate: number
    storeName: string
    sellerMobile?: string
    quantity: number
    sizes?: string
    sellingPrice?: string
    location?: {
        lat: number
        lng: number
        address?: string
    }
    name: string
    notes: string
    timestamp: number
}

type ProductContextType = {
    products: Product[]
    loading: boolean
    addProduct: (product: Omit<Product, "id" | "timestamp">) => Promise<void>
    updateProduct: (id: string, updates: Partial<Product>) => Promise<void>
    deleteProduct: (id: string) => Promise<void>
    clearPendingUploads: () => void
}

const ProductContext = createContext<ProductContextType | undefined>(undefined)

export function ProductProvider({ children }: { children: React.ReactNode }) {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [pendingUploads, setPendingUploads] = useState<Omit<Product, "id" | "timestamp">[]>([])
    const [isOnline, setIsOnline] = useState(true)

    // Load pending from local storage on mount
    useEffect(() => {
        setIsOnline(navigator.onLine)
        const saved = localStorage.getItem("pending_uploads")
        if (saved) {
            setPendingUploads(JSON.parse(saved))
        }

        const handleOnline = () => {
            setIsOnline(true)
            syncPendingUploads()
        }
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Fetch products on mount
    useEffect(() => {
        fetchProducts()
    }, [])

    const syncPendingUploads = async () => {
        const pending = JSON.parse(localStorage.getItem("pending_uploads") || "[]") as Omit<Product, "id" | "timestamp">[]
        if (pending.length === 0) return

        console.log("Syncing pending items...", pending.length)

        const remaining: typeof pending = []

        for (const item of pending) {
            try {
                // Try to upload
                await addProductToSupabase(item)
            } catch (e) {
                console.error("Sync failed for item", item.name, e)
                remaining.push(item) // Keep it if it fails
            }
        }

        setPendingUploads(remaining)
        localStorage.setItem("pending_uploads", JSON.stringify(remaining))
        fetchProducts() // Refresh to get real IDs
    }

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            if (data) {
                // Map DB columns to our frontend type
                const mapped: Product[] = data.map(item => {
                    let parsedImages: string[] = []
                    try {
                        if (item.image_url) {
                            parsedImages = JSON.parse(item.image_url)
                            if (!Array.isArray(parsedImages)) {
                                parsedImages = [item.image_url]
                            }
                        }
                    } catch {
                        parsedImages = item.image_url ? [item.image_url] : []
                    }

                    return {
                        id: item.id,
                        image: parsedImages.length > 0 ? parsedImages[0] : item.image_url, // First image as primary
                        images: parsedImages,
                        price: item.price?.toString() || "",
                        currency: item.currency,
                        priceInr: item.price_inr?.toString() || "",
                        exchangeRate: item.currency === "THB" ? 3.0 : (item.exchange_rate || 1.0),
                        storeName: item.store_name || "Unknown Store",
                        sellerMobile: item.seller_mobile,
                        quantity: item.quantity ?? 1,
                        sizes: item.sizes,
                        sellingPrice: item.selling_price?.toString() || "",
                        location: item.location,
                        name: item.name,
                        notes: item.notes,
                        timestamp: new Date(item.created_at).getTime()
                    }
                })

                // Merge with pending uploads for display (give them temp IDs)
                let pending = []
                try {
                    const raw = localStorage.getItem("pending_uploads")
                    if (raw) pending = JSON.parse(raw)
                } catch {
                    localStorage.removeItem("pending_uploads")
                }
                const pendingMapped: Product[] = pending.map((p: any, i: number) => ({
                    ...p,
                    id: `temp-${Date.now()}-${i}`,
                    timestamp: Date.now()
                }))

                setProducts([...pendingMapped, ...mapped])
            }
        } catch (e: any) {
            console.error("Error fetching products:", e)
            alert("Fetch failed: " + (e.message || String(e)))
        } finally {
            setLoading(false)
        }
    }

    const uploadImage = async (base64Image: string): Promise<string | null> => {
        try {
            if (!base64Image || !base64Image.startsWith('data:image')) return base64Image // Already a URL?

            // Convert base64 to Blob
            const res = await fetch(base64Image)
            const blob = await res.blob()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${blob.type.split('/')[1]}`

            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(fileName, blob)

            if (error) throw error

            const { data: publicUrlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName)

            return publicUrlData.publicUrl
        } catch (e) {
            console.error("Upload failed", e)
            throw e // Rethrow to handle in caller
        }
    }

    const uploadImages = async (images: string[]): Promise<string[]> => {
        const uploadedUrls: string[] = []
        for (const img of images) {
            if (!img || !img.startsWith('data:image')) {
                uploadedUrls.push(img) // Already a URL
                continue
            }
            try {
                const url = await uploadImage(img)
                if (url) uploadedUrls.push(url)
            } catch (e) {
                console.error("Failed to upload an image", e)
            }
        }
        return uploadedUrls
    }

    const addProductToSupabase = async (product: Omit<Product, "id" | "timestamp">) => {
        let finalImages: string[] = []

        // Handle migration case where old code might pass `image` but not `images`
        const imagesToUpload = product.images?.length > 0 ? product.images : (product.image ? [product.image] : [])
        finalImages = await uploadImages(imagesToUpload)

        const mainImageUrl = finalImages.length > 0 ? finalImages[0] : ""
        const stringifiedImages = JSON.stringify(finalImages)

        const row = {
            name: product.name,
            price: parseFloat(product.price),
            currency: product.currency,
            price_inr: parseFloat(product.priceInr),
            exchange_rate: product.exchangeRate,
            store_name: product.storeName,
            seller_mobile: product.sellerMobile,
            quantity: product.quantity,
            sizes: product.sizes,
            selling_price: parseFloat(product.sellingPrice || "0"),
            notes: product.notes,
            image_url: stringifiedImages, // Save as JSON array for new implementation
            location: product.location,
        }

        const { data, error } = await supabase.from('products').insert(row).select().single()
        if (error) throw error
    }

    const addProduct = async (product: Omit<Product, "id" | "timestamp">) => {
        // Optimistically add to UI immediately
        const tempProduct: Product = {
            ...product,
            id: `temp-${Date.now()}`,
            timestamp: Date.now()
        }
        setProducts(prev => [tempProduct, ...prev])

        if (!navigator.onLine) {
            // Offline: Save to Pending
            console.log("Offline: Queueing product")
            const newPending = [...pendingUploads, product]
            setPendingUploads(newPending)
            localStorage.setItem("pending_uploads", JSON.stringify(newPending))
            return
        }

        try {
            await addProductToSupabase(product)
            fetchProducts() // Refresh to get real ID
        } catch (e) {
            console.error("Online add failed, falling back to offline queue", e)
            // Even if online, if upload fails, queue it
            const newPending = [...pendingUploads, product]
            setPendingUploads(newPending)
            localStorage.setItem("pending_uploads", JSON.stringify(newPending))
        }
    }

    const updateProduct = async (id: string, updates: Partial<Product>) => {
        try {
            if (id.startsWith('temp-')) {
                // Updating a pending item? TODO: Update in localStorage too.
                // For now, simple MVP: Update local state.
                setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
                return
            }

            const row: any = {}

            // Map valid DB columns
            if (updates.name !== undefined) row.name = updates.name
            if (updates.price !== undefined) row.price = parseFloat(updates.price)
            if (updates.currency !== undefined) row.currency = updates.currency
            if (updates.priceInr !== undefined) row.price_inr = parseFloat(updates.priceInr)
            if (updates.exchangeRate !== undefined) row.exchange_rate = updates.exchangeRate
            if (updates.storeName !== undefined) row.store_name = updates.storeName
            if (updates.sellerMobile !== undefined) row.seller_mobile = updates.sellerMobile
            if (updates.quantity !== undefined) row.quantity = updates.quantity
            if (updates.sizes !== undefined) row.sizes = updates.sizes
            if (updates.sellingPrice !== undefined) row.selling_price = parseFloat(updates.sellingPrice)
            if (updates.notes !== undefined) row.notes = updates.notes
            if (updates.location !== undefined) row.location = updates.location
            // Upload new images if they are base64
            if (updates.images !== undefined) {
                const editedImages = await uploadImages(updates.images)
                row.image_url = JSON.stringify(editedImages)
            } else if (updates.image !== undefined) {
                // Fallback for old single image update if it ever happens
                row.image_url = JSON.stringify([updates.image])
            }

            console.log("Updating product in Supabase:", id, row)

            const { error, data } = await supabase.from('products').update(row).eq('id', id).select()
            if (error) {
                console.error("Supabase update error:", error)
                throw error
            }

            console.log("Supabase update success:", data)

            setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
        } catch (e) {
            console.error("Error updating", e)
        }
    }

    const deleteProduct = async (id: string) => {
        try {
            if (id.startsWith('temp-')) {
                setProducts(prev => prev.filter(p => p.id !== id))
                // Remove from pending storage
                // This is tricky because we need to know WHICH pending item it corresponds to.
                // For MVP, deleting pending items might be limited or we clear the whole queue.
                // Let's defer "Delete Pending" logic or just allow it in memory.
                return
            }

            const { error } = await supabase.from('products').delete().eq('id', id)
            if (error) throw error
            setProducts(prev => prev.filter(p => p.id !== id))
        } catch (e) {
            console.error("Error deleting", e)
        }
    }

    const clearPendingUploads = () => {
        setPendingUploads([])
        localStorage.removeItem("pending_uploads")
    }

    return (
        <ProductContext.Provider value={{ products, loading, addProduct, updateProduct, deleteProduct, clearPendingUploads }}>
            {children}
            {!isOnline && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full shadow-md z-[60]">
                    Offline Mode • {pendingUploads.length} Pending
                </div>
            )}
            {isOnline && pendingUploads.length > 0 && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full shadow-md z-[60] flex items-center gap-2">
                    <span>Syncing {pendingUploads.length} items...</span>
                    {pendingUploads.length > 0 && (
                        <button
                            onClick={clearPendingUploads}
                            className="text-blue-900 font-bold hover:underline"
                        >
                            x
                        </button>
                    )}
                </div>
            )}
        </ProductContext.Provider>
    )
}

export function useProducts() {
    const context = useContext(ProductContext)
    if (context === undefined) {
        throw new Error("useProducts must be used within a ProductProvider")
    }
    return context
}
