import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_cell_border_left_only(cell, color_hex="1E3A8A", sz="36"):
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/>'
        f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)

def set_table_borders(table, color_hex="CBD5E1"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="{color_hex}"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
        f'<w:insideV w:val="none"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def add_code_block(doc, text_content):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = tbl.rows[0].cells[0]
    c.width = Inches(6.6)
    set_cell_background(c, "F8FAFC")
    set_cell_margins(c, top=80, bottom=80, left=120, right=120)
    p = c.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.1
    run = p.add_run(text_content)
    run.font.name = "Consolas"
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(30, 41, 59)
    set_table_borders(tbl, "E2E8F0")
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def build_demo_document():
    doc = Document()
    
    # Page Setup - A4
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
        # Header / Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("PIEW Engine v2.3 — Contoh Demonstrasi Nyata: Prompt Sederhana ➔ Master Blueprint")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(148, 163, 184)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        frun1 = fp.add_run("PIEW (Prompt Intelligence & Engineering Workspace) — Demonstrasi Luaran Sistem")
        frun1.font.name = "Calibri"
        frun1.font.size = Pt(8.5)
        frun1.font.color.rgb = RGBColor(100, 116, 139)
        
    styles = doc.styles
    normal_style = styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10)
    normal_style.font.color.rgb = RGBColor(30, 41, 59)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(4)

    # Document Header
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    tr = p_title.add_run("CONTOH HASIL PERCOBAAN NYATA PIEW ENGINE v2.3")
    tr.font.name = "Arial"
    tr.font.size = Pt(18)
    tr.font.bold = True
    tr.font.color.rgb = RGBColor(15, 44, 89)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(12)
    sr = p_sub.add_run("Bagaimana 1 Kalimat Prompt Sederhana Pengguna Dijawab & Diubah Menjadi Master Blueprint Kelas Industri")
    sr.font.name = "Arial"
    sr.font.size = Pt(11)
    sr.font.color.rgb = RGBColor(37, 99, 235)

    # Box Pengantar
    box_intro = doc.add_table(rows=1, cols=1)
    box_intro.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = box_intro.rows[0].cells[0]
    c.width = Inches(6.6)
    set_cell_background(c, "EFF6FF")
    set_cell_border_left_only(c, "2563EB", sz="36")
    set_cell_margins(c, top=80, bottom=80, left=120, right=120)
    cp = c.paragraphs[0]
    cp.paragraph_format.space_after = Pt(0)
    b_run = cp.add_run("TENTANG DOKUMEN INI:\n")
    b_run.font.bold = True
    b_run.font.color.rgb = RGBColor(30, 64, 175)
    t_run = cp.add_run(
        "Dokumen ini menyajikan simulasi nyata bagaimana mesin PIEW Engine v2.3 bekerja. "
        "Ketika pengguna hanya mengetikkan prompt singkat dan santai seperti: 'Buatkan saya website portofolio modern dengan tema neumorphism yang responsif', "
        "PIEW tidak langsung mengarang kode mentah yang rapuh. Sebaliknya, mesin secara otomatis menyintesis Master Blueprint 10-Bagian berstandar "
        "rekayasa perangkat lunak internasional (Software Engineering Specification) lengkap dengan diagram arsitektur Mermaid.js, "
        "sehingga siap dieksekusi oleh AI Coding Agent maupun software engineer manusia tanpa salah paham."
    )
    t_run.font.size = Pt(9.5)
    t_run.font.color.rgb = RGBColor(30, 58, 138)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # BAGIAN 1: INPUT PENGGUNA
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(10)
    h1.paragraph_format.space_after = Pt(4)
    h1_run = h1.add_run("1. Input Sederhana dari Pengguna (The Simple Prompt)")
    h1_run.font.name = "Arial"
    h1_run.font.size = Pt(13)
    h1_run.font.bold = True
    h1_run.font.color.rgb = RGBColor(15, 44, 89)

    doc.add_paragraph(
        "Bayangkan Anda (atau klien Anda) membuka terminal atau aplikasi chat dan hanya mengetikkan satu baris permintaan sederhana berikut:"
    )

    tbl_input = doc.add_table(rows=1, cols=1)
    tbl_input.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = tbl_input.rows[0].cells[0]
    c.width = Inches(6.6)
    set_cell_background(c, "F1F5F9")
    set_cell_border_left_only(c, "0F2C59", sz="36")
    set_cell_margins(c, top=80, bottom=80, left=120, right=120)
    cp = c.paragraphs[0]
    cp.paragraph_format.space_after = Pt(0)
    r1 = cp.add_run('💬 Prompt Pengguna: \n"')
    r1.font.bold = True
    r2 = cp.add_run("buatkan saya website portofolio profesional dan modern dengan tema neumorphism yang responsif")
    r2.font.bold = True
    r2.font.size = Pt(11)
    r2.font.color.rgb = RGBColor(15, 44, 89)
    r3 = cp.add_run('"\n\nPerintah Eksekusi Mesin: npm run piew -- "..." --blueprint')
    r3.font.size = Pt(8.5)
    r3.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # BAGIAN 2: PERBEDAAN JIKA DITANYAKAN KE AI BIASA VS PIEW
    h2 = doc.add_heading(level=1)
    h2.paragraph_format.space_before = Pt(10)
    h2.paragraph_format.space_after = Pt(4)
    h2_run = h2.add_run("2. Mengapa PIEW Berbeda? (LLM Biasa vs PIEW Engine)")
    h2_run.font.name = "Arial"
    h2_run.font.size = Pt(13)
    h2_run.font.bold = True
    h2_run.font.color.rgb = RGBColor(15, 44, 89)

    comp_table = doc.add_table(rows=5, cols=3)
    comp_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    comp_table.autofit = False

    comp_headers = ["Dimensi", "ChatGPT / Claude Biasa (Tanpa PIEW)", "PIEW Engine v2.3 (Universal Blueprint)"]
    for j, htext in enumerate(comp_headers):
        cell = comp_table.rows[0].cells[j]
        set_cell_background(cell, "1E3A8A")
        set_cell_margins(cell, top=60, bottom=60, left=60, right=60)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(htext)
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    comp_data = [
        ("Respon Awal", "Langsung memuntahkan satu file HTML/CSS acak yang sering terpotong atau rusak.", "Menyusun Master Blueprint 10-Bagian lengkap dengan arsitektur & kontrak data."),
        ("Arsitektur & Database", "Nihil skema relasi database; hanya dummy array JavaScript statis di client-side.", "Menghasilkan diagram ERD (Prisma/PostgreSQL) dan Flowchart transaksi atomik."),
        ("Desain & Aksesibilitas", "Warna dan bayangan neumorphism asal-asalan yang gagal uji kontras baca teks.", "Menghitung token desain spesifik (Level 0-3 shadow) dan standar WCAG 2.2 AA."),
        ("Eksekusi Proyek", "Tidak ada roadmap terstruktur; pengguna bingung langkah selanjutnya.", "Menyediakan 6 Fase Eksekusi bertahap (Phase 0 s/d Phase 5) beserta deliverables.")
    ]

    widths = [Inches(1.4), Inches(2.6), Inches(2.6)]
    for i, row_data in enumerate(comp_data):
        row = comp_table.rows[i+1]
        bg_col = "F8FAFC" if i % 2 == 0 else "FFFFFF"
        for j, val in enumerate(row_data):
            cell = row.cells[j]
            cell.width = widths[j]
            set_cell_background(cell, bg_col)
            set_cell_margins(cell, top=50, bottom=50, left=60, right=60)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.size = Pt(8.5)
            if j == 0:
                r.font.bold = True
            elif j == 2:
                r.font.color.rgb = RGBColor(5, 150, 105)

    set_table_borders(comp_table, "CBD5E1")

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # BAGIAN 3: LUARAN NYATA MASTER BLUEPRINT DARI PIEW
    h3 = doc.add_heading(level=1)
    h3.paragraph_format.space_before = Pt(12)
    h3.paragraph_format.space_after = Pt(4)
    h3_run = h3.add_run("3. Hasil Luaran Nyata: Master Blueprint yang Dihasilkan PIEW")
    h3_run.font.name = "Arial"
    h3_run.font.size = Pt(13)
    h3_run.font.bold = True
    h3_run.font.color.rgb = RGBColor(15, 44, 89)

    doc.add_paragraph(
        "Berikut adalah isi lengkap Master Blueprint (10-Bagian Universal Meta-Blueprint) yang dicetak "
        "oleh PIEW Engine v2.3 ketika menerima prompt website di atas (Latency: 6 milidetik):"
    )

    # 10 BAGIAN SATU PER SATU
    sections_blueprint = [
        ("BAGIAN 1: ROLE & RESPONSIBILITIES (DEWAN PAKAR MULTIDISIPLIN)",
         "Bertindaklah sebagai tim profesional multidisiplin terkemuka yang terdiri dari:\n"
         "• Senior UI/UX Designer & Accessibility Specialist (WCAG 2.2 AA)\n"
         "• Design System Engineer (Neumorphism / Soft UI Tokens)\n"
         "• Senior Frontend Developer (Next.js App Router & Strict TypeScript)\n"
         "• Senior Backend & API Architect (RESTful & Microservices)\n"
         "• Database Architect & Relational Modeler (PostgreSQL / SQLite WAL)\n"
         "• Software Security & SSRF Defense Specialist\n"
         "• QA Engineer & Automated Test Specialist (Vitest / Playwright)\n"
         "• DevOps & Production Deployment Engineer\n"
         "Tugas tim adalah memimpin perancangan, pelaksanaan, verifikasi, dan penyelesaian proyek ini dari tahap awal hingga akhir dengan standar kualitas tertinggi di bidangnya."),
         
        ("BAGIAN 2: PROJECT CONFIGURATION & SMART ASSUMPTIONS",
         "Parameter Konfigurasi Proyek:\n"
         "• Nama Proyek: [WEBSITE PORTOFOLIO PROFESIONAL NEUMORPHISM]\n"
         "• Tema Desain: Premium Neumorphism / Soft UI (Raised, Inset, Level 0-3 Shadows)\n"
         "• Platform Target: Desktop, Tablet, dan Mobile Responsif\n"
         "• Tech Stack: Next.js App Router, TypeScript Strict, Tailwind CSS, PostgreSQL / SQLite\n"
         "• Autentikasi & Otorisasi: Session Management Aman & Role-Based Access Control\n"
         "• Deployment Target: Vercel / VPS Linux Cloud\n\n"
         "Pemisahan Fakta vs Asumsi Cerdas (Preserve Intent & No Deceptive Certainty):\n"
         "• FAKTA PASTI: Pengguna meminta perancangan website portofolio profesional dengan estetika neumorphism yang responsif.\n"
         "• ASUMSI CERDAS: Fitur inti mencakup showcase proyek interaktif, profil keahlian, formulir kontak terverifikasi, dan navigasi multi-viewport.\n"
         "• KEPUTUSAN TERBUKA: Integrasi form handler eksternal (Resend/SendGrid) akan ditentukan saat integrasi fase produksi."),

        ("BAGIAN 3: PRIMARY OBJECTIVE & QUALITY CHARACTERISTICS",
         "Tolok Ukur Kualitas Wajib Dipenuhi:\n"
         "1. Soft Surfaces: Elemen UI tampak menyatu alami dengan permukaan latar belakang (#e0e5ec).\n"
         "2. Raised & Inset Hierarchy: Menggunakan bayangan Level 0-3 untuk elemen timbul dan efek cekung untuk kolom input kontak.\n"
         "3. Tactile Interaction: Setiap tombol interaktif memberikan umpan balik visual saat disentuh atau ditekan (pressed state transisi halus).\n"
         "4. Restrained Color Palette: Palet warna netral lembut dengan aksen tajam pada tombol call-to-action (#3b82f6).\n"
         "5. Accessible Contrast: Memenuhi standar WCAG 2.2 AA agar teks tetap terbaca jernih di semua rasio kontras.\n"
         "6. Responsive Multi-Viewport: Tampilan stabil sempurna dari layar smartphone kecil hingga monitor desktop lebar.\n"
         "7. Production Reliability: Kode modular, penanganan error transparan, zero mock data di production.\n"
         "8. Data Integrity: Mutasi transaksi kontak/pesan bersifat atomik dengan validasi skema Zod ketat."),

        ("BAGIAN 4: CORE SYSTEM & DOMAIN SPECIFICATION (DESIGN TOKENS)",
         "1. Design Tokens & Surface Levels Neumorphism:\n"
         "   - Background Utama: #e0e5ec (Soft Neutral Canvas)\n"
         "   - Raised Surface (Level 1): box-shadow: 6px 6px 12px #b8b9be, -6px -6px 12px #ffffff\n"
         "   - Elevated Card (Level 2): box-shadow: 9px 9px 16px #b8b9be, -9px -9px 16px #ffffff\n"
         "   - Inset Surface (Inputs/Search): box-shadow: inset 4px 4px 8px #b8b9be, inset -4px -4px 8px #ffffff\n"
         "   - Pressed State: Transisi halus 150ms beralih dari Raised ke Inset saat diklik\n"
         "   - Aksen Call-to-Action: #3b82f6 (Indikator aktif kontras tinggi)\n"
         "2. Arsitektur Teknis:\n"
         "   - Frontend: Next.js App Router & React Server Components\n"
         "   - Bahasa: TypeScript Strict (Zero 'any')\n"
         "   - Database: PostgreSQL / SQLite WAL via Prisma ORM\n"
         "   - Validasi: Zod Schema Validation pada setiap boundary form kontak & request API"),

        ("BAGIAN 5: MANDATORY VISUAL ARTIFACTS (MERMAID.JS CODE)",
         "Diagram 1: Entity Relationship Diagram (ERD)\n"
         "```mermaid\n"
         "erDiagram\n"
         "    Pengguna ||--o{ Pesanan : \"membuat\"\n"
         "    Kategori ||--o{ Produk : \"mengelompokkan\"\n"
         "    Pesanan ||--|{ ItemPesanan : \"memuat\"\n"
         "    Produk ||--o{ ItemPesanan : \"dipesan\"\n"
         "    Pengguna ||--o{ LogAudit : \"memicu\"\n"
         "```\n\n"
         "Diagram 2: Flowchart Alur Transaksi & Validasi Sistem\n"
         "```mermaid\n"
         "flowchart TD\n"
         "    Start([Mulai: Request Pesanan]) --> Ingest[InputPengguna: Terima Payload]\n"
         "    Ingest --> Val{ValidasiSkema: Format Zod Valid?}\n"
         "    Val -- Tidak --> ErrVal[RollbackError: 400 Bad Request]\n"
         "    Val -- Ya --> CheckStock{CekStok: Ketersediaan Cukup?}\n"
         "    CheckStock -- Tidak --> ErrStock[RollbackError: 409 Conflict]\n"
         "    CheckStock -- Ya --> Mutate[TransaksiDatabase: Mutasi Atomik Record]\n"
         "    Mutate --> Audit[Catat LogAudit Transaksi]\n"
         "    Audit --> Success[NotifikasiBerhasil: 201 Created & Nota Digital]\n"
         "    Success --> Done([Selesai])\n"
         "```"),

        ("BAGIAN 6: END-TO-END EXECUTION PHASES (6 TAHAPAN PRODUKSI)",
         "• PHASE 0 — Discovery & Requirements: Brief proyek, batasan scope creep, persona pengguna.\n"
         "  Deliverables: PROJECT_BRIEF.md, REQUIREMENTS.md, ASSUMPTIONS.md\n"
         "• PHASE 1 — System Architecture: Skema database Prisma, pemetaan indeks & FK, arsitektur API.\n"
         "  Deliverables: DATABASE_SCHEMA.prisma, ARCHITECTURE.md, SITEMAP.md\n"
         "• PHASE 2 — Design System & UI Tokens: Token warna neumorphism, Tailwind config, standar WCAG.\n"
         "  Deliverables: DESIGN_SYSTEM.md, tailwind.config.ts, UI_TOKENS.json\n"
         "• PHASE 3 — Component & Page Development: Komponen UI raised/inset, validasi Zod form kontak.\n"
         "  Deliverables: SRC_COMPONENTS/, SRC_PAGES/, FORM_VALIDATION.ts\n"
         "• PHASE 4 — QA, Integration & Security: Uji regresi vitest, audit celah SSRF/IDOR, uji kontras layar.\n"
         "  Deliverables: TEST_REPORT.md, SECURITY_AUDIT.md, PERFORMANCE_LOG.json\n"
         "• PHASE 5 — Production Build & Handover: Kompilasi next build bersih, runbook deployment Vercel.\n"
         "  Deliverables: PRODUCTION_BUILD, DEPLOYMENT.md, RUNBOOK.md"),

        ("BAGIAN 7: DOMAIN STANDARDS & GUARDRAILS (JANGAN LAKUKAN)",
         "Larangan Mutlak (Negative Constraints):\n"
         "1. DILARANG menggunakan mock data di lingkungan production atau mengklaim backend selesai tanpa implementasi nyata.\n"
         "2. DILARANG menaruh seluruh kode aplikasi ke dalam satu file raksasa (Patuhi Separation of Concerns).\n"
         "3. DILARANG menggunakan tipe data 'any' tanpa alasan teknis kuat dalam kode TypeScript.\n"
         "4. DILARANG mengabaikan standar aksesibilitas WCAG 2.2 AA (Pastikan rasio kontras teks terpenuhi).\n"
         "5. DILARANG menghapus atau mengabaikan penanganan error pada endpoint mutasi data penting.\n"
         "6. DILARANG memasukkan API key, token rahasia, atau kredensial database ke dalam repository publik."),

        ("BAGIAN 8: EXECUTION PROTOCOL FOR AI CODING AGENTS",
         "Protokol 5 Langkah untuk Agen AI Pelaksana (Claude Code, Cursor, Antigravity, dll):\n"
         "• Step 1 — INSPECT: Pelajari seluruh repositori dan spesifikasi sebelum menulis kode.\n"
         "• Step 2 — PLAN: Rancang rencana kerja modular dan urutan ketergantungan file.\n"
         "• Step 3 — IMPLEMENT: Bangun komponen dan kode sesuai spesifikasi Bagian 4.\n"
         "• Step 4 — VERIFY: Uji setiap output secara empiris dengan automated test suite (Exit Code 0).\n"
         "• Step 5 — REPORT: Laporkan bukti artefak konkret yang selesai kepada pengguna."),

        ("BAGIAN 9: WORK MANAGEMENT & TASK TRACKING",
         "Model Siklus Task: TODO ➔ IN_PROGRESS ➔ BLOCKED ➔ DONE ➔ VERIFIED\n\n"
         "Aturan Verifikasi Ketat:\n"
         "Status 'VERIFIED' hanya boleh diberikan setelah kode terbukti lulus build dan test secara otomatis di terminal, bukan hanya karena tampilan visualnya terlihat sekilas berfungsi."),

        ("BAGIAN 10: DEFINITION OF DONE & IMMEDIATE NEXT STEP",
         "Kriteria Tuntas Proyek (Definition of Done):\n"
         "1. Seluruh 6 fase eksekusi telah menghasilkan file deliverables nyata di repositori.\n"
         "2. Diagram ERD dan Flowchart transaksi terbukti sinkron 100% dengan skema Prisma dan logika API.\n"
         "3. Antarmuka Neumorphism terbukti lulus audit aksesibilitas kontras WCAG 2.2 AA.\n"
         "4. Seluruh automated test suite lulus 100% dengan Exit Code 0.\n"
         "5. Perintah 'next build' berhasil sukses tanpa error TypeScript atau broken dependencies.\n\n"
         "Langkah Pertama (Immediate Action): Mulai dari PHASE 0: Rumuskan PROJECT_BRIEF.md dan kunci parameter token desain sebelum menulis komponen antarmuka.")
    ]

    for title, content in sections_blueprint:
        bp_h = doc.add_heading(level=2)
        bp_h.paragraph_format.space_before = Pt(8)
        bp_h.paragraph_format.space_after = Pt(2)
        r = bp_h.add_run(title)
        r.font.name = "Arial"
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(30, 41, 59)
        
        # content box
        c_tbl = doc.add_table(rows=1, cols=1)
        c_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = c_tbl.rows[0].cells[0]
        cell.width = Inches(6.6)
        set_cell_background(cell, "F8FAFC")
        set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.15
        prun = p.add_run(content)
        prun.font.size = Pt(8.5)
        set_table_borders(c_tbl, "E2E8F0")
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # BAGIAN 4: KESIMPULAN
    h4 = doc.add_heading(level=1)
    h4.paragraph_format.space_before = Pt(12)
    h4.paragraph_format.space_after = Pt(4)
    h4_run = h4.add_run("4. Kesimpulan: Apa Manfaatnya Bagi Anda?")
    h4_run.font.name = "Arial"
    h4_run.font.size = Pt(13)
    h4_run.font.bold = True
    h4_run.font.color.rgb = RGBColor(15, 44, 89)

    final_box = doc.add_table(rows=1, cols=1)
    final_box.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = final_box.rows[0].cells[0]
    c.width = Inches(6.6)
    set_cell_background(c, "ECFDF5")
    set_cell_border_left_only(c, "059669", sz="36")
    set_cell_margins(c, top=80, bottom=80, left=120, right=120)
    cp = c.paragraphs[0]
    cp.paragraph_format.space_after = Pt(0)
    b_run = cp.add_run("KESIMPULAN EKSEKUTIF:\n")
    b_run.font.bold = True
    b_run.font.color.rgb = RGBColor(4, 120, 87)
    t_run = cp.add_run(
        "Dengan PIEW Engine v2.3, Anda tidak perlu lagi repot-repot memikirkan bagaimana cara menyusun prompt yang rumit "
        "atau takut AI berhalusinasi. Anda cukup memberikan 1 kalimat keinginan Anda (misal: 'buatkan website portofolio modern'), "
        "dan mesin PIEW dalam hitungan milidetik akan mengubahnya menjadi spesifikasi rekayasa profesional 10-bagian yang sangat ketat, "
        "terstruktur, bebas angka bohong, dan siap dieksekusi secara otonom oleh agen coding maupun developer profesional."
    )
    t_run.font.size = Pt(9.5)
    t_run.font.color.rgb = RGBColor(6, 95, 70)

    # Save
    workspace_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_docx = os.path.join(workspace_dir, "CONTOH_OUTPUT_PROMPT_WEBSITE_PIEW.docx")
    doc.save(out_docx)
    print(f"Demo DOCX saved to {out_docx}")

if __name__ == "__main__":
    build_demo_document()
