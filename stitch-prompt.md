# Stitch Prompt — IAV Hassan II · Emploi du Temps

---

Admin dashboard screen for IAV Hassan II university — the **Emploi du Temps (Timetable Generator)** page — clean, institutional, data-dense but readable, desktop-first.

## Key Features

- Fixed left sidebar (260px) with deep forest green gradient background (#0e2016 → #163320), IAV logo top-left, grouped navigation links in white text
- Top breadcrumb bar: `Emploi du Temps > Générateur` in slate text on white surface
- Page header with eyebrow label "Emploi du Temps", bold title "Générateur d'emploi du temps", short description text
- **Toolbar row** below header: four filter controls in a horizontal bar on white card —
  - Classe dropdown ("Agronomie PA 1A")
  - Semaine date picker ("31 mars – 4 avr 2026")
  - Salle dropdown ("Toutes les salles")
  - Professeur dropdown ("Tous les enseignants")
  - Primary filled button "Générer" in emerald green (#16a34a) with white text
- **Progress stats bar** below toolbar: "12 / 18 sessions planifiées" with an emerald green progress bar (67%), small text "6 cours non planifiés" in amber
- **Main weekly grid** (takes ~70% width):
  - 6 columns: time labels (left, 60px) + Mon–Fri (equal width)
  - Rows for each hour 08h00 to 18h00 with light gray (#e2e8f0) horizontal dividers
  - Day headers: "Lundi 31", "Mardi 1", "Merdi 2", "Jeudi 3", "Vendredi 4" in slate bold
  - Session cards placed in grid cells — rounded (8px), colored by type:
    - **CM (Cours Magistral)** — soft blue background (#dbeafe), blue-700 text, blue left border
    - **TD (Travaux Dirigés)** — teal background (#ccfbf1), teal-700 text, teal left border
    - **TP (Travaux Pratiques)** — amber background (#fef3c7), amber-700 text, amber left border
  - Each session card contains: course name bold (e.g. "Algèbre"), teacher name small gray (e.g. "Pr. Benali"), room pill badge (e.g. "Salle A12")
  - One session card has a **conflict indicator**: red border, small red warning icon top-right, red badge "Conflit"
  - Example sessions placed:
    - Lundi 08h–10h: CM "Analyse" · Pr. Chraibi · Amphi 1
    - Lundi 10h–12h: TD "Statistiques" · Pr. Idrissi · Salle B3
    - Mardi 08h–10h: TP "Biologie végétale" · Pr. Alaoui · Labo 2
    - Mercredi 14h–16h: CM "Algèbre" · Pr. Benali · Amphi 1 (conflict indicator)
    - Jeudi 10h–12h: TD "Chimie organique" · Pr. Fassi · Salle A12
    - Vendredi 08h–10h: CM "Physique" · Pr. Haddad · Amphi 2
- **Right panel "Cours non planifiés"** (280px, fixed right, scrollable):
  - Panel header "Non planifiés" with amber badge count "6"
  - Draggable course cards in light amber (#fffbeb) border, each showing:
    - Course name bold
    - Classe label small (e.g. "Agronomie PA 1A")
    - Hours remaining pill (e.g. "2h restantes") in amber
  - Example unscheduled cards: "Informatique", "Économie rurale", "Pédologie", "Hydraulique", "Génétique", "Droit agraire"
  - Small helper text at bottom: "Glissez un cours vers le calendrier pour le planifier"

## Visual Style

- Background: Off-white canvas (#f8fafc)
- Cards and panels: Pure white (#ffffff) with subtle shadow (0 1px 3px rgba(0,0,0,0.08)), 12px radius
- Table grid background: white, alternating row tint (#f8fafc on odd hours)
- Typography: clean sans-serif, near-black (#0f172a) for data, slate (#64748b) for secondary
- Borders: light gray (#e2e8f0)
- Status chips: pill-shaped, color-coded

## Platform

Responsive web, **desktop-first** at 1440px width.
