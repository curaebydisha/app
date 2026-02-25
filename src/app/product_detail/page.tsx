"use client"

import { useProducts } from "@/context/ProductContext"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, MapPin, Share2, Trash2, Edit2, X, Download, Maximize2, Camera, Upload, ChevronLeft, ChevronRight, Copy } from "lucide-react"
import { useState, useEffect, Suspense } from "react"
import { Product } from "@/context/ProductContext"
import { QuickAddModal } from "@/components/features/QuickAdd/QuickAddModal"

function ProductContent() {
    const searchParams = useSearchParams()
    const id = searchParams.get('id')
    const router = useRouter()
    const { products, updateProduct, deleteProduct } = useProducts()
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<Partial<Product>>({})
    const [showFullImage, setShowFullImage] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)

    const product = products.find(p => p.id === id)

    // For edit form images
    const [editImages, setEditImages] = useState<string[]>([])

    useEffect(() => {
        if (product) {
            setEditForm({
                name: product.name,
                price: product.price,
                storeName: product.storeName,
                sellerMobile: product.sellerMobile,
                quantity: product.quantity,
                sizes: product.sizes,
                sellingPrice: product.sellingPrice,
                notes: product.notes
            })
            setEditImages(product.images || (product.image ? [product.image] : []))
        }
    }, [product])

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <p className="text-muted-foreground mb-4">Product not found.</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        )
    }

    const handleSave = () => {
        if (!product || !editForm) return

        // rudimentary check if price changed to update Inr
        let priceInr = product.priceInr
        if (editForm.price && editForm.price !== product.price) {
            const priceNum = parseFloat(editForm.price)
            const rateNum = product.exchangeRate || 1
            priceInr = (priceNum * rateNum).toFixed(2)
        }

        updateProduct(product.id, {
            ...editForm,
            priceInr,
            images: editImages
        })
        setIsEditing(false)
    }

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this product?")) {
            deleteProduct(product.id)
            router.back()
        }
    }

    const openMaps = () => {
        if (!product.location) return
        const url = `https://www.google.com/maps/search/?api=1&query=${product.location.lat},${product.location.lng}`
        window.open(url, '_blank')
    }

    const downloadImage = async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            // Extract filename or generate one
            link.download = `curae-${product.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error downloading image:', error)
            alert('Failed to download image')
        }
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        files.forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => {
                setEditImages(prev => [...prev, reader.result as string])
            }
            reader.readAsDataURL(file)
        })
        e.target.value = ""
    }

    const removeImage = (index: number) => {
        setEditImages(prev => prev.filter((_, i) => i !== index))
    }

    const displayImages = isEditing ? editImages : (product.images?.length > 0 ? product.images : [product.image])

    return (
        <div className="min-h-screen bg-background pb-20 font-[family-name:var(--font-geist-sans)]">
            {/* Quick Add Modal for Duplicating */}
            <QuickAddModal
                open={isDuplicateModalOpen}
                onOpenChange={setIsDuplicateModalOpen}
                initialData={product}
            />

            {/* Full Screen Image Modal */}
            {showFullImage && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center">
                    <div className="absolute top-4 right-4 flex gap-4 z-10">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full bg-white/20 text-white hover:bg-white/40 border-none"
                            onClick={() => downloadImage(displayImages[currentImageIndex])}
                        >
                            <Download className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full bg-white/20 text-white hover:bg-white/40 border-none"
                            onClick={() => setShowFullImage(false)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                    <div className="w-full h-full flex items-center justify-center p-2 relative">
                        {displayImages.length > 1 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-4 z-10 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setCurrentImageIndex(prev => prev === 0 ? displayImages.length - 1 : prev - 1)
                                }}
                            >
                                <ChevronLeft className="h-8 w-8" />
                            </Button>
                        )}
                        <img
                            src={displayImages[currentImageIndex]}
                            alt={product.name}
                            className="max-w-none w-full object-contain max-h-full"
                        />
                        {displayImages.length > 1 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-4 z-10 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setCurrentImageIndex(prev => prev === displayImages.length - 1 ? 0 : prev + 1)
                                }}
                            >
                                <ChevronRight className="h-8 w-8" />
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Header Image */}
            <div className="relative h-[50vh] w-full bg-muted group">
                <div className="w-full h-full overflow-x-auto snap-x snap-mandatory flex scrollbar-hide">
                    {displayImages.map((img, idx) => (
                        <div key={idx} className="min-w-full h-full snap-center relative">
                            <img
                                src={img}
                                alt={`${product.name} ${idx + 1}`}
                                className="h-full w-full object-cover cursor-pointer"
                                onClick={() => {
                                    if (!isEditing) {
                                        setCurrentImageIndex(idx)
                                        setShowFullImage(true)
                                    }
                                }}
                            />
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="rounded-full pointer-events-auto shadow-lg shadow-black/50"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            removeImage(idx)
                                        }}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {!isEditing && (
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <Maximize2 className="h-12 w-12 text-white/80 drop-shadow-lg" />
                    </div>
                )}

                {displayImages.length > 1 && !isEditing && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {displayImages.map((_, idx) => (
                            <div key={idx} className="h-1.5 w-1.5 rounded-full bg-white/80 shadow-sm"></div>
                        ))}
                    </div>
                )}

                {isEditing && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-10">
                        <Button
                            className="rounded-full bg-black/70 hover:bg-black/90 text-white shadow-lg gap-2"
                            onClick={() => document.getElementById("edit-camera-input")?.click()}
                        >
                            <Camera className="h-4 w-4" /> Camera
                        </Button>
                        <Button
                            className="rounded-full bg-white/90 hover:bg-white text-black shadow-lg gap-2"
                            onClick={() => document.getElementById("edit-gallery-input")?.click()}
                        >
                            <Upload className="h-4 w-4" /> Gallery
                        </Button>
                        <input
                            id="edit-camera-input"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleImageChange}
                        />
                        <input
                            id="edit-gallery-input"
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleImageChange}
                        />
                    </div>
                )}

                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-4 left-4 rounded-full bg-black/50 text-white hover:bg-black/70 border-none"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className="absolute top-4 right-4 flex gap-2">
                    {!isEditing && (
                        <>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="rounded-full bg-black/50 text-white hover:bg-black/70 border-none"
                                onClick={() => setIsDuplicateModalOpen(true)}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="rounded-full bg-black/50 text-white hover:bg-black/70 border-none"
                                onClick={() => downloadImage(displayImages[0])} // Just download first one by default from icon
                            >
                                <Download className="h-5 w-5" />
                            </Button>
                        </>
                    )}
                    <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full bg-white/90 text-black hover:bg-white border-none shadow-sm"
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? <X className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            <div className="p-6 -mt-6 relative bg-background rounded-t-3xl shadow-lg flex flex-col gap-6">
                {/* Title & Price */}
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        {isEditing ? (
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                className="font-bold text-xl mb-2"
                                placeholder="Product Name"
                            />
                        ) : (
                            <h1 className="text-2xl font-bold">{product.name}</h1>
                        )}

                        <div className="flex items-center text-muted-foreground mt-1">
                            <MapPin className="h-4 w-4 mr-1 shrink-0" />
                            {isEditing ? (
                                <Input
                                    value={editForm.storeName}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, storeName: e.target.value }))}
                                    className="h-8 text-sm"
                                    placeholder="Store Name"
                                />
                            ) : (
                                <span className="text-sm">{product.storeName}</span>
                            )}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        {isEditing ? (
                            <div className="flex flex-col gap-2 items-end">
                                <label className="text-xs text-muted-foreground">Buying Price</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">{product.currency}</span>
                                    <Input
                                        value={editForm.price}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                                        className="h-8 w-20 text-right"
                                        type="number"
                                        placeholder="Buy"
                                    />
                                </div>
                                <label className="text-xs text-muted-foreground mt-1">Selling Price</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">₹</span>
                                    <Input
                                        value={editForm.sellingPrice}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, sellingPrice: e.target.value }))}
                                        className="h-8 w-20 text-right font-bold bg-green-50 text-green-700"
                                        type="number"
                                        placeholder="Sell"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-end gap-1">
                                <div className="text-2xl font-bold text-green-700">₹{product.sellingPrice || product.priceInr}</div>
                                {product.sellingPrice && product.sellingPrice !== "0" && (
                                    <div className="text-sm font-medium text-muted-foreground">
                                        Buy: ₹{product.priceInr}
                                    </div>
                                )}
                                <div className="text-[10px] text-muted-foreground">
                                    ({product.currency} {product.price})
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Seller & Product Details */}
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg">
                    {/* Quantity - Now prominently displayed here or under image */}
                    <div className="col-span-2 flex items-center justify-between border-b pb-2 mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Quantity Available</span>
                        {isEditing ? (
                            <Input
                                value={editForm.quantity}
                                onChange={(e) => setEditForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                className="h-8 w-20 text-right"
                                type="number"
                            />
                        ) : (
                            <span className="text-lg font-bold">{product.quantity} units</span>
                        )}
                    </div>

                    <div>
                        <span className="text-xs text-muted-foreground block">Seller Mobile</span>
                        {isEditing ? (
                            <Input
                                value={editForm.sellerMobile}
                                onChange={(e) => setEditForm(prev => ({ ...prev, sellerMobile: e.target.value }))}
                                className="h-8 text-sm mt-1"
                                placeholder="+66..."
                            />
                        ) : (
                            <span className="text-sm font-medium">{product.sellerMobile || "N/A"}</span>
                        )}
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground block">Size(s)</span>
                        {isEditing ? (
                            <Input
                                value={editForm.sizes}
                                onChange={(e) => setEditForm(prev => ({ ...prev, sizes: e.target.value }))}
                                className="h-8 text-sm mt-1"
                                placeholder="S, M..."
                            />
                        ) : (
                            <span className="text-sm font-medium">{product.sizes || "N/A"}</span>
                        )}
                    </div>
                </div>

                {/* Location Map Placeholder */}
                {product.location && (
                    <div className="bg-muted/20 p-4 rounded-lg flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                            <MapPin className="h-5 w-5 text-green-700" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs text-muted-foreground">Location Captured</p>
                            <p className="text-sm font-medium truncate">{product.location.address || `${product.location.lat.toFixed(6)}, ${product.location.lng.toFixed(6)}`}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-auto text-blue-600 shrink-0" onClick={openMaps}>Open Maps</Button>
                    </div>
                )}

                {/* Notes */}
                <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    {isEditing ? (
                        <Textarea
                            value={editForm.notes}
                            onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Add notes..."
                            className="min-h-[100px]"
                        />
                    ) : (
                        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                            {product.notes || "No notes added."}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-4 mt-4">
                    {isEditing ? (
                        <Button className="w-full bg-[#d4af37] hover:bg-[#b5952f] text-black" onClick={handleSave} disabled={editImages.length === 0}>
                            Save Changes
                        </Button>
                    ) : (
                        <>
                            <Button className="flex-1 gap-2" variant="outline" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" /> Delete
                            </Button>
                            <Button
                                className="flex-1 gap-2 bg-[#d4af37] hover:bg-[#b5952f] text-black"
                                onClick={async () => {
                                    const shareUrl = `${window.location.origin}/app/share?id=${product.id}`

                                    const textParts = [
                                        product.name,
                                        `Price: ₹${product.sellingPrice || product.priceInr}`,
                                        product.sizes ? `Size: ${product.sizes}` : null,
                                        product.notes ? `${product.notes}` : null,
                                        `\nView all images & details here:`,
                                        shareUrl
                                    ]
                                    const text = textParts.filter(Boolean).join('\n').trim()

                                    try {
                                        // Try to share Image + Text (Best for WhatsApp)
                                        if (navigator.share) {
                                            const response = await fetch(displayImages[0])
                                            const blob = await response.blob()
                                            const file = new File([blob], "product.jpg", { type: blob.type })

                                            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                                await navigator.share({
                                                    files: [file],
                                                    title: product.name,
                                                    text: text,
                                                    // Some apps might ignore text if files are present, but worth trying
                                                })
                                                return
                                            }
                                        }
                                    } catch (e) {
                                        console.log("Image share failed, falling back to link", e)
                                    }

                                    // Fallback: Share Link (Buyer View)
                                    if (navigator.share) {
                                        navigator.share({
                                            title: product.name,
                                            text: text, // URL is already in the text now
                                        })
                                    } else {
                                        // Fallback Clipboard
                                        navigator.clipboard.writeText(`${text}\n${shareUrl}`)
                                        alert("Details copied to clipboard")
                                    }
                                }}
                            >
                                <Share2 className="h-4 w-4" /> Share
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ProductPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProductContent />
        </Suspense>
    )
}
