
# Google-Scoutnet-synkronisering
Du kan med dessa program synkronisera användarkonton med personer i Scoutnet som
har en funktionärsroll samt synkronisera google-grupper med e-postlistor i Scoutnet.
Du kan använda dessa som e-postlistor eller som att lägg till att en specifik
google-grupp ger behörighet till en Team drive. Alltså automatisk synkronisering att
t.ex Spårarledare ges behörighet till en Teamdrive för Spårare.
Denna lösning använder Google Apps Script.

Vid problem, fel, frågor eller tips på förbättringar eller fler funktioner som du saknar;
lägg ett ärende under "Issues" eller mejla emil.ohman@scouterna.se

Du kan ladda ner den senaste versionen via
https://github.com/scouternasetjanster/Google-Scoutnet-synk/releases/latest och där kan
du också ser vilken funktionalitet som är ny i respektive version.

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
   tjänster från Google.
1. Besök script.google.com när du är inloggad på kårens webbansvariges Google-konto
   eller annat lämpligt Google-konto med hög behörighet på kårens G Suite.
1. Tryck på "Nytt Script" och namnge sedan projektet till något lämpligt, t.ex Scoutnet.
1. Till vänster på skärmen listas de olika filer som finns i projektet och vid nu vid
   starten finns endast en som heter Code.gs. Byt namn på den till "Användare" och
   ta bort den koden som står i filen.
