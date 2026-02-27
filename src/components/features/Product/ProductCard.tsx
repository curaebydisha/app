"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Product } from "@/context/ProductContext"
import Link from "next/link"

import { CheckCircle2, Zap } from "lucide-react"

interface ProductCardProps {
    product: Product
    selectionMode?: boolean
    isSelected?: boolean
    onToggleSelect?: (id: string) => void
    onDirectSale?: (product: Product) => void
}

export function ProductCard({ product, selectionMode, isSelected, onToggleSelect, onDirectSale }: ProductCardProps) {
    const hasSellingPrice = product.sellingPrice && parseFloat(product.sellingPrice) > 0
    const displayPrice = hasSellingPrice ? product.sellingPrice : product.priceInr

    const handleDirectSale = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (onDirectSale && product.quantity > 0) {
            onDirectSale(product)
        }
    }

    const handleClick = (e: React.MouseEvent) => {
        // Prevent selection if quantity is 0
        if (selectionMode && onToggleSelect) {
            e.preventDefault()
            e.stopPropagation() // Prevent link navigation

            if (product.quantity > 0) {
                onToggleSelect(product.id)
            }
        }
    }

    const Wrap = selectionMode ? 'div' : Link
    const wrapProps: any = selectionMode
        ? { onClick: handleClick, className: "block h-full cursor-pointer" }
        : { href: `/product_detail?id=${product.id}`, className: "block h-full" }

    return (
        <Wrap {...wrapProps}>
            <Card className={`overflow-hidden border-2 transition-all shadow-sm h-full flex flex-col ${isSelected ? 'border-[#d4af37] ring-2 ring-[#d4af37]/20' : 'border-transparent'}`}>
                <div className="aspect-[4/5] w-full relative bg-muted group">
                    <img
                        src={product.image}
                        alt={product.name}
                        className={`absolute inset-0 w-full h-full object-cover transition-transform ${selectionMode ? '' : 'group-hover:scale-105'} ${isSelected ? 'opacity-80' : ''}`}
                    />

                    {/* Selection Indicator */}
                    {selectionMode && product.quantity > 0 && (
                        <div className="absolute top-2 left-2 z-10">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-[#d4af37] border-[#d4af37]' : 'bg-white/50 border-white text-transparent'}`}>
                                <CheckCircle2 className="w-4 h-4" color={isSelected ? "white" : "transparent"} />
                            </div>
                        </div>
                    )}

                    {/* Out of Stock Overlay */}
                    {product.quantity <= 0 && (
                        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
                            <span className="bg-red-600 text-white font-bold px-3 py-1 rounded-sm text-sm tracking-wider rotate-[-12deg] shadow-lg border border-red-800">SOLD OUT</span>
                        </div>
                    )}

                    {/* Quick Direct Sale Button */}
                    {!selectionMode && product.quantity > 0 && onDirectSale && (
                        <button
                            onClick={handleDirectSale}
                            className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                            title="Mark 1 Sold (Direct)"
                        >
                            <Zap className="w-4 h-4 text-[#d4af37]" />
                        </button>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8 flex items-end justify-between">
                        <div>
                            <p className="text-white font-bold text-lg">₹{displayPrice}</p>
                            {hasSellingPrice && (
                                <p className="text-white/80 text-[10px]">Buy: ₹{product.priceInr}</p>
                            )}
                        </div>
                        {product.quantity > 0 && (
                            <div className="bg-white/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                                {product.quantity} Left
                            </div>
                        )}
                    </div>
                </div>
                <CardContent className="p-3 flex-1 flex flex-col justify-between gap-1">
                    <div>
                        <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{product.storeName}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        {product.currency} {product.price}
                    </p>
                </CardContent>
            </Card>
        </Wrap>
    )
}
