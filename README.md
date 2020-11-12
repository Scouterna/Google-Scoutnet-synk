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

Du kan ladda ner den senaste versionen via
https://github.com/Scouterna/Google-Scoutnet-synk/releases/latest och där kan
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

## Manual
### Google användarkonton - synkronisering med Scoutnet
Synkroniserar personer som är med på e-postlistor från Scoutnet genom att man
anger id-nummret för e-postlistan i filen Konfiguration.gs i variabeln "userAccountConfig".
Det går bra att ange flera e-postlistor med kommatecken samt skriva kommentarer med
parenteser inom variabelnamnet. Se exemplen i filen.

Om inget id-nummer för en e-postlista anges så tolkar programmet det som alla
personer i kåren som har en avdelningsroll eller roll på kårnivå och skapar
användarkonton på kårens G Suite åt dem i den underorganisationen i G Suite som
man specificerar.

Om ett användarkonto vid nästkommande synkronisering ej matchar någon person
som synkroniseras så inaktiveras det specifika kontot.

Om personen senare matchas aktiveras kontot igen. Det är bara konton som finns
i organisationsstrukturen "Scoutnet" i G Suite som berörs vid en synkronisering.

Användarkonton skapas på formen fornamn.efternamn@domännamn.se

Om det finns personer som har samma namn (för- och efternamn) angivet i Scoutnet
kommer de som skapas som nr2 osv skapas på formen fornamn.efternamnX@domännamn.se
där X motsvarar en siffra från 1-5.

#### Inställningar för att komma igång (i Konfiguration.gs)
- Ändra kårens domän namn på variabeln "domain"
- Ändra kårens grupp-id som finns angivet i Scoutnet på sidan för Webbkoppling
- Ändra api-nyckeln som under Webbkoppling i Scoutnet står under
  "Get a detailed csv/xls/json list of all members"
- Om du gör detta för ett distrikt. Ändra variabeln "organisationType" från "group"
  till "district".

### Övrigt
- Avstängda konton, alltså de som inte längre matchar de som ska synroniseras flyttas till
  underorganisationen "/Scoutnet/Avstängda"
  
### Google grupper - synkronisering med Scoutnet
I ett Google kalkylark kan du ställa in namn på google-grupper, dess e-postadress,
vilken e-postlista i Scoutnet de ska synkroniseras mot samt hur den ska synkronisera
i fältet Synkinställning.
Du kan i cellera för listid kommaseparera flera listor om du vill använda flera listor
från Scoutnet för att bygga upp en större egen. Det går också bra att skriva kommentarer
med parenteser.

Du kan där för synkinställning för respektive e-postlista ange följande
- "@" Lägg till personens Google-konto om den har något, annars hoppa över personen
- "-" Lägg endast till personens e-postadress som listad i Scoutnet
- "&" Lägg till både personens e-postadress som listad i Scoutnet samt Google-konto
  om den har något.

Det går också att ställa in i detta fält vilka e-postadressfält från scoutnet
som ska läggas till
- "m" Lägg till en medlems primära e-postadress.
- "f" Lägg till de e-postadresser som är angivet i fälten Anhörig 1,2.
  Alltså vanligtvis föräldrarna.
- "a" Lägg till en medlems alternativa e-postadress.
- "e" Lägg till de fält som Scoutnet använder för att skicka till med
  den inbyggda e-postlistsfunktionen.
- Om man inte anger något används fälten primär e-postadress, anhörig 1,
  anhörig 2 och alternativ e-postadress.

Det går att enkelt kontrollera vilka som är med i en google-grupp för att se att
man har gjort rätt genom att trycka på länken till höger om varje e-postadress i kalkylarket.

Du kan också lägga till e-postadresser manuellt till en grupp i kalkylarket om du vill.
I stället för att ange listid på något ställe så anger du en e-postadress eller flera med
komma emellan. Det går bra att både använda listid och e-postadress till samma lista.

