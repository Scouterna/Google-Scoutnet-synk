/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/scouternasetjanster 
 */


/*
 * Returnerar lista med vilket index som olika rubriker har i kalkylarket
 *
 * @returns {number[]} - Lista med rubrikindex för respektive rubrik
 */
function GrupperRubrikData() {
  
  //Siffran är vilken kolumn i kalkylarket.
  var gruppRubrikData = {};
  gruppRubrikData["namn"] = 0;
  gruppRubrikData["e-post"] = 1;
  
  gruppRubrikData["scoutnet_list_id"] = 2;
  gruppRubrikData["synk_option"] = 3;
  gruppRubrikData["scoutnet_list_id_send"] = 4;
  gruppRubrikData["synk_option_send"] = 5;
  gruppRubrikData["scoutnet_list_id_receive"] = 6;
  gruppRubrikData["synk_option_receive"] = 7;
  
  gruppRubrikData["groupId"] = 8;
  gruppRubrikData["cell_url"] = 9;
  
  gruppRubrikData["post_permission"] = 11;  //FIXME Ta bort denna
                  
  return gruppRubrikData;
}


function Grupper() {
  
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Grupper).getSheets()[0];
  var selection = sheet.getDataRange();
  var data = selection.getValues();
  
  var grd = GrupperRubrikData();
  
  var delete_rows = [];
  
  for (var i = 1; i < data.length; i++) {
    
    var name = data[i][grd["namn"]];
    var email = data[i][grd["e-post"]];
    var scoutnet_list_id = data[i][grd["scoutnet_list_id"]];
    var synk_option = data[i][grd["synk_option"]];
    var groupId = data[i][grd["groupId"]];
    var postPermission = data[i][grd["post_permission"]];
    
    if (!postPermission) {
      postPermission = "ANYONE_CAN_POST";
    }
    
    var rad_nummer = i+1;
    
    Logger.log('Namn: ' + name + ' E-post: ' + email + ' Scoutnet: ' + scoutnet_list_id + ' Grupp-ID: ' + groupId + ' Inläggsbehörighet: ' + postPermission);
    
    var update_group = "yes";
    
    if (groupId=="") { //Vi borde skapa en grupp
      
      if (name=="" && email=="") { //Ta bort raden
        Logger.log("Försöker ta bort rad " + rad_nummer);
        
        delete_rows.push(rad_nummer);
        update_group = "no";
      }
      else if (name=="" && email!="") { //Vi gör ingenting
      }
      else if (name!="" && email=="") { //Vi gör ingenting
      }
      
      else if (name!="" && email!="") {        
        
        if (false==checkIfGroupExists(email) && true==checkEmailFormat(email)) { //Skapa gruppen
          
          email = email.toLowerCase().replace(/\s+/g, ''); //Ta bort tomma mellanrum
          email = removeDiacritics(email);
          
          var group = createGroup(email, name);
          var groupId = group.id;
          Logger.log("Skapade gruppen: " + email);
          
          var cell=selection.getCell(rad_nummer, grd["e-post"]+1);
          cell.setValue(email);
          cell.setBackground("white");
          
          cell=selection.getCell(rad_nummer, grd["groupId"]+1);
          cell.setValue(groupId);
          
          setCellValueCellUrl(selection, rad_nummer, grd["cell_url"], email);
          
        }
        else { //Om gruppens e-postadress redan finns
          
          var cell=selection.getCell(rad_nummer, grd["e-post"]+1);
          cell.setBackground("red");
        }        
      }           
    }
    else if (groupId!="") {  //Gruppen finns sedan innan
      
      if (name=="" && email=="") { //Ta bort gruppen
        
        Logger.log("Försöker ta bort " + groupId + " rad " + rad_nummer);
        AdminDirectory.Groups.remove(groupId);
        Logger.log(groupId + " raderades");
        
        delete_rows.push(rad_nummer);
        update_group = "no";
      }
      else if (email=="") { //Om tom, hämta e-postadressen från systemet och sätt tillbaka den
        
        var tmp_usr = AdminDirectory.Groups.get(groupId);
        var tmp_email = tmp_usr.email;
        var cell=selection.getCell(rad_nummer,grd["e-post"]+1);
        cell.setValue(tmp_email);
        cell.setBackground("white");
      }
      else if (email!="") { //Kontrollerar om vi behöver uppdatera
        
        var group = AdminDirectory.Groups.get(groupId);
        
        if (email!=group.email) { //E-postadressen har ändrats
          
          Logger.log("E-postadress för gruppen har ändrats på raden " + rad_nummer);          
          
          if (false==checkIfGroupExists(email) && true==checkEmailFormat(email)) {
            
            email = email.toLowerCase().replace(/\s+/g, ''); //Ta bort tomma mellanrum
            email = removeDiacritics (email);            
            
            Logger.log("try remove " + groupId + " row " + rad_nummer);
            AdminDirectory.Groups.remove(groupId); //Vi gör på detta sätt då det varit stora problem
            //med att tjänsten ej svarat tidigare om vi gjort en patch/update
            Logger.log(groupId + " togs bort");
            
            var group = createGroup(email, name);
            Logger.log("Uppdaterat e-postadress för gruppen: " + email);            
            groupId = group.id;
            
            var cell=selection.getCell(rad_nummer, grd["e-post"]+1);
            cell.setValue(email);
            cell.setBackground("white");
            
            cell=selection.getCell(rad_nummer, grd["groupId"]+1);
            cell.setValue(groupId);
            
            setCellValueCellUrl(selection, rad_nummer, grd["cell_url"], email);
          }
          else { //Om gruppens e-postadress redan finns
            
            var cell=selection.getCell(rad_nummer, grd["e-post"]+1);
            cell.setBackground("red");
          }
        }
        else if (name != group.name) { //Om namnet, men inte e-postadressen för gruppen ändrats
          
          Logger.log("Gruppnamnet har ändrats på rad " + rad_nummer);
          var tmp_group = {
            name: name
          };
          AdminDirectory.Groups.patch(tmp_group, groupId);
        }
        else if (email == group.email) { //Om e-posten är oförändrad. Behöver ändra bakgrund om man
          //ändrat till en ogiltig e-postadress och sen ändrar tillbaka
          Logger.log("E-post ej ändrad för grupppen " + email);
          var cell=selection.getCell(rad_nummer, grd["e-post"]+1);
          cell.setBackground("white");
        }
      }
    }
    if (update_group == "yes") {
      var cell_scoutnet_list_id = selection.getCell(rad_nummer, grd["scoutnet_list_id"]+1);
      updateGroup(groupId, scoutnet_list_id, cell_scoutnet_list_id, synk_option); //Uppdatera medlemmar av en grupp
    }
    changeGroupPermissions(email, postPermission);
  }
  deleteRowsFromSpreadsheet(sheet, delete_rows);
}


