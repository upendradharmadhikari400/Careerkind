CREATE TABLE public.counselling_coupons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code_hash text UNIQUE NOT NULL, discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 1 AND 99), max_uses integer NOT NULL CHECK (max_uses > 0), active boolean NOT NULL DEFAULT true);
GRANT ALL ON public.counselling_coupons TO service_role;
ALTER TABLE public.counselling_coupons ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.counselling_coupon_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), coupon_id uuid NOT NULL REFERENCES public.counselling_coupons(id), user_id uuid NOT NULL, amount integer NOT NULL CHECK (amount > 0), mode text NOT NULL, order_id text UNIQUE, payment_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.counselling_coupon_orders TO service_role;
ALTER TABLE public.counselling_coupon_orders ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX counselling_one_pending_coupon ON public.counselling_coupon_orders(coupon_id,user_id) WHERE payment_id IS NULL;
CREATE FUNCTION public.reserve_counselling_coupon(p_hash text, p_user uuid, p_base_amount integer, p_mode text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.counselling_coupons; r public.counselling_coupon_orders;
BEGIN
SELECT * INTO c FROM public.counselling_coupons WHERE code_hash=p_hash AND active FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Coupon is invalid or unavailable.'; END IF;
SELECT * INTO r FROM public.counselling_coupon_orders WHERE coupon_id=c.id AND user_id=p_user AND payment_id IS NULL;
IF FOUND THEN RETURN to_jsonb(r); END IF;
IF (SELECT count(*) FROM public.counselling_coupon_orders WHERE coupon_id=c.id) >= c.max_uses THEN RAISE EXCEPTION 'All coupon places have been used or reserved.'; END IF;
INSERT INTO public.counselling_coupon_orders(coupon_id,user_id,amount,mode) VALUES(c.id,p_user,round(p_base_amount*(100-c.discount_percent)/100.0),p_mode) RETURNING * INTO r;
RETURN to_jsonb(r);
END; $$;
REVOKE ALL ON FUNCTION public.reserve_counselling_coupon(text,uuid,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_counselling_coupon(text,uuid,integer,text) TO service_role;