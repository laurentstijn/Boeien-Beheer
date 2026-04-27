# Voordelen Boeien Beheer App — Overzicht voor Management & IT

---

## 1. Centraal Voorraadbeheer (Stock & Inventaris)

- **Volledig digitaal overzicht** van alle materialen: kettingen, stenen, boeien, toptekens, sluitingen, zinkblokken, lampen en opslag — alles op één plek.
- **Real-time status per onderdeel**: elk item is gemarkeerd als *In Opslag*, *Uitgelegd*, of *In Onderhoud*. Geen Excel-lijsten of papieren registers meer nodig.
- **Minimum stock waarschuwingen**: stel per type een minimumvoorraad in. Zakt de voorraad eronder? Automatische kleur-indicatie (oranje/rood) + aparte "Lage Voorraad" pagina. Preventief inkopen wordt eenvoudig.
- **Serienummers & specificaties**: per individueel asset (bijv. lampen) worden serienummers, type-informatie en technische specs bijgehouden.

---

## 2. Boei Uitleggen — Gestroomlijnd Proces

- **Stap-voor-stap wizard** (3 stappen): kies boei → koppel onderdelen → locatie bevestigen. Foutgevoelig manueel werk wordt geminimaliseerd.
- **Automatische voorraadmutatie**: bij het uitleggen worden geselecteerde onderdelen (boei, ketting, steen, lamp, topteken) automatisch van "In Opslag" naar "Uitgelegd" gezet. Geen dubbele administratie.
- **Slimme coördinaten invoer**: coördinaten in elk formaat (Lambert, graden/minuten, decimaal) plakken — de app herkent het formaat automatisch en vult de velden in.
- **Externe klant markering**: boei direct markeren als zijnde voor een externe klant + klantnaam invullen. Dit vormt de basis voor facturatie-rapporten.

---

## 3. Onderhoud Loggen — Compleet & Traceerbaar

- **Onderhoud registreren per boei**: met één klik onderhoud loggen, inclusief welke onderdelen vervangen zijn.
- **Directe koppeling met voorraad**: bij vervanging van een onderdeel wordt het oude uit "Uitgelegd" gehaald en het nieuwe automatisch gekoppeld.
- **On-the-fly onderdelen aanmaken**: staat een nieuw onderdeel niet in de lijst? Direct aanmaken vanuit het onderhoudsvenster, zonder terug te hoeven naar de inventaris.
- **Live getijdendata & advies**: tijdens het plannen van onderhoud toont de app automatisch waterstanden (tij-grafiek) en geeft een advies (bijv. "Enkel rond HW"). Veiliger en efficiënter werken op het water.

---

## 4. Facturatie & Externe Klanten — Directe Business Waarde

> [!IMPORTANT]
> Dit onderdeel is bijzonder relevant voor het management.

- **Externe klant tracking**: bij het uitleggen of bewerken van een boei kan deze gemarkeerd worden als "Externe Klant" met bijbehorende klantnaam/bedrijf.
- **Automatische klant-rapporten**: per externe klant wordt een **Historiek Rapport** gegenereerd met:
  - Alle boeien die voor deze klant uitgelegd zijn
  - Alle onderhoudshistoriek per boei
  - Data van uitlegging en laatste onderhoudsbeurten
- **Afdrukbaar / exporteerbaar**: rapporten zijn direct te printen of als PDF op te slaan — ideaal als onderbouwing bij facturen naar derden.
- **Overzichtspagina alle externe klanten**: admins zien in één oogopslag welke bedrijven/klanten boeien in beheer hebben, en kunnen per klant het historiekrapport openen.
- **Filtermogelijkheid "Extern"**: in het overzicht van uitgelegde boeien is er een snelfilter om alleen externe-klant boeien te tonen.

**Concreet voordeel**: geen manueel bijhouden meer van welke boeien voor welke klant liggen. Facturatie-onderbouwing is altijd up-to-date en auditable.

---

## 5. Rapportage & Administratie (Admin)