/*
 * Ta bort rader från kalkylarket
 *
 * @param {Object} sheet - Googleobjekt
 * @param {numbers[]} delete_rows - Lista med villka rader som ska tas bort
 */
function deleteRowsFromSpreadsheet(sheet, delete_rows) {
  
  for (var k = delete_rows.length-1; k >= 0 ; k--) { //Tar bort rader, starta nerifrån
    
    var tmp_row = delete_rows[k];
    Logger.log("Remove row " + tmp_row);
    sheet.deleteRow(tmp_row);
  }  
}


/*
 * Skiver in i kalkylarket länken till gruppen
 *
 * @param {Object} selection - ett googleojekt
 * @param {string} rad_nummer - radnummer i kalkylarket för en specifik googlegrupp
 * @param {string} column - kolumnnummer som detta hör till
 * @param {string} email - e-postadress för googlegruppen
 */
function setCellValueCellUrl(selection, rad_nummer, column, email) {
  
  var cell =selection.getCell(rad_nummer, column+1);
  var cell_url = '=HYPERLINK("https://admin.google.com/AdminHome?groupId='+ email + '&chromeless=1#OGX:Group";"Länk")';
  cell.setValue(cell_url);
}


/*
 * Skapar en grupp med angiven e-postadress och namn
 * med fördefinerade behörighetsinställningar
 *
 * @param {string} email - e-postadress för gruppen
 * @param {string} name - namn på e-postgruppen
 *
 * @returns {Object} - Objekt av den nya skapade Googlegrupppen
 */
function createGroup(email, name) {

  var tmp_group = {
    "email": email,
    "name": name,
    "description": "Scoutnet"
  };
            
  AdminDirectory.Groups.insert(tmp_group);
            
  var group = AdminDirectory.Groups.get(email);
  
  return group;
}


