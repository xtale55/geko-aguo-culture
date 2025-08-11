-- Create user profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create farms table
CREATE TABLE public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    total_area DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own farms" ON public.farms
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own farms" ON public.farms
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own farms" ON public.farms
    FOR UPDATE USING (auth.uid() = user_id);

-- Create ponds table
CREATE TABLE public.ponds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    area DECIMAL(10,2) NOT NULL,
    depth DECIMAL(5,2) NOT NULL,
    status TEXT CHECK (status IN ('free', 'in_use')) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ponds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ponds from own farms" ON public.ponds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.farms 
            WHERE farms.id = ponds.farm_id 
            AND farms.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert ponds to own farms" ON public.ponds
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farms 
            WHERE farms.id = ponds.farm_id 
            AND farms.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update ponds from own farms" ON public.ponds
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.farms 
            WHERE farms.id = ponds.farm_id 
            AND farms.user_id = auth.uid()
        )
    );

-- Create batches table (lotes)
CREATE TABLE public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    arrival_date DATE NOT NULL,
    total_pl_quantity INTEGER NOT NULL,
    pl_size DECIMAL(5,2) NOT NULL,
    pl_cost DECIMAL(10,2) NOT NULL,
    survival_rate DECIMAL(5,2) DEFAULT 85.0,
    status TEXT CHECK (status IN ('active', 'finished')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view batches from own farms" ON public.batches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.farms 
            WHERE farms.id = batches.farm_id 
            AND farms.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert batches to own farms" ON public.batches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farms 
            WHERE farms.id = batches.farm_id 
            AND farms.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update batches from own farms" ON public.batches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.farms 
            WHERE farms.id = batches.farm_id 
            AND farms.user_id = auth.uid()
        )
    );

-- Create pond_batches table (distribuição do lote nos viveiros)
CREATE TABLE public.pond_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pond_id UUID REFERENCES public.ponds(id) ON DELETE CASCADE NOT NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
    pl_quantity INTEGER NOT NULL,
    preparation_cost DECIMAL(10,2) DEFAULT 0,
    current_population INTEGER NOT NULL,
    stocking_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(pond_id, batch_id)
);

ALTER TABLE public.pond_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pond_batches from own farms" ON public.pond_batches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ponds p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE p.id = pond_batches.pond_id 
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert pond_batches to own farms" ON public.pond_batches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ponds p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE p.id = pond_batches.pond_id 
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update pond_batches from own farms" ON public.pond_batches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.ponds p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE p.id = pond_batches.pond_id 
            AND f.user_id = auth.uid()
        )
    );

-- Create biometrics table
CREATE TABLE public.biometrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pond_batch_id UUID REFERENCES public.pond_batches(id) ON DELETE CASCADE NOT NULL,
    measurement_date DATE NOT NULL,
    average_weight DECIMAL(6,2) NOT NULL,
    uniformity DECIMAL(5,2),
    sample_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.biometrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view biometrics from own farms" ON public.biometrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pond_batches pb
            JOIN public.ponds p ON pb.pond_id = p.id
            JOIN public.farms f ON p.farm_id = f.id
            WHERE pb.id = biometrics.pond_batch_id 
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert biometrics to own farms" ON public.biometrics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pond_batches pb
            JOIN public.ponds p ON pb.pond_id = p.id
            JOIN public.farms f ON p.farm_id = f.id
            WHERE pb.id = biometrics.pond_batch_id 
            AND f.user_id = auth.uid()
        )
    );

-- Create mortality records table
CREATE TABLE public.mortality_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pond_batch_id UUID REFERENCES public.pond_batches(id) ON DELETE CASCADE NOT NULL,
    record_date DATE NOT NULL,
    dead_count INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.mortality_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mortality_records from own farms" ON public.mortality_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pond_batches pb
            JOIN public.ponds p ON pb.pond_id = p.id
            JOIN public.farms f ON p.farm_id = f.id
            WHERE pb.id = mortality_records.pond_batch_id 
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert mortality_records to own farms" ON public.mortality_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pond_batches pb
            JOIN public.ponds p ON pb.pond_id = p.id
            JOIN public.farms f ON p.farm_id = f.id
            WHERE pb.id = mortality_records.pond_batch_id 
            AND f.user_id = auth.uid()
        )
    );

-- Create trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farms_updated_at
    BEFORE UPDATE ON public.farms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ponds_updated_at
    BEFORE UPDATE ON public.ponds
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_batches_updated_at
    BEFORE UPDATE ON public.batches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pond_batches_updated_at
    BEFORE UPDATE ON public.pond_batches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();