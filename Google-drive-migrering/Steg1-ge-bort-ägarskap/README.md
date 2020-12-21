# Skript för att överföra ägarskap för filer och mappar
Skriptet överför ägarskapet för filer och undermappar för en given mapp till ett annat Google-konto.

## Varför ska vi överföra ägarskapet?
Det optimala är egentligen om alla ledare överför sina egna filer till den nya delade enheten, men då olika personer kan ha sina filer spridda på väldigt
många olika undermappar och kanske bara en enstaka i varje kan det bli ett väldigt omständigt arbete att flytta.

Du som inte äger en fil på Google drive kan inte ta bort den helt och hållet utan kan enbart ta bort den för dig och andra som har redigerarbehörighet
men den kommer fortsatt finnas kvar hos den som ursprungligen skapade den.
Målet med skriptet är alltså att hjälpa till att samtliga som har tillgång till en mapp överför sitt ägarskap för filer och undermappar till en användare
för att slut bli så att alla enbart tillhör ett konto som då kan flytta alla filer samtidigt.

## Krav för att överföra ägarskap
För att kunna överföra ägarskap för filer och mappar måste den som överför ägarskapaet ha sitt konto på samma domän som den som ägarskapet önskas
överföras till.

T.ex kan ett @gmail.com endast överföra ägarskap till ett annat @gmail.com konto och ett konto på kårens domän kan enbart överföra ägarskap till ett
annat konto på kårens domän. Om ni har en blandning av vilka typer av konton ni använt kan du behöva göra två uppsättningar av skripet med olika
e-postadresser för vem den nya ägaren ska vara för att detta skript ska komma till nytta. Alltså ett skript som ändrar den nya ägaren till ditt konto
på kårens domän och det andra som ändrar till ditt privata @gmail.com konto.
