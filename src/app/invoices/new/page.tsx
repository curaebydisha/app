"use client"
import { useSearchParams } from "next/navigation"
import { InvoiceForm } from "@/components/features/Invoice/InvoiceForm"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

function InvoiceNewContent() {
    const searchParams = useSearchParams()
    const itemIds = searchParams.getAll('items')

    return (
        <div className="min-h-screen pb-20 p-4 font-[family-name:var(--font-geist-sans)] max-w-2xl mx-auto">
            <header className="flex items-center gap-4 mb-6">
                <Link href="/" className="p-2 rounded-full hover:bg-muted">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-bold">Create Invoice</h1>
            </header>
            <InvoiceForm initialProductIds={itemIds} />
        </div>
    )
}

export default function NewInvoicePage() {
    return (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
            <InvoiceNewContent />
        </Suspense>
    )
}
