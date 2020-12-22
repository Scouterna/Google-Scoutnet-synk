# Migreringsverktyg för Google drive
Dessa program är tänkta att användas för kåren vid migrering från att kåren tidigare har använt vanlig Google drive och att nu börja använda Googles
Delade enheter.

För att hjälpa till med migreringen har olika skript tagits fram som du kan läsa mer om nedan.

## Skillnad mellan Google drive och Google Delade enheter
Vanliga Google drive kan beskrivas som att varje person som skapar en fil eller mapp äger den och inga andra kan ta bort den utan kan bara ta bort den hos
andra som har tillgång till den och sig själv men ej ta bort den för den som skapat den. Då det ju går att skapa undermappar till andra mappar som andra
har skapat blir det lätt svåröverskådligt med alla olika mapp- eller filägare och det går inte heller att få en hållbar lagringslösning på lång sikt.
Du som ej äger en fil kan ej flytta den till delade enheter utan kan enbart skapa en kopia där.

Delade enheter fungerar som en vanlig hårddisk på en server. Om någon annan tar bort en fil försvinner den hos alla andra också.

För att minska risken att ledare använder gamla filer på drive och inte eventuella nya kopior på delade enheter är det bra att ta bort så mycket
delning som möjligt från filer på drive så att enbart du själv och filägaren står kvar för att sen ta bort din egna behörighet också. För att minska
spridning av känsliga uppgifter är det också bra att ta bort känslig data ur filen innan du tar bort din egna behörighet. Tyvärr går det inte att
ta bort filen helt och hållet, så filen kommer finnas kvar och eventuellt kunna återställas om versionshistorik finns.
Skripten hjälper till med detta arbete vilket kan vara omständigt om det görs manuellt.

## Skript
### Ge bort ditt ägarskap för filer och mappar
Skript för att dela med användare i kåren som har tillgång till en given mapp och undermappar för att flytta deras ägarskap till dig eller given
e-postadress.

Tips är att köra skriptet om att lista vilka som äger filer och undermappar före du delar detta med kårens funktionärer för att veta vilka du ska skicka
skriptet till.

### Lista vilka som äger filer och undermappar i en mapp
Skript för att få fram vilka som äger alla filer och undermappar till en given mapp.

### Ta bort länkdelning och redigerare för filer och undermappar i en mapp
Skript som tar bort länkdelning och redigerare för alla filer och undermappar till en given mapp. De enda som är kvar är fil/mapp-ägaren och du själv.

### Skapa nya filer som du själv äger
Skript som skapar filer som du själv äger som är kopior och tar bort orginalfilen för dig. Skriver också över orginalfilen med ny data.

## Förslag till utförandesteg
1. Ladda ner en kopia från Google drive för den mappen du vill flytta för att ha som säkerhetskopia.
1. Sätt upp alla skripten enligt instruktionerna.
1. Kör skriptet `ListaÄgare` för att få fram e-postadresser på vilka som äger alla filer och undermappar.
1. Skicka ett mejl och dela skriptet `BytaÄgare` enligt instruktionen till de det berör. Du kommer få massor av e-brev när någon kör skriptet så att du vet. Se också till att de du skickar skriptet till har e-postkonto på samma domän som de ska överföra ägarskapet till.
1. Nu är förhoppningsvis allt överfört till dig om alla har kört skriptet. Kör skriptet `ListaÄgare` för att se om det nu bara är du som är listad som ägare.
1. När du är nöjd; kör skriptet `ÄndraDelning` för att se till så att inte alla längre har tillgång till alla filer. Det kan behövas lite manuellt arbete med ändring av behörighetsdelning efter körningen om inte programmet lyckas ändra på alla ställen.
1. Kör skriptet `KopiaNyÄgare` för att skapa kopior på de filer som du ej äger så att du nu äger de nya filerna. Orginalfilerna skrivs över och raderas htl för alla förutom orginalägaren. 
1.  Kör skriptet `ÄndraDelning` igen då det kan ha blivit problem med att ta bort behörigheten för ägaren till orginalfilerna från kopian.
1. Börja flytta över alla filer till den delade enheten. Mapparna får du skapa på nytt på den delade enheten och de gamla mapparna ska raderas.
