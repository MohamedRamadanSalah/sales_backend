-- ==========================================
-- 1. Create Custom ENUM Types
-- ==========================================
CREATE TYPE user_role AS ENUM ('admin', 'client', 'broker');
CREATE TYPE listing_type AS ENUM ('sale', 'rent');
CREATE TYPE property_origin AS ENUM ('primary', 'resale');
CREATE TYPE finishing_type AS ENUM ('core_and_shell', 'semi_finished', 'fully_finished', 'furnished');
CREATE TYPE legal_status AS ENUM ('registered', 'primary_contract', 'unregistered'); -- مسجل، عقد ابتدائي، غير مسجل
CREATE TYPE property_status AS ENUM ('pending_approval', 'approved', 'rejected', 'sold', 'rented', 'inactive');
CREATE TYPE location_type AS ENUM ('governorate', 'city', 'neighborhood');
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');
CREATE TYPE invoice_status AS ENUM ('unpaid', 'paid', 'overdue', 'cancelled');

-- ==========================================
-- 2. Create Tables
-- ==========================================

-- USERS Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'client',
    profile_picture_url VARCHAR(255),
    preferred_language VARCHAR(2) DEFAULT 'ar', -- Default communication lang
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DEVELOPERS Table (e.g., Emaar)
CREATE TABLE developers (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(255) UNIQUE NOT NULL,
    name_en VARCHAR(255) UNIQUE NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    logo_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LOCATIONS Table (Hierarchical mapping: Governorate -> City -> Neighborhood)
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    type location_type NOT NULL,
    parent_id INT REFERENCES locations(id) ON DELETE CASCADE,
    UNIQUE(name_ar, parent_id),
    UNIQUE(name_en, parent_id)
);

-- PROJECTS/COMPOUNDS Table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    developer_id INT NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    delivery_year INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CATEGORIES Table (e.g., Apartment, Villa, Chalet, Commercial)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

-- PROPERTIES Table (The core listing data)
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- The Seller/Broker
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    
    project_id INT REFERENCES projects(id) ON DELETE SET NULL,     
    developer_id INT REFERENCES developers(id) ON DELETE SET NULL, 

    -- **Bilingual User Input Requirement**
    title_ar VARCHAR(255) NOT NULL,
    title_en VARCHAR(255), -- Not strictly required at insert, but highly recommended
    description_ar TEXT NOT NULL,
    description_en TEXT, 
    
    -- Real Estate Meta-Data
    listing_type listing_type NOT NULL,
    property_origin property_origin NOT NULL, 
    finishing_type finishing_type NOT NULL,
    legal_status legal_status NOT NULL, -- مسجل شهر عقاري أو لا
    
    -- Pricing and Installments (Egyptian Market Dynamics)
    price DECIMAL(15, 2) NOT NULL, 
    currency VARCHAR(10) DEFAULT 'EGP',
    down_payment DECIMAL(15, 2), 
    installment_years INT DEFAULT 0,
    delivery_date DATE,
    maintenance_deposit DECIMAL(15, 2), -- وديعة الصيانة (Can be fixed amount or percentage of price)
    commission_percentage DECIMAL(5, 2) DEFAULT 0.00, -- Brokerage commission
    
    -- Physical Specs
    area_sqm DECIMAL(10, 2) NOT NULL,
    bedrooms INT,
    bathrooms INT,
    floor_level INT, 
    
    -- System Workflow
    status property_status DEFAULT 'pending_approval', 
    
    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PROPERTY IMAGES Table
CREATE TABLE property_images (
    id SERIAL PRIMARY KEY,
    property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AMENITIES Lookup Table (Bilingual)
CREATE TABLE amenities (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(100) UNIQUE NOT NULL,
    name_en VARCHAR(100) UNIQUE NOT NULL
);

-- PROPERTY AMENITIES Junction Table
CREATE TABLE property_amenities (
    property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    amenity_id INT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, amenity_id)
);

-- FAVORITES Table
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, property_id)
);

-- ORDERS Table (Purchase requests for properties)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
    property_id INT NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    total_amount DECIMAL(15, 2) NOT NULL,
    status order_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INVOICES Table (Billing the client for the order/downpayment)
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status DEFAULT 'unpaid',
    payment_method VARCHAR(50), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. Automation (Update Timestamps)
-- ==========================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_developers_modtime BEFORE UPDATE ON developers FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_properties_modtime BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_invoices_modtime BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_modified_column();