#### Enkelt och avancerat läge
Det går att ställa in om du vill visa samtliga kolumner i kalkylarket för olika
inställningar eller endast de grundläggande. Detta för att kunna hålla det enkelt.
I filen Grupper.gs finns funktionerna enkelLayout() och avanceradLayout() att använda för detta.
De visar och döljer egentligen bara olika kolumner i kalkylarket, så om man vill
kan man anropa avanceradLayout() för att visa alla kolumner och sen dölja de man inte önskar.

#### Förtydliga hur man skickar e-brev till en e-postlista
Du kan ange en sidfot som läggs till i alla e-brev som skickas till listan.
Bra till t.ex en e-postlista för ledare eller utmanare så att alla vet hur de ska mejla
för att skicka till alla. Detta kanske man glömmer bort att nämna för nya och om man vill
slippa tänka på att komma ihåg att nämna det när det kommer någon ny så står det då i
alla e-brev som de får skickat till sig via e-postlistan.
Kan också förtydliga vilken lista som brevet skickades till och vilka som var mottagarna.

#### Begränsa åtkomst för att skicka och ta emot e-post
Om du vill kan du ställa in att enbart vissa personer ska kunna skicka till en lista,
att vissa personer ska både kunna skicka och ta emot eller att vissa enbart ska kunna
ta emot e-post.
Som standard om du fyller i "Scoutnet-id" och "Synkinställning" under "Kan skicka och
ta emot" så är listan helt publik och vem som helst kan skicka till den. Du kan se detta
som det vanligaste alternativet.
Om du däremot önskar att bara specifika personer ska få skicka till listan så anger du
något Scoutnet-id i cellen under "Kan skicka". Om du önskar att bara kårens e-postdresser
(de e-postkonton som finns i kårens GSuite) ska kunna skicka till en lista så skriver
du in ett "@" (snabela) i rutan "Scoutnet-id" under rukriken "Kan skicka".

Om du vill kan du också specificera vilka som ska få skicka och ta emot för en lista genom
att ange list-ID under rubrikerna "Kan skicka" & "Kan ta emot". Du behöver dock inte ange
under alla tre typerna om du inte vill. Du kanske vill att några ska kunna skicka och ta emot,
till en lista och några andra som bara ska få skicka.

#### Inställningar för att komma igång (i Konfiguration.gs)
- Ändra kårens domännamn på variabeln "domain"
- Ändra kårens "Kår-ID för webbtjänster" på variabeln "groupId. Hittas i Scoutnet på sidan för
  Webbkoppling
- Ändra api-nyckeln med namn api_key_mailinglists som hittas i Scoutnet under
  Webbkoppling under "Get a csv/xls/json list of members, based on mailing lists you have set up"
- Skapa ett Google Kalkylark och klistra in webbadressen vid variabeln "spreadsheetUrl_Grupper"
- Ändra vart e-post som misstänkts för skräppost ska skickas genom att uppdatera variabeln
  "moderateContentEmail". Om inget anges skickas e-breven till den användare som kör detta program.
  Det går inte att ange en av kårens grupper som mottagare, men enskilda e-postadresser och
  Scoutnet-id går bra.
- Om du gör detta för ett distrikt. Ändra variabeln "organisationType" från "group" till "district".
- Spara filen.
- Välj funktionen "createHeaders_Grupper" i Grupper.gs och kör den.
- Fyll i övriga fält i filen Konfiguration.gs vid behov och möjligt.
- Klart.

## Ny version - Hur du gör för att uppgradera
- Uppdatering av programmet sker genom att ladda ner en ny version och uppdatera filerna.
- Om programmet använder kalkylark (för synkronisering av grupper) kan det hända att du behöver
  välja att visa samtliga kolumner i kalkylarket för att kunna infoga eller ta bort kolumner om
  det har skett någon ändring.
- Du hittar senaste versionen av programmet på 
  https://github.com/Scouterna/Google-Scoutnet-synk/releases/latest och där kan
  du också ser vilken funktionalitet som är ny i respektive version och om du behöver göra
  något för att uppdatera förutom att uppdatera koden.
