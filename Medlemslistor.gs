/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Returnerar lista med objekt för specialkolumner i kalkylarket med namn
 * och formel
 *
 * @returns {Object[]} - Lista med objekt för specialkolumner i kalkylarket
 */
function getCustomFunctions() {

  var cf = [
    {'namn': 'Ålder', 'formel': '=DATEDIF(R[0]C[-37], TODAY(), "Y")'},   
    {'namn': 'Dagar till nästa födelsedag', 'formel': '=DATE(YEAR(R[0]C[-38])+DATEDIF(R[0]C[-38],TODAY(),"Y")+1,MONTH(R[0]C[-38]),DAY(R[0]C[-38]))-TODAY()'},
    {'namn': 'Antal dagar som medlem i kåren', 'formel': '=DATEDIF(R[0]C[-36],TODAY(), "D")'}
  ];
  
  return cf;
}


/**
 * Funktion för att ange att enbart vissa radintervall i kalkylarket
 * för medlemslistor ska synkroniseras
 *
 * Exempelvis rad 0 till 10. Helt fritt att ändra själv
 */
function MedlemslistorVissaRader1() {
  Medlemslistor(0, 10);
}


/**
 * Funktion för att ange att enbart vissa radintervall i kalkylarket
 * för medlemslistor ska synkroniseras
 *
 * Exempelvis rad 11 till 20. Helt fritt att ändra själv
 */
function MedlemslistorVissaRader2() {
  Medlemslistor(11, 20);
}


/**
 * Huvudfunktion för att hantera synkronisering av medlemslistor med Scoutnet
 * 
 * @param {number} start - rad att börja synkronisera på
 * @param {number} slut - rad att sluta synkronisera på
 */
function Medlemslistor(start, slut) {
  
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Medlemslistor).getSheets()[0];
  var selection = sheet.getDataRange();
  var data = selection.getValues();
  
  var grd = getMedlemslistorKonfigRubrikData();
  
  var delete_rows = [];
  
  //Hämta lista med alla medlemmar i kåren och alla deras attribut
  var allMembers = fetchScoutnetMembers();
  
  var rowsToSync = findWhatRowsToSync(start, slut, data.length);
  start = rowsToSync.start;
  slut = rowsToSync.slut;
  
  Logger.log("Startrad " + start + " slutrad " + slut);
  
  for (var i = start-1; i < slut; i++) {
    
    var name = data[i][grd["namn"]];
    var scoutnet_list_id = data[i][grd["scoutnet_list_id"]];
    var spreadsheetUrl = data[i][grd["spreadsheetUrl"]];
    
    var rad_nummer = i+1;
    
    Logger.log('Rad: ' + rad_nummer + ' Namn: ' + name + ' Scoutnet: ' + scoutnet_list_id + ' spreadsheetUrl: ' + spreadsheetUrl);
    
    var update_group = "yes";
    
    var cell=selection.getCell(rad_nummer, grd["namn"]+1);
    if (name=="") { //Kolla om fältet för namn är angivet
      cell.setBackground("yellow");
    }
    else {
      if ("#ffffff" != cell.getBackground()) {
        cell.setBackground("white");
      }
    }

    if (spreadsheetUrl=="") { //Inget kalkylark är angivet      
      if (name=="" && scoutnet_list_id=="") { //Ta bort raden
        Logger.log("Försöker ta bort rad " + rad_nummer);        
        delete_rows.push(rad_nummer);        
      }
      update_group = "no";          
    }

    var cell=selection.getCell(rad_nummer, grd["spreadsheetUrl"]+1);
    var rowSpreadsheet;
    try {
      rowSpreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
      
      if ("#ffffff" != cell.getBackground()) {
        cell.setBackground("white");
      }
    }
    catch (e) { //Om url är fel
      Logger.log(e);
      update_group = "no";
      cell.setBackground("red");
    }    

    if (update_group == "yes") {
      //Uppdatera aktuell medlemslista
      updateMemberlist(selection, rad_nummer, data[i], grd, allMembers, rowSpreadsheet);     
    }
  }
  //Ta bort tomma radera i kalkylarket
  deleteRowsFromSpreadsheet(sheet, delete_rows);
}


/**
 * Uppdatera en lista över medlemmar
 * 
 * @param {Objekt} selection - området på kalkylarket för alla listor som används just nu
 * @param {number} rad_nummer - radnummer för aktuell medlemslista i kalkylarket
 * @param {string[]} radInfo - lista med data för aktuell rad i kalkylarket
 * @param {string[]} grd - lista med vilka kolumnindex som respektive parameter har
 * @param {Object[]} allMembers - lista med medlemsobjekt
 * @param {Object[]} spreadsheet - ett googleobjekt av typen Spreadsheet där listan finns
 */
