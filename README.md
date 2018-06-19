
# Google-Scoutnet-synkronisering
Du kan med dessa program synkronisera användarkonton med personer i Scoutnet som har en funktionärsroll samt synkronisera google-grupper med e-postlistor i Scoutnet. Du kan använda dessa som e-postlistor eller som att lägg till att en specifik google-grupp ger behörighet till en Team drive. Alltså automatisk synkronisering att t.ex Spårarledare ges behörighet till en Teamdrive för Spårare.
Denna lösning använder Google Apps Script.
Vid problem, fel, frågor eller tips på förbättringar eller fler funktioner som du saknar; lägg ett ärende under "Issues" eller mejla emil.ohman@scouterna.se
## Inställningar
### Generella inställningar


### Synkronisera användare & grupper
1. Logga in till Adminkonsolen för G Suite med ditt adminkonto och tryck på "Säkerhet". Tryck på "API-referens", och tryck på kryssrutan för att "Aktivera API-åtkomst".
2. I kårens G Suite ställer du in under Admin/Användare in en underorganisation som heter "Scoutnet" (utan citationstecken). https://support.google.com/a/answer/182537?hl=en
3. I kårens G Suite ställer du in under Admin/Appar/G Suite och trycker på Scoutnet i organisationsstrukturen till vänster och sätter på/ stängar av de tjänster som ska vara tillgängliga för de användare som synkroniseras. Tänk på att det är lättare att ha mycket avstängt och sen sätta på tjänster vid behov än tvärt om.
-- Om du trycker på "Katalog" kan du ställa in om användare ska få anpassa sina namn. Det går också att aktivera kontaktdelning inom kåren vilket kan underlätta kommunikationen internt.
4. Det går också att sätta på / stänga av inställningar under Admin/Appas/Ytterliggare tjänster från Google.
5. Besök script.google.com när du är inloggad på kårens webbansvariges Google-konto eller annat lämpligt Google-konto med hög behörighet på kårens G Suite.
6. Tryck på "Nytt Script" och namnge sedan projektet till något lämpligt, t.ex Scoutnet.
7. Till vänster på skärmen listas de olika filer som finns i projektet och vid nu vid starten finns endast en som heter Code.gs. Byt namn på den till "Användare" och ta bort den koden som står i filen.
8. Klistra in koden från filen Användare.gs och spara (Ctrl+S).
9. Skapa en ny fil som heter "Grupper" och gör samma sak för filen Grupper.gs
10. Under "Resources"/"Advanced Google Services" behöver du aktivera "Admin Directory API", "Google Sheets API" och "Group Settings API". På denna sida finns också en länk till "Google API Console" (https://console.cloud.google.com/apis/library?project) där du också behöver aktivera tjänsterna. Aktivera där "Admin SDK", "Google Sheets API", "Group Settings API".
11. Gör inställningar enligt nedan för respektive fil.
12. Kör programmet en gång genom att trycka på filen Användare.gs och välja funktionen "AccountsAndGroups" upp bland menyn och tryck sedan på playknappen.
13. Du kan nu tidinställa hur ofta som programmen ska köra/synkronisera genom att trycka på "klocksymbolen" i menyn och ställa in synkroniseringar. Tänk på att inte köra synkroniseringen för ofta då det finns maxbegränsningar per dag och som mestadels beror på antal grupper och e-postadresser i dessa. Det bör räcka med att synkronisera användare en gång per dygn och samma för grupper, förslagsvis mitt i natten. Synkroniseringen bör gå under minuten och om det är personer som på något sätt har ställt in att deras e-postadress ska användas som ett slags alias för deras @gmail.com så kommer deras adress tas bort från e-postlistan och sedan läggas till igen någon delsekund senare. Du kan här trycka på "notifications" och ställa in att att du får felmeddelanden om något skulle gå fel.
Om du vill att synkroniseringen av användarkonton och grupper ska ske "samtidigt" (direkt efter varandra) så kan du ställa in den att exekvera funktionen "AccountsAndGroup".
### Övriga program
1. Skapa en ny fil i samma projekt som tidigare och klistra in koden och kör. Eventuellt kan du behöva lägga till någon inställning i konfigurationsfilen (kommer inom kort).
2. Läs aktuellt avsnitt i manualen nedan.
## Manual
### Google användarkonton - synkronisering med Scoutnet
Synkroniserar personer som har en funktionsroll i kåren på avdelningsnivå eller på kårnivå och skapar användarkonton på kårens G Suite åt dem. Om personen vid nästkommande synkronisering ej har en funktionsroll inaktiveras konto. Om personen senare får en funktionsroll aktiveras kontot igen. Det är bara konton som finns i organisationsstrukturen "Scoutnet" i G Suite som berörs vid en synkronisering. Användarkonton skapas på formen fornamn.efternamn@domännamn.se.
Om det finns personer som har samma namn (för- och efternamn) angivet i Scoutnet kommer de som skapas som nr2 osv skapas på formen fornamn.efternamnX@domännamn.se där X motsvarar en siffra från 1-5.
- E-postadresser genereras på följande sätt.
1. För och efternamn görs om till gemener och tar bort alla mellanslag och andra tomrum som är skrivet i de fälten i Scoutnet.
2. Därefter görs bokstäverna om till bokstäver som lämpar sig för e-postadresser. T.ex åäö blir aao.
3. Om det därefter finns några fler konstiga tecken kvar som inte lämpar sig för e-postadress så tas de bort.
#### Inställningar
- Ändra kårens domän namn på variabeln "domain"
- Ändra kårens grupp-id som finns angivet i Scoutnet på sidan för Webbkoppling
- Ändra api-nyckeln som under Webbkoppling i Scoutnet står under "Get a detailed csv/xls/json list of all members"


### Google grupper - synkronisering med Scoutnet
I kalkylarket kan du ställa in namn på de olika google-grupperna, dess e-postadress, vilken e-postlista i Scoutnet de ska synkroniseras mot samt hur den ska synkronisera i fältet Synkinställning. Du kan där för respektive e-postlistan ange följande
- "@" Lägg till personens Google-konto om den har något, annars hoppa över personen
- "-" Lägg endast till personens e-postadress som listad i Scoutnet
- "&" Lägg till både personens e-postadress som listad i Scoutnet samt Google-konto om den har något.

Det går också att ställa in i detta fält vilka e-postadressfält från scoutnet som ska läggas till
- "m" Lägg endast till en medlems primära e-postadress
- "f" Lägg endast till de e-postadresser som är angivet i fälten Anhörig 1,2. Alltså vanligtvis föräldrarna.
- Om man inte anger något används fälten primär e-postadress, anhörig 1, anhörig 2 och alternativ e-postadress.

Det går att enkelt kontrollera vilka som är med i en google-grupp genom att trycka på länken vid varje e-postadress i kalkylarket.

Om du vill att en person ska vara med i en Google-grupp utan att beröras av att tas bort vid en synkronisering lägger du till e-postadressen som ägare eller medarbetare av gruppen.
#### Inställningar
- Ändra kårens domän namn på variabeln "domain"
- Ändra kårens grupp-id som finns angivet i Scoutnet på sidan för Webbkoppling
- Ändra api-nyckeln som under Webbkoppling i Scoutnet står under "Get a csv/xls/json list of members, based on mailing lists you have set up"
- Skapa ett Google Kalkylark och klistra in webbadressen vid variabeln "spreadsheetUrl"
- Spara.
- Välj funktionen createHeaders och kör den.
- Klart.

## Hjälp
1. Om problem uppstått när du kört programmet tidsinställt, testa då att köra programmet manuellt en gång och se om felet uppstår då också. När man kör programmet manuellt kan det dyka upp rutor för att godkänna vissa saker som inte syns när man kör programmet tidsinställt.
2. Kolla i loggfilen genom att trycka Ctrl+Enter så kanske du lyckas se vad problemet är
3. Det kan hända att det finns en bugg i den versionen av programmet som du kör vilket givet vissa specifika omständigheter yttrar sig för just dig. Se till att du har den senaste versionen av programmet.
4. Lägg ett ärende under "Issues" eller mejla emil.ohman@scouterna.se