- Kör de olika programmen manuellt en gång innan du kör med tidsinställning då det kan ha
  tillkommit någon ny funktionalitet som kräver ditt tillstånd.
- Du kan hålla dig uppdaterad med nya versioner genom att om du är inloggad på Github trycka
  på knappen **Watch** uppe till höger på sidan för att då kunna bli notifierad vid ny version.

## Hjälp
1. Om problem uppstått när du kört programmet tidsinställt, testa då att köra
   programmet manuellt en gång och se om felet uppstår då också. När man kör programmet
   manuellt kan det dyka upp rutor för att godkänna vissa saker som inte syns när man
   kör programmet tidsinställt.
1. Om du fått något felmeddelande; titta bland de nedan som förklarar de felen som hittills
   har frågats om bland andra kårer.
1. Kolla i loggfilen genom att trycka Ctrl+Enter så kanske du lyckas se vad problemet är
1. Det kan hända att det finns en bugg i den versionen av programmet som du kör vilket
   givet vissa specifika omständigheter yttrar sig för just dig. Se till att du har den
   senaste versionen av programmet.
1. Lägg ett ärende under "Issues" eller mejla emil.ohman@scouterna.se

### Hur gör jag för att...?
Nedan finns en del exempel med olika Scoutnet-id och e-postadresser på hur du gör för att
ställa in programmen så som du vill.
Om du saknar något exempel eller behöver hjälp är det bara att mejla emil.ohman@scouterna.se

#### Användare - inställningar exempel
*  Hur gör jag om jag bara vill synkronisera användare?
   - Du kör funktionen "Anvandare" i filen "Anvandare.gs"

#### Grupper - inställningar exempel
* Hur gör jag om jag bara vill synkronisera grupper / e-postlistor?
   - Du kör funktionen "Grupper" i filen "Grupper.gs"
   
*  Jag vill ha följande e-postlista
   * Bara de med en e-postadress från kåren ska kunna skicka till listan.
   * En grupp/avdelning/scoutföräldrar ska bara kunna ta emot från listan, EJ skicka. Vi vill
   skicka till alla e-postadresser som är registrerad på någon medlem på avdelningen.
      
   Gör följande inställningar i kalkylarket

   <table>
      <thead>
         <tr>
            <th colspan=2>Kan skicka och ta emot</th>
            <th colspan=2>Kan skicka</th>
            <th colspan=2>Kan ta emot</th>
         </tr>
      </thead>
      <tbody>
         <tr>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
         </tr>
         <tr>
            <td></td>
            <td></td>
            <td>@ (kårens googlekonton)</td>
            <td></td>
            <td>1910 (id för avdelningen)</td>
            <td></td>
         </tr>
      </tbody>
   </table>
   
*  Jag vill ha följande e-postlista
   * Bara de som är med på listan samt de med en e-postadress från kåren ska kunna skicka till listan.
   * För de som är med på listan ska e-posten bara skickas till en medlems primära e-postadress i Scoutnet.
      
   Gör följande inställningar i kalkylarket

   <table>
      <thead>
         <tr>
            <th colspan=2>Kan skicka och ta emot</th>
            <th colspan=2>Kan skicka</th>
            <th colspan=2>Kan ta emot</th>
         </tr>
      </thead>
      <tbody>
         <tr>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
         </tr>
         <tr>
            <td>1910 (id för avdelningen)</td>
            <td>-m</td>
            <td>@ (kårens googlekonton)</td>
            <td></td>
            <td></td>
            <td></td>
         </tr>
      </tbody>
   </table>
   
