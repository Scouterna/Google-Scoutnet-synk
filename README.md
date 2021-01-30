# Google-Scoutnet-synkronisering
Du kan med dessa program göra följande
1. Synkronisera Google-användarkonton hos kåren med personer från Scoutnet.
2. Synkronisera google-grupper med e-postlistor i Scoutnet för att använda som e-postlistor
   samt för behörighetskontroller. Alltså t.ex. att spårarledare ges behörighet till en 
   **Delad enhet** på Google drive för Spårare.
3. Synkronisera medlemslistor enligt dina urval från Scoutnet samt skicka ut personliga
   e-brev enligt dina inställningar till medlemmar.

- Denna lösning använder Google Apps Script.

- Vid problem, fel, frågor eller tips på förbättringar eller fler funktioner som du saknar;
  lägg ett ärende under **Issues** eller mejla emil.ohman@scouterna.se.

- I bland kommer det ny funktionalitet, så håll utkik på en ny version genom att trycka på
  knappen **Watch** uppe till höger på sidan för att kunna bli notifierad vid en ny version.

- Du kan ladda ner den senaste versionen 
  [här](https://github.com/Scouterna/Google-Scoutnet-synk/releases/latest) och där kan 
  du också se vilken funktionalitet som är ny i respektive version. Läs filen **README.md**
  för instruktion om installation och funktionalitet.

## [Dokumentation - läs mer här](https://github.com/Scouterna/Google-Scoutnet-synk/wiki)

## Inställningar
1. Logga in till [Adminkonsolen](https://admin.google.com/) med ditt adminkonto.
1. Under **Säkerhet/API-referens** tryck på kryssrutan för att **Aktivera API-åtkomst**.
1. I **Adminkonsolen** under **Organisationsenheter** skapar du en underorganisation till
   kåren som heter **Scoutnet**. Läs hur [här](https://support.google.com/a/answer/182537?hl=sv)
2. I **Adminkonsolen** ställer du in under **Appar/Google Workspace** vilka tjänster som ska
   vara tillgängliga för olika organisationsenheter. Om du trycker på **Scoutnet** i
   organisationsstrukturen till vänster kan du sätta på/stänga av de tjänster som ska vara
   tillgängliga för just de användare som ska synkroniseras. Tänk på att det är lättare att ha
   mycket avstängt och sen sätta på tjänster vid behov än tvärt om.
   - Om du går in på [Kataloginställningar](https://admin.google.com/ac/appsettings/986128716205)
   kan du ställa in om användare ska få anpassa sina namn mm.
   Det går också att aktivera kontaktdelning inom kåren vilket kan underlätta kommunikationen internt.
   - Det går också att sätta på och stänga av inställningar under
   **Appar/Ytterligare tjänster från Google**.
   Om ni har stängt av det tidigare behöver **Google Cloud Platform** aktiveras för den användare som
   ska köra dessa program.
3. Besök https://script.google.com inloggad med ditt adminkonto.
4. Tryck på **Nytt Script** och namnge sedan projektet till något lämpligt, t.ex. **Scoutnet**.
5. Till vänster på skärmen listas de olika filer som finns i projektet och nu vid starten finns endast
   en som heter `Kod.gs`. Byt namn på den till `Användare.gs` och ta bort den koden som står i filen.
6. Klistra in koden från filen **Anvandare.gs** och spara (Ctrl+S).
7. Gör samma sak för de andra filerna som slutar på .gs genom att skapa nya filer och klistra in
   koden för respektive och spara (Ctrl+S).
8.  Under **Tjänster** behöver du aktivera följande:
   - **Admin SDK API**. Kommer sen stå **AdminDirectory** efter tillagd.
   - **Google Sheets API**. Kommer sen stå **Sheets** efter tillagd.
   - **Group Settings API**. Kommer sen stå **AdminGroupsSettings** efter tillagd.
12. Gör inställningar enligt nedan för respektive skript för att sätta upp dem.
   [Användare](https://github.com/Scouterna/Google-Scoutnet-synk/wiki/Manual-Användare#inställningar-för-att-komma-igång-i-konfigurationgs), 
   [Grupper](https://github.com/Scouterna/Google-Scoutnet-synk/wiki/Manual-Grupper#inställningar-för-att-komma-igång-i-konfigurationgs), [Medlemslistor](https://github.com/Scouterna/Google-Scoutnet-synk/wiki/Manual-Medlemslistor#inställningar-för-att-komma-igång-i-konfigurationgs)
13. Kör programmen genom att öppna filen **Start_funktioner.gs** och kör önskad funktion för att
    se att de olika skripten fungerar som de ska. Du kan t.ex välja funktionen
    **AnvändareOchGrupper** uppe bland menyn och sedan trycka på **Kör**.
14. Du kan nu tidinställa hur ofta som programmen ska köra/synkronisera genom att trycka på
    klocksymbolen i menyn till vänster och ställa in synkroniseringar för olika funktioner och skript.
    
    - Tänk på att inte köra synkroniseringen för ofta då det finns maxbegränsningar hos Google per
   dag för olika operationer. Det rekommenderas också att ställa in enskilda synkroniseringar för
   de olika skripten då de annars kan ta för lång tid på sig och då inte lyckas synkronisera klart.
   Det bör räcka med att synkronisera användare en gång per dygn och samma för grupper och
   medlemslistor; förslagsvis under natten.
    
    - Om körningen för grupper trots allt tar för lång tid finns i **Start_funktioner.gs**
   funktionerna `GrupperVissaRader1` osv. som du kan ställa in att enbart vissa rader i
   kalkylarket ska synkroniseras.
    
    - Det finns också funktioner i **Start_funktioner.gs** för att enbart synkronisera vissa
   medlemslistor, enbart skicka e-brev mm om man vill dela upp saker.
15. För att komma ihåg vilken version av programmet du har kan du t.ex anteckna det i filen
   **Konfiguration.gs** på något sätt.
