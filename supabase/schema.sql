-- =====================================================
-- MANGO BUSINESS MANAGEMENT — COMPLETE SUPABASE SCHEMA
-- Run this entire file in the Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text CHECK (role IN ('owner', 'employee')) DEFAULT 'employee',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Owner can update any profile except self-deactivate"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  )
  WITH CHECK (
    CASE
      WHEN id = auth.uid() THEN is_active = true
      ELSE true
    END
  );

-- Trigger: auto-create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'employee',
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =====================================================
-- 2. SUPPLIERS TABLE
-- =====================================================
CREATE TABLE public.suppliers (
  supplier_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read suppliers"
  ON public.suppliers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert suppliers"
  ON public.suppliers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update suppliers"
  ON public.suppliers FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only owner can delete suppliers"
  ON public.suppliers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );


-- =====================================================
-- 3. STOCK PURCHASES TABLE
-- =====================================================
CREATE TABLE public.stock_purchases (
  purchase_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(supplier_id) ON DELETE SET NULL,
  jumbo_dz numeric DEFAULT 0,
  large_dz numeric DEFAULT 0,
  medium_dz numeric DEFAULT 0,
  small_dz numeric DEFAULT 0,
  total_amount numeric,
  amount_paid numeric,
  payment_date date,
  payment_method text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.stock_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock_purchases"
  ON public.stock_purchases FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert stock_purchases"
  ON public.stock_purchases FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stock_purchases"
  ON public.stock_purchases FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only owner can delete stock_purchases"
  ON public.stock_purchases FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );


-- =====================================================
-- 4. CUSTOMERS TABLE
-- =====================================================
CREATE TABLE public.customers (
  customer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customers"
  ON public.customers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers"
  ON public.customers FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only owner can delete customers"
  ON public.customers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );


-- =====================================================
-- 5. SALES ORDERS TABLE (with auto-increment serial)
-- =====================================================
CREATE SEQUENCE sales_order_serial_seq START 1;

CREATE TABLE public.sales_orders (
  order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number integer DEFAULT nextval('sales_order_serial_seq'),
  date date NOT NULL,
  customer_id uuid REFERENCES public.customers(customer_id) ON DELETE SET NULL,
  size text CHECK (size IN ('Jumbo', 'Large', 'Medium', 'Small')),
  quantity_dz numeric NOT NULL,
  amount numeric NOT NULL,
  payment_status text CHECK (payment_status IN ('Paid', 'Due', 'Partial')),
  payment_method text,
  delivery_status text CHECK (delivery_status IN ('Delivered', 'Pending', 'Scheduled')),
  delivery_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sales_orders"
  ON public.sales_orders FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert sales_orders"
  ON public.sales_orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sales_orders"
  ON public.sales_orders FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only owner can delete sales_orders"
  ON public.sales_orders FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );


-- =====================================================
-- 6. MANGO RATES TABLE
-- =====================================================
CREATE TABLE public.mango_rates (
  rate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size text UNIQUE,
  sell_price_per_dz numeric,
  cost_price_per_dz numeric,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.mango_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mango_rates"
  ON public.mango_rates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only owner can update mango_rates"
  ON public.mango_rates FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Only owner can insert mango_rates"
  ON public.mango_rates FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Only owner can delete mango_rates"
  ON public.mango_rates FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );


-- =====================================================
-- 7. RATE HISTORY TABLE
-- =====================================================
CREATE TABLE public.rate_history (
  rate_history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size text NOT NULL,
  old_sell numeric,
  new_sell numeric,
  old_cost numeric,
  new_cost numeric,
  changed_at timestamptz DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rate_history"
  ON public.rate_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only owner can insert rate_history"
  ON public.rate_history FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );


-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_sales_orders_date ON public.sales_orders(date);
CREATE INDEX idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX idx_sales_orders_size ON public.sales_orders(size);
CREATE INDEX idx_sales_orders_payment_status ON public.sales_orders(payment_status);
CREATE INDEX idx_sales_orders_delivery_status ON public.sales_orders(delivery_status);
CREATE INDEX idx_stock_purchases_date ON public.stock_purchases(date);
CREATE INDEX idx_stock_purchases_supplier ON public.stock_purchases(supplier_id);
CREATE INDEX idx_mango_rates_size ON public.mango_rates(size);
CREATE INDEX idx_rate_history_size ON public.rate_history(size);
CREATE INDEX idx_rate_history_changed_at ON public.rate_history(changed_at);


-- =====================================================
-- 9. SEED DATA — DEFAULT MANGO RATES
-- =====================================================
INSERT INTO public.mango_rates (size, sell_price_per_dz, cost_price_per_dz)
VALUES
  ('Jumbo',  1710, 1500),
  ('Large',  1380, 1200),
  ('Medium', 1160, 1000),
  ('Small',  760,  650);
