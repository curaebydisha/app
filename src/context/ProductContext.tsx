"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export type Product = {
    id: string
    image: string
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
}

const ProductContext = createContext<ProductContextType | undefined>(undefined)

export function ProductProvider({ children }: { children: React.ReactNode }) {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch products on mount
    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            if (data) {
                // Map DB columns to our frontend type
                const mapped: Product[] = data.map(item => ({
                    id: item.id,
                    image: item.image_url, // Map image_url to image
                    price: item.price?.toString() || "",
                    currency: item.currency,
                    priceInr: item.price_inr?.toString() || "",
                    exchangeRate: item.exchange_rate,
                    storeName: item.store_name,
                    sellerMobile: item.seller_mobile,
                    quantity: item.quantity || 1,
                    sizes: item.sizes,
                    sellingPrice: item.selling_price?.toString() || "",
                    location: item.location,
                    name: item.name,
                    notes: item.notes,
                    timestamp: new Date(item.created_at).getTime()
                }))
                setProducts(mapped)
            }
        } catch (e) {
            console.error("Error fetching products:", e)
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
            return null
        }
    }

    const addProduct = async (product: Omit<Product, "id" | "timestamp">) => {
        try {
            const imageUrl = await uploadImage(product.image)

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
                image_url: imageUrl || "",
                location: product.location,
            }

            const { data, error } = await supabase.from('products').insert(row).select().single()
            if (error) throw error

            fetchProducts() // Refresh list to get the new ID and timestamp
        } catch (e) {
            console.error("Error adding product", e)
            alert("Failed to save product")
        }
    }

    const updateProduct = async (id: string, updates: Partial<Product>) => {
        try {
            const row: any = { ...updates }
            // Map back to DB Columns where usage differs
            if (updates.price) row.price = parseFloat(updates.price)
            if (updates.priceInr) row.price_inr = parseFloat(updates.priceInr)
            if (updates.storeName) row.store_name = updates.storeName
            if (updates.exchangeRate) row.exchange_rate = updates.exchangeRate
            if (updates.sellerMobile) row.seller_mobile = updates.sellerMobile
            if (updates.quantity) row.quantity = updates.quantity
            if (updates.sizes) row.sizes = updates.sizes
            if (updates.sellingPrice) row.selling_price = parseFloat(updates.sellingPrice)
            // created_at etc are handled by DB

            const { error } = await supabase.from('products').update(row).eq('id', id)
            if (error) throw error

            setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
        } catch (e) {
            console.error("Error updating", e)
        }
    }

    const deleteProduct = async (id: string) => {
        try {
            const { error } = await supabase.from('products').delete().eq('id', id)
            if (error) throw error
            setProducts(prev => prev.filter(p => p.id !== id))
        } catch (e) {
            console.error("Error deleting", e)
        }
    }

    return (
        <ProductContext.Provider value={{ products, loading, addProduct, updateProduct, deleteProduct }}>
            {children}
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
