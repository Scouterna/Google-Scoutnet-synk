# Skript för admin i kåren för att tvinga ändring av filägare
Dessa skript gör olika saker och hjälper till med
- Få fram lista över vilka som är ägare till alla filer och undermappar till en given mapp.
- Ta bort länkdelning och redigerare för alla filer och undermappar till en given mapp. De enda som är kvar är fil/mapp-ägaren och du själv.
- Skapa filer som du själv äger som är kopior av orginalen och tar bort orginalfilen för dig så att du kan flytta över filerna.

## Inställningar - gemensamt
1. Besök när du är inloggad på kårens webbansvariges Google-konto eller annat lämpligt Google-konto med hög behörighet på kårens Google Workspace den mapp på Google drive där du vill lagra projektet. Där skapar du en ny fil på formatet `Google Apps Script`.
1. Till vänster på skärmen listas de olika filer som finns i projektet och nu vid starten finns endast en som heter `Code.gs`. Byt namn på den till `ListaÄgare` och ta bort den kod som står i filen.
1. Klistra in koden från filen `ListaÄgare.gs` och spara (Ctrl+S).
1. Skapa också nya filer för `ÄndraDelning` och `KopiaNyÄgare` och klistra in respektive kod där för att sen spara.
### Inställningar - ListaÄgare
- Vilket id som Google drive-mappen har. Hittas som enligt exemplet i koden som den sista delen i webbadressen när du besöker Google drive-mappen.
    -  ```
        var folderId = "qwer-asdfghjklzxcvbnmqwertyuio";
        ```

### Inställningar - ÄndraDelning
-   Styr till vilket Google-konto som skriptet ska göra så att enbart du och fil- eller mappägaren har tillgång till filerna och mapparna.
    - ```
        var emailOfAdmin = "webmaster@dinegnascoutkår.se";
        ```
- Vilken domän som Google-kontot tillhör som skriptet försöker överföra ägarskapet till. Som en liten extra koll att du fyller i rätt e-postadress.
    - ```
        var domain = "dinegnascoutkår.se"; 
        ```
- Vilket id som Google drive-mappen har. Hittas som enligt exemplet i koden som den sista delen i webbadressen när du besöker Google drive-mappen.
    -  ```
        var folderId = "qwer-asdfghjklzxcvbnmqwertyuio";
        ```

### Inställningar - KopiaNyÄgare
- Vilket id som Google drive-mappen har. Hittas som enligt exemplet i koden som den sista delen i webbadressen när du besöker Google drive-mappen.
    -  ```
        var folderId = "qwer-asdfghjklzxcvbnmqwertyuio";
        ```

## Skript
### ListaÄgare
Detta skript generera en lista över alla fil- och undermappsägare till en given mapp. Resultatet skrivs ut i loggen det sista den gör.

Om du enbart vill att skriptet ska visa vilka som äger filerna lägger du till `//` framför raden `listOfOwners.push(oldChildFolderOwner);` innan du kör skriptet.

### ÄndraDelning
Detta skript tar bort eventuell länkdelning för alla filer och undermappar till en given mapp samt ändrar delningen så att enbart fil- eller mappägaren, du själv samt det Google-konto som är specificerat i `emailOfAdmin` har tillgång till den.

För de eventuella mappar och filer som det inte går att ta bort länkdelning på skrivs de ut i loggen det sista den gör. Vanligtvis är detta med anledning av att det finns flera olika behörigheter för länkdelning för de inom organisationen (kårens konton) och för övriga. Då dessa behörigheter kan fortgå till undermappar osv. kan du börja med att manuellt gå in i den första mappen som listas i loggen och ta bort länkdelningen inom kåren för den för att sen köra skriptet igen.

### KopiaNyÄgare
Detta skript skapar en kopia på filer som du inte äger. Därefter tas datan bort ur orginalfilen för att sedan ta bort din egen åtkomst till orginalfilen. Till slut tas behörigheten bort för ägaren till orginalfilen från kopian då denne automatiskt ges behörighet vid skapandet av kopian.

Observera att programmet endast gör detta för vissa typer av filer som är specificerade i funktionen `checkMimeTypeIfOkToMakeNew`. Om du vill att skriptet ska göra det för att typer av filformat kan du ta bort `//` på första raden i funktionen `checkMimeTypeIfOkToMakeNew`.
T.ex görs inte detta för filtypen med Google formulär då man av misstag då kan ta bort dem och få dem att sluta fungera.

Förslagsvis körs skriptet `ÄndraDelning` igen efter att detta skript har körts då det kan hända att de nyskapade filerna har fått oönskade behörighetstilldelningar.
