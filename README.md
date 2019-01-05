# Google-Scoutnet-synkronisering
Du kan med dessa program synkronisera användarkonton med personer i Scoutnet som
har en funktionärsroll samt synkronisera google-grupper med e-postlistor i Scoutnet.
Du kan använda dessa som e-postlistor eller som att lägga till att en specifik
google-grupp ger behörighet till en specifik Team drive. Alltså automatisk synkronisering att
t.ex Spårarledare ges behörighet till en Teamdrive för Spårare.
Denna lösning använder Google Apps Script.

Vid problem, fel, frågor eller tips på förbättringar eller fler funktioner som du saknar;
lägg ett ärende under "Issues" eller mejla emil.ohman@scouterna.se

Du kan ladda ner den senaste versionen via
https://github.com/scouternasetjanster/Google-Scoutnet-synk/releases/latest och där kan
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

   Synkroniseringen bör gå under minuten.

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

## Manual
### Google användarkonton - synkronisering med Scoutnet
Synkroniserar personer som som är med på e-postlistor från Scoutnet genom att
man anger id-nummret för e-postlistan i filen Konfiguration.gs. Det går bra att ange
flera e-postlistor med kommatecken samt skriva kommentarer med parenteser inom
variabelnamnet. Se exemplen i filen.
Om inget id-nummer för en e-postlista anges så tolkar programmet det som alla
personer i kåren som har en avdelningsroll eller roll på kårnivå och skapar
användarkonton på kårens G Suite åt dem i den underorganisationen i G Suite som
man specificerar.
Om ett användarkonto vid nästkommande synkronisering ej matchar någon person
som synkroniseras så inaktiveras konto.
Om personen senare matchas aktiveras kontot igen. Det är bara konton som finns
i organisationsstrukturen "Scoutnet" i G Suite som berörs vid en synkronisering.
Användarkonton skapas på formen fornamn.efternamn@domännamn.se

Om det finns personer som har samma namn (för- och efternamn) angivet i Scoutnet
kommer de som skapas som nr2 osv skapas på formen fornamn.efternamnX@domännamn.se
där X motsvarar en siffra från 1-5.

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

Det går att enkelt kontrollera vilka som är med i en google-grupp för att se att
man har gjort rätt genom att trycka på länken till höger om varje e-postadress i kalkylarket.

Om du vill att en person ska vara med i en Google-grupp utan att beröras av att tas
bort vid en synkronisering lägger du till e-postadressen som ägare av gruppen.

#### Enkelt och avancerat läger
Det går nu att ställa in om du vill visa samtliga kolumner i kalkylarket för olika
inställningar eller endast de grundläggande. Detta för att kunna hålla det enkelt.

#### Begränsa åtkomst för att skicka och ta emot e-post
Om du vill kan du ställa in att enbart vissa personer ska kunna skicka till en lista,
att vissa personer ska både kunna skicka och ta emot eller att vissa enbart ska kunna
ta emot e-post.
Som standard om du fyller i "Scoutnet-id" och "Synkinställning" under "Kan skicka och
ta emot" så är listan helt publik och vem som helst kan skicka till den. Du kan se detta
som det vanligaste.
Om du på detta enkla sätt vill ställa in att enbart kårens adresser (de e-postkonton som
finns i kårens GSuite) ska kunna skicka till denna lista så skriver du in ett "@" (snabela)
i rutan "synkinställning" under rukriken "Kan skicka". Och om du enbart vill att de som är
på listan ska kunna skicka till listan så skriver du "lista" i den cellen i kalkylarket i
stället. Du kan inte använda någon lista under rubrikerna "Kan skicka" eller "Kan ta emot"
om du använder denna funktionalitet för en specifik grupp"
T.ex kanske du vill har en e-postlista som går till föräldrar på en avdelning och då enbart
vill att någon med en kåradress ska kunna skicka till den. Eller att du bara vill att de som
är på en avdelning (förälder eller som ledare) ska kunna skicka till avdelningslistan.

Om du vill kan du också specificera vilka som ska få skicka och ta emot för en lista genom
att ange list-ID under rubrikerna "Kan skicka" & "Kan ta emot". Du behöver dock inte ange
under alla tre om du inte vill. Du kanske vill att några ska kunna skicka och ta emot,
till en lista och några andra som bara ska få skicka.

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

## Ny version
- Uppdatering av programmet sker genom att ladda ner en ny version och uppdatera filerna.
- Om programmet använder kalkylark kan det hända att du behöver välja att visa samtliga
  kolumner i kalkylarket för att kunna infoga eller ta bort kolumner om det har skett
  någon ändring.
- Du hittar senaste versionen av programmet på 
  https://github.com/scouternasetjanster/Google-Scoutnet-synk/releases/latest och där kan
  du också ser vilken funktionalitet som är ny i respektive version om om du behöver göra
  något för att uppdatera förutom att uppdatera koden.
- Kör de olika programmen manuellt en gång innan du kör med tidsinställning då det kan ha
  tillkommit någon ny funktionalitet som kräver ditt tillstånd.
- Du kan hålla dig uppdaterad med nya versioner genom att om du är inloggad på Github trycka
  på knappen "Watch" uppe till höger på sidan för att då bli notifierad vid ny version.

## Hjälp
1. Om problem uppstått när du kört programmet tidsinställt, testa då att köra
   programmet manuellt en gång och se om felet uppstår då också. När man kör programmet
   manuellt kan det dyka upp rutor för att godkänna vissa saker som inte syns när man
   kör programmet tidsinställt.
1. Kolla i loggfilen genom att trycka Ctrl+Enter så kanske du lyckas se vad problemet är
1. Det kan hända att det finns en bugg i den versionen av programmet som du kör vilket
   givet vissa specifika omständigheter yttrar sig för just dig. Se till att du har den
   senaste versionen av programmet.
1. Lägg ett ärende under "Issues" eller mejla emil.ohman@scouterna.se


## Tekniska förtydliganden
### E-postadresser kan tas bort för att igen läggs till.
Synkroniseringen av användare bör gå under minuten och om det är personer som på något sätt har ställt
in att deras e-postadress ska användas som ett slags alias för deras @gmail.com så kan det hända att
deras adress tas bort från e-postlistan och sedan läggas till igen någon delsekund senare. Detta kan
om personen har t.ex adressen fornamn.efternamn@gmail.com men att det i Scoutnet står
fornamnefternamn@gmail.com. Detta då detta program tolkar dessa som olika, men gmail tycker att de
är lika.
### E-postadresser genereras på följande sätt.
1. För och efternamn görs om till gemener och tar bort alla mellanslag och
   andra tomrum som är skrivet i de fälten i Scoutnet.
1. Därefter görs bokstäverna om till bokstäver som lämpar sig för e-postadresser.
   T.ex åäö blir aao.
1. Om det därefter finns några fler konstiga tecken kvar som inte lämpar sig för
   e-postadress så tas de bort.