1. Klistra in koden från filen Anvandare.gs och spara (Ctrl+S).
1. Gör samma sak för de andra filerna som slutar på .gs
1. Under "Resources"/"Advanced Google Services" behöver du aktivera "Admin Directory API",
   "Google Sheets API" och "Group Settings API". På denna sida finns också en länk till
   "Google API Console" (https://console.cloud.google.com/apis/library?project) där du
   också behöver aktivera tjänsterna. Aktivera där "Admin SDK", "Google Sheets API", "Group Settings API".
1. Gör inställningar enligt nedan för respektive fil.
1. Kör programmet en gång genom att trycka på filen Användare.gs och välja funktionen
   "AnvändareOchGrupper" upp bland menyn och tryck sedan på playknappen.
1. Du kan nu tidinställa hur ofta som programmen ska köra/synkronisera genom att trycka
   på "klocksymbolen" i menyn och ställa in synkroniseringar.

   Tänk på att inte köra synkroniseringen för ofta då det finns maxbegränsningar per dag
   och som mestadels beror på antal grupper och e-postadresser i dessa.
   Det bör räcka med att synkronisera användare en gång per dygn och samma för grupper,
   förslagsvis mitt i natten.

   Synkroniseringen bör gå under minuten och om det är personer som på något sätt har ställt
   in att deras e-postadress ska användas som ett slags alias för deras @gmail.com så kommer
   deras adress tas bort från e-postlistan och sedan läggas till igen någon delsekund senare.

   Du kan här trycka på "notifications" och ställa in att att du får felmeddelanden om något
   skulle gå fel. Om du vill att synkroniseringen av användarkonton och grupper ska ske
   "samtidigt" (direkt efter varandra) så kan du ställa in den att exekvera funktionen
   "AnvändareOchGrupper".

### Övriga program
1. Skapa en ny fil i samma projekt som tidigare och klistra in koden och kör.
   Eventuellt kan du behöva lägga till någon inställning i konfigurationsfilen Konfiguration.gs.
1. Läs aktuellt avsnitt i manualen nedan.

## Manual
### Google användarkonton - synkronisering med Scoutnet
Synkroniserar personer som som är med på e-postlistor från Scoutnet genom att
man anger id-nummret för e-postlistan i Konfiguration.gs. Det går bra att ange
flera e-postlistor med kommatecken samt skriva kommentarer med parenteser.
Om inget id-nummer för en e-postlista anges så tolkat programmet det som alla
personer i kåren som har en avdelningsroll eller roll på kårnivå och skapar
användarkonton på kårens G Suite åt dem i den underorganisationen i G Suite som
man specificerar.
Om personen vid nästkommande synkronisering ej matchar något inaktiveras konto.
Om personen senare matchas aktiveras kontot igen. Det är bara konton som finns
i organisationsstrukturen "Scoutnet" i G Suite som berörs vid en synkronisering.
Användarkonton skapas på formen fornamn.efternamn@domännamn.se

Om det finns personer som har samma namn (för- och efternamn) angivet i Scoutnet
kommer de som skapas som nr2 osv skapas på formen fornamn.efternamnX@domännamn.se
där X motsvarar en siffra från 1-5.

#### E-postadresser genereras på följande sätt.
1. För och efternamn görs om till gemener och tar bort alla mellanslag och
   andra tomrum som är skrivet i de fälten i Scoutnet.
1. Därefter görs bokstäverna om till bokstäver som lämpar sig för e-postadresser.
   T.ex åäö blir aao.
1. Om det därefter finns några fler konstiga tecken kvar som inte lämpar sig för
   e-postadress så tas de bort.

#### Inställningar
- Ändra kårens domän namn på variabeln "domain"
- Ändra kårens grupp-id som finns angivet i Scoutnet på sidan för Webbkoppling
- Ändra api-nyckeln som under Webbkoppling i Scoutnet står under
  "Get a detailed csv/xls/json list of all members"


### Google grupper - synkronisering med Scoutnet
I kalkylarket kan du ställa in namn på de olika google-grupperna, dess e-postadress,
vilken e-postlista i Scoutnet de ska synkroniseras mot samt hur den ska synkronisera
i fältet Synkinställning.

Du kan i cellera för listid kommaseparera flera listor om du vill använda flera listor
från Scoutnet för att bygga upp en större egen. Det går också bra att skriva kommentarer
med parenteser.

Du kan där för respektive e-postlistan ange följande
- "@" Lägg till personens Google-konto om den har något, annars hoppa över personen
- "-" Lägg endast till personens e-postadress som listad i Scoutnet
- "&" Lägg till både personens e-postadress som listad i Scoutnet samt Google-konto
  om den har något.

Det går också att ställa in i detta fält vilka e-postadressfält från scoutnet
som ska läggas till
- "m" Lägg endast till en medlems primära e-postadress
- "f" Lägg endast till de e-postadresser som är angivet i fälten Anhörig 1,2.
  Alltså vanligtvis föräldrarna.
- "e" Lägg endast till de fält som Scoutnet använder för att skicka till med
  den inbyggda e-postlistsfunktionen.
- Om man inte anger något används fälten primär e-postadress, anhörig 1,
  anhörig 2 och alternativ e-postadress.

Det går att enkelt kontrollera vilka som är med i en google-grupp genom att
trycka på länken vid varje e-postadress i kalkylarket.

Om du vill att en person ska vara med i en Google-grupp utan att beröras av att tas
bort vid en synkronisering lägger du till e-postadressen som ägare eller medarbetare av gruppen.

#### Begränsa åtkomst

Kolumnen "Begränsa åtkomst" i kalkylbladet styr vem som får lov att skicka till listan. Detta kan t.ex. användas så att bara ledare inom kåren får lov att skicka till listor med alla scouter, medan en lista som går till ledarna kan användas av utomstående.

- Tom ruta betyder betyder att vem som helst får skicka till listan. Detta är bra för inkommande meddelanden, t.ex. styrelsen, ledarteam, lägerkommittéer osv.
- "ALL_IN_DOMAIN_CAN_POST" begränsar till avsändare från kårens domän i G Suite. Detta är bra för listor som går till alla scouter på en avdelning eller hela kåren.
- För mer info, se avsnittet "whoCanPostMessage" i Googles dokumentation här: https://developers.google.com/admin-sdk/groups-settings/v1/reference/groups#resource

#### Inställningar (i Konfiguration.gs)
- Ändra kårens domännamn på variabeln "domain"
- Ändra kårens grupp-id som finns angivet i Scoutnet på sidan för Webbkoppling
- Ändra api-nyckeln med namn api_key_mailinglists som hittas i Scoutnet under
  Webbkoppling under "Get a csv/xls/json list of members, based on mailing lists you have set up"
- Skapa ett Google Kalkylark och klistra in webbadressen vid variabeln "spreadsheetUrl_Grupper"
- Spara.
- Välj funktionen GrupperRubrikData i Grupper.gs och kör den.
- Fyll i övriga fält i filen Konfiguration.gs vid behov och möjligt.
- Klart.

## Hjälp
1. Om problem uppstått när du kört programmet tidsinställt, testa då att köra
   programmet manuellt en gång och se om felet uppstår då också. När man kör programmet
   manuellt kan det dyka upp rutor för att godkänna vissa saker som inte syns när man
   kör programmet tidsinställt.
2. Kolla i loggfilen genom att trycka Ctrl+Enter så kanske du lyckas se vad problemet är
3. Det kan hända att det finns en bugg i den versionen av programmet som du kör vilket
   givet vissa specifika omständigheter yttrar sig för just dig. Se till att du har den
   senaste versionen av programmet.
4. Lägg ett ärende under "Issues" eller mejla emil.ohman@scouterna.se
