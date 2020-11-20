# Google-Scoutnet-synkronisering
Du kan med dessa program synkronisera Google-användarkonton hos kåren med personer i Scoutnet
samt synkronisera google-grupper med e-postlistor i Scoutnet
Du kan använda dessa som e-postlistor eller som att lägga till att en specifik
google-grupp ger behörighet till en specifik "Delad enhet". Alltså automatisk synkronisering att
t.ex Spårarledare ges behörighet till en "Delad enhet" för Spårare.
Denna lösning använder Google Apps Script.

Vid problem, fel, frågor eller tips på förbättringar eller fler funktioner som du saknar;
lägg ett ärende under "Issues" eller mejla emil.ohman@scouterna.se
I bland kommer det ny funktionalitet, så håll utkik på en ny version genom att trycka på knappen
**Watch** uppe till höger på sidan för att du kunna bli notifierad vid en ny version.

Du kan ladda ner den senaste versionen [här]
(https://github.com/Scouterna/Google-Scoutnet-synk/releases/latest) och där kan
du också ser vilken funktionalitet som är ny i respektive version. Läs filen README.md
för instruktion om installation och funktionalitet.

## Inställningar
### Generella inställningar

### Synkronisera användare & grupper
1. Logga in till Adminkonsolen för G Suite med ditt adminkonto och tryck på "Säkerhet".
   Tryck på "API-referens", och tryck på kryssrutan för att "Aktivera API-åtkomst".
1. I kårens G Suite ställer du in under Admin/Användare in en underorganisation som
   heter "Scoutnet" (utan citationstecken). https://support.google.com/a/answer/182537?hl=en
1. I kårens G Suite ställer du in under Admin/Appar/G Suite och trycker på Scoutnet i
   organisationsstrukturen till vänster och sätter på/ stänger av de tjänster som ska vara
   tillgängliga för de användare som synkroniseras.
   Tänk på att det är lättare att ha mycket
   avstängt och sen sätta på tjänster vid behov än tvärt om.
   -- Om du trycker på "Katalog" kan du ställa in om användare ska få anpassa sina namn.
   Det går också att aktivera kontaktdelning inom kåren vilket kan underlätta
   kommunikationen internt.
1. Det går också att sätta på / stänga av inställningar under Admin/Appar/Ytterligare
   tjänster från Google. Om ni har stängt av det tidigare behöver "Google Cloud Platform"
   aktiveras för den användare som ska köra detta program.
1. Besök script.google.com när du är inloggad på kårens webbansvariges Google-konto
   eller annat lämpligt Google-konto med hög behörighet på kårens G Suite.
1. Tryck på "Nytt Script" och namnge sedan projektet till något lämpligt, t.ex Scoutnet.
1. Till vänster på skärmen listas de olika filer som finns i projektet och vid nu vid
   starten finns endast en som heter Code.gs. Byt namn på den till "Användare" och
   ta bort den koden som står i filen.
1. Klistra in koden från filen Anvandare.gs och spara (Ctrl+S).
1. Gör samma sak för de andra filerna som slutar på .gs genom att skapa nya filer och
   klistra in koden för respektive.
1. Under "Resources"/"Advanced Google Services" behöver du aktivera "Admin Directory API",
   "Google Sheets API" och "Group Settings API". På denna sida finns också en länk till
   "Google API Console" (https://console.cloud.google.com/apis/library?project) där du
   också behöver aktivera tjänsterna. Aktivera där "Admin SDK", "Google Sheets API", "Group Settings API".
1. Gör inställningar enligt nedan för respektive fil.
   [Användare](#inställningar-för-att-komma-igång-i-konfigurationgs), 
   [Grupper](#inställningar-för-att-komma-igång-i-konfigurationgs-1)
1. Kör programmet en gång genom att trycka på filen Användare.gs och välja funktionen
   "AnvändareOchGrupper" upp bland menyn och tryck sedan på playknappen.
1. Du kan nu tidinställa hur ofta som programmen ska köra/synkronisera genom att trycka
   på "klocksymbolen" i menyn och ställa in synkroniseringar.

   Tänk på att inte köra synkroniseringen för ofta då det finns maxbegränsningar per dag
   och som mestadels beror på antal grupper och e-postadresser i dessa.
   Det bör räcka med att synkronisera användare en gång per dygn och samma för grupper,
   förslagsvis mitt i natten.

   Om du har många användare och grupper som ska synkroniseras kan det hända att det tar
   för lång tid för programmet att klara av allt under en körning. Du kan då ställa in en
   körning av "Användare" och en för "Grupper". Om körningen för "Grupper" trots allt tar
   för lång tid finns i Grupper.gs funktionerna "GrupperVissaRader1" osv. som du kan ställa
   in att enbart vissa rader i kalkylarket ska synkroniseras.

   Du kan här trycka på "notifications" och ställa in att att du får felmeddelanden om något
   skulle gå fel. Om du vill att synkroniseringen av användarkonton och grupper ska ske
   "samtidigt" (direkt efter varandra) så kan du ställa in den att exekvera funktionen
   "AnvändareOchGrupper".
1. För att komma ihåg vilken version av programmet du har kan du t.ex trycka på "File"-->
   "Manage versions" och sedan skrivna versionsnumret i rutan och sedan trycka på
   "Save new version"

### Övriga program
1. Skapa en ny fil i samma projekt som tidigare och klistra in koden och kör.
   Eventuellt kan du behöva lägga till någon inställning i konfigurationsfilen Konfiguration.gs.
1. Läs aktuellt avsnitt i manualen nedan.
