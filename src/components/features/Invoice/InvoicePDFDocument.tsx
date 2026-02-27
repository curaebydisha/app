"use client"
import React, { useRef } from "react"
import { Product } from "@/context/ProductContext"
import { Download, CheckCircle, Share2, ArrowLeft } from "lucide-react"

interface InvoicePDFDocumentProps {
    invoiceId: string
    customerName: string
    customerMobile: string
    items: { product: Product, quantity: number, salePrice: number }[]
    totalAmount: number
    onClose: () => void
}

export function InvoicePDFDocument({ invoiceId, customerName, customerMobile, items, totalAmount, onClose }: InvoicePDFDocumentProps) {
    const printRef = useRef<HTMLDivElement>(null)

    // Using standard window.print as a fallback/primary for HTML -> PDF in mobile/web without plugins
    const handleDownload = () => {
        // Cache original title
        const originalTitle = document.title;
        // The browser uses document.title as the default file name when saving to PDF
        document.title = `Curae - ${invoiceId}`;

        // Brief timeout ensures the title change propagates to the DOM before the print dialog freezes the thread
        setTimeout(() => {
            window.print();
            // Restore original title immediately after the dialog closes/resolves
            document.title = originalTitle;
        }, 100);
    }

    const handleShareWhatsApp = () => {
        const text = `Hi ${customerName},\n\nHere are the details for your purchase (Invoice: ${invoiceId}):\nTotal Amount: ₹${totalAmount.toLocaleString('en-IN')}\n\nThank you for shopping with Curae!`;
        // Ensure +91 or 91 prefix for Indian numbers if not present
        let cleanMobile = customerMobile.replace(/\D/g, '');
        if (cleanMobile.length === 10) {
            cleanMobile = `91${cleanMobile}`;
        }
        window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(text)}`, '_blank');
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-green-100 text-green-800 p-4 rounded-xl flex items-center gap-3 border border-green-200">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                    <h3 className="font-bold">Invoice Created Successfully</h3>
                    <p className="text-sm opacity-80">Saved to database and inventory updated.</p>
                </div>
            </div>

            <div className="flex gap-3 mt-2">
                <button
                    onClick={handleDownload}
                    className="flex-1 bg-black text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                >
                    <Download className="w-5 h-5" /> Download PDF
                </button>
                <button
                    onClick={handleShareWhatsApp}
                    className="flex-1 bg-green-500 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
                >
                    <Share2 className="w-5 h-5" /> WhatsApp
                </button>
            </div>

            <button onClick={onClose} className="text-center text-sm font-semibold text-muted-foreground underline pt-2 mb-4">
                Back to Dashboard
            </button>

            {/* The Print Layout */}
            <div
                ref={printRef}
                className="bg-white border rounded-xl overflow-hidden shadow-sm printable-invoice"
                style={{ padding: '2rem', minHeight: '600px', fontFamily: 'sans-serif', color: '#000' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #eee', paddingBottom: '1rem', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#d4af37' }}>Curae By Disha</h1>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>Timeless Fashion</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ margin: 0, fontSize: '20px', letterSpacing: '1px' }}>INVOICE</h2>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>#{invoiceId.toUpperCase()}</p>
                        <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>Date: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '14px', margin: '0 0 8px 0', color: '#666', textTransform: 'uppercase' }}>Billed To:</h3>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '16px' }}>{customerName}</p>
                    <p style={{ margin: 0, color: '#444' }}>{customerMobile}</p>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #ddd' }}>
                            <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', color: '#666' }}>Item</th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', color: '#666' }}>Qty</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', color: '#666' }}>Price</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', color: '#666' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px 8px' }}>
                                    <div style={{ fontWeight: '500' }}>{item.product.name}</div>
                                </td>
                                <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right' }}>₹{item.salePrice.toLocaleString('en-IN')}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                                    ₹{(item.salePrice * item.quantity).toLocaleString('en-IN')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                    <div style={{ width: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#fafafa', borderTop: '2px solid #333' }}>
                            <span style={{ fontWeight: 'bold' }}>Total Due:</span>
                            <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#d4af37' }}>
                                ₹{totalAmount.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '4rem', textAlign: 'center', fontSize: '12px', color: '#888', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    Thank you for your business!
                </div>
            </div>
        </div>
    )
}