*  Jag vill ha följande e-postlista
   * Vem som helst ska kunna skicka till listan.
   * Alla scouter på avdelningen ska kunna ta emot från listan, men listan ska endast skicka till föräldrarnas e-postadresser för scouterna.
   * Alla ledare på avdelningenska få alla mejl på listan, men listan ska endast skickas till deras e-postkonto hos kåren och inte till någon privat e-postadress.
      
   Gör följande inställningar i kalkylarket

   <table>
      <thead>
         <tr>
            <th colspan=2>Kan skicka och ta emot</th>
            <th colspan=2>Kan skicka</th>
            <th colspan=2>Kan ta emot</th>
         </tr>
      </thead>
      <tbody>
         <tr>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
         </tr>
         <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>1910&rule_id=1930 (id för avdelningen och regel för ledarna)</td>
            <td>@</td>
         </tr>
         <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>1910&rule_id=1940 (id för avdelningen och regel för scouter på avdelningen), [e-postadressen till e-postlistan på raden ovan]</td>
            <td>-f</td>
         </tr>
      </tbody>
   </table>
   
 * Jag vill ha följande e-postlista
   * Vem som helst ska kunna skicka till listan.
   * Jag vill manuellt lägga till vilka e-postadresser som ska vara med.
      
   Gör följande inställningar i kalkylarket

   <table>
      <thead>
         <tr>
            <th colspan=2>Kan skicka och ta emot</th>
            <th colspan=2>Kan skicka</th>
            <th colspan=2>Kan ta emot</th>
         </tr>
      </thead>
      <tbody>
         <tr>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
            <td>Scoutnet-id</td>
            <td>Synkinställning</td>
         </tr>
         <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>scoutnet@scouterna.se, scoutid@scouterna.se</td>
            <td></td>
         </tr>
      </tbody>
   </table>

#### Google Drive - exempel
Att koppla ihop grupper med delade enheter på Google Drive sker manuellt, men du kan använda grupperna som skapats enligt ovan för enkel uppdatering av åtkomst.
Om du döper om själva gruppen, t.ex. e-postadressen, _kan_ gruppen tappa åtkomst till mappen. Detta då gruppen tas bort och en ny skapas med det nya namnet.

- Skapa en "Delad enhet" på Google Drive (https://drive.google.com) från ett konto med lämplig behörighet som finns med i kårens gSuite.
- Lägg till medlemmar till den delade enheten, du kan ange grupper som skapats ovan som medlemmar.

### Felmeddelanden och förslag till lösning
*  ```
   API-anrop till directory.users.insert misslyckades med felet: Domain user limit reached......
   ```
   Du har skapat maximalt antal Google-konton enligt din licens. Detta då din kår antaligen
   inte har skaffat Google Nonprofit och kör på en gammal gratislicens. På admin.google.com
   under Fakturering ska det stå "G Suite for Nonprofit" om du har det. Du kan läsa hos
   https://www.techsoup.se hur du skaffar Google Nonprofit.

## Tekniska förtydliganden
### E-postalias
I vissa specifika fall kan det bli ett felmeddelande i loggen då ett alias till en e-postadress
redan är tillagd. Detta kan vara då en användare t.ex själv har lagt till en e-postadress
abc123@hotmail.se som en alternativ e-postadress för sitt Google-konto hos Google och vi lägger till
hotmail.se-adressen då i e-postlistan för att sedan försöka lägga till den riktiga Gmail-adressen i listan,
tex. abc123@gmail.com som. Det blir då ett fel då denna adress redan är tillagd som alias kan man typ säga,
och Google-gruppen tolkar då dessa adressen som samma. Om båda dessa adresser (abc123@hotmail.se &
abc123@gmail.com) läggs till kan dock inte programmet i förväg veta att de hör ihop utan det märker
det först när den försöker lägga till den andra adressen.
Du löser felet genom att köra programmet igen om du startade det manuellt alternativt invänta nästa
schemalagda körning.

### E-postadresser genereras på följande sätt.
1. För och efternamn görs om till gemener och tar bort alla mellanslag och
   andra tomrum som är skrivet i de fälten i Scoutnet.
1. Därefter görs bokstäverna om till bokstäver som lämpar sig för e-postadresser.
   T.ex åäö blir aao.
1. Om det därefter finns några fler konstiga tecken kvar som inte lämpar sig för
   e-postadress så tas de bort.
