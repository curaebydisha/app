"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Camera, MapPin, Loader2, Upload } from "lucide-react"
import { useState, useEffect } from "react"

interface QuickAddModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: Partial<Product>
}

import { useProducts, Product } from "@/context/ProductContext"

export function QuickAddModal({ open, onOpenChange, initialData }: QuickAddModalProps) {
    const { addProduct } = useProducts()
    const [loading, setLoading] = useState(false)
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const [currency, setCurrency] = useState("THB")
    const [price, setPrice] = useState("")
    const [exchangeRate, setExchangeRate] = useState("3.0") // Default THB rate
    const [storeName, setStoreName] = useState("")
    const [productName, setProductName] = useState("")
    const [notes, setNotes] = useState("")
    const [sellerMobile, setSellerMobile] = useState("")
    const [quantity, setQuantity] = useState("1")
    const [sizes, setSizes] = useState("")
    const [markup, setMarkup] = useState("120")
    const [sellingPrice, setSellingPrice] = useState("")
    const [location, setLocation] = useState<{ lat: number, lng: number } | undefined>(undefined)
    const [locating, setLocating] = useState(false)

    // Prefix mapping
    const prefixes: Record<string, string> = {
        "THB": "+66",
        "USD": "+1",
        "EUR": "+33", // Defaulting to France/Europe generic
        "INR": "+91"
    }

    useEffect(() => {
        // Auto-update mobile prefix when currency changes, if mobile is empty or just has prefix
        const prefix = prefixes[currency] || ""
        if (!sellerMobile || Object.values(prefixes).some(p => sellerMobile === p)) {
            setSellerMobile(prefix)
        }
    }, [currency])

    // Auto-calculate selling price when Price, Rate, or Markup changes
    useEffect(() => {
        if (!price) {
            setSellingPrice("")
            return
        }

        const cost = parseFloat(price) * (parseFloat(exchangeRate) || 1)
        const mark = parseFloat(markup) || 0
        const sell = cost + (cost * mark / 100)
        setSellingPrice(sell.toFixed(0))
    }, [price, exchangeRate, markup])

    // Auto-detect location on open
    useEffect(() => {
        if (open) {
            if (initialData) {
                setCurrency(initialData.currency || "THB")
                setPrice(initialData.price || "")
                setExchangeRate((initialData.exchangeRate || 3.0).toString())
                setStoreName(initialData.storeName || "")
                setProductName(initialData.name || "")
                setNotes(initialData.notes || "")
                setSellerMobile(initialData.sellerMobile || "")
                setQuantity(initialData.quantity?.toString() || "1")
                setSizes(initialData.sizes || "")

                // Estimate markup if possible
                if (initialData.price && initialData.sellingPrice) {
                    const cost = parseFloat(initialData.price) * (initialData.exchangeRate || 1)
                    const sell = parseFloat(initialData.sellingPrice)
                    if (cost > 0) {
                        const mark = ((sell - cost) / cost) * 100
                        setMarkup(mark.toFixed(0))
                    } else {
                        setMarkup("120")
                    }
                } else {
                    setMarkup("120")
                }

                setSellingPrice(initialData.sellingPrice || "")
                setLocation(initialData.location)
                setImagePreviews([])
                setLocating(false)
            } else {
                setLocating(true)
                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            const { latitude, longitude } = position.coords
                            setLocation({
                                lat: latitude,
                                lng: longitude
                            })

                            // Reverse geocoding using OpenStreetMap (Nominatim)
                            try {
                                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                                const data = await response.json()
                                if (data && data.name) {
                                    setStoreName(data.name)
                                } else if (data && data.address) {
                                    // Fallback to building name, road, or suburb
                                    setStoreName(data.address.building || data.address.shop || data.address.road || data.address.suburb || "")
                                }
                            } catch (error) {
                                console.error("Error reverse geocoding:", error)
                            }

                            setLocating(false)
                        },
                        (error) => {
                            console.error("Error getting location", error)
                            setLocating(false)
                        }
                    )
                } else {
                    setLocating(false)
                }
            }
        }
    }, [open, initialData])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        files.forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result as string])
            }
            reader.readAsDataURL(file)
        })
        // Reset input so the same file can be selected again if needed
        e.target.value = ""
    }

    const removeImage = (index: number) => {
        setImagePreviews(prev => prev.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!price || imagePreviews.length === 0) return // Basic validation
        setLoading(true)

        // Simulate async operation or image upload
        await new Promise(resolve => setTimeout(resolve, 500))

        const priceNum = parseFloat(price)
        const rateNum = parseFloat(exchangeRate) || 1
        const priceInr = (priceNum * rateNum).toFixed(2)

        addProduct({
            image: imagePreviews[0], // Keep for backward compatibility 
            images: imagePreviews,
            price,
            currency,
            priceInr,
            exchangeRate: rateNum,
            storeName: storeName || "Unknown Store",
            sellerMobile,
            quantity: parseInt(quantity) || 1,
            sizes,
            sellingPrice,
            location,
            name: productName || "Untitled Product",
            notes
        })

        setLoading(false)
        onOpenChange(false)
        // Reset form
        setImagePreviews([])
        setPrice("")
        setStoreName("")
        setSellerMobile("")
        setProductName("")
        setQuantity("1")
        setSizes("")
        setMarkup("50")
        setSellingPrice("")
        setNotes("")
        setLocation(undefined)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] flex flex-col gap-6 max-h-[90vh] overflow-y-auto w-[95vw] rounded-xl">
                <DialogHeader>
                    <DialogTitle>Quick Add Product</DialogTitle>
                    <DialogDescription>
                        Snap a photo and fill in the details.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Image Input */}
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div
                            className={`relative flex ${imagePreviews.length > 0 ? "h-24 justify-start items-center overflow-x-auto p-2 gap-2" : "h-48 justify-center items-center flex-col"} w-full rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/5 transition-colors`}
                        >
                            {imagePreviews.length > 0 ? (
                                <>
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="group relative h-20 w-20 shrink-0 rounded-md overflow-hidden border border-border">
                                            <img
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="destructive"
                                                    className="h-8 w-8 rounded-full"
                                                    onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                                >
                                                    <Upload className="h-4 w-4 rotate-45" /> {/* Use as a cross/delete icon placeholder for now, or X */}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Add More Button */}
                                    <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-muted-foreground/25 hover:bg-muted/10 transition-colors cursor-pointer"
                                        onClick={() => document.getElementById("gallery-input")?.click()}>
                                        <Upload className="h-6 w-6 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">Add</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full w-full">
                                    <div
                                        className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 border-r-2 border-dashed border-muted-foreground/25 hover:bg-muted/10 transition-colors"
                                        onClick={() => document.getElementById("camera-input")?.click()}
                                    >
                                        <Camera className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">Camera</span>
                                    </div>
                                    <div
                                        className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 hover:bg-muted/10 transition-colors"
                                        onClick={() => document.getElementById("gallery-input")?.click()}
                                    >
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">Gallery</span>
                                    </div>
                                </div>
                            )}
                            <input
                                id="camera-input"
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                            <input
                                id="gallery-input"
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>

                    {/* Price & Currency */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="price">Price</Label>
                            <div className="flex items-center gap-2">
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger className="w-[80px]">
                                        <SelectValue placeholder="Cur" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="THB">THB</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="INR">INR</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    id="price"
                                    type="number"
                                    placeholder="0.00"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Approx INR</Label>
                            <div className="flex flex-col">
                                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground font-medium">
                                    ₹ {price ? (parseFloat(price) * (parseFloat(exchangeRate) || 1)).toFixed(2) : "0.00"}
                                </div>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className="text-[10px] text-muted-foreground">Rate:</span>
                                    <Input
                                        className="h-5 w-12 text-[10px] px-1 py-0 text-right"
                                        value={exchangeRate}
                                        onChange={(e) => setExchangeRate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Store Info */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="store">Store Details</Label>
                            {locating ? (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Locating...
                                </span>
                            ) : location ? (
                                <span className="text-[10px] text-green-600 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> GPS Set
                                </span>
                            ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative col-span-2">
                                <Input
                                    id="store"
                                    placeholder="Store Name"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                />
                                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10 text-muted-foreground">
                                    <MapPin className={`h-4 w-4 ${location ? "text-green-600 fill-current" : ""}`} />
                                </Button>
                            </div>
                            <div className="col-span-2">
                                <Input
                                    placeholder="Seller Mobile"
                                    value={sellerMobile}
                                    onChange={(e) => setSellerMobile(e.target.value)}
                                    type="tel"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Details */}
                    <div className="grid gap-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input
                            id="name"
                            placeholder="Silk Scarf, etc."
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="qty">Quantity</Label>
                            <Input
                                id="qty"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sizes">Sizes</Label>
                            <Input
                                id="sizes"
                                placeholder="S, M, L..."
                                value={sizes}
                                onChange={(e) => setSizes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Selling Price Calculation */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="markup">Markup %</Label>
                            <Input
                                id="markup"
                                type="number"
                                placeholder="%"
                                value={markup}
                                onChange={(e) => setMarkup(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="selling">Selling Price (INR)</Label>
                            <Input
                                id="selling"
                                placeholder="₹"
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(e.target.value)}
                                className="bg-green-50 font-bold text-green-800"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Colors, style codes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <Button
                    className="w-full bg-[#d4af37] hover:bg-[#b5952f] text-black font-semibold h-12 text-lg shrink-0 mb-4"
                    onClick={handleSave}
                    disabled={loading || imagePreviews.length === 0 || !price}
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Product"}
                </Button>
            </DialogContent>
        </Dialog>
    )
}
