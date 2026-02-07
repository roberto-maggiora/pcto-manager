# UI Reference (MVP) — Impakt PCTO Platform

Obiettivo: UI semplice e operativa per scuole. Focus su:
- Anagrafiche (Classi, Studenti)
- Progetti PCTO (creazione, lista, dettaglio)
- Sessioni e presenze (bulk)
- Export PDF (Registro Presenze)
- Branding scuola (logo/header/footer)

Stile: pulito, “gestionale scolastico”, leggibilità > estetica.
Layout: sidebar sinistra + topbar + content.
Tenant: sempre una singola scuola per sessione (logo + nome visibili in topbar).

---

## Global Layout

### Sidebar (voci MVP)
- Dashboard
- Classi
- Studenti
- Progetti PCTO
- Export
- Impostazioni Scuola

### Topbar
- Badge scuola (logo + nome)
- Search (studenti/progetti)
- User menu (profilo, logout)

### Global UX
- Tutte le pagine hanno empty state con CTA.
- Errori: toast + messaggio inline su form.
- Azioni distruttive o irreversibili: modal conferma.
- Progetto “closed” (futuro): read-only (MVP può non includerlo).

---

## Screen 1 — Login
Campi:
- Email
- Password
CTA: “Accedi”
Error: credenziali errate

---

## Screen 2 — Dashboard
Cards:
- Progetti PCTO (totali / attivi / bozza)
- Sessioni svolte (ultimo 30gg)
- Ore totali registrate (ultimo 30gg)
Lista rapida:
- “Ultimi progetti aggiornati”
CTA principali:
- “Nuovo Progetto”
- “Nuova Sessione” (porta a selezione progetto)

---

## Screen 3 — Classi (Lista + Crea)
Tabella:
- Anno (es. 4)
- Sezione (es. A)
- # studenti
Azioni:
- “Apri” (vedi studenti filtrati)
- “Elimina” (opzionale, con conferma)

CTA:
- “Crea classe”

### Modal “Crea classe”
Campi:
- Anno (number)
- Sezione (text)
CTA: “Salva”

---

## Screen 4 — Studenti (Lista + Crea)
Filtri:
- Classe (dropdown)
- Search (nome/cognome)

Tabella:
- Cognome Nome
- Classe (4A)
- Ore totali (calcolate lato UI se endpoint non c’è ancora, oppure placeholder)
Azioni:
- “Dettaglio” (drawer) (MVP optional)

CTA:
- “Crea studente”
- “Import CSV” (disabled MVP)

### Modal “Crea studente”
Campi:
- Classe (obbligatoria)
- Nome
- Cognome
CTA: “Salva”

---

## Screen 5 — Progetti PCTO (Lista)
Filtri:
- Stato (draft / active / closed) — se backend per ora ha solo draft, mostra comunque
- Periodo (start/end)
- Search titolo

Tabella:
- Titolo
- Stato (badge)
- Periodo
- # sessioni
- Ore totali (somma sessioni/presenze)
Azioni:
- “Apri”

CTA:
- “Nuovo progetto”

---

## Screen 6 — Nuovo Progetto
Form (MVP):
- Titolo (required)
- Stato (required: default “draft” in UI)
- Data inizio (start_date)
- Data fine (end_date)
CTA:
- “Crea progetto”

Nota:
- Anche se in futuro status dovrà defaultare server-side, in UI mettiamo default “draft”.

---

## Screen 7 — Progetto (Dettaglio) con Tabs
Header:
- Titolo + badge stato
- Periodo
CTA:
- “Crea sessione”
- “Esporta Registro Presenze (PDF)” (attendance register)

Tabs:
1) Panoramica
2) Sessioni
3) Presenze (per sessione)
4) Documenti/Export (MVP: solo export)

### Tab 1: Panoramica
- Dati progetto
- KPI:
  - # sessioni
  - ore totali registrate
- Ultimi export (se disponibili)

### Tab 2: Sessioni (lista)
Tabella:
- Data/ora inizio
- Data/ora fine
- Ore pianificate
Azioni:
- “Apri presenze” (porta alla schermata presenze per quella sessione)
CTA:
- “Crea sessione”

#### Modal “Crea sessione”
Campi:
- Start (datetime)
- End (datetime)
- Planned hours (number)
CTA: “Salva”

### Tab 3: Presenze (bulk editor)
Selezione Sessione:
- dropdown sessioni del progetto
Oppure accesso diretto da “Apri presenze”.

Tabella studenti (filtrabile per classe):
- Studente
- Stato: Presente / Assente
- Ore (number)
- Flag “validato” (opzionale UI, se backend non lo supporta ancora = solo UI)

CTA:
- “Imposta tutti presenti”
- “Imposta ore = planned”
- “Salva presenze”

Payload backend attuale:
- POST /v1/sessions/{session_id}/attendance
- Body = lista:
  - { student_id, status, hours }

### Tab 4: Export
Sezioni:
- “Registro Presenze”
  - CTA: “Genera PDF”
  - Lista export generati (data/ora, download)

---

## Screen 8 — Impostazioni Scuola (Branding)
Sezioni:
1) Anagrafica scuola (nome, contatti)
2) Branding PDF:
   - Header text
   - Footer text
   - Primary color
   - Logo upload (PNG/JPG; SVG può essere accettato ma non renderizzato nel PDF per ora)

CTA:
- “Salva”
- “Anteprima PDF header” (genera export school-header e apre download)

Upload:
- endpoint upload logo usa multipart field "upload" (UI deve usare name="upload").

---

## Screen 9 — Export (pagina dedicata)
Lista export (ultimi N):
- Tipo (school-header / attendance-register)
- Data
- Download
Filtri:
- Tipo export
- Periodo
