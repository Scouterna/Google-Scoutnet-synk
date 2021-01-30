# Skript för admin i kåren för att flytta filer till delade enheter
Dessa skript hjälper till med följande saker:
- Radera tomma mappar.
- Flytta dina filer och kopia över undermappar till en given mapp.

## Inställningar - gemensamt
1. Besök när du är inloggad på kårens webbansvariges Google-konto eller annat lämpligt Google-konto med hög behörighet på kårens Google Workspace den mapp på Google drive där du vill lagra projektet. Där skapar du en ny fil på formatet **Google Apps Script**.
1. Till vänster på skärmen listas de olika filer som finns i projektet och nu vid starten finns endast en som heter `Code.gs`. Byt namn på den till `RaderaTommaMappar` och ta bort den kod som står i filen.
1. Klistra in koden från filen `RaderaTommaMappar.gs` och spara (Ctrl+S).
1. Skapa också en ny fil för `FlyttaFiler` och klistra in motsvarande kod där för att sen spara.

### Inställningar - RaderaTommaMappar
- Vilket id som Google drive-mappen har. Hittas som enligt exemplet i koden som den sista delen i webbadressen när du besöker Google drive-mappen.
    -  ```
        var folderId = "qwer-asdfghjklzxcvbnmqwertyuio";
        ```
### Inställningar - FlyttaFiler
- Vilket id som Google drive-mappen har där filerna ska flyttas ifrån. Hittas som enligt exemplet i koden som den sista delen i webbadressen när du besöker Google drive-mappen.
    -  ```
        var sourceFolderId = "qwer-asdfghjklzxcvbnmqwertyuio";
        ```
- Vilket id som Google drive-mappen har dit filerna ska flyttas. Hittas som enligt exemplet i koden som den sista delen i webbadressen när du besöker Google drive-mappen.
    -  ```
        var destFolderId = "qwer-asdfghjklzxcvbnmqwertyuio";
        ```

## Skript
### RaderaTommaMappar
Detta skript försöker radera tomma undermappar till en given mapp.

### FlyttaFiler
Detta skript flyttar dina egna filer och kopiera undermappar från en given destination till en given målmapp.

Observera att programmet endast gör detta för vissa typer av filer som är specificerade i funktionen `checkMimeTypeIfOkToMakeNew`. Om du vill att skriptet ska göra det för att typer av filformat kan du ta bort `//` på första raden i funktionen `checkMimeTypeIfOkToMakeNew`.
T.ex görs inte detta för filtypen med Google formulär då man av misstag då kan ta bort dem och få dem att sluta fungera.

Förslagsvis körs skriptet `RaderaTommaMappar` igen efter att detta skript har körts då det kan hända att det blivit en del tomma mappar efter att dina filer har flyttats till den delade enheten.
