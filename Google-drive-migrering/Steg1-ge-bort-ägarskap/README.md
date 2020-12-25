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
För att kunna överföra ägarskap för filer och mappar måste den som överför ägarskapet ha sitt konto på samma domän som den som ägarskapet önskas
överföras till.

T.ex kan ett @gmail.com endast överföra ägarskap till ett annat @gmail.com konto och ett konto på kårens domän kan enbart överföra ägarskap till ett
annat konto på kårens domän. Om ni har en blandning av vilka typer av konton ni använt kan du behöva göra två uppsättningar av skripet med olika
e-postadresser för vem den nya ägaren ska vara för att detta skript ska komma till nytta. Alltså ett skript som ändrar den nya ägaren till ditt konto
på kårens domän och det andra som ändrar till ditt privata @gmail.com konto.

## Inställningar
1. Besök när du är inloggad på kårens webbansvariges Google-konto eller annat lämpligt Google-konto med hög behörighet på kårens Google Workspace den mapp på Google drive där du vill lagra projektet. Där skapar du en ny fil på formatet `Google Apps Script`. Om du ska dela skriptet för olika mappar till olika personer är det lämpligt att skriva i projektnamnet också vilken mapp det är frågan om.
1. Till vänster på skärmen listas de olika filer som finns i projektet och nu vid starten finns endast en som heter Code.gs. Byt namn på den till `BytaÄgare` och ta bort den koden som står i filen.
1. Klistra in koden från filen `BytaÄgare.gs` och spara (Ctrl+S).
1. Ändra följande variabler i koden
    -   Styr till vilket Google-konto som skriptet ska försöka överföra ägarskapet till.
        - ```
            var emailOfNewOwner = "webmaster@dinegnascoutkår.se";
            ```
    - Vilken domän som Google-kontot tillhör som försöker överföra ägarskapet till. Som en liten extra koll att du fyller i rätt e-postadress.
        - ```
            var domain = "dinegnascoutkår.se"; 
            ```
    - Vilket id som Google drive-mappen har. Hittas som enligt exemplet i koden som den sista delen i webbadressen när du besöker Google drive-mappen.
        -  ```
            var folderId = "qwer-asdfghjklzxcvbnmqwertyuio";
            ```    
1. Ta reda på vilka du ska skicka skriptet till.
1. Ändra delningsinställningarna för skriptet via inställningarna uppe till höger. Förslagsvis så att andra enbart kan visa skriptet och inte ändra.
1. Dela länken till skriptet och be dem köra det genom att trycka på `Run`.
   -    Observera att du kommer att få ett mejl till din inkorg för alla filer som skriptet påverkar när någon kör det, så det rekommenderas att vara beredd på det.
