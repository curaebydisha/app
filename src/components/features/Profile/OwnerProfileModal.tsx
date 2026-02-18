"use client"

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Instagram, Phone, Share2, X } from "lucide-react"
import Link from "next/link"

export function OwnerProfileModal({ children }: { children: React.ReactNode }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-[350px] rounded-2xl p-6 pt-12 flex flex-col items-center gap-6 bg-white/95 backdrop-blur-sm">

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
                    <h2 className="text-2xl font-bold text-gray-900">Disha Sanghvi</h2>
                    <p className="text-[#d4af37] font-medium">Founder, Curae</p>
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

                {/* QR Code Placeholder (Using API for simplicity to avoid deps) */}
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

                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground gap-2 -mt-2"
                    onClick={() => {
                        const url = window.location.origin + '/profile'
                        if (navigator.share) {
                            navigator.share({
                                title: "Connect with Disha Sanghvi | Curae",
                                text: "Hi! I'm Disha Sanghvi, Founder of Curae. Let's connect!",
                                url: url
                            })
                        } else {
                            navigator.clipboard.writeText(url)
                            alert("Profile link copied!")
                        }
                    }}
                >
                    <Share2 className="h-4 w-4" /> Share Profile
                </Button>

            </DialogContent>
        </Dialog>
    )
}
