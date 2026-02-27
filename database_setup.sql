-- Run this script in your Supabase SQL Editor

-- 1. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_mobile TEXT,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PAID'::text,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Sales Table (for both direct sales and invoiced sales)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    sale_price NUMERIC NOT NULL, -- Price at which it was actually sold
    cost_price NUMERIC NOT NULL, -- The original cost price (price_inr * exchange_rate) at time of sale
    profit NUMERIC NOT NULL,     -- sale_price - cost_price
    sale_type TEXT NOT NULL CHECK (sale_type IN ('DIRECT', 'INVOICE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Set up Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated/anon users (matching your current open setup if you are not using Auth)
-- Adjust these if your products table has stricter policies
CREATE POLICY "Enable all for everyone on invoices" ON public.invoices
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for everyone on sales" ON public.sales
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create simple sequence for invoice numbers if needed
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;
