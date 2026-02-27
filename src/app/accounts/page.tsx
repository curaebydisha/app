"use client"

import { useSales } from "@/context/SalesContext"
import { useProducts } from "@/context/ProductContext"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ArrowUpRight, ArrowDownRight, IndianRupee, PieChart, ReceiptText, RotateCcw } from "lucide-react"
import Link from "next/link"

export default function AccountsPage() {
    const { sales, invoices, loading, undoDirectSale } = useSales()
    const { products } = useProducts()

    // Calculations
    const currentInventoryValue = products.reduce((sum, p) => sum + (p.quantity * parseFloat(p.priceInr || "0")), 0)

    // Process Sales (Sold revenue, costs, profit)
    const totalRevenue = sales.reduce((sum, s) => sum + (s.sale_price * s.quantity), 0)
    const totalCostOfSold = sales.reduce((sum, s) => sum + (s.cost_price * s.quantity), 0)
    const totalProfit = sales.reduce((sum, s) => sum + (s.profit * s.quantity), 0)

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Accounts...</div>
    }

    return (
        <div className="min-h-screen pb-20 p-4 font-[family-name:var(--font-geist-sans)] max-w-2xl mx-auto">
            <header className="flex items-center justify-between mb-6 sticky top-0 bg-background/95 backdrop-blur-md z-10 py-4 -mx-4 px-4 border-b">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 rounded-full hover:bg-muted">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-[#d4af37]" /> Accounting
                    </h1>
                </div>
            </header>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-8">
                <Card className="border-2 border-green-100 bg-green-50/50">
                    <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Total Revenue</span>
                        <div className="text-2xl font-bold text-green-900">₹{totalRevenue.toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-[#d4af37]/20 bg-[#d4af37]/5">
                    <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-xs font-semibold text-[#8b7324] uppercase tracking-wider mb-1">Total Profit</span>
                        <div className="text-2xl font-bold text-[#b08d24]">₹{totalProfit.toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>
                <Card className="border-2 shadow-sm">
                    <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cost of Sold</span>
                        <div className="text-lg font-bold">₹{totalCostOfSold.toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>
                <Card className="border-2 shadow-sm">
                    <CardContent className="p-4 flex flex-col justify-center">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Inventory Value</span>
                        <div className="text-lg font-bold">₹{currentInventoryValue.toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-muted-foreground" /> Recent Sales Logs
            </h2>

            <div className="flex flex-col gap-3">
                {sales.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                        No sales recorded yet.
                    </div>
                ) : (
                    sales.map(sale => (
                        <div key={sale.id} className="border-2 rounded-xl p-3 flex items-start gap-3 bg-card shadow-sm">
                            <div className="h-10 w-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
                                {sale.products?.image_url && (
                                    <img
                                        src={
                                            sale.products.image_url.startsWith('[')
                                                ? JSON.parse(sale.products.image_url)[0]
                                                : sale.products.image_url
                                        }
                                        alt="Product"
                                        className="h-full w-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-sm truncate pr-2">
                                        {sale.products?.name || "Unknown Product"}
                                    </h4>
                                    <div className="text-right flex-shrink-0">
                                        <div className="font-bold text-sm text-green-700">
                                            +₹{(sale.sale_price * sale.quantity).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        {sale.sale_type === 'INVOICE' ? (
                                            <Link href={`/invoices/view?id=${sale.invoice_id}`} className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded uppercase text-[9px] font-bold hover:bg-blue-200 transition-colors">
                                                Invoice {sale.invoices?.invoice_number || ""}
                                            </Link>
                                        ) : (
                                            <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded uppercase text-[9px] font-bold">Direct</span>
                                        )}
                                        <span>• Qty: {sale.quantity}</span>
                                    </div>
                                    <div className="text-[10px] font-semibold text-muted-foreground">
                                        Profit: ₹{(sale.profit * sale.quantity).toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1 opacity-70 flex justify-between items-center">
                                    <span>{new Date(sale.created_at).toLocaleString()}</span>
                                    {sale.sale_type === 'DIRECT' && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Undo this sale? This will restore the inventory and remove this log.")) {
                                                    undoDirectSale(sale.id);
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 px-2 py-1 rounded"
                                        >
                                            <RotateCcw className="w-3 h-3" /> Undo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-8 pt-4 border-t">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ReceiptText className="w-5 h-5 text-muted-foreground" /> All Invoices
                </h2>
                <div className="flex flex-col gap-3">
                    {invoices.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                            No invoices generated yet.
                        </div>
                    ) : (
                        invoices.map(inv => (
                            <Link href={`/invoices/view?id=${inv.id}`} key={inv.id} className="border p-3 rounded-lg flex justify-between items-center shadow-sm hover:border-[#d4af37] transition-colors bg-white">
                                <div>
                                    <div className="font-bold text-sm">{inv.invoice_number}</div>
                                    <div className="text-xs text-muted-foreground">{inv.customer_name} • {inv.customer_mobile}</div>
                                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(inv.created_at).toLocaleDateString()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-[#d4af37]">₹{inv.total_amount.toLocaleString('en-IN')}</div>
                                    <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded mt-1 inline-block">{inv.status}</span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
