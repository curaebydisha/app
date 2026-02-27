"use client"

import { useState, useEffect } from "react"
import { useProducts, Product } from "@/context/ProductContext"
import { useSales } from "@/context/SalesContext"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, X, Loader2, Download, Send } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InvoicePDFDocument } from "./InvoicePDFDocument"

interface InvoiceItem {
    product: Product
    quantity: number
    salePrice: number
    costPrice: number
}

interface InvoiceFormProps {
    initialProductIds: string[]
}

export function InvoiceForm({ initialProductIds }: InvoiceFormProps) {
    const { products } = useProducts()
    const { createInvoice } = useSales()
    const [isSaving, setIsSaving] = useState(false)
    const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null)
    const [showProductsPicker, setShowProductsPicker] = useState(false)

    const [customerName, setCustomerName] = useState("")
    const [customerMobile, setCustomerMobile] = useState("")
    const [notes, setNotes] = useState("")
    const [items, setItems] = useState<InvoiceItem[]>([])

    // Load initial products if any
    useEffect(() => {
        if (initialProductIds.length > 0 && products.length > 0) {
            const initialItems: InvoiceItem[] = initialProductIds
                .map(id => products.find(p => p.id === id))
                .filter((p): p is Product => Boolean(p))
                .map(product => ({
                    product,
                    quantity: 1, // default 1
                    salePrice: product.sellingPrice && parseFloat(product.sellingPrice) > 0
                        ? parseFloat(product.sellingPrice)
                        : parseFloat(product.priceInr || "0"),
                    costPrice: parseFloat(product.priceInr || "0")
                }))

            // Avoid adding duplicates if component re-renders
            setItems(prev => {
                const newItems = [...prev]
                initialItems.forEach(item => {
                    if (!newItems.find(i => i.product.id === item.product.id)) {
                        newItems.push(item)
                    }
                })
                return newItems
            })
        }
    }, [initialProductIds, products])

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0)

    const handleAddItem = (product: Product) => {
        if (items.find(i => i.product.id === product.id)) return // prevent duplicate rows
        setItems(prev => [...prev, {
            product,
            quantity: 1,
            salePrice: product.sellingPrice && parseFloat(product.sellingPrice) > 0
                ? parseFloat(product.sellingPrice)
                : parseFloat(product.priceInr || "0"),
            costPrice: parseFloat(product.priceInr || "0")
        }])
        setShowProductsPicker(false)
    }

    const handleRemoveItem = (productId: string) => {
        setItems(prev => prev.filter(i => i.product.id !== productId))
    }

    const handleUpdateItem = (productId: string, field: keyof InvoiceItem, value: number) => {
        setItems(prev => prev.map(item => {
            if (item.product.id === productId) {
                // Ensure quantity doesn't exceed inventory
                if (field === 'quantity') {
                    const maxQty = item.product.quantity
                    let qty = value < 1 ? 1 : value
                    qty = qty > maxQty ? maxQty : qty
                    return { ...item, quantity: qty }
                }
                return { ...item, [field]: value }
            }
            return item
        }))
    }

    const handleSave = async () => {
        if (!customerName || !customerMobile) {
            alert("Customer Name and Mobile are required.")
            return
        }
        if (items.length === 0) {
            alert("Please add at least one product.")
            return
        }

        setIsSaving(true)
        try {
            const formattedItems = items.map(i => ({
                productId: i.product.id,
                quantity: i.quantity,
                salePrice: i.salePrice,
                costPrice: i.costPrice
            }))

            const { invoice_number } = await createInvoice(customerName, customerMobile, totalAmount, formattedItems, notes)
            setSavedInvoiceId(invoice_number)

            // Trigger background email
            sendEmailViaEmailJS(invoice_number, customerName, totalAmount, items)

            alert("Invoice successfully created!")
        } catch (e) {
            console.error("Failed to generate invoice", e)
            alert("Error creating invoice. Please trace the console.")
        } finally {
            setIsSaving(false)
        }
    }

    const sendEmailViaEmailJS = async (invoiceId: string, name: string, total: number, purchasedItems: InvoiceItem[]) => {
        // This is a stub for the EmailJS REST API
        // User will replace these with actual keys
        const serviceId = "YOUR_SERVICE_ID"
        const templateId = "YOUR_TEMPLATE_ID"
        const publicKey = "YOUR_PUBLIC_KEY"

        if (serviceId.includes("YOUR_")) {
            console.warn("EmailJS keys missing - Auto-email skipped.")
            return
        }

        const templateParams = {
            invoice_id: invoiceId,
            customer_name: name,
            total_amount: total,
            items_list: purchasedItems.map(i => `${i.product.name} (x${i.quantity}) - ₹${i.salePrice * i.quantity}`).join('\n'),
            reply_to: "curaebydisha@gmail.com",
            to_emails: "curaebydisha@gmail.com,ryshah.tech@gmail.com"
        }

        try {
            await fetch("https://api.emailjs.com/api/v1.0/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    service_id: serviceId,
                    template_id: templateId,
                    user_id: publicKey,
                    template_params: templateParams
                })
            })
            console.log("Email sent successfully")
        } catch (e) {
            console.error("Failed to send email", e)
        }
    }

    // Product Picker component
    const availableProducts = products.filter(p => p.quantity > 0)

    if (savedInvoiceId) {
        return (
            <InvoicePDFDocument
                invoiceId={savedInvoiceId}
                customerName={customerName}
                customerMobile={customerMobile}
                items={items}
                totalAmount={totalAmount}
                onClose={() => window.location.href = '/'}
            />
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <Card className="border-2 shadow-sm">
                <CardContent className="p-4 flex flex-col gap-4">
                    <h2 className="font-semibold text-lg text-[#d4af37]">Customer Details</h2>
                    <Input
                        placeholder="Customer Name *"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                    />
                    <Input
                        placeholder="Customer Mobile *"
                        type="tel"
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                    />
                    <Input
                        placeholder="Sale Notes (optional)"
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
                        {items.length === 0 ? (
                            <p className="text-sm text-center text-muted-foreground italic py-4">No items added yet.</p>
                        ) : (
                            items.map(item => (
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
                                                    max={item.product.quantity}
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
                        <span className="font-bold">Total Amount</span>
                        <span className="text-xl font-bold text-[#d4af37]">₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>

                </CardContent>
            </Card>

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#d4af37] text-white px-6 py-4 rounded-xl shadow-lg font-bold flex items-center justify-center gap-2 hover:bg-[#b08d24] transition-colors mb-10 w-full"
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isSaving ? "Saving & Processing..." : "Generate Invoice"}
            </button>
        </div>
    )
}
