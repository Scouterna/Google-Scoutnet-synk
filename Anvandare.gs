/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 * @version 2022-12-30
 */


/**
 * Huvudfunktion för att hantera synkronisering av användarkonton med Scoutnet
 */
function synkroniseraAnvandare() {
  
  const defaultOrgUnitPath = "/Scoutnet";
  const suspendedOrgUnitPath = defaultOrgUnitPath + "/" + "Avstängda";
  
  ScoutnetSynkLib.synkroniseraAnvandare(KONFIG_OBJECT, defaultOrgUnitPath, suspendedOrgUnitPath);
}


/**
 * Testfunktion för att lista alla Googlekonton som finns i underorganisationen "Scoutnet"
 */
function listaAllaGooglekonton() {
  ScoutnetSynkLib.listaAllaGooglekonton(KONFIG_OBJECT);
}
