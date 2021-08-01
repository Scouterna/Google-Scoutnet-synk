/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


var domain = 'hasselbyscout.se'; //Domänen/Webbsideadressen utan www till kåren och som används i Google Workspace

var groupId = '12'; //Kårens id som kan hittas i Scoutnet om du har tillräcklig behörighet


var api_key_list_all = 'jkdf949348948'; //Kan hittas i Scoutnet om du har tillräcklig behörighet

var api_key_mailinglists = 'jhshdfh98489498'; //Kan hittas i Scoutnet om du har tillräcklig behörighet

//Typ av organisationsenhet
var organisationType = 'group'; //Ska enbart ändras om du kör programmet för ett distrikt. Ska då bytas till district

//Adressen till Scoutnet. Ska ej ändras
var scoutnet_url = 'www.scoutnet.se'; //Scoutnets webbadress


/**
 * Testfunktion för att anropa
 * Om direktanrop utan användarnamn/lösenord kan konto-id anges
 * vid den bortkommenterade variabeln memberKey
 */
function testaDoGet() {
  var e = {
    parameters : {
      username: "en e-postadress",
      password: "lösenord"
    }
  }
  doGet(e);
}


/**
 * Körs vid GET-anrop till webbappen
 * 
 * @param {String} e - Unikt identifierare för en person
 *
 * @returns {Object[[]]} - Lista över kontaktgrupper och vilka medlemmar
 * för respektive
 */
function doGet(e) {
  
  var params = e.parameters;
  var username = params.username;
  var password = params.password;

  var memberKey = checkCredentials(username, password);
  //memberKey = "123456712345671234567";  //För testsyfte
  
  let contactGroupsList;
  Logger.log("userkey " + userKey);
  if (userKey) {
    //Hämta en lista över alla Google Grupper som denna person är med i
    let groups = getListOfGroupsForAUser(userKey);

    let listOfGroupEmails = getListOfGroupsEmails(groups);

    contactGroupsList = getContactGroupsData(listOfGroupEmails);
  }

  Logger.log("Svar");
  Logger.log(contactGroupsList);

  return ContentService.createTextOutput(JSON.stringify(contactGroupsList))
    .setMimeType(ContentService.MimeType.JSON);
}


function getContactGroupsData(listOfGroupEmails)  {
  let spreadsheetUrl_Kontakter = 'https://docs.google.com/spreadsheets/d/kjdskdjf32332/edit';

  let sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Kontakter).getSheetByName("Kontakter");
  if (sheet == null) {
    Logger.log("Bladet Kontakter finns ej i kalkylarket");
  }
  var selection = sheet.getDataRange();
  var data = selection.getValues();

  let grd = getKontaktGruppKonfigRubrikData();

  let delete_rows = [];

  let contactGroupsList = [];

  //Hämta lista med alla medlemmar i kåren och alla deras attribut
  let allMembers = fetchScoutnetMembers();

  let start = 3;
  let slut = data.length;

  updateListOfGroups();

  Logger.log("Startrad " + start + " slutrad " + slut);

  for (let i = start-1; i < slut; i++) {
    
    let name = data[i][grd["namn"]];
    let email = data[i][grd["e-post"]];
    let scoutnet_list_id = data[i][grd["scoutnet_list_id"]];

    if(!contains(listOfGroupEmails, email))  {
      Logger.log("Användare ej med i Google Gruppen " + email);
      continue;
    }
    else  {
      Logger.log("Användare med i Google Gruppen " + email);
    }

    let rad_nummer = i+1;
    
    Logger.log('Rad: ' + rad_nummer + ' Namn: ' + name + ' E-post: ' + email + ' Scoutnet: ' + scoutnet_list_id);

    let updateContactGroup = true;

    if (email=="" && scoutnet_list_id=="") { //Ta bort raden
      Logger.log("Försöker ta bort rad " + rad_nummer);
      
      delete_rows.push(rad_nummer);
      updateContactGroup = false;
    }

    if (name=="") {
      let cell=selection.getCell(rad_nummer,grd["namn"]+1);
      Logger.log("Sätter cellen för namn till gul");
      cell.setBackground("yellow");
    }
    else if (name!="") {
      let cell=selection.getCell(rad_nummer,grd["namn"]+1);
      if ("#ffffff" != cell.getBackground()) {
        Logger.log("Sätter cellen för namn till vit");
        cell.setBackground("white");
      }
    }
    
    if (email!="" && checkIfEmailIsAGroup(email)) {
      let cell=selection.getCell(rad_nummer,grd["e-post"]+1);
      if ("#ffffff" != cell.getBackground()) {
        Logger.log("Sätter cellen för e-post till vit");
        cell.setBackground("white");
      }
    }
    else  {
      let cell=selection.getCell(rad_nummer,grd["e-post"]+1);
      Logger.log("Sätter cellen för e-post till röd");
      cell.setBackground("red");
    }

    if (updateContactGroup) {
      //Hämta uppdatering av kontaktgruppsinfo
      let membersInAList = getUpdateForContactGroup(selection, rad_nummer, data[i], grd, allMembers);
      Logger.log("membersInAList");
      Logger.log(membersInAList);

      contactGroupsList.push(membersInAList);      
    }
  }
  deleteRowsFromSpreadsheet(sheet, delete_rows);

  return contactGroupsList;
}


