-- LogiPulse schema. Idempotent: safe to run on every boot.
-- Coordinates use DOUBLE PRECISION so drivers return JS numbers (not strings) for Haversine maths.

DO $$ BEGIN CREATE TYPE order_status AS ENUM ('PENDING','ACCEPTED','PICKED_UP','IN_TRANSIT','DELIVERED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_priority AS ENUM ('NORMAL','HIGH','URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sender_role AS ENUM ('user','rider');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS riders (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(100) NOT NULL,
  email                VARCHAR(255) NOT NULL UNIQUE,
  password_hash        VARCHAR(100) NOT NULL,
  current_lat          DOUBLE PRECISION,
  current_lng          DOUBLE PRECISION,
  location_updated_at  TIMESTAMPTZ,
  is_available         BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  user_id          INT NOT NULL REFERENCES users(id),
  rider_id         INT REFERENCES riders(id),          -- NULL until a rider accepts
  pickup_address   VARCHAR(300) NOT NULL,
  pickup_lat       DOUBLE PRECISION NOT NULL,
  pickup_lng       DOUBLE PRECISION NOT NULL,
  delivery_address VARCHAR(300) NOT NULL,
  description      TEXT,
  status           order_status DEFAULT 'PENDING',
  priority         order_priority DEFAULT 'NORMAL',    -- Day 2 feature, in the schema from Day 1
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_role sender_role NOT NULL,
  sender_id   INT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_status_log (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     order_status NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS priority_change_log (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  priority   order_priority NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);
CREATE INDEX IF NOT EXISTS idx_orders_status_pending ON orders(id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_status_log_order ON order_status_log(order_id);
CREATE INDEX IF NOT EXISTS idx_priority_log_order ON priority_change_log(order_id);
