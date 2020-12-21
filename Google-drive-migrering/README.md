# Migreringsverktyg för Google drive
Dessa program är tänkta att användas för kåren vid migrering från att kåren tidigare har använt vanlig Google drive och att nu börja använda Googles
Delade enheter.

För att hjälpa till med migreringen har olika skript tagits fram som du kan läsa mer om nedan

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
Skript som tar bort länkdelning och redigerare för alla filer och undermappar till en given mapp. De enda som är kvar är fil/mapp-ägaren och du.

### Skapa nya filer som du själv äger
Skript som skapar filer som du själv äger som är kopior och tar bort orginalfilen för dig. Skriver också över orginalfilen med ny data.