- **Dagelijks Rapport**: automatisch logboek van alle acties, onderhoudsbeurten en nieuwe uitleggingen per dag. Afdrukbaar.
- **Boei Rapport**: per individuele boei een compleet rapport met al haar gegevens, componenten en onderhoudshistoriek.
- **Google Planning**: koppeling met de onderhoudsplanning.
- **Database Export (Excel)**: met één klik de volledige inventaris exporteren naar Excel — ideaal als backup of voor rapportage aan stakeholders.
- **Automatische cron-backups**: de app maakt automatisch periodieke Excel-backups van de database.

---

## 6. Gebruikersbeheer & Zones

- **Rolgebaseerde toegang**: twee rollen — *Admin* en *Gebruiker*. Admins zien extra functionaliteit (rapporten, gebruikersbeheer, export).
- **Zone-scheiding (Zeeschelde / Zeetijger)**: data wordt automatisch gefilterd per zone. Gebruikers zien alleen hun eigen zone. Admins kunnen schakelen tussen zones.
- **Beveiligde toegang**: login via Supabase Authentication. Niet-ingelogde gebruikers worden automatisch doorgestuurd naar de inlogpagina.
- **Uitnodigingssysteem**: nieuwe gebruikers worden uitgenodigd en krijgen de juiste rol/zone toegewezen.

---

## 7. Interactieve Kaart

- **Visuele weergave** van alle uitgelegde boeien op een kaart.
- **Externe klant indicator** direct zichtbaar op de kaart.
- **Snelle navigatie** naar boei-details vanuit de kaart.

---

## 8. Handige Tools & Kennisbeheer

- **Coördinaten Omzetter**: ingebouwde rekenmachine om GPS-coördinaten om te rekenen tussen formaten (Lambert, decimaal, graden/minuten).
- **Handleidingen Bibliotheek**: centraal uploaden en opslaan van PDF-handleidingen (bijv. van zwaailampen, GPS-systemen). Kennis altijd beschikbaar op elk device.
- **In-app hulp**: "Hoe werkt de app?" sectie met uitleg over alle functionaliteiten.

---

## 9. Technische Voordelen (voor IT)

| Aspect | Detail |
|---|---|
| **Stack** | Next.js (React) + Supabase (PostgreSQL + Auth) |
| **Hosting** | Vercel — serverless, automatische schaling |
| **Database** | Supabase (managed PostgreSQL met PostGIS) |
| **Authenticatie** | Supabase Auth met JWT-tokens en Row Level Security (RLS) |
| **Beveiliging** | RLS-policies per zone, middleware-bescherming op routes |
| **Backups** | Automatische cron-job Excel export + manuele export |
| **PWA-ready** | Responsive design, bruikbaar op telefoon, tablet en desktop |
| **Uitbreidbaarheid** | Flexibele JSONB metadata velden in alle tabellen — nieuwe velden toevoegen zonder schema-migraties |
| **Kosten** | Minimale operationele kosten (Vercel free/pro tier + Supabase free/pro tier) |

---

## 10. Samenvatting: Waarom deze app?

| Probleem (vroeger) | Oplossing (nu) |
|---|---|
| Excel-lijsten en papieren logboeken | Centrale digitale database — altijd up-to-date |
| Geen zicht op voorraad in real-time | Live voorraadstatus per onderdeel |
| Handmatig bijhouden welke boei voor welke klant | Automatische klant-tracking en rapporten |
| Geen onderhoudstraceerbaarheid | Complete onderhoudshistoriek per boei |
| Facturatie-onderbouwing kosten manueel werk | Klant-rapporten met één klik genereren |
| Informatie verspreid over meerdere mensen | Eén systeem met rolgebaseerde toegang |
| Getij handmatig opzoeken | Live getij-data en advies in de app |
| Kennis in hoofden van mensen | Handleidingen centraal opgeslagen |

---

*Document gegenereerd op 24 april 2026 ter voorbereiding van de meeting op maandag.*
