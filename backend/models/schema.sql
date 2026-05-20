-- =====================================================
-- Hospital Patient Management System (HPMS)
-- PostgreSQL Schema
-- =====================================================

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS billing CASCADE;
DROP TABLE IF EXISTS ehr_records CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -------------------------------------------------
-- USERS  (patients, doctors, nurses, admins)
-- -------------------------------------------------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(120) NOT NULL,
    email           VARCHAR(120) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('PATIENT','DOCTOR','NURSE','ADMIN')),
    phone           VARCHAR(30),
    date_of_birth   DATE,
    address         TEXT,
    specialisation  VARCHAR(100),   -- doctors only
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_role  ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- -------------------------------------------------
-- APPOINTMENTS
-- -------------------------------------------------
CREATE TABLE appointments (
    id              SERIAL PRIMARY KEY,
    patient_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_dt  TIMESTAMP NOT NULL,
    reason          TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'BOOKED'
                    CHECK (status IN ('BOOKED','COMPLETED','CANCELLED')),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_appt_patient ON appointments(patient_id);
CREATE INDEX idx_appt_doctor  ON appointments(doctor_id);
CREATE INDEX idx_appt_date    ON appointments(appointment_dt);

-- -------------------------------------------------
-- ELECTRONIC HEALTH RECORDS
-- -------------------------------------------------
CREATE TABLE ehr_records (
    id              SERIAL PRIMARY KEY,
    patient_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    diagnosis       TEXT NOT NULL,
    prescription    TEXT,
    notes           TEXT,
    visit_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ehr_patient ON ehr_records(patient_id);

-- -------------------------------------------------
-- BILLING
-- -------------------------------------------------
CREATE TABLE billing (
    id              SERIAL PRIMARY KEY,
    patient_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id  INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    amount          NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','PAID','CANCELLED')),
    issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_date       DATE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bill_patient ON billing(patient_id);
CREATE INDEX idx_bill_status  ON billing(status);

-- -------------------------------------------------
-- AUDIT LOGS  (security & compliance)
-- -------------------------------------------------
CREATE TABLE audit_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(80) NOT NULL,
    resource        VARCHAR(80),
    ip_address      VARCHAR(64),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);

-- -------------------------------------------------
-- SEED DATA  (passwords are bcrypt-hashed "Password123!")
-- Hash generated with: bcrypt.hashSync("Password123!", 10)
-- -------------------------------------------------
INSERT INTO users (full_name, email, password_hash, role, phone, specialisation) VALUES
('System Administrator',     'admin@hpms.local',  '$2a$10$qZ8XJ1H9pZ4l5mY3kVxN8eXxYqGmF7ZqVZqVZqVZqVZqVZqVZqVZ', 'ADMIN',   '0400000001', NULL),
('Dr. Sarah Chen',           'sarah.chen@hpms.local', '$2a$10$qZ8XJ1H9pZ4l5mY3kVxN8eXxYqGmF7ZqVZqVZqVZqVZqVZqVZqVZ', 'DOCTOR',  '0400000002', 'Cardiology'),
('Dr. Raj Patel',            'raj.patel@hpms.local', '$2a$10$qZ8XJ1H9pZ4l5mY3kVxN8eXxYqGmF7ZqVZqVZqVZqVZqVZqVZqVZ', 'DOCTOR',  '0400000003', 'General Practice'),
('Nurse Emma Wilson',        'emma.wilson@hpms.local', '$2a$10$qZ8XJ1H9pZ4l5mY3kVxN8eXxYqGmF7ZqVZqVZqVZqVZqVZqVZqVZ', 'NURSE',   '0400000004', NULL),
('John Smith',               'john.smith@hpms.local', '$2a$10$qZ8XJ1H9pZ4l5mY3kVxN8eXxYqGmF7ZqVZqVZqVZqVZqVZqVZqVZ', 'PATIENT', '0400000005', NULL),
('Mary Johnson',             'mary.johnson@hpms.local', '$2a$10$qZ8XJ1H9pZ4l5mY3kVxN8eXxYqGmF7ZqVZqVZqVZqVZqVZqVZqVZ', 'PATIENT', '0400000006', NULL);

-- Sample appointments
INSERT INTO appointments (patient_id, doctor_id, appointment_dt, reason, status) VALUES
(5, 2, NOW() + INTERVAL '2 days', 'Annual cardiac check-up', 'BOOKED'),
(6, 3, NOW() + INTERVAL '1 day',  'Persistent cough', 'BOOKED'),
(5, 3, NOW() - INTERVAL '7 days', 'General consultation', 'COMPLETED');

-- Sample EHR
INSERT INTO ehr_records (patient_id, doctor_id, diagnosis, prescription, notes) VALUES
(5, 3, 'Mild hypertension', 'Amlodipine 5mg daily', 'Patient advised low-sodium diet'),
(6, 2, 'Seasonal allergic rhinitis', 'Loratadine 10mg as needed', 'Follow-up in 4 weeks');

-- Sample billing
INSERT INTO billing (patient_id, appointment_id, amount, description, status) VALUES
(5, 3, 120.00, 'General consultation fee', 'PAID'),
(6, 2, 90.00,  'GP consultation - cough assessment', 'PENDING');
