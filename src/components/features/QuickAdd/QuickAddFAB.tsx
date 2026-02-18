"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { QuickAddModal } from "./QuickAddModal"

export function QuickAddFAB() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <Button
                    size="icon"
                    className="h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 bg-[#d4af37] hover:bg-[#b5952f] text-black"
                    onClick={() => setIsOpen(true)}
                >
                    <Plus className="h-8 w-8" />
                </Button>
            </div>
            <QuickAddModal open={isOpen} onOpenChange={setIsOpen} />
        </>
    )
}