/*
 * Returnera gruppmedlemmar för en specifik grupp
 *
 * @param {string} groupId -Googles id för en grupp
 *
 * @returns {Object[]} members - Lista av medlemsobjekt med attributen email, role, status för medlemmar i en grupp
 */
function getGroupMembers(groupId) {
  
  var group = [];
  
  var pageToken, page;
  do {
    page = AdminDirectory.Members.list(groupId,{
      domainName: domain,
      maxResults: 150,
      pageToken: pageToken,
    });
    var members = page.members
    if (members)
    {
      for (var i = 0; i < members.length; i++)
      {
        var member = members[i];
        
        var member = {
          email: member.email.toLowerCase(),
          role: member.role,
          status: member.status
        };
        group.push(member);
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
      
  return group;
}


/*
 * Om en medlem (dennes member_no) har ett Googlekonto
 * så returnerar vi dennes e-postadress. Annars bara en tom sträng
 *
 * @param {string} member_no - Medlemsnummer för en medlem
 *
 * @returns {string} - E-postadress för medlem om finns, annars tom sträng
 */
function getGoogleAccount(member_no) {
  
  var users;
  
  var qry = "externalId='"+ member_no +"'";
  var pageToken, page;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      query: qry,
      orderBy: 'givenName',
      maxResults: 150,
      pageToken: pageToken
    });
    users = page.users;
    if (users) {
      
      //Logger.log('%s (%s)', users[0].name.fullName, users[0].primaryEmail);
      return users[0].primaryEmail;
        
    } else {
      //Logger.log('Inga användare hittades.');
      return "";
    }
    pageToken = page.nextPageToken;
  } while (pageToken);  
}


/*
 * Uppdatera medlemmar för en grupp
 *
 * @param {string} groupId - Googles id för gruppen
 * @param {string} scoutnet_list_id - Scoutnets id för e-postgruppen i Scoutnet
 * @param {Objekt} cell_scoutnet_list_id - Google objekt för cellen i kalkylarket för Scoutnets list_id
 * @param {string} synk_option - Sträng som definerar synkroniseringsinställningar
 */
function updateGroup(groupId, scoutnet_list_id, cell_scoutnet_list_id, synk_option) {
  
  var allMembers = fetchScoutnetMembersMultipleMailinglists(scoutnet_list_id, cell_scoutnet_list_id);
  var allMembers_email = [];
  
  var group_members = getGroupMembers(groupId); //Alla gruppmedlemmar med deras roller
  var group_members_email = [];
  
  for (var k = 0; k < allMembers.length; k++) {   
    
    allMembers_email.push.apply(allMembers_email, getEmailListSyncOption(allMembers[k], synk_option, true));
  }  
  
  allMembers_email = removeDublicates(allMembers_email);  //Ifall samma e-postadress är hos flera medlemmar eller upprepas i olika kontaktfält.
  //Sparar in på dataförfrågningar till Google något
  
  for (var i = 0; i < group_members.length; i++) {
   
    if (group_members[i].role=='MEMBER') //Ta endast bort personer med rollen Member
      if (!contains(allMembers_email, group_members[i].email)) {
        
        Logger.log(group_members[i].email + " Borde tas bort från " + groupId  + "Google e-postlista");
        AdminDirectory.Members.remove(groupId, group_members[i].email);
      }
    group_members_email.push(group_members[i].email);
  }  
  
  for (var i = 0; i < allMembers_email.length; i++) { //Vi gör detta som nummer två för att spara lite tid,
    //och för att Google i bland ändrar e-postadress för en användare.
       
    if (!contains(group_members_email, allMembers_email[i])) { //Lägg till medlem till e-postlista
       
      Logger.log(allMembers_email[i] + " Borde lägga till i Googles e-postlista");
      addGroupMember(groupId, allMembers_email[i]);
    }    
  }  
}


/*
 * Lägg till en medlem till en specifik grupp
 *
 * @param {string} groupId - Gruppens id hos Google
 * @param {string} email - e-postadress att lägg till
 */
function addGroupMember(groupId, email) {
  
  var member = {
    email: email,
    role: 'MEMBER'
  };
  try {
    AdminDirectory.Members.insert(member, groupId);
  }
  catch (e) {
    Logger.log("Kunde inte lägga till e-postadress:" + email); 
  }
}


/*
 * Ändra behörigheter för en grupp efter att den är skapad
 *
 * @param {string} email - E-postadress för en grupp
 * @param {string} postPermission - Definierar vilka som ska få skicka till e-postlistan
 */
