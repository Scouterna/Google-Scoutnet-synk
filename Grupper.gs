/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Huvudfunktion för att hantera synkronisering av googlegrupper med Scoutnet
 * Anropas antingen med (startrad, slutrad)
 * (startrad, slutrad, etikett)
 * (etikett)
 */
function synkroniseraGrupper(...args)  {
  ScoutnetSynkLib.synkroniseraGrupper(KONFIG_OBJECT, args);
}


/**
 * Testfunktion för att synkronisera några rader med grupper
 */
function synkroniseraGrupperTestsynk() {
  synkroniseraGrupper(0, 10);
}


/**
 * Skapa kolumnrubriker i kalkylarket och dölj kolumnen med Grupp-ID
 */
function skapaRubrikerGrupper() {
  ScoutnetSynkLib.skapaRubrikerGrupper(KONFIG_OBJECT);
}


/**
 * Döljer kolumner som styr avancerade inställningar för grupper
 */
function visaEnkelLayoutGrupper() {
  ScoutnetSynkLib.visaEnkelLayoutGrupper();
}


/**
 * Visar kolumner som styr avancerade inställningar för grupper
 */
function visaAvanceradLayoutGrupper() {
  ScoutnetSynkLib.visaAvanceradLayoutGrupper(); 
}
 

/**
 * Testfunktion för att lista alla grupper
 */
function listaAllaGrupperGoogle() {
  ScoutnetSynkLib.listaAllaGrupperGoogle(KONFIG_OBJECT);
}


/**
 * Testfunktion för att läsa kalkylbladet med alla grupper
 */
function listaAllaGrupperKalkylblad() {
  ScoutnetSynkLib.listaAllaGrupperKalkylblad(KONFIG_OBJECT);  
}
