/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Anropa denna funktion om du vill synkronisera både användare och
 * grupper direkt efter varandra
 */
function AnvandareOchGrupper() {  
  Anvandare();
  Grupper();
}


/***Grupper***/
/**
 * Anropar funktion för att skapa kolumnrubriker för kalkylarket
 * för grupper
 */
function skapaRubrikerGrupper() {
  createHeaders_Grupper();
}
/**
 * Funktion för att alla rader i kalkylarket för grupper
 * ska synkroniseras och e-brev skickas ut
 */
function GrupperAllaRader() {
  Grupper();
}

/**
 * Funktioner för att ange att enbart vissa radintervall i kalkylarket
 * ska synkroniseras
 *
 * Exempelvis rad 0 till 10. Helt fritt att ändra själv
 */
function GrupperVissaRader1() {
  Grupper(0, 10);
}

function GrupperVissaRader2() {
  Grupper(11, 20);
}

function GrupperVissaRader3() {
  Grupper(21, 30);
}
/***Grupper - Slut***/


/***Medlemslistor***/
/**
 * Anropar funktion för att skapa kolumnrubriker för kalkylarket
 * för medlemslistor konfig
 */
function skapaRubrikerMedlemslistor() {
  skapaRubrikerML();
}
/**
 * Funktion för att alla rader i kalkylarket för medlemslistor
 * ska synkroniseras och e-brev skickas ut
 */
function MedlemslistorAllaRader() {
  Medlemslistor();
}

/**
 * Funktioner för att ange att enbart vissa radintervall i kalkylarket
 * för medlemslistor ska synkroniseras och e-brev skickas ut.
 * Samt ställa in om medlemslistor enbart ska uppdateras alternativt om
 * gällande om e-brev ska skickas ut till listan
 *
 * Exempelvis rad 0 till 10. Helt fritt att ändra själv
 */
function MedlemslistorVissaRaderUppdateraOchSkicka1() {
  Medlemslistor(0, 10, true, true);
}

function MedlemslistorVissaRaderUppdateraOchSkicka2() {
  Medlemslistor(11, 20, true, true);
}

function MedlemslistorVissaRaderUppdateraOchSkicka3() {
  Medlemslistor(21, 30, true, true);
}

function MedlemslistorVissaRaderUppdateraEnbart1() {
  Medlemslistor(0, 10, true, false);
}

function MedlemslistorVissaRaderSkickaEnbart1() {
  Medlemslistor(0, 10, false, true);
}


/**
 * Ställer in egna attribut och de funktioner som körs för att räkna ut
 * värdet på attributet för respektive person.
 * Funktionerna använder R1C1 notation för att skriva formeln i google kalkylark
 * och hänvisar då relativt aktuell kolumn till en rad R eller kolumn C från denna
 * R[0]C[-37] betyder därmed att man hänvisar till samma rad (0 rader förändring) och
 * till värdet i cellen 37 kolumner till vänster.
 * 
 * Vilken plats som varje eget attribut får är att först sätts alla standardattribut
 * ut och sedan nedanstående i ordning. Enklast är att testa för att se till att det
 * blir korrekt.
 * Observera att dessa påverkar alla medlemslistor som används, så var försiktig om du
 * tar bort någon funktion nedan då den kanske används i någon annan lista.
 */
var medlemslista_egna_attribut_funktioner = [
    {'namn': 'Ålder', 'formel': '=DATEDIF(R[0]C[-37]; TODAY(); "Y")'},   
    {'namn': 'Dagar till nästa födelsedag', 'formel': '=DATE(YEAR(R[0]C[-38])+DATEDIF(R[0]C[-38];TODAY();"Y")+1;MONTH(R[0]C[-38]);DAY(R[0]C[-38]))-TODAY()'},
    {'namn': 'Antal dagar som medlem i kåren', 'formel': '=DATEDIF(R[0]C[-36];TODAY(); "D")'},
    {'namn': 'Primär e-post som anhörigs e-post', 'formel': '=IF(AND(ISTEXT(R[0]C[-23]);OR(R[0]C[-23]=R[0]C[-18];R[0]C[-23]=R[0]C[-14])); "LIKA"; "OLIKA")'}
  ];
/***Medlemslistor - Slut***/