function updateMemberlist(selection, rad_nummer, radInfo, grd, allMembers, spreadsheet) {

  /******/
  var scoutnet_list_id = radInfo[grd["scoutnet_list_id"]]; //Själva datan
  var cell_scoutnet_list_id = selection.getCell(rad_nummer, grd["scoutnet_list_id"]+1); //Range
  Logger.log(".......Synkronisering - hämta data............");
  var tmpMembersInAList = fetchScoutnetMembersMultipleMailinglists(scoutnet_list_id, cell_scoutnet_list_id, "");
  Logger.log(".......Slut Synkronisering - hämta data.......");
  /***********************/ 

  var membersInAList = []
  for (var i = 0; i<tmpMembersInAList.length; i++) {
    //Leta upp medlemmen i listan övar alla medlemmar
    var obj = allMembers.find(obj => obj.member_no == tmpMembersInAList[i].member_no);
    membersInAList.push(obj);
    Logger.log(obj);
  }


  var mlrd = getMedlemslistorRubrikData();
  Logger.log(mlrd);
  var numAttrMembers = mlrd.length;
  Logger.log("Antal medlemsattribut att använda " + numAttrMembers);


  var sheet = spreadsheet.getSheets()[0];

  /****Storlek på den gamla datan som ska bort***/
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var numRows = lastRow+1;

  if (membersInAList.length+1>lastRow)  {
    //Vi ska rensa om det blir fler rader i nya också
    numRows = membersInAList.length+1;
  }  

  if (numAttrMembers>lastColumn)  {
    //Vi ska rensa om det blir fler kolumner i nya också
    lastColumn = numAttrMembers;
  }  
  Logger.log("lastColumn ska vara " + lastColumn);
  Logger.log("lastRow ska vara " + lastRow);
  
  //Storlek på den gamla datan som ska bort
  var range_allt = sheet.getRange(1, 1, numRows, lastColumn);
  range_allt.clearContent();
  /*********************************************/

  /****Storlek på den nya datan som ska in*****/
  var range_medlemmar = sheet.getRange(2, 1, membersInAList.length, numAttrMembers);
  var memberMatrix = createMemberlistMatrix(membersInAList, mlrd);
  Logger.log(memberMatrix);
  range_medlemmar.setValues(memberMatrix);  
  /********************************************/

  /****Storlek på den nya rubriken som ska in**/
  var range_rad1 = sheet.getRange(1, 1, 1, numAttrMembers);
  range_rad1.setFontWeight("bold");
  range_rad1.setFontStyle("italic");

  var memberRubrikMatrix = createMemberlistRubrikRow(mlrd);
  range_rad1.setValues([memberRubrikMatrix]);
  /********************************************/

  setCustomColumns(sheet, numAttrMembers+1, membersInAList.length);
}


/**
 * Bygger upp en rad med rubriker för medlemsdatan
 * 
 * @param {Object[]} mlrd - en lista över rubriker och och attribut för tillhörande medlemmar
 * 
 * @returns {string[]} - lista bestående av rubrikerna för medlemsdatan
 */
function createMemberlistRubrikRow(mlrd)  {

  var row = [];
  for (var i = 0; i<mlrd.length; i++) {    
    var svName = mlrd[i].svName;
    row.push(svName);
  }
  Logger.log("Rubriknamn " + row);
  return row;
}


/**
 * Bygger upp en matris med medlemsdata för flera medlemmar
 * 
 * @param {Object[]} membersInAList - lista över medlemsobjekt
 * @param {Object[]} mlrd - en lista över rubriker och och attribut för tillhörande medlemmar
 * 
 * @returns {string[[]]} - matris bestående av listor som är rader med medlemsdata
 */
function createMemberlistMatrix(membersInAList, mlrd) {

  var memberMatrix = [];
  for (var i = 0; i<membersInAList.length; i++) {
    var row = createMemberlistRow(membersInAList[i], mlrd);
    memberMatrix.push(row);
  }
  return memberMatrix;
}


/**
 * Bygger upp en rad med medlemsdata
 * 
 * @param {Object} member - ett medlemsobjekt
 * @param {Object[]} mlrd - en lista över rubriker och och attribut för tillhörande medlemmar
 * 
 * @returns {string[]} - Lista med medlemsdata
 */
function createMemberlistRow(member, mlrd)  {

  var row = [];
  for (var i = 0; i<mlrd.length; i++) {   
    var name = mlrd[i].apiName;
    value = member[name];
    //Logger.log("Attribut " + name + " värde " + value);
    row.push(value);
  }
  return row;
}


/**
 * Sätter specialkolumner i ett kalkylark
 * 
 * @param {Object} sheet - ett googleobjekt av typen Sheet
 * @param {number} startCol - startkolumn för var dessa kolumner ska skrivas
 * @param {number} numRow - antal rader att skriva specialfunktionerna på
 */
