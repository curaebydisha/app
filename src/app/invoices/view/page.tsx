"use client"

import { useSales } from "@/context/SalesContext"
import { useProducts } from "@/context/ProductContext"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { InvoicePDFDocument } from "@/components/features/Invoice/InvoicePDFDocument"
import { Suspense, useState } from "react"

function InvoiceViewContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const invoiceId = searchParams.get('id')

    const { invoices, sales, loading, deleteInvoice } = useSales()
    const { products } = useProducts()

    const [isDeleting, setIsDeleting] = useState(false)

    if (loading || !products.length) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Invoice...</div>
    }

    const invoice = invoices.find(i => i.id === invoiceId)

    if (!invoice) {
        return (
            <div className="p-8 text-center flex flex-col items-center gap-4 mt-20">
                <h2 className="text-xl font-bold">Invoice Not Found</h2>
                <Link href="/accounts" className="text-blue-500 hover:underline">Back to Accounts</Link>
            </div>
        )
    }

    // Get the items for this invoice
    const invoiceSales = sales.filter(s => s.invoice_id === invoiceId)

    // Map them to the format expected by InvoicePDFDocument
    const pdfItems = invoiceSales.map(sale => {
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
            product: product as any, // Cast for PDF Document
            quantity: sale.quantity,
            salePrice: sale.sale_price,
            costPrice: sale.cost_price
        }
    })

    return (
        <div className="min-h-screen pb-20 p-4 font-[family-name:var(--font-geist-sans)] max-w-2xl mx-auto">
            <header className="flex items-center justify-between mb-6 sticky top-0 bg-background/95 backdrop-blur-md z-10 py-4 -mx-4 px-4 border-b">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-muted">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        Invoice {invoice.invoice_number}
                        {invoice.status === 'CANCELED' && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded uppercase">Canceled</span>
                        )}
                    </h1>
                </div>
                {invoiceId && invoice.status !== 'CANCELED' && (
                    <div className="flex gap-2">
                        <button
                            disabled={isDeleting}
                            onClick={async () => {
                                const reason = prompt("Enter a reason for canceling this invoice:")
                                if (reason) {
                                    setIsDeleting(true)
                                    try {
                                        await deleteInvoice(invoiceId, reason)
                                        alert("Invoice Canceled. Inventory Restored.")
                                        // router.push('/accounts')
                                    } catch (e) {
                                        alert("Failed to cancel invoice")
                                    } finally {
                                        setIsDeleting(false)
                                    }
                                }
                            }}
                            className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-red-200 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> {isDeleting ? "..." : "Cancel"}
                        </button>

                        <Link href={`/invoices/edit?id=${invoiceId}`} className="bg-muted px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-muted/80 transition-colors">
                            <Edit className="w-4 h-4" /> Edit
                        </Link>
                    </div>
                )}
            </header>

            {invoice.status === 'CANCELED' ? (
                <div className="p-8 border border-red-200 rounded-xl bg-red-50 text-red-800 flex flex-col gap-4">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Trash2 className="w-5 h-5" /> This Invoice was canceled</h2>
                    <p className="text-sm">The sales logs for this invoice were deleted and all inventory was correctly restored. This document is kept for auditing purposes.</p>
                    <div className="p-3 bg-white/50 rounded-lg text-sm font-mono whitespace-pre-wrap">
                        {invoice.notes}
                    </div>
                </div>
            ) : (
                <InvoicePDFDocument
                    invoiceId={invoice.invoice_number} // specifically passing the number here for display
                    customerName={invoice.customer_name}
                    customerMobile={invoice.customer_mobile || ""}
                    items={pdfItems}
                    totalAmount={invoice.total_amount}
                    onClose={() => router.push('/accounts')}
                />
            )}
        </div>
    )
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>}>
            <InvoiceViewContent />
        </Suspense>
    )
}
