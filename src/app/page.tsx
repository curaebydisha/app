"use client"

import Link from "next/link";
import { QuickAddFAB } from "@/components/features/QuickAdd/QuickAddFAB";
import { useProducts } from "@/context/ProductContext";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard } from "@/components/features/Product/ProductCard";
import { Input } from "@/components/ui/input"
import { Search, CheckSquare, X } from "lucide-react"
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OwnerProfileModal } from "@/components/features/Profile/OwnerProfileModal";
import { useSales } from "@/context/SalesContext";
import { Product } from "@/context/ProductContext";
import { useRouter } from "next/navigation";

export default function Home() {
  const { products } = useProducts()
  const { logDirectSale } = useSales()
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [filterStore, setFilterStore] = useState("")

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.storeName.toLowerCase().includes(search.toLowerCase())
    const matchesStore = filterStore && filterStore !== "ALL" ? p.storeName === filterStore : true
    return matchesSearch && matchesStore
  })

  // Get unique stores for filter
  const stores = Array.from(new Set(products.map(p => p.storeName))).filter(Boolean)

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleDirectSale = async (product: Product) => {
    if (window.confirm(`Mark 1 qty of "${product.name}" as sold?`)) {
      const salePrice = product.sellingPrice && parseFloat(product.sellingPrice) > 0
        ? parseFloat(product.sellingPrice)
        : parseFloat(product.priceInr);
      const costPrice = parseFloat(product.priceInr);

      try {
        await logDirectSale(product.id, 1, salePrice, costPrice);
      } catch (e) {
        alert("Failed to record direct sale.");
      }
    }
  }

  const handleCreateInvoice = () => {
    if (selectedIds.length === 0) return;
    // Pass selected IDs to the invoice creation page via query params
    const query = new URLSearchParams();
    selectedIds.forEach(id => query.append('items', id));
    router.push(`/invoices/new?${query.toString()}`);
  }

  return (
    <div className="min-h-screen pb-20 p-4 font-[family-name:var(--font-geist-sans)]">
      <header className="flex flex-col gap-4 mb-6 sticky top-0 bg-background/95 backdrop-blur-md z-10 py-4 -mx-4 px-4 border-b transition-all">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#d4af37]">Curae <span className="text-xs text-muted-foreground font-normal">v2.0.0</span></h1>
          <OwnerProfileModal>
            <div className="h-8 w-8 rounded-full overflow-hidden border border-[#d4af37] cursor-pointer ring-2 ring-offset-2 ring-[#d4af37]">
              <img src="/app/owner.jpg" alt="Profile" className="h-full w-full object-cover" />
            </div>
          </OwnerProfileModal>
        </div>

        {/* Action Bar (Search/Filter or Selection Controls) */}
        {isSelectionMode ? (
          <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
            <span className="text-sm font-semibold">{selectedIds.length} Selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelectedIds([]); setIsSelectionMode(false); }}
                className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9 bg-muted/50 border-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {stores.length > 0 && (
              <div className="w-[120px]">
                <Select value={filterStore} onValueChange={setFilterStore}>
                  <SelectTrigger className="bg-muted/50 border-0">
                    <SelectValue placeholder="Store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Stores</SelectItem>
                    {stores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <button
              onClick={() => setIsSelectionMode(true)}
              className="px-3 flex items-center justify-center bg-muted/50 rounded-md border-0 text-muted-foreground hover:text-foreground"
              title="Select Multiple Items for Invoice"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      <main className="flex flex-col gap-4">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">
              {search || filterStore ? "Search Results" : "Recent Finds"}
            </h2>
            <span className="text-sm text-muted-foreground">{filtered.length} items</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filtered.length === 0 ? (
              /* Empty State */
              <div className="col-span-2 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/5 min-h-[200px]">
                <p>No items found.</p>
                <p className="text-sm">Tap + to add your first find.</p>
              </div>
            ) : (
              /* Product List */
              filtered.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selectionMode={isSelectionMode}
                  isSelected={selectedIds.includes(product.id)}
                  onToggleSelect={handleToggleSelect}
                  onDirectSale={handleDirectSale}
                />
              ))
            )}
          </div>
        </section>
      </main>

      {/* Floating Action Button for Invoice Selection */}
      {isSelectionMode && selectedIds.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleCreateInvoice}
            className="bg-[#d4af37] text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 hover:bg-[#b08d24] transition-colors"
          >
            Create Invoice
          </button>
        </div>
      )}

      {/* Only show Quick Add if not in selection mode */}
      {!isSelectionMode && <QuickAddFAB />}
    </div>
  );
}
