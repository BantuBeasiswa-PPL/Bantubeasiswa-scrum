# PBI-36: BeasiswaForm Component Documentation

## 📋 Overview

`BeasiswaForm` is a reusable React component for creating and editing scholarship programs (Beasiswa) for donors (Pendonor). The component supports two modes:
- **Create mode**: Empty form for new programs
- **Edit mode**: Pre-filled form for editing existing programs

## 🎯 Component Props

```javascript
<BeasiswaForm
  initialData={object|null}     // Required. null = create mode, object = edit mode
  onSubmit={callback}           // Required. Called with validated form data
  onCancel={callback}           // Required. Called when user clicks "Batal"
/>
```

### Props Detailed:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialData` | object \| null | null | If provided, form enters edit mode and pre-fills all fields. Object should have keys: judul, deskripsi, syarat, nominal, kuota, deadline, status |
| `onSubmit` | function | - | Async callback. Receives validated form data with all fields. Nominal is converted to integer. |
| `onCancel` | function | - | Callback fired when user clicks "Batal" button |

## 📝 Form Fields

### 1. Judul Beasiswa (Title)
- **Type**: Text input
- **Constraints**: max 150 characters, required
- **Features**: 
  - Live character counter
  - Progress bar (green → yellow → red)
  - Red border when exceeds limit
  - Validation: "Judul maksimal 150 karakter"

### 2. Deskripsi Program (Description)
- **Type**: Textarea
- **Constraints**: min 50 characters, required
- **Features**:
  - Character counter (live)
  - Shows "Kurang X karakter" when below minimum
  - Placeholder with guidance
  - Validation on blur

### 3. Persyaratan Pendaftaran (Requirements)
- **Type**: Textarea
- **Constraints**: required, multi-line
- **Features**:
  - Accepts one requirement per line
  - Placeholder with examples

### 4. Nominal Dana per Mahasiswa (Scholarship Amount)
- **Type**: Number input with Rupiah formatting
- **Display**: "Rp 5.000.000"
- **Storage**: Integer (5000000)
- **Features**:
  - Auto-formats as user types
  - Rupiah prefix indicator
  - Validation: must be > 0

### 5. Total Kuota Penerima (Total Recipients)
- **Type**: Number input
- **Constraints**: min 1, required
- **Storage**: Integer
- **Validation**: "Kuota minimal 1 penerima"

### 6. Batas Waktu Pendaftaran (Registration Deadline)
- **Type**: datetime-local input
- **Constraints**: required, must be tomorrow or later
- **Features**:
  - Min attribute automatically set to tomorrow
  - Validation: "Deadline harus di masa mendatang"

### 7. Status Awal (Initial Status)
- **Type**: Radio buttons
- **Options**: "Draft" or "Publish"
- **Default**: "Draft"
- **Storage**: 'draft' | 'publish'

## 🔍 Real-time Validation

The component validates fields as the user types:

| Field | Trigger | Error Message |
|-------|---------|---------------|
| Judul | input change | "Judul maksimal 150 karakter" if > 150 |
| Deskripsi | input change | "Minimal 50 karakter (X/50)" if < 50 |
| Nominal | input change | "Nominal harus lebih dari 0" if ≤ 0 |
| Deadline | input change | "Deadline harus di masa mendatang" if past date |

**Touch-aware behavior**: Errors only display after user has interacted with the field (blur or change).

## 🎨 UI/UX Features

### Layout
- **Header**: Title changes based on mode ("Tambah Program Beasiswa Baru" vs "Edit Program Beasiswa")
- **Two-column grid** for short fields:
  - Row 1: Nominal Dana | Total Kuota
  - Row 2: Deadline | Status
- **Full-width** for textareas
- **Buttons**: "Batal" (gray) and "Simpan Program" (blue) with loading spinner

### Visual Feedback
- ✅ Green borders on valid/touched fields
- ❌ Red borders on invalid fields with error icon
- 📊 Progress bar for character count
- ⏳ Loading spinner on submit button
- 🎨 Inline Rupiah formatting

### Responsive Design
- Uses Tailwind CSS grid system
- Mobile-friendly spacing and sizing

## 🔄 Form Data Flow

### Create Mode
```javascript
<BeasiswaForm
  initialData={null}
  onSubmit={(data) => {
    console.log(data);
    // {
    //   judul: "Beasiswa Prestasi...",
    //   deskripsi: "Program beasiswa...",
    //   syarat: "IPK minimal 3.5...",
    //   nominal: 5000000,  // integer
    //   kuota: 50,
    //   deadline: "2026-12-31T23:59",
    //   status: "draft"
    // }
  }}
  onCancel={() => router.back()}
/>
```

### Edit Mode
```javascript
<BeasiswaForm
  initialData={{
    judul: "Beasiswa Prestasi...",
    deskripsi: "Program beasiswa...",
    syarat: "IPK minimal 3.5...",
    nominal: 5000000,
    kuota: 50,
    deadline: "2026-12-31T23:59",
    status: "publish"
  }}
  onSubmit={(data) => {
    // Update existing scholarship
  }}
  onCancel={() => router.back()}
/>
```

## 🧪 Testing

### Test Create Mode
Navigate to `/pendonor/form-demo` → Click "Mode Create (Kosong)" button

**Expected behavior**:
- All fields empty
- Form header shows "Tambah Program Beasiswa Baru"
- Button text shows "Simpan Program"

### Test Edit Mode
Navigate to `/pendonor/form-demo` → Click "Mode Edit (Pre-filled)" button

**Expected behavior**:
- All fields populated with sample data
- Form header shows "Edit Program Beasiswa"
- Button text shows "Simpan Perubahan"

### Test Validation
1. **Title > 150 chars**: Type 151+ characters → Red border appears
2. **Deadline in past**: Select yesterday → Error message shows
3. **Nominal = 0**: Leave blank or enter 0 → Error on submit
4. **Description < 50 chars**: Type 30 characters → Warning shows "Kurang 20 karakter"

## 🔗 Integration with PBI-37 (Database)

This component is designed to be database-agnostic. For PBI-37:

1. Import the component into your page/modal
2. Provide `initialData` from Supabase query
3. In `onSubmit` callback, call your API endpoint:

```javascript
const handleSubmit = async (formData) => {
  const response = await fetch('/api/pendonor/beasiswa/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  
  if (response.ok) {
    router.push('/pendonor/dashboard');
  }
};
```

## 🛠️ Implementation Notes

### Rupiah Formatting Logic
- **formatRupiah()**: Converts 5000000 → "Rp 5.000.000" (using Intl.NumberFormat)
- **parseRupiah()**: Strips non-numeric characters, converts back to integer
- Value stored in state as integer, displayed as formatted string

### Deadline Validation
- **getTomorrowISO()**: Calculates tomorrow's date in YYYY-MM-DDTHH:mm format
- Used as min attribute on datetime-local input
- Server-side validation should also enforce this

### Character Counting
- Real-time counters for Judul and Deskripsi
- Deskripsi uses `.trim()` to exclude leading/trailing whitespace

### Loading State
- Button disabled during submission
- Spinner icon appears with "Menyimpan..." text
- Parent component should handle actual data submission

## 📦 File Location
`/bantubeasiswa/components/BeasiswaForm.js`

## 🚀 Demo Page
`/pendonor/form-demo` - Interactive demo with both create and edit modes

## 🔐 Security Considerations
- All validation is client-side (real-time UX feedback)
- **Server-side validation required** for PBI-37 API endpoint
- Always validate deadline, nominal, and kuota on backend
- Sanitize Judul, Deskripsi, Syarat fields for XSS prevention