function changeGroupPermissions(email, postPermission) {
  
  var group = AdminGroupsSettings.newGroups();
  
  group.whoCanJoin = 'INVITED_CAN_JOIN';
  group.whoCanViewMembership = 'ALL_MANAGERS_CAN_VIEW';
  group.whoCanInvite = 'ALL_MANAGERS_CAN_INVITE';
  group.whoCanAdd = 'ALL_MANAGERS_CAN_ADD';
  group.allowExternalMembers = true;
  group.whoCanPostMessage = postPermission;
  group.primaryLanguage = 'sv';
  group.messageModerationLevel = 'MODERATE_NONE';
  group.replyTo = 'REPLY_TO_SENDER';
  group.membersCanPostAsTheGroup = false;
  group.whoCanLeaveGroup = 'NONE_CAN_LEAVE';
  
  AdminGroupsSettings.Groups.patch(group, email);
}


/*
 * Skapa kolumnrubriker i kalkylarket och dölj kolumnen med Grupp-ID
 */
function createHeaders_Grupper() {
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Grupper).getSheets()[0];
  
  var grd = GrupperRubrikData();
  
  // Frys de två översta raderna på arket så att rubrikerna alltid syns
  sheet.setFrozenRows(2);
  
  /********Rad 1********************/
  var range1_rad1 = sheet.getRange(1, grd["scoutnet_list_id"]+1, 1, 2);
  var range2_rad1 = sheet.getRange(1, grd["scoutnet_list_id_send"]+1, 1, 2);
  var range3_rad1 = sheet.getRange(1, grd["scoutnet_list_id_receive"]+1, 1, 2);
  
  if (! (range1_rad1.isPartOfMerge() ||
         range2_rad1.isPartOfMerge() ||
      range3_rad1.isPartOfMerge())) { //Inga angivna celler på rad 1 är sammanfogade
    
    Logger.log("Inga av de angivna cellerna på rad 1 är sammanfogade");
    
    range1_rad1.merge();
    range2_rad1.merge();
    range3_rad1.merge();
    
    Logger.log("Vi har nu sammanfogat dem");    
  }
  else {
    Logger.log("Några celler är sedan tidigare sammanfogade på rad 1, så vi gör inget åt just det");
  }
  
  var values_rad1 = [
    ["Kan skicka och ta emot", "", "Kan skicka", "", "Kan ta emot", ""]
  ];

  // Sätter området för cellerna som vi ska ändra
  // De 6 kolumnerna för listId & synkinställning
  var range_rad1 = sheet.getRange(1, grd["scoutnet_list_id"]+1, 1, 6);
  range_rad1.setHorizontalAlignment("center");
  range_rad1.setFontWeight("bold");

  // Sätter våra rubriker på vårt område
  range_rad1.setValues(values_rad1);
  
  /********************************/
    
  /*******Rad 2********************/
  // Våra värden vi vill ha som rubriker för de olika kolumnerna på rad 2
  var values_rad2 = [
    ["Namn", "E-post", "Scoutnet-id", "Synkinställning", "Scoutnet-id", "Synkinställning", "Scoutnet-id", "Synkinställning", "Grupp-ID hos Google (RÖR EJ)", "Länk"]
  ];

  // Sätter området för cellerna på rad 2 som vi ska ändra
  var range_rad2 = sheet.getRange(2, 1, 1, values_rad2[0].length);

  // Sätter våra rubriker på vårt område med kursiv text
  range_rad2.setValues(values_rad2);
  range_rad2.setFontStyle("italic");
  
  /*******************************/
  
  /*******Sätt kantlinjer*********/
  
  var kolumn1 = getA1RangeOfColumns(sheet, grd["scoutnet_list_id"]+1, 2);
  //Kolumnen för scoutnet_list_id;
  kolumn1.setBorder(null, true, null, true, null, null);
  
  var kolumn2 = getA1RangeOfColumns(sheet, grd["scoutnet_list_id_send"]+1, 2);
  kolumn2.setBorder(null, true, null, true, null, null);
  
  var kolumn3 = getA1RangeOfColumns(sheet, grd["scoutnet_list_id_receive"]+1, 2);
  kolumn3.setBorder(null, true, null, true, null, null);  
  
  /*******************************/
  
  /*******Kolumn Grupp-ID*********/
  
  var column = getA1RangeOfColumns(sheet, grd["groupId"]+1, 1); //Kolumnen för Grupp-ID  
  column.setBackground("orange");
  column.setFontColor("blue");
  
  //Vi tar bort alla skyddade områden
  var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);  
  for (var i = 0; i < protections.length; i++) {
    var protection = protections[i];
    if (protection.canEdit()) {
      protection.remove();
    }
  }
  //Vi skyddar kolumnen för Grupp-ID så man inte råkar ändra av misstag
  column.protect().setWarningOnly(true);
  
  //Dölj kolumnen med group-id
  sheet.hideColumn(column);
  
  /*******************************/  
}


