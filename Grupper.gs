/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Testfunktion för att synkronisera några rader med grupper
 */
function GrupperTestsynk() {

  const konfigObject = makeKonfigObject();

  ScoutnetSynkLib.Grupper(konfigObject, 1, 10);
}


/**
 * Skapa kolumnrubriker i kalkylarket och dölj kolumnen med Grupp-ID
 */
function skapaRubrikerGrupper() {
  const konfigObject = makeKonfigObject();
  ScoutnetSynkLib.skapaRubrikerGrupper(konfigObject);
}


/**
 * Visar kolumner som styr avancerade inställningar för grupper
 */
function avanceradLayoutGrupper() {

  const sheetDataGrupper = getDataFromActiveSheet_("Grupper");
  const sheet = sheetDataGrupper["sheet"];
  const grd = grupperRubrikData_();
  
  sheet.showColumns(grd["scoutnet_list_id_send"]+1, 5);
  sheet.showColumns(grd["isArchived"]+1, 2);
}


/**
 * Döljer kolumner som styr avancerade inställningar för grupper
 */
function enkelLayoutGrupper() {
  
  const sheetDataGrupper = getDataFromActiveSheet_("Grupper");
  const sheet = sheetDataGrupper["sheet"];
  const grd = grupperRubrikData_();
  
  sheet.hideColumns(grd["scoutnet_list_id_send"]+1, 6);
  sheet.hideColumns(grd["isArchived"]+1, 2);
}
 

/**
 * Testfunktion för att lista alla grupper
 */
function TestListAllGroups() {
  let pageToken, page;
  do {
    page = AdminDirectory.Groups.list({
      domain: domain,
      maxResults: 150,
      pageToken: pageToken
    });
    const groups = page.groups;
    if (groups) {
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        console.info('%s (%s), %s', group.name, group.email, group.id);
      }
    } else {
      console.warn('Inga grupper hittades.');
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}


/**
 * Testfunktion för att läsa kalkylbladet
 */
function TestReadSpreadSheet() {
  
  const sheetDataGrupper = getDataFromActiveSheet_("Grupper");

  //const sheet = sheetDataGrupper["sheet"];
  //const selection = sheetDataGrupper["selection"];
  const data = sheetDataGrupper["data"];

  const grd = grupperRubrikData_();
  
  for (let i = 1; i < data.length; i++) {    
    console.info('Namn: ' + data[i][grd["namn"]] + ' E-post: ' + data[i][grd["e-post"]] + ' list-id: ' + data[i][grd["scoutnet_list_id"]] + ' grupp id: ' + data[i][grd["groupId"]]);
  }
  return data;
}