/**
 * Hämta data över de medlemmar som ska vara med i en kontaktgrupp
 *
 * @param {Objekt} selection - Hela området på kalkylarket som används
 * @param {Int} rad_nummer - Radnummer för aktuell grupp i kalkylarket
 * @param {String[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {String[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * @param {Objekt[]} allMembers - Lista med medlemsobjekt för alla medlemmar i kåren
 * 
 * @returns {Objekt[]} - Lista med medlemsobjekt anpassade för de i aktuell lista
 */
function getUpdateForContactGroup(selection, rad_nummer, radInfo, grd, allMembers) {

  let name = radInfo[grd["namn"]];

  let scoutnet_list_id = radInfo[grd["scoutnet_list_id"]]; //Själva datan
  let cell_scoutnet_list_id = selection.getCell(rad_nummer, grd["scoutnet_list_id"]+1); //Range
  let synk_option = radInfo[grd["synk_option"]];

  let tmpMembersInAList = fetchScoutnetMembersMultipleMailinglists(scoutnet_list_id, cell_scoutnet_list_id, "");
  
  let contactGroupInfo = {
    name: name
  };

  let membersInAList = [];
  membersInAList.push(contactGroupInfo);

  for (let i = 0; i<tmpMembersInAList.length; i++) {
    //Leta upp medlemmen i listan övar alla medlemmar
    let obj = allMembers.find(obj => obj.member_no == tmpMembersInAList[i].member_no);

    let emailList = getEmailListSyncOption(obj, synk_option, true);
    
    obj.google_contact_group = makeStringForGoogleContactGroup(emailList);
    membersInAList.push(obj);
    //Logger.log("obj");
    //Logger.log(obj);
    Logger.log("obj.google_contact_group");
    Logger.log(obj.google_contact_group);
  }
  return membersInAList;
}


/**
 * Ger en textsträng med e-postadresser anpassas för Google Kontakter
 * 
 * @param {String[]} - Lista över e-postadresser enligt specificerade attribut
 *
 * @returns {Object[]} - Textsträng för e-postadresser i Google Kontakter
 */
function makeStringForGoogleContactGroup(emailList)  {

  //Skapa lista med enbart korrekta e-postadresser
  let realEmailList = [];
  for (let i = 0; i<emailList.length; i++) {
    if (checkIfEmail(emailList[i])) {
      realEmailList.push(emailList[i]);
    }
    else {
      Logger.log("Ogiltig e-postadress " + emailList[i]);
    }
  }

  //Ta bort dubletter
  realEmailList = removeDublicates(realEmailList);

  let contactGroupList = [];
  for (let i = 0; i<realEmailList.length; i++) {
    
    if (0 == i) {
      if (realEmailList.length == 1) {
        contactGroupList.push(realEmailList[i]);
        Logger.log("Första och enda elementet " + realEmailList[i]);
      }
      else  {
        contactGroupList.push(realEmailList[i] + ">");
        Logger.log("Första elementet " + realEmailList[i]);
      }      
    }
    else if (realEmailList.length-1 == i) {
      contactGroupList.push("<" + realEmailList[i]);
      Logger.log("Sista elementet " + realEmailList[i]);
    }
    else {
      contactGroupList.push("<" + realEmailList[i] + ">");
      Logger.log("Ett element i mitten någonstans " + realEmailList[i]);
    }
  }
  contactGroupList = contactGroupList.toString();
  return contactGroupList;
}


//TODO
/*
Anropar ett kalkylark
returnerar memberKey för aktuell medlem
Använd samma attribut för e-post såsom i medlemslistor synkningen?
*/
function checkCredentials(username, password) {
  
  //Test
  return "123456712345671234567";
}


/**
 * Ger lista över de grupper som denna person är med i
 * 
 * @param {String} userKey - Unikt identifierare för en person
 *
 * @returns {Object[]} - Lista över grupper som denna person är med i
 */
