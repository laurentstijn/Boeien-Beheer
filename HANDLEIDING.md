# Handleiding Boeien Beheer App

Welkom bij de **Boeien Beheer** applicatie. Deze app is ontworpen om het voorraadbeheer, het uitleggen van boeien, en het plannen van onderhoud zo efficiënt en overzichtelijk mogelijk te maken.

Hier is een kort overzicht van de belangrijkste functionaliteiten:

---

## 1. Stock & Inventaris 📦

In de zijbalk vind je verschillende categorieën zoals **Kettingen, Stenen, Boeien, Toptekens, Sluitingen, Zinkblokken, en Lampen**.
- **Overzicht:** Per categorie zie je precies hoeveel stuks er *In Opslag*, *Uitgelegd*, of *In Onderhoud* zijn.
- **Stock Aanpassen:** Met de `+` en `-` knoppen kan je snel de voorraad verhogen of verlagen.
- **Minimum Stock:** Stel per type het minimum in. Zakt de voorraad hieronder? Dan kleurt de status oranje of rood en verschijnt het item op de waarschuwingspagina **Lage Voorraad**.
- **Nieuw item:** Via de "Details" bewerken knop kan je specifieke items instellen, een nieuw uniek onderdeel aanmaken, of de serienummers van lampen bijhouden.

## 2. Uitgelegd / Onderhoud ⚓

Op deze pagina zie je een lijst van alle boeien die momenteel stilliggen op het water.
- **Onderhoud Loggen:** Klik op de knop **"Onderhoud Loggen"** om een onderhoudsbeurt te registreren.
- **Onderdelen Vervangen:** In het onderhoudsvenster kan je direct aangeven welke onderdelen (ketting, steen, lamp, etc.) zijn vervangen. 
- **Onderdeel Maken tijdens Onderhoud:** Staat je vervangonderdeel niet in de lijst? Scrol in de keuzelijst naar beneden en klik op **"+ Nieuw onderdeel aanmaken"** om het direct toe te voegen aan de database.
- **Getijdendata:** Tijdens het loggen van onderhoud of het uitleggen toont de app automatisch de waterstanden (tij) en geeft een advies (bijv. "Enkel rond HW").

## 3. Een Nieuwe Boei Uitleggen 🚀

Klik onderaan de zijbalk op de blauwe knop **"Boei Uitleggen"**.
- Vul de naam (identificatie) en de coördinaten in.
- Kies de specifieke onderdelen uit je voorraad (welke lamp, welke steen, etc.). Zodra je een boei uitlegt, worden deze onderdelen automatisch uit de "In Opslag" status gehaald en op "Uitgelegd" gezet.
- Is het voor een externe klant? Vink dit dan aan en vul de naam van de klant in. Dit wordt later gebruikt in de klantrapportages.

## 4. Administratie & Rapporten 📊 (Alleen voor Admins)

Admins hebben een extra sectie:
- **Gebruikers:** Beheer wie toegang heeft tot het systeem en wijs rollen toe (Admin of Gebruiker) en de zone (Zeetijger of Zeeschelde).
- **Dagelijks Rapport:** Bekijk een logboek van alle acties, onderhoudsbeurten en nieuwe uitleggingen per dag.
- **Rapporten Externe Klanten:** Genereer overzichten van boeien die in beheer zijn voor derden, inclusief de data van hun laatste onderhoud.
- **Export Backup:** Met één druk op de knop download je de volledige database inventaris naar een Excel-bestand.

## 5. Handige Tools 🛠️

- **Coördinaten Omzetten:** Linksonder in de zijbalk vind je een rekenmachine-icoon. Hiermee kan je GPS-coördinaten (bijv. graden/minuten of decimaal) snel omrekenen naar het formaat dat in de app wordt gebruikt.
- **Notities / Handleidingen:** Een bibliotheek waar je PDF's kan uploaden. Erg handig om handleidingen van specifieke zwaailampen of GPS-systemen centraal op te slaan.

---

### Veelgestelde Vragen

**Hoe voeg ik een heel nieuw type boei toe?**
Ga naar de categorie "Boeien" en klik ergens op "Bewerken" of voeg een nieuw asset toe. Vanuit het dialoogvenster kan je bij het dropdown-menu van het "Type / Model" kiezen om een nieuw type aan te maken. Dat type is daarna overal bruikbaar.

**Ik zie een onderdeel niet als ik onderhoud wil uitvoeren?**
Enkel onderdelen met status "In Opslag" komen tevoorschijn in de keuzelijsten. Controleer The Stock & Inventaris of het item wel degelijk op voorraad staat en niet per ongeluk als "Uitgelegd" of "In Onderhoud" staat gemarkeerd. Via "+ Nieuw onderdeel aanmaken" kan je altijd on-the-fly een nieuw stuk stock toevoegen.
