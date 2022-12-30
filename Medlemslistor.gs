/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 * @version 2022-12-30
 */


/**
 * Funktion att använda för att enbart uppdatera en specifik
 * medlemslista på en specifik rad
 */
function medlemslistorVissaRaderUppdateraEnbartTmp() {
  ScoutnetSynkLib.uppdateraMedlemslistor(KONFIG_OBJECT, 5, 5);
}


/**
 * Funktion att använda för att enbart skicka ut e-brev till
 * en specifik medlemslista på en specifik rad
 */
function medlemslistorVissaRaderSkickaEnbartTmp() {
  ScoutnetSynkLib.skickaUtTillMedlemslistor(KONFIG_OBJECT, 1, 1);
}


/**
 * Funktion att använda för att uppdatera medlemslistor
 */
function medlemslistorUppdateraEnbart() {
  ScoutnetSynkLib.uppdateraMedlemslistor(KONFIG_OBJECT, 1, 100);
}


/**
 * Skapa kolumnrubriker i kalkylarket för konfiguration av Medlemslistor
 */
function skapaRubrikerMedlemslistor() {
  ScoutnetSynkLib.skapaRubrikerMedlemslistor(KONFIG_OBJECT);
}
