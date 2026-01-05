
# 🪺 PromptNest - Professional AI Prompt Library

**PromptNest** adalah aplikasi manajemen prompt minimalis yang dirancang untuk power users. Aplikasi ini memungkinkan pengguna untuk menyimpan, mengorganisir, dan mengeksekusi prompt AI dengan variabel dinamis di berbagai platform seperti ChatGPT, Claude, dan Gemini.

## 🚀 Fitur Utama

- **Dynamic Variable Engine**: Mengubah teks statis menjadi form input otomatis menggunakan sintaks `{{variable_name}}`.
- **Version History**: Snapshot otomatis setiap kali perubahan disimpan, memungkinkan restorasi ke versi sebelumnya.
- **Smart Filtering**: Sistem filter multi-tag dan pengurutan (Newest, Oldest, A-Z, Z-A).
- **Cloud Sync**: Sinkronisasi real-time dengan Supabase sebagai backend.
- **Direct Execution**: Salin otomatis ke clipboard dan buka platform AI target dalam satu klik.
- **License-Based Auth**: Sistem akses eksklusif menggunakan kode lisensi.

## 🛠 Tech Stack

- **Frontend**: React (ES6 Modules), Tailwind CSS.
- **Icons**: Lucide React.
- **Backend/Database**: Supabase (PostgreSQL, Auth).
- **Deployment**: Optimized for modern browser environments.

## 📂 Struktur Folder

```text
/
├── App.tsx             # Entry point utama & Logic state global
├── index.html          # Template HTML & Tailwind Config
├── index.tsx           # Mounting React ke DOM
├── types.ts            # Definisi Interface TypeScript (Single Source of Truth)
├── config.ts           # Konfigurasi API Keys (Supabase, Google)
├── components/         # Komponen UI Terfragmentasi
│   ├── LandingPage.tsx # Halaman Marketing & Fitur
│   ├── AuthModal.tsx   # Sistem Login Lisensi
│   ├── PromptCard.tsx  # Display Card Prompt di Dashboard
│   ├── PromptModal.tsx # Editor Prompt, Variabel, & History
│   └── ProfileModal.tsx# Pengaturan Profil User
└── services/           # Business Logic & Data Fetching
    ├── auth.ts         # Integrasi Supabase Auth & Profiling
    └── storage.ts      # Manajemen Database Prompts & Caching
```

## 🏗 Setup Database (Supabase)

Untuk menjalankan aplikasi ini di VScode, pastikan Anda memiliki tabel berikut di proyek Supabase Anda:

### 1. Tabel `licenses`
Menyimpan kode akses untuk user.
```sql
create table licenses (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  is_used boolean default false,
  used_by uuid references auth.users(id),
  activated_at timestamp with time zone
);
```

### 2. Tabel `profiles`
Ekstensi dari data user auth.
```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  display_name text,
  username text unique,
  photo_url text,
  license_code text,
  created_at timestamp with time zone default now()
);
```

### 3. Tabel `prompts`
Penyimpanan data prompt utama.
```sql
create table prompts (
  id uuid primary key,
  user_id uuid references auth.users(id),
  title text not null,
  description text,
  content text not null,
  tags text[] default '{}',
  platform text,
  is_favorite boolean default false,
  history jsonb default '[]',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

## 🧠 Panduan Pengembangan

### Sintaks Variabel
Sistem mendeteksi variabel secara otomatis menggunakan Regex di `PromptModal.tsx`. 
Contoh penggunaan:
`"Tuliskan caption Instagram tentang {{topik}} untuk audiens {{target}}."`
Aplikasi akan secara otomatis membuat form input untuk `topik` dan `target`.

### State Management
Aplikasi menggunakan React Hooks (`useState`, `useMemo`, `useEffect`) untuk manajemen state. Sinkronisasi cloud ditangani di `services/storage.ts` dengan sistem optimistik UI (update cache lokal dulu, lalu sync ke server).

### Autentikasi
Sistem tidak menggunakan email/password tradisional secara langsung di UI, melainkan memetakan `username` + `license_code` ke dalam sistem kredensial Supabase Auth untuk keamanan tinggi.

---
**Note for AI Agents:**
When modifying UI components, ensure to maintain the minimalist aesthetic (Inter font, neutral backgrounds, subtle shadows). Follow the `types.ts` strictly for any data structure changes.
