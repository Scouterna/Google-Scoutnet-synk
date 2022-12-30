/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 * @version 2022-12-30
 */


/**
 * Anropa denna funktion om du vill synkronisera både användare och
 * grupper direkt efter varandra
 */
function synkroniseraAnvandareOchGrupper() {
  synkroniseraAnvandare();
  synkroniseraGrupperAllaRader();
}


/***Grupper***/

/**
 * Funktioner för att ange att enbart vissa radintervall och
 * eller etiketter i kalkylbladet ska synkroniseras
 *
 * Exempelvis rad 0 till 10. Helt fritt att ändra själv
 * Går att komplettera med en etikett för t.ex bara de inom
 * radintervallet med en viss etikett ska synkas.
 * Går att ange enbart etikett om så önskas.
 */
function synkroniseraGrupperVissaRader1() {
  synkroniseraGrupper_(0, 10);
}

function synkroniseraGrupperVissaRader2() {
  synkroniseraGrupper_(11, 20);
}

function synkroniseraGrupperVissaRader3() {
  synkroniseraGrupper_(21, 30);
}

function synkroniseraGrupperVissaRaderOchEtikett1() {
  synkroniseraGrupper_(0, 10, "Avdelningar");
}

function synkroniseraGrupperVissEtikett1() {
  synkroniseraGrupper_("Avdelningar");
}
/***Grupper - Slut***/


/***Medlemslistor***/
/**
 * Funktioner för att ange att enbart vissa radintervall i kalkylarket
 * för medlemslistor ska synkroniseras och e-brev skickas ut.
 * Samt ställa in om medlemslistor enbart ska uppdateras alternativt om
 * det enbart ska skickas ut till listan
 *
 * Exempelvis rad 0 till 10. Helt fritt att ändra själv
 */
function synkroniseraMedlemslistorVissaRaderUppdateraOchSkicka1() {
  ScoutnetSynkLib.uppdateraMedlemslistor(KONFIG_OBJECT, 1, 1);
  ScoutnetSynkLib.skickaUtTillMedlemslistor(KONFIG_OBJECT, 1, 1);
}

function synkroniseraMedlemslistorVissaRaderUppdateraEnbart1() {
  ScoutnetSynkLib.uppdateraMedlemslistor(KONFIG_OBJECT, 5, 5);
}

function synkroniseraMedlemslistorVissaRaderSkickaEnbart1() {
  ScoutnetSynkLib.skickaUtTillMedlemslistor(KONFIG_OBJECT, 1, 1);
}
