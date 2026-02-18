"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Product } from "@/context/ProductContext"
import Link from "next/link"

interface ProductCardProps {
    product: Product
}

export function ProductCard({ product }: ProductCardProps) {
    const hasSellingPrice = product.sellingPrice && parseFloat(product.sellingPrice) > 0
    const displayPrice = hasSellingPrice ? product.sellingPrice : product.priceInr

    return (
        <Link href={`/product_detail?id=${product.id}`} className="block h-full">
            <Card className="overflow-hidden border-none shadow-sm h-full flex flex-col">
                <div className="aspect-[4/5] w-full relative bg-muted group">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
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
        </Link>
    )
}
