"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useProducts } from "./ProductContext"

export type Invoice = {
    id: string
    invoice_number: string
    customer_name: string
    customer_mobile: string | null
    total_amount: number
    status: string
    notes: string | null
    created_at: string
}

export type SaleRecord = {
    id: string
    product_id: string | null
    invoice_id: string | null
    quantity: number
    sale_price: number
    cost_price: number
    profit: number
    sale_type: "DIRECT" | "INVOICE"
    created_at: string

    // Joined product data for display
    products?: {
        name: string
        image_url: string
        store_name: string
    }
    invoices?: {
        invoice_number: string
    }
}

type SalesContextType = {
    invoices: Invoice[]
    sales: SaleRecord[]
    loading: boolean
    logDirectSale: (productId: string, quantity: number, salePrice: number, costPrice: number) => Promise<void>
    createInvoice: (
        customerName: string,
        customerMobile: string,
        totalAmount: number,
        items: { productId: string; quantity: number; salePrice: number; costPrice: number }[],
        notes?: string
    ) => Promise<{ id: string, invoice_number: string }> // Returns invoice ids
    updateInvoice: (invoiceId: string, updates: Partial<Invoice>, reason: string) => Promise<void>
    deleteInvoice: (invoiceId: string, reason: string) => Promise<void>
    undoDirectSale: (saleId: string) => Promise<void>
    refreshData: () => Promise<void>
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

export function SalesProvider({ children }: { children: React.ReactNode }) {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [sales, setSales] = useState<SaleRecord[]>([])
    const [loading, setLoading] = useState(true)
    const { products, updateProduct } = useProducts()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [invoicesRes, salesRes] = await Promise.all([
                supabase.from('invoices').select('*').order('created_at', { ascending: false }),
                supabase.from('sales').select(`
                    *,
                    products (
                        name,
                        image_url,
                        store_name
                    ),
                    invoices (
                        invoice_number
                    )
                `).order('created_at', { ascending: false })
            ])

            if (invoicesRes.error) throw invoicesRes.error
            if (salesRes.error) throw salesRes.error

            setInvoices(invoicesRes.data || [])
            setSales(salesRes.data || [])
        } catch (e: any) {
            console.error("Error fetching sales data:", e)
        } finally {
            setLoading(false)
        }
    }

    const logDirectSale = async (productId: string, quantity: number, salePrice: number, costPrice: number) => {
        try {
            const profit = salePrice - costPrice

            // 1. Insert into sales table
            const { error: saleError } = await supabase.from('sales').insert({
                product_id: productId,
                quantity: quantity,
                sale_price: salePrice,
                cost_price: costPrice,
                profit: profit,
                sale_type: 'DIRECT'
            })

            if (saleError) throw saleError

            // 2. Reduce quantity in product context
            const product = products.find(p => p.id === productId)
            if (product) {
                const newQuantity = Math.max(0, product.quantity - quantity)
                await updateProduct(productId, { quantity: newQuantity })
            }

            // Refresh sales state
            fetchData()
        } catch (e) {
            console.error("Direct sale failed:", e)
            throw e
        }
    }

    const undoDirectSale = async (saleId: string) => {
        try {
            const sale = sales.find(s => s.id === saleId)
            if (!sale || sale.sale_type !== 'DIRECT') return

            // 1. Delete the sale record
            const { error: delError } = await supabase.from('sales').delete().eq('id', saleId)
            if (delError) throw delError

            // 2. Add quantity back to product context
            if (sale.product_id) {
                const product = products.find(p => p.id === sale.product_id)
                if (product) {
                    await updateProduct(product.id, { quantity: product.quantity + sale.quantity })
                }
            }

            fetchData()
        } catch (e) {
            console.error("Undo sale failed:", e)
            throw e
        }
    }

    const createInvoice = async (
        customerName: string,
        customerMobile: string,
        totalAmount: number,
        items: { productId: string; quantity: number; salePrice: number; costPrice: number }[],
        notes?: string
    ) => {
        try {
            // Generate serialized invoice number (e.g. CFeb26001)
            const date = new Date()
            const month = date.toLocaleString('en-US', { month: 'short' })
            const yearStr = date.getFullYear().toString().slice(-2)
            const prefix = `C${month}${yearStr}`

            // Getting the latest invoice to increment the counter
            const { data: latestInvoices } = await supabase
                .from('invoices')
                .select('invoice_number')
                .like('invoice_number', `${prefix}%`)
                .order('created_at', { ascending: false })
                .limit(1)

            let counter = 1
            if (latestInvoices && latestInvoices.length > 0 && latestInvoices[0].invoice_number) {
                const lastNum = parseInt(latestInvoices[0].invoice_number.replace(prefix, ''), 10)
                if (!isNaN(lastNum)) counter = lastNum + 1
            }

            const invoiceNumber = `${prefix}${counter.toString().padStart(3, '0')}`

            // 1. Create Invoice
            const { data: invoiceData, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                    invoice_number: invoiceNumber,
                    customer_name: customerName,
                    customer_mobile: customerMobile,
                    total_amount: totalAmount,
                    notes: notes || null
                })
                .select()
                .single()

            if (invoiceError) throw invoiceError

            // 2. Create Sale Records
            const saleRecords = items.map(item => ({
                product_id: item.productId,
                invoice_id: invoiceData.id,
                quantity: item.quantity,
                sale_price: item.salePrice,
                cost_price: item.costPrice,
                profit: item.salePrice - item.costPrice,
                sale_type: 'INVOICE'
            }))

            const { error: salesError } = await supabase.from('sales').insert(saleRecords)
            if (salesError) throw salesError

            // 3. Update Inventory Quantities
            for (const item of items) {
                const product = products.find(p => p.id === item.productId)
                if (product) {
                    const newQuantity = Math.max(0, product.quantity - item.quantity)
                    await updateProduct(item.productId, { quantity: newQuantity })
                }
            }

            // Refresh state
            fetchData()

            return { id: invoiceData.id, invoice_number: invoiceData.invoice_number }
        } catch (e) {
            console.error("Create invoice failed:", e)
            throw e
        }
    }

    const updateInvoice = async (invoiceId: string, updates: Partial<Invoice>, reason: string) => {
        try {
            const oldInvoice = invoices.find(i => i.id === invoiceId)
            const newNotes = oldInvoice?.notes
                ? `${oldInvoice.notes}\n[Edit ${new Date().toLocaleDateString()}]: ${reason}`
                : `[Edit ${new Date().toLocaleDateString()}]: ${reason}`

            const { error } = await supabase.from('invoices').update({
                ...updates,
                notes: newNotes
            }).eq('id', invoiceId)

            if (error) throw error
            fetchData()
        } catch (e) {
            console.error("Update invoice failed:", e)
            throw e
        }
    }

    const deleteInvoice = async (invoiceId: string, reason: string) => {
        try {
            // 1. Fetch sales linked to this invoice
            const invoiceSales = sales.filter(s => s.invoice_id === invoiceId)

            // 2. Restore inventory quantities
            for (const sale of invoiceSales) {
                if (sale.product_id) {
                    const product = products.find(p => p.id === sale.product_id)
                    if (product) {
                        await updateProduct(product.id, { quantity: product.quantity + sale.quantity })
                    }
                }
            }

            // 3. Delete the sale records
            const { error: salesError } = await supabase.from('sales').delete().eq('invoice_id', invoiceId)
            if (salesError) throw salesError

            // 4. Mark invoice as canceled/deleted and add note
            const oldInvoice = invoices.find(i => i.id === invoiceId)
            const newNotes = oldInvoice?.notes
                ? `${oldInvoice.notes}\n[CANCELED ${new Date().toLocaleDateString()}]: ${reason}`
                : `[CANCELED ${new Date().toLocaleDateString()}]: ${reason}`

            const { error: invError } = await supabase.from('invoices').update({
                status: 'CANCELED',
                total_amount: 0,
                notes: newNotes
            }).eq('id', invoiceId)

            if (invError) throw invError

            fetchData()
        } catch (e) {
            console.error("Delete invoice failed:", e)
            throw e
        }
    }

    return (
        <SalesContext.Provider value={{
            invoices, sales, loading, logDirectSale, createInvoice, updateInvoice, deleteInvoice, undoDirectSale,
            refreshData: fetchData
        }}>
            {children}
        </SalesContext.Provider>
    )
}

export function useSales() {
    const context = useContext(SalesContext)
    if (context === undefined) {
        throw new Error("useSales must be used within a SalesProvider")
    }
    return context
}
