
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
}

// Custom resilient fetch wrapper to bypass ISP DNS/CORS blocks in India
const customFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    try {
        // 1. Try the direct, fastest route first
        return await fetch(url, options)
    } catch (err: any) {
        // 2. If it throws a network error (like "Failed to fetch" on Jio/Airtel), try a proxy
        if (err.name === 'TypeError' && typeof url === 'string') {
            console.warn("Direct connection blocked! Rerouting through proxy...", url)
            try {
                // Public proxies strip custom headers for security. Fortunately, Supabase allows the `apikey` in the URL!
                let proxyTarget = url

                // Extract apikey from the headers Supabase tries to send
                const headers = new Headers(options?.headers)
                const apiKey = headers.get('apikey') || supabaseKey

                if (apiKey) {
                    const separator = proxyTarget.includes('?') ? '&' : '?'
                    proxyTarget = `${proxyTarget}${separator}apikey=${apiKey}`
                }

                // api.allorigins.win is much faster than codetabs and passes queries perfectly when using /raw
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(proxyTarget)}`
                return await fetch(proxyUrl, options)
            } catch (proxyErr) {
                console.error("Proxy also failed:", proxyErr)
                throw proxyErr // Both failed, bubble up the error
            }
        }
        throw err // Not a network error, bubble up
    }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
        fetch: customFetch
    }
})
