// ──────────────────────────────────────────────────────────────────
// @prompt-workspace/domain-rules — Universal Expert Council Roles
// Blueprint v1.0 Bagian 4.2 & ADR-003: Multi-Disciplinary Expert Personas
// ──────────────────────────────────────────────────────────────────

import { AudienceLevel } from "@prompt-workspace/prompt-contracts";
import { UniversalDomainCategory, DomainSubtopic } from "./subtopics.js";

/**
 * Mengembalikan susunan Dewan Pakar multi-disiplin yang relevan untuk subtopik dan level audiens
 */
export function getDomainRoles(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  audience?: AudienceLevel
): string[] {
  switch (subtopic) {
    case "software_web3_defi":
      return [
        "Lead Solidity & Smart Contract Security Architect",
        "DeFi Protocol Architect & Tokenomics Specialist",
        "Smart Contract Security Auditor (Anti-Reentrancy & Invariant Specialist)",
        "EVM State & Gas Optimization Specialist",
        "QA & Automated Hardhat/Foundry Test Specialist",
      ];
    case "software_iot_telemetry":
      return [
        "IoT Embedded Systems Architect & Hardware Interface Specialist",
        "Satellite Telemetry Protocol Engineer & Anomaly Detection Lead",
        "Time-Series Database Architect & High-Throughput Ingestion Engineer",
        "Distributed Systems & Edge Computing Reliability Specialist",
        "QA Automated Hardware-in-the-Loop & Fuzz Testing Lead",
      ];
    case "software_medical_clinic":
      return [
        "Clinical Informatics Specialist & Medical Systems Architect",
        "Electronic Medical Record (EMR/EHR) & ICD-10 Compliance Lead",
        "Healthcare Privacy & HIPAA / GDPR Security Auditor",
        "Fullstack Healthcare App Developer (Strict TypeScript & Next.js)",
        "Database Architect & Medical Audit Log Specialist",
      ];
    case "software_personal_portfolio":
      return [
        "Senior Creative Director & Interactive UI/UX Designer",
        "Design System Engineer (Neumorphism / Soft UI Tokens)",
        "Senior Frontend Engineer (Next.js App Router & Micro-animations)",
        "Technical Copywriter & Professional Branding Strategist",
        "Performance Optimization & Web Vitals Specialist",
      ];
    case "software_ecommerce_store":
    case "software_generic":
      return [
        "Senior UI/UX Designer & Accessibility Specialist (WCAG 2.2 AA)",
        "Design System Engineer (Neumorphism / Soft UI Tokens)",
        "Senior Frontend Developer (Next.js App Router & Strict TypeScript)",
        "Senior Backend & API Architect (RESTful & Microservices)",
        "Database Architect & Relational Modeler (PostgreSQL / SQLite WAL)",
        "Software Security & SSRF Defense Specialist",
        "QA Engineer & Automated Test Specialist (Vitest / Playwright)",
        "DevOps & Production Deployment Engineer",
      ];
    case "business_manufacturing_industry":
      return [
        "Manajer Pabrik & Industrial Process Engineering Lead",
        "Quality Control Lead Pengolahan Hasil Perkebunan & Minyak Sawit (CPO)",
        "Analis Efisiensi Biaya Operasional Manufaktur & OEE Pabrik",
        "Spesialis Standard Operating Procedure (SOP) & K3 Pabrik",
        "Koordinator Logistik Rantai Pasok TBS & Pengapalan CPO",
      ];
    case "business_aquaculture_agri":
      return [
        "Ahli Akuakultur & Spesialis Mikrobiologi Bioflok",
        "Manajer Operasional Tambak & Standard Operating Procedure (SOP) Lead",
        "Analis Keuangan Agribisnis & Struktur Biaya HPP Budidaya",
        "Spesialis Manajemen Kualitas Air & Biosafety Kolam",
        "Koordinator Rantai Pasok, Grading & Distribusi Pasar Panen",
      ];
    case "business_food_beverage":
    case "business_generic":
      return [
        "Chief Strategy Officer & Business Development Lead",
        "Head of Operations & Standard Operating Procedure (SOP) Architect",
        "Financial & HPP Margin Analyst",
        "Supply Chain & Food Safety Quality Control Specialist",
        "Marketing & Commercial Launch Campaign Manager",
        "Risk & Legal Compliance Officer (P-IRT, BPOM, Sertifikasi Halal)",
      ];
    case "education_physics_circuits":
      return [
        "Guru Pembimbing Fisika Sekolah Menengah & Desainer Eksperimen Sains",
        "Instruktur Praktikum Sirkuit & Kelistrikan Dasar Ramah Siswa",
        "Fasilitator Pemahaman Konsep Teori & Analogi Aliran Listrik",
        "Petugas Keselamatan Kerja Laboratorium & Pencegahan Korsleting",
        "Pengembang Modul Pembelajaran Visual & Lembar Kerja Siswa",
      ];
    case "education_practical_experiment":
      return [
        "Instruktur Pembimbing Praktikum Kejuruan (SMK / Vokasi)",
        "Spesialis Prosedur Sterilisasi & Keselamatan Kerja Laboratorium (K3)",
        "Fasilitator Observasi Lapangan & Analisis Hasil Eksperimen Mandiri",
        "Pengembang Modul Praktikum Terpadu & Lembar Kerja Siswa",
        "Desainer Evaluasi Pemahaman Praktik & Refleksi Sains",
      ];
    case "education_biology_photosynthesis":
    case "education_generic":
      return [
        "Guru Pembimbing Sains & Biologi Sekolah Menengah",
        "Desainer Kurikulum Edukasi & Pedagogi Visual",
        "Mentor Praktikum Laboratorium Sains Ramah Siswa",
        "Fasilitator Pemahaman Konsep & Analogi Sehari-hari",
        "Petugas Keselamatan Kerja Laboratorium Sekolah",
      ];
    case "research_marine_environmental":
    case "research_generic":
      return [
        "Principal Investigator (Lead Scientific Researcher)",
        "Research Methodologist & PRISMA Framework Specialist",
        "Biostatistician & Quantitative Data Analyst (ANOVA / Multivariate)",
        "Marine Ecology & Microplastics Domain Specialist",
        "Peer Reviewer & Scientific Rigor Auditor",
        "Research Ethics & Biosafety Compliance Officer",
      ];
    case "academic_technology_adoption":
    case "academic_generic":
      return [
        "Dosen Pembimbing Akademik Utama (Senior Academic Supervisor)",
        "Metodolog Penelitian Kuantitatif & Model UTAUT / TAM",
        "Analis Statistik Skripsi (Uji Validitas, Reliabilitas & Regresi)",
        "Kajian Pustaka & Literature Gap Specialist",
        "Editor Penulisan Ilmiah & Checklist Anti-Plagiasi",
      ];
  }
}
