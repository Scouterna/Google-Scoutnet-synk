/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 * @version 2023-01-27
 */


/**
 * Huvudfunktion för att hantera synkronisering av användarkonton med Scoutnet
 */
function synkroniseraAnvandare() {  
  ScoutnetSynkLib.synkroniseraAnvandare(KONFIG_OBJECT);
}


/**
 * Testfunktion för att lista alla Googlekonton som finns i underorganisationen "Scoutnet"
 */
function listaAllaGooglekonton() {
  ScoutnetSynkLib.listaAllaGooglekonton(KONFIG_OBJECT);
}