/*
 * Visar kolumner som styr avancerade inställningar
 */
function avanceradLayout() {
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Grupper).getSheets()[0];
  
  var grd = GrupperRubrikData();
  
  sheet.showColumns(grd["scoutnet_list_id_send"]+1, 4);  
}


/*
 * Döljer kolumner som styr avancerade inställningar
 */
function enkelLayout() {
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Grupper).getSheets()[0];
  
  var grd = GrupperRubrikData();
  
  sheet.hideColumns(grd["scoutnet_list_id_send"]+1, 4);  
}


/*
 * Ger området för en eller flera kolumner
 *
 * @param {Objekt} sheet - Ett ark
 * @param {int} columnIndex - Kolumnindex
 * @param {int} numColumns - Antal kolumner med columnIndex längst till vänster
 *
 * @returns {Objekt} - Området för hela kolumnen
 */
function getA1RangeOfColumns(sheet, columnIndex, numColumns) {
  
  var range = sheet.getRange(1, columnIndex, 2, numColumns);
  //Vi anger att det ska vara två rader så att vi får en start och slutkolumn
  var a1_cell_row_one = range.getA1Notation();
  
  var a1Notation = a1_cell_row_one.replace(/[0-9]/g, '');  
  range = sheet.getRange(a1Notation);
  
  return range;
}
 

/*
 * Kontrollerar att formatet på en e-postadress är godkänt
 * genom att se om den innehåller @ och om domännamnet är godkänt
 *
 * @param {string} email - En e-postadress
 *
 * @returns {boolean} - Om e-postadressen är skriven på rätt format
 */
function checkEmailFormat(email) {
  
  var arr = email.split("@");
  var tmp_domain = arr[1];
  
  if (tmp_domain==domain) {
       return true;
  }
  return false;  
}


/*
 * Returnerar true eller false om en googlegrupp finns
 *
 * @param {string} email - E-postadress för en googlegrupp
 *
 * @returns {boolean} - Om gruppen finns eller ej
 */
function checkIfGroupExists(email) {
  
  var pageToken, page;
  do {
    page = AdminDirectory.Groups.list({
      domain: domain,
      maxResults: 150,
      pageToken: pageToken
    });
    var groups = page.groups;
    if (groups) {
      
      for (var i = 0; i < groups.length; i++) {
        
        var group = groups[i];
        if (group.email==email) { //Träff hittad
          
          Logger.log('Denna grupp finns redan. ' + email);
          return true;
        }        
      }      
    }
    else {
      Logger.log('Ingen grupp hittades med e-postadress. ' + email);      
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  
  Logger.log('Ingen grupp hittades med e-postadress. ' + email);
  return false;
}


/*
 * Testfunktion för att läsa alla grupper
 */
function TestListAllGroups() {
  var pageToken, page;
  do {
    page = AdminDirectory.Groups.list({
      domain: domain,
      maxResults: 150,
      pageToken: pageToken
    });
    var groups = page.groups;
    if (groups) {
      for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        Logger.log('%s (%s)', group.name, group.email);
      }
    } else {
      Logger.log('Inga grupper hittades.');
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}


/*
 * Testfunktion för att läsa kalkylarket
 */
function TestReadSpreadSheet() {
  
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Grupper);
  var data = sheet.getDataRange().getValues();
  var grd = GrupperRubrikData();
  
  for (var i = 1; i < data.length; i++) {
    
    Logger.log('Namn: ' + data[i][grd["namn"]] + ' E-post: ' + data[i][grd["e-post"]] + ' list-id: ' + data[i][grd["scoutnet_list_id"]] + ' grupp id: ' + data[i][grd["groupId"]]);           
  }
  return data;
}