function setCustomColumns(sheet, startCol, numRow)  {

  var cf = getCustomFunctions();
  var num_cf = cf.length;

  /***********Rubriker**********/
  var row = [];
  for (var i = 0; i<num_cf; i++) {
    var namn = cf[i].namn;
    row.push(namn);
  }

  var range_cf_rubrik = sheet.getRange(1, startCol, 1, num_cf);
  range_cf_rubrik.setValues([row]);

  /***********Data i extra kolumner*****/
  for (var i = 0; i<num_cf; i++) {
    var formula = cf[i].formel;
    var range_cf = sheet.getRange(2, startCol+i, numRow, 1);
    range_cf.setFormulaR1C1(formula);
  }
}


/**
 * Returnerar lista med vilket index som olika rubriker har i kalkylarket
 *
 * @returns {number[]} - Lista med rubrikindex för respektive rubrik
 */
function getMedlemslistorKonfigRubrikData() {
  
  //Siffran är vilken kolumn i kalkylarket.
  var medlemslistaKonfigRubrikData = {};
  medlemslistaKonfigRubrikData["namn"] = 0;
  medlemslistaKonfigRubrikData["scoutnet_list_id"] = 1;  
  medlemslistaKonfigRubrikData["spreadsheetUrl"] = 2;
                  
  return medlemslistaKonfigRubrikData;
}


/**
 * Returnerar lista med objekt för standardkolumner i kalkylarket med namn
 * i Scoutnets API och det svenska attributnamnet
 *
 * @returns {Object[]} - Lista med objekt för standardkolumner i kalkylarket
 */
function getMedlemslistorRubrikData()  {
  
  var mlrd = [
    {"apiName": "member_no", "svName": "Medlemsnr."},
    {"apiName": "first_name", "svName": "Förnamn"},
    {"apiName": "last_name", "svName": "Efternamn"},
    {"apiName": "ssno", "svName": "Personnummer"},
    {"apiName": "note", "svName": "Noteringar"},
    {"apiName": "date_of_birth", "svName": "Födelsedatum"},
    {"apiName": "status", "svName": "Status"},
    {"apiName": "created_at", "svName": "Registrerad Scouterna"},
    {"apiName": "confirmed_at", "svName": "Startdatum kår"},
    {"apiName": "group", "svName": "Kår"},
    {"apiName": "unit", "svName": "Avdelning"},
    {"apiName": "patrol", "svName": "Patrull"},
    {"apiName": "unit_role", "svName": "Avdelningsroll"},
    {"apiName": "group_role", "svName": "Kårfunktion"},
    {"apiName": "sex", "svName": "Kön"},
    {"apiName": "address_co", "svName": "c/o"},
    {"apiName": "address_1", "svName": "Adress"},
    {"apiName": "address_2", "svName": "Adress, rad 2"},
    {"apiName": "address_3", "svName": "Adress, rad 3"},
    {"apiName": "postcode", "svName": "Postnummer"},
    {"apiName": "town", "svName": "Postort"},
    {"apiName": "country", "svName": "Land"},
    {"apiName": "email", "svName": "Primär e-postadress"},
    {"apiName": "contact_alt_email", "svName": "Alternativ e-post"},
    {"apiName": "contact_mobile_phone", "svName": "Mobiltelefon"},
    {"apiName": "contact_home_phone", "svName": "Hemtelefon"},
    {"apiName": "contact_mothers_name", "svName": "Anhörig 1 namn"},
    {"apiName": "contact_email_mum", "svName": "Anhörig 1 e-post"},
    {"apiName": "contact_mobile_mum", "svName": "Anhörig 1 mobiltelefon"},
    {"apiName": "contact_telephone_mum", "svName": "Anhörig 1 hemtelefon"},
    {"apiName": "contact_fathers_name", "svName": "Anhörig 2 namn"},
    {"apiName": "contact_email_dad", "svName": "Anhörig 2 e-post"},
    {"apiName": "contact_mobile_dad", "svName": "Anhörig 2 mobiltelefon"},
    {"apiName": "contact_telephone_dad", "svName": "Anhörig 2 hemtelefon"},
    {"apiName": "extra_emails", "svName": "Medlem valda e-post för e-postlista"},
    {"apiName": "contact_leader_interest", "svName": "Jag kan hjälpa till!"},
    {"apiName": "prev_term", "svName": "Föregående termin"},
    {"apiName": "prev_term_due_date", "svName": "Föregående termin förfallodatum"},
    {"apiName": "current_term", "svName": "Aktuell termin"},
    {"apiName": "current_term_due_date", "svName": "Aktuell termin förfallodatum"},
    {"apiName": "avatar_updated", "svName": "Profilbild uppdaterad"},
    {"apiName": "avatar_url", "svName": "Profilbild url"}
  ];

  return mlrd;
}
