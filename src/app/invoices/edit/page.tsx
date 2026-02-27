"use client"

import { useSales } from "@/context/SalesContext"
import { useProducts, Product } from "@/context/ProductContext"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, X, Save } from "lucide-react"
import { useState, useEffect, Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

interface EditInvoiceItem {
    saleId?: string // Present if it's an existing mapped sale
    product: Product
    quantity: number
    salePrice: number
    costPrice: number
    isNew?: boolean
    isDeleted?: boolean
}

function EditInvoiceContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const invoiceId = searchParams.get('id')

    const { invoices, sales, loading, updateInvoice, refreshData } = useSales()
    const { products, updateProduct } = useProducts()

    const [isSaving, setIsSaving] = useState(false)
    const [editReason, setEditReason] = useState("")

    const [customerName, setCustomerName] = useState("")
    const [customerMobile, setCustomerMobile] = useState("")
    const [notes, setNotes] = useState("")
    const [items, setItems] = useState<EditInvoiceItem[]>([])

    const [showProductsPicker, setShowProductsPicker] = useState(false)

    const invoice = invoices.find(i => i.id === invoiceId)
    const invoiceSales = sales.filter(s => s.invoice_id === invoiceId)

    useEffect(() => {
        if (invoice && items.length === 0) {
            setCustomerName(invoice.customer_name)
            setCustomerMobile(invoice.customer_mobile || "")
            setNotes(invoice.notes || "")

            // Load items
            const loadedItems = invoiceSales.map(sale => {
                const product = products.find(p => p.id === sale.product_id) || {
                    id: sale.product_id || "unknown",
                    name: sale.products?.name || "Unknown Product",
                    image: sale.products?.image_url ? (sale.products.image_url.startsWith('[') ? JSON.parse(sale.products.image_url)[0] : sale.products.image_url) : "",
                    images: [],
                    price: sale.sale_price.toString(),
                    currency: "INR",
                    priceInr: sale.sale_price.toString(),
                    exchangeRate: 1,
                    storeName: sale.products?.store_name || "",
                    quantity: 0,
                    notes: "",
                    timestamp: 0
                }

                return {
                    saleId: sale.id,
                    product: product as any,
                    quantity: sale.quantity,
                    salePrice: sale.sale_price,
                    costPrice: sale.cost_price,
                    isNew: false,
                    isDeleted: false
                }
            })
            setItems(loadedItems)
        }
    }, [invoice, invoiceSales, products])

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Editor...</div>
    }

    if (!invoiceId || !invoice) {
        return <div className="p-8 text-center text-red-500">Invoice not found.</div>
    }

    const availableProducts = products.filter(p => p.quantity > 0)
    const activeItems = items.filter(i => !i.isDeleted)
    const totalAmount = activeItems.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0)

    const handleAddItem = (product: Product) => {
        if (activeItems.find(i => i.product.id === product.id)) return // prevent duplicate rows
        setItems(prev => [...prev, {
            product,
            quantity: 1,
            salePrice: product.sellingPrice && parseFloat(product.sellingPrice) > 0
                ? parseFloat(product.sellingPrice)
                : parseFloat(product.priceInr || "0"),
            costPrice: parseFloat(product.priceInr || "0"),
            isNew: true,
            isDeleted: false
        }])
        setShowProductsPicker(false)
    }

    const handleRemoveItem = (productId: string) => {
        setItems(prev => prev.map(i => {
            if (i.product.id === productId) {
                return { ...i, isDeleted: true }
            }
            return i
        }))
    }

    const handleUpdateItem = (productId: string, field: keyof EditInvoiceItem, value: number) => {
        setItems(prev => prev.map(item => {
            if (item.product.id === productId) {
                // Ensure quantity doesn't exceed inventory (only for new items or increasing qty)
                /* Complex inventory logic skipped for simple edit - relying on user discretion for qty bounds */
                let validValue = value < 1 ? 1 : value
                return { ...item, [field]: validValue }
            }
            return item
        }))
    }

    const handleSave = async () => {
        if (!editReason.trim()) {
            alert("Please provide a reason for editing this invoice for the audit log.")
            return
        }

        setIsSaving(true)
        try {
            // 1. Update Invoice Base Data
            await updateInvoice(invoiceId as string, {
                customer_name: customerName,
                customer_mobile: customerMobile,
                total_amount: totalAmount,
                notes: notes // Note: updateInvoice appends the reason to notes automatically
            }, editReason)

            // 2. Process Items (Diffing logic)
            for (const item of items) {
                if (item.isDeleted && item.saleId) {
                    // Item was present, now deleted. Delete sale record & restore inventory.
                    const originalSale = invoiceSales.find(s => s.id === item.saleId)
                    if (originalSale) {
                        await supabase.from('sales').delete().eq('id', item.saleId)
                        const p = products.find(p => p.id === originalSale.product_id)
                        if (p) {
                            await updateProduct(p.id, { quantity: p.quantity + originalSale.quantity })
                        }
                    }
                } else if (item.isNew && !item.isDeleted) {
                    // Brand new item added to invoice. Create sale & reduce inventory
                    await supabase.from('sales').insert({
                        product_id: item.product.id,
                        invoice_id: invoiceId,
                        quantity: item.quantity,
                        sale_price: item.salePrice,
                        cost_price: item.costPrice,
                        profit: item.salePrice - item.costPrice,
                        sale_type: 'INVOICE'
                    })
                    const p = products.find(p => p.id === item.product.id)
                    if (p) {
                        const newQ = Math.max(0, p.quantity - item.quantity)
                        await updateProduct(p.id, { quantity: newQ })
                    }
                } else if (!item.isNew && !item.isDeleted && item.saleId) {
                    // Existing item modified? (Check quantities or prices)
                    const originalSale = invoiceSales.find(s => s.id === item.saleId)
                    if (originalSale && (originalSale.quantity !== item.quantity || originalSale.sale_price !== item.salePrice)) {
                        // 1. Update Sale Match
                        await supabase.from('sales').update({
                            quantity: item.quantity,
                            sale_price: item.salePrice,
                            profit: item.salePrice - item.costPrice
                        }).eq('id', item.saleId)

                        // 2. Correct Inventory Diff
                        const qtyDiff = item.quantity - originalSale.quantity // +1 means we took 1 MORE.
                        const p = products.find(p => p.id === originalSale.product_id)
                        if (p) {
                            const newQ = Math.max(0, p.quantity - qtyDiff)
                            await updateProduct(p.id, { quantity: newQ })
                        }
                    }
                }
            }

            // Await complete context refresh from the database so the view page has the correct removed items state
            await refreshData()

            // Route back
            alert("Invoice Successfully Updated!")
            router.push(`/invoices/view?id=${invoiceId}`)
            router.refresh() // Hard reload to refresh context fully

        } catch (e) {
            console.error("Failed to edit invoice", e)
            alert("Error saving edits.")
        } finally {
            setIsSaving(false)
        }
    }


    return (
        <div className="min-h-screen pb-20 p-4 font-[family-name:var(--font-geist-sans)] max-w-2xl mx-auto flex flex-col gap-6">
            <header className="flex items-center gap-4 mb-2 sticky top-0 bg-background/95 backdrop-blur-md z-10 py-4 -mx-4 px-4 border-b">
                <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-muted">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold flex items-center gap-2">Edit Invoice</h1>
                    <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
                </div>
            </header>

            <Card className="border-2 shadow-sm border-blue-200 bg-blue-50/30">
                <CardContent className="p-4 flex flex-col gap-4">
                    <h2 className="font-semibold text-sm text-blue-800 uppercase tracking-widest">Audit Reason (Required)</h2>
                    <Input
                        placeholder="Why are you editing this invoice? e.g 'Customer returned item'"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        className="bg-white"
                    />
                </CardContent>
            </Card>

            <Card className="border-2 shadow-sm">
                <CardContent className="p-4 flex flex-col gap-4">
                    <h2 className="font-semibold text-lg text-[#d4af37]">Customer Details</h2>
                    <Input
                        placeholder="Customer Name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                    />
                    <Input
                        placeholder="Customer Mobile"
                        type="tel"
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                    />
                    <Input
                        placeholder="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </CardContent>
            </Card>

            <Card className="border-2 shadow-sm">
                <CardContent className="p-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-lg text-[#d4af37]">Invoice Items</h2>
                        <button
                            onClick={() => setShowProductsPicker(!showProductsPicker)}
                            className="bg-muted px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-muted/80"
                        >
                            <Plus className="w-4 h-4" /> Add Item
                        </button>
                    </div>

                    {showProductsPicker && (
                        <div className="bg-muted p-2 rounded-lg flex flex-col gap-2 relative">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1">Select from Inventory</h3>
                            <button className="absolute top-2 right-2 text-muted-foreground" onClick={() => setShowProductsPicker(false)}>
                                <X className="w-4 h-4" />
                            </button>
                            <Select onValueChange={(val) => {
                                const prod = availableProducts.find(p => p.id === val)
                                if (prod) handleAddItem(prod)
                            }}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Choose a product..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableProducts.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} - ₹{p.sellingPrice || p.priceInr} ({p.quantity} left)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        {activeItems.length === 0 ? (
                            <p className="text-sm text-center text-muted-foreground italic py-4">All items removed.</p>
                        ) : (
                            activeItems.map(item => (
                                <div key={item.product.id} className="flex gap-3 border rounded-lg p-3 relative">
                                    <button
                                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow-sm"
                                        onClick={() => handleRemoveItem(item.product.id)}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>

                                    <img src={item.product.image} className="w-16 h-16 object-cover rounded-md" alt="Thumb" />
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div className="font-semibold text-sm line-clamp-1 pr-4">{item.product.name}</div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-muted-foreground">Qty:</span>
                                                <Input
                                                    type="number"
                                                    className="w-16 h-7 text-xs px-2"
                                                    value={item.quantity}
                                                    onChange={e => handleUpdateItem(item.product.id, 'quantity', parseInt(e.target.value) || 1)}
                                                    min="1"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-muted-foreground">₹/Ea:</span>
                                                <Input
                                                    type="number"
                                                    className="w-24 h-7 text-xs px-2"
                                                    value={item.salePrice}
                                                    onChange={e => handleUpdateItem(item.product.id, 'salePrice', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-bold self-end text-[#d4af37]">
                                        ₹{(item.salePrice * item.quantity).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex justify-between items-center rounded-lg p-3 bg-muted mt-2 border-2 border-dashed border-gray-300">
                        <span className="font-bold">New Total Amount</span>
                        <span className="text-xl font-bold text-[#d4af37]">₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>

                </CardContent>
            </Card>

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#d4af37] text-white px-6 py-4 rounded-xl shadow-lg font-bold flex items-center justify-center gap-2 hover:bg-[#b08d24] transition-colors mb-10 w-full"
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? "Saving Edit..." : "Save Invoice Edits"}
            </button>
        </div>
    )
}

export default function EditInvoicePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Loading Editor...</div>}>
            <EditInvoiceContent />
        </Suspense>
    )
}
