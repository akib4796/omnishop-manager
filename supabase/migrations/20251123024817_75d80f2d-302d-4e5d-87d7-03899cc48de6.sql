-- Create sales table for completed transactions
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID REFERENCES public.customers(id),
  total_amount DECIMAL NOT NULL DEFAULT 0,
  discount_amount DECIMAL DEFAULT 0,
  tax_amount DECIMAL DEFAULT 0,
  payment_method TEXT NOT NULL,
  items JSONB NOT NULL,
  notes TEXT,
  cashier_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_from_offline BOOLEAN DEFAULT false
);

-- Enable RLS on sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Sales policies
CREATE POLICY "Users can view sales in their tenant"
  ON public.sales FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "All users can insert sales"
  ON public.sales FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  category TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Users can view expenses in their tenant"
  ON public.expenses FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins and managers can insert expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins and managers can update expenses"
  ON public.expenses FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins can delete expenses"
  ON public.expenses FOR DELETE
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product images
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images' AND
    auth.role() = 'authenticated'
  );