function getListOfGroupsForAUser(userKey) {
  
  Logger.log("Hämtar lista över alla grupper som denna person är med i");
  let listOfGroups = [];

  let pageToken, page;
  do {
    page = AdminDirectory.Groups.list({
      domain: domain,
      maxResults: 150,
      pageToken: pageToken,
      userKey: userKey
    });
    let groups = page.groups;
    if (groups) {   
      for (let i = 0; i < groups.length; i++) {

        let group = {
          email: groups[i].email,
          id: groups[i].id,
          name: groups[i].name
        };
        //Logger.log(group);
        listOfGroups.push(group);
      }      
    }
    else {
      Logger.log('Inga grupper hittades.');      
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  //Logger.log(listOfGroups);
  return listOfGroups;
}


/**
 * Ger lista över de grupper som denna person är med i
 * 
 * @param {Object[]} - Lista med objekt av grupper
 *
 * @returns {String[]} - Lista med e-postadresser för alla angivna grupper
 */
function getListOfGroupsEmails(groups)  {

  let listOfGroupsEmails = [];

  for (let i = 0; i < groups.length; i++) {
    listOfGroupsEmails.push(groups[i].email);
  }
  Logger.log(listOfGroupsEmails);
  return listOfGroupsEmails;
}


/*
 * Returnerar lista med vilket index som olika rubriker har i kalkylarket
 *
 * @returns {number[]} - Lista med rubrikindex för respektive rubrik
 */
function getKontaktGruppKonfigRubrikData() {
  
  //Siffran är vilken kolumn i kalkylarket.
  let kontaktgruppKonfigRubrikData = {};
  kontaktgruppKonfigRubrikData["namn"] = 0;
  kontaktgruppKonfigRubrikData["e-post"] = 1;

  kontaktgruppKonfigRubrikData["scoutnet_list_id"] = 2;  
  kontaktgruppKonfigRubrikData["synk_option"] = 3;

  return kontaktgruppKonfigRubrikData;
}


/**
 * Returnera AdminGroupSettings
 *
 * @param {String} email - E-postadress för gruppen
 *
 * @returns {Object} - Inställningar för en Googlegrupp
 */
function getAdminGroupSettings(email) {
  
  for (var n=0; n<6; n++) {    
    try {
      var group = AdminGroupsSettings.Groups.get(email);
      return group;
    }
    catch (e) {
      Logger.log("Funktionen getAdminGroupSettings körs " + n);
      Logger.log("Problem med att anropa AdminGroupsSettings.Groups.get i getAdminGroupSettings med:" + email);
      if (n == 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Returnera fullständig information om en medlem i en grupp
 *
 * @param {String} groupId - Googles id för en grupp
 * @param {String} memberKey - Unik identifierare för en medlem i en grupp
 *
 * @returns {Object[]} member - Ett medlemsobjekt
 */
function getGroupMember(groupId, memberkey) {
  
  //Logger.log("Försöker hämta grupp:" + groupId);
  //Logger.log("Försöker med memberKey:" + memberkey);
  
  for (var n=0; n<6; n++) { 
    try {
      var groupMember = AdminDirectory.Members.get(groupId, memberkey);
      //Logger.log(groupMember);
      return groupMember;
    }
    catch (e) {
      Logger.log("Funktionen getGroupMember körs " + n);
      Logger.log("Problem med att anropa Members.get i getGroupMember med:" + memberkey);
      if (n == 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Ger gruppmedlemmar för en specifik grupp
 *
 * @param {Object} group - Grupp
 *
 * @returns {Object[]} groupMembers - Lista av medlemsobjekt med attributen email, role, memberId för medlemmar i en grupp
 */
function getGroupMembers(group) {
  
  var groupMembers = [];
  
  var pageToken, page;
  do {
    page = AdminDirectory.Members.list(group.id,{
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
        
        var tmpEmail = getGmailAdressWithoutDots(member.email.toLowerCase());
        var member = {
          email: tmpEmail,
          role: member.role,
          memberId: member.id
        };
        groupMembers.push(member);     
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  
  Logger.log("Medlemmar i gruppen " + group.email);
  Logger.log(groupMembers);
  return groupMembers;
}


/**
 * Ger gruppmedlemmar för en specifik grupp
 *
 * @param {Object} group - Grupp
 * @param {Object[]} members - Lista av medlemsobjekt för medlemmar i en grupp
 *
 * @returns {Object[]} emails - List med vilka som är mottagare i en grupp
 */
function getGroupRecipients(group, members)  {

  var emails = [];
  emails.push(group);

  for (var i = 0; i < members.length; i++)
  {
    var member = getGroupMember(group.id, members[i].memberId);
    //Logger.log(member.email + " " + member.delivery_settings);
    if ('ALL_MAIL' == member.delivery_settings) {
      emails.push(member.email);
    }
  }
  Logger.log("E-postmottagare i gruppen");
  Logger.log(emails);
  return emails;
}


/**
 * Tar bort punkter före @ om det är en gmailadress
 *
 * @param {String} email - E-postadress
 *
 * @returns {String} - E-postadress utan punkter före @ om gmailadress
 */
function getGmailAdressWithoutDots(email) {
  
  var regexGmailDots = /(?:\.|\+.*)(?=.*?@gmail\.com)/g;
  
  email = email.replace(regexGmailDots, "");
  return email;  
}
