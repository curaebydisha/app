"use client"

import { Button } from "@/components/ui/button"
import { Instagram, Phone, Share2 } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
    const handleShare = () => {
        if (typeof window === 'undefined') return

        const shareData = {
            title: "Connect with Disha Sanghvi | Curae",
            text: "Hi! I'm Disha Sanghvi, Founder of Curae. Let's connect!",
            url: window.location.href
        }

        if (navigator.share) {
            navigator.share(shareData).catch(console.error)
        } else {
            navigator.clipboard.writeText(shareData.url)
            alert("Profile link copied!")
        }
    }

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
            <div className="w-full max-w-[350px] bg-white rounded-2xl shadow-xl overflow-hidden p-8 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">

                {/* Profile Image */}
                <div className="relative">
                    <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-xl">
                        <img
                            src="/owner.jpg"
                            alt="Disha Sanghvi"
                            className="h-full w-full object-cover"
                        />
                    </div>
                </div>

                {/* Name & Title */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Disha Sanghvi</h1>
                    <p className="text-[#d4af37] font-medium">Founder, Curae</p>
                    <p className="text-sm text-muted-foreground mt-2 text-center leading-relaxed">
                        Helping designers source the best products efficiently.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 w-full">
                    <Link href="https://instagram.com/curaebydisha" target="_blank" className="w-full">
                        <Button variant="outline" className="w-full gap-2 border-pink-500 text-pink-600 hover:text-pink-700 hover:bg-pink-50">
                            <Instagram className="h-5 w-5" /> Follow on Instagram
                        </Button>
                    </Link>

                    <Link href="https://wa.me/919819754421" target="_blank" className="w-full">
                        <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white border-none">
                            <Phone className="h-5 w-5" /> Chat on WhatsApp
                        </Button>
                    </Link>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-2 mt-2 w-full pt-4 border-t">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Scan to Connect</p>
                    <div className="p-2 bg-white rounded-lg shadow-inner border">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://wa.me/919819754421`}
                            alt="WhatsApp QR"
                            className="h-28 w-28 opacity-90"
                        />
                    </div>
                </div>

                {/* Share Page Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground gap-2"
                    onClick={handleShare}
                >
                    <Share2 className="h-4 w-4" /> Share Profile
                </Button>

            </div>
        </div>
    )
}
