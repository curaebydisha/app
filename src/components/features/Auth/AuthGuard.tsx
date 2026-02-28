"use client"

import { useState, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [pin, setPin] = useState("")
    const [error, setError] = useState(false)

    const pathname = usePathname()

    useEffect(() => {
        // Only run on client
        const currentPath = window.location.pathname
        const isPublicRoute = currentPath.includes('/product_detail')

        const storedAuth = localStorage.getItem("admin_authenticated")
        if (storedAuth === "true" || isPublicRoute) {
            setIsAuthenticated(true)
        }
        setIsLoading(false)
    }, [pathname])

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        const correctPin = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234"

        if (pin === correctPin) {
            localStorage.setItem("admin_authenticated", "true")
            setIsAuthenticated(true)
            setError(false)
        } else {
            setError(true)
            setPin("")
        }
    }

    // While checking localStorage, show nothing or a tiny spinner to prevent flash of content
    if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"></div>

    if (isAuthenticated) {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-[family-name:var(--font-geist-sans)]">
            <div className="w-full max-w-sm flex flex-col items-center gap-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-[#d4af37] mb-2">Curae Admin</h1>
                    <p className="text-sm text-muted-foreground">Enter your PIN to access the dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                    <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoFocus
                        placeholder="••••"
                        className={`w-full text-center text-3xl tracking-widest p-4 rounded-xl border-2 bg-muted/30 focus:outline-none transition-colors ${error ? 'border-red-500 text-red-500' : 'border-[#d4af37]/30 focus:border-[#d4af37]'}`}
                        value={pin}
                        onChange={(e) => {
                            setPin(e.target.value)
                            setError(false)
                        }}
                    />

                    {error && (
                        <p className="text-xs text-red-500 text-center font-medium">Incorrect PIN. Please try again.</p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-[#d4af37] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#b08d24] transition-colors mt-2 uppercase tracking-wide disabled:opacity-50"
                        disabled={pin.length < 4}
                    >
                        Unlock App
                    </button>
                </form>
            </div>
        </div>
    )
}
