/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


var domain = 'hasselbyscout.se'; //Domänen/Webbsideadressen utan www till kåren och som används i Google Workspace


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
 * @returns {Object[[]]} - Lista över grupper och vilka som är mottagare
 * för de grupper som angiven person är med i och kan skicka till
 */
function doGet(e) {
  
  var params = e.parameters;
  var username = params.username;
  var password = params.password;

  var memberKey = checkCredentials(username, password);
  //memberKey = "123456712345671234567";  //För testsyfte
  
  if (memberKey) {
    //Hämta en lista över alla grupper som denna person är med i
    var groups = getListOfGroups(memberKey);
    
    //Kolla igenom grupper och ta bara de som personen får skicka till
    //Ta bort de grupper som vem som helst får skicka till
    groups = getListOfGroupsAllowedToSendTo(groups, memberKey);    

    //Skapa lista över alla e-postmottagare i alla dessa grupper
    var listOfGroupsRecipients = getListOfGroupsRecipients(groups);
  }

  Logger.log("Svar");
  Logger.log(listOfGroupsRecipients);

  return ContentService.createTextOutput(JSON.stringify(listOfGroupsRecipients))
    .setMimeType(ContentService.MimeType.JSON);
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
function getListOfGroups(userKey) {
  
  Logger.log("Hämtar lista över alla grupper som denna person är med i");
  var listOfGroups = [];

  var pageToken, page;
  do {
    page = AdminDirectory.Groups.list({
      domain: domain,
      maxResults: 150,
      pageToken: pageToken,
      userKey: userKey
    });
    var groups = page.groups;
    if (groups) {      
      for (var i = 0; i < groups.length; i++) {

        var group = {
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

  Logger.log(listOfGroups);
  return listOfGroups;
}


/**
 * Ger lista över de grupper som denna person får skicka till
 * och som inte hela världen får skicka till
 * 
 * @param {Object[]} groups - Lista över grupper som denna person är med i
 * @param {String} memberKey - Unik identifierare för en medlem i en grupp
 *
 * @returns {Object[]} - Lista över grupper som denna person får skicka till
 */
function getListOfGroupsAllowedToSendTo(groups, memberKey) {

  Logger.log("Hämtar lista över alla grupper som denna person får skicka till");
  var groupsAllowedToSendTo = [];

  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    //Logger.log(group);
    var groupSettings = getAdminGroupSettings(group.email);
    var postPermission = groupSettings.whoCanPostMessage;

    //Så inte vem som helst i hela världen får skicka till den
    if ('ALL_MANAGERS_CAN_POST' == postPermission) {
      
      var member = getGroupMember(group.id, memberKey);
      Logger.log(group.email + " " + member.email + " " + member.role);

      if ('MANAGER' == member.role) {       
        groupsAllowedToSendTo.push(group);
      }      
    }
  }
  Logger.log("Grupper som denna person får skicka till");
  Logger.log(groupsAllowedToSendTo);
  Logger.log("Antal grupper som får skicka till - " + groupsAllowedToSendTo.length);
  return groupsAllowedToSendTo;
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
 * Ger lista över de som är mottagare i grupper givet lista över grupper
 * 
 * @param {Object[]} groups - Lista över grupper
 *
 * @returns {Object[[]]} groupsRecipients - Lista över grupper med listor för respektive
 */
function getListOfGroupsRecipients(groups) {

  var groupsRecipients = [];
  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    var members = getGroupMembers(group);
    members = getGroupRecipients(group, members);

    var antalMottagare = members.length - 1;
    Logger.log("Antal mottagare i gruppen " + antalMottagare);
    if (1 != members.length)  {
      groupsRecipients.push(members);
    }
  }
  return groupsRecipients;
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
