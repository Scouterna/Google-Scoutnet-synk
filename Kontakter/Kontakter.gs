/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */

//Sen borde det kanske egentligen vara implementeringsid som står här
var url = 'https://script.google.com/macros/s/1213235654/exec';


var username = "info@testkar.se";

var password = "12345";

var version = "1.9.0kdkdkdkk";

var prefixContactgroups = "Scoutnet - ";

var customEmailField = "Kontaktgruppsutskick via Gmail webb";

var groupName = "Test Scoutkår";

//Arkiv e-post lägga till i listan, ska vara på adminsidan



/**
 * Huvudfunktion för att hantera synkronisering av kontaktgrupper med Scoutnet
 */
function Kontakter() {

  Logger.log("Gör anrop till API");

  let userParam = "?username=" + username + "&password=" + password;
  let response = UrlFetchApp.fetch(url+userParam);
  let nyaKontaktGrupper = JSON.parse(response);

  Logger.log(nyaKontaktGrupper);

  let kontaktgrupper = getContactGroups();
  kontaktgrupper = createAndDeleteContactGroups(kontaktgrupper, nyaKontaktGrupper);
  Logger.log("kontaktgrupper");
  Logger.log(kontaktgrupper);


  let contactsRemovedFromContactGroups = createAndUpdateContacts(kontaktgrupper, nyaKontaktGrupper);
  Logger.log(contactsRemovedFromContactGroups);
  return;


  //Hämta lista med alla kontakter
  //hämta lista med alla kontaktgrupper som finns
  //Loopa igenom, om medlemsgruppsId matchar något som ej är systemgrupp, ta bort den
  deleteOldContacts(contactsRemovedFromContactGroups);
}


/*
 * Tar bort inaktuella kontakter som tidigare har synkroniserats
 * 
 * @param {Object[]} - Lista av Objekt av typen Contact med de kontakter som tagits bort
 * från någon kontaktgrupp
 */
function deleteOldContacts(contactsRemovedFromContactGroups)  {

  Logger.log("deleteOldContacts " +  contactsRemovedFromContactGroups.length);

  //Kolla om varje kontakt är med i en kontaktgrupp
  for (let i = 0; i < contactsRemovedFromContactGroups.length; i++) {
    let contact = contactsRemovedFromContactGroups[i];
    Logger.log("Kollar kontakten " + contact.getPrimaryEmail());

    let contactGroups = contact.getContactGroups();

    if (checkIfContactInAnyNonSystemGroup(contactGroups)) {
      Logger.log("Denna kontakt är fortfarande med i en kontaktgrupp " + contactGroups[0].getName());
    }
    else  {
      let scoutnetEmail = contact.getEmails(customEmailField)[0];
      
      if (scoutnetEmail.isPrimary()) {
        Logger.log("Ska radera kontakten. Var ej med i någon vanlig kontaktgrupp");
        deleteContact(contact);
      }
    }
  }
}


/*
 * Kollar om någon av angivna kontaktgrupper inte är en systemgrupp
 * 
 * @param {Object[]} kontaktgrupper - Lista av Objekt av typen ContactGroup
 * 
 * @returns {Boolean} - Sant eller falskt om en av grupperna inte är en systemgrupp
 */
function checkIfContactInAnyNonSystemGroup(kontaktGrupper)  {

  for (let i = 0; i < kontaktGrupper.length; i++) {

    if (kontaktGrupper[i].isSystemGroup()) {
      Logger.log("Denna grupp är en  systemgrupp " + kontaktGrupper[i].getName());
    }
    else  {
      Logger.log("Denna kontakt är med i en vanlig grupp");
      return true;
    }
  }
  return false;
}


function createAndUpdateContacts(kontaktGrupper, nyaKontakter)  {

  let contactsRemovedFromContactGroups = [];

  let emptyContactResource = makeContactResource({});
  let contactResourceKeys = Object.keys(emptyContactResource);
  Logger.log("Nycklar som används");
  Logger.log(contactResourceKeys);

  let connections = updateListOfConnections(contactResourceKeys);

  let resourceNamesAlreadyProcessed = [];
  let memberNumbersUsedInSomeGroup = [];

  //Loop och gå igenom varje kontaktgrupp
  for (let i = 0; i < kontaktGrupper.length; i++) {
    
    Logger.log(kontaktGrupper[i]);
    //Namn på aktuell kontaktgrupp
    let kontaktGruppNamn = kontaktGrupper[i].name;
    Logger.log("Namn på aktuell kontaktgrupp " + kontaktGruppNamn);
    //Resursnamn för aktuell kontaktgrupp
    let kontaktGruppResourceName = kontaktGrupper[i].resourceName;
    Logger.log("Resursnamn för aktuell kontaktgrupp " + kontaktGruppResourceName);


    //Hämta vilka som är med i kontaktgruppen just nu
    let kontaktGrupp = getContactGroup(kontaktGrupper[i]);
    let memberResourceNames = kontaktGrupp.memberResourceNames;
    let kontaktLista = getContactsByMemberResourceNames(memberResourceNames);
    let membersInfo = getMembersInfoFromPersonResponses(kontaktLista);
    let memberNumbers = getMemberNumbersFromMembersInfo(membersInfo);


    Logger.log("kontaktGrupp");
    Logger.log(kontaktGrupp);

    Logger.log("memberResourceNames");
    Logger.log(memberResourceNames);

    Logger.log("kontaktLista");
    Logger.log(kontaktLista);

    Logger.log("membersInfo");
    Logger.log(membersInfo);

    Logger.log("memberNumbers");
    Logger.log(memberNumbers);

    Logger.log("nyaKontakter");
    Logger.log(nyaKontakter);

    /***Ska var med i kontaktgruppen***/
    //Hämta lista vilka som ska vara med i kontaktgruppen
    let kontaktGruppInfo = getNewContactGroupInfo(nyaKontakter, kontaktGruppNamn);
    Logger.log("Hämta lista över vilka som ska vara med i kontaktgruppen");
    Logger.log(kontaktGruppInfo);

    let kontaktGruppMemberNumbersList = getContactGroupMemberNumbers(kontaktGruppInfo);
    Logger.log("kontaktGruppMemberNumbersList");
    Logger.log(kontaktGruppMemberNumbersList);
    /***Ska var med i kontaktgruppen - Slut***/


    let membersInfoStayingInGroup = [];

    let resourceNamesToAdd = [];
    let resourceNamesToRemove = [];
    
    //Loop - de som är med i kontaktgruppen nu men inte ska. Ska tas bort från gruppen
    Logger.log("Loopa igenom vilka som ska tas bort från kontaktgruppen");
    //Loop och gå igenom varje kontakt som är med i gruppen just nu
    for (let n = 0; n < membersInfo.length; n++) {
      
      //Detta medlemsnummer finns ej med i den nya listan
      if (!contains(kontaktGruppMemberNumbersList, membersInfo[n].memberNumber)) {
        Logger.log("Ska ta bort kontakten från kontaktgruppen " + membersInfo[n].memberNumber);
        resourceNamesToRemove.push(membersInfo[n].resourceName);
        contactsRemovedFromContactGroups.push(membersInfo[n].resourceName);
      }
      else  {
        Logger.log("Ska fortsätta stanna i gruppen " + membersInfo[n]);
        membersInfoStayingInGroup.push(membersInfo[n]);
      }
    }

    let memberNumbersStayingInGroup = getMemberNumbersFromMembersInfo(membersInfoStayingInGroup);
    
    Logger.log("resourceNamesToRemove");
    Logger.log(resourceNamesToRemove);

    Logger.log("membersInfoStayingInGroup");
    Logger.log(membersInfoStayingInGroup);

    Logger.log("memberNumbersStayingInGroup");
    Logger.log(memberNumbersStayingInGroup);

    
    //Loop - de som inte är med i kontaktgruppen ska läggas till. Om konto saknas ska det skapas
    Logger.log("Loopa igenom vilka som ska läggas till i kontaktgruppen");
    for (let n = 0; n < kontaktGruppMemberNumbersList.length; n++) {

      //Ej med i kontaktgruppen sedan innan
      if (!contains(memberNumbersStayingInGroup, kontaktGruppMemberNumbersList[n])) {

        Logger.log("Connn ");
        Logger.log(connections);
        let connection = getConnectionByMemberNumber(connections, kontaktGruppMemberNumbersList[n])

        Logger.log("Connection " + connection);

        if (connection)  {
          //Kontakten finns sedan innan
          Logger.log("Lägg till kontakten " + connection.memberNumber + " i gruppen");
          resourceNamesToAdd.push(connection.resourceName);
        }
        else {          
          Logger.log("Skapa kontakten " + kontaktGruppMemberNumbersList[n] + " och lägg till i gruppen");
          let memberData = getMemberdataFromMemberNumber(nyaKontakter, kontaktGruppMemberNumbersList[n]);

          connection = createContact(memberData);
          resourceNamesToAdd.push(connection.resourceName);
          resourceNamesAlreadyProcessed.push(connection.resourceName);

          //Sparar anrop i stället för att uppdatera hela tiden.
          connections.push({
            resourceName: connection.resourceName,
            memberNumber: kontaktGruppMemberNumbersList[n]
          });
          
        }        
      }
    }
    Logger.log("Följande ska läggas till i gruppen");
    Logger.log("resourceNamesToAdd");
    Logger.log(resourceNamesToAdd);


    Logger.log("Följande ska tas bort från gruppen");
    Logger.log(resourceNamesToRemove);

    modifyContactGroupMembers(kontaktGruppResourceName, resourceNamesToAdd, resourceNamesToRemove);
  }

  Logger.log("Följande resursnamn är redan processade och behöver ej uppdateras senare");
  Logger.log(resourceNamesAlreadyProcessed);
  updateContacts(nyaKontakter, connections, contactResourceKeys, memberNumbersUsedInSomeGroup, resourceNamesAlreadyProcessed);

  
  //Lista över alla kontakter
  //Uppdatera kontakter
  //  resourceNamesAlreadyProcessed

  return contactsRemovedFromContactGroups;  //Behövs den?? eller bara ta bort alla som matchar och saknar grupp
}


/**
 * Uppdatera vilka kontakter som ska tillhöra en kontaktgrupp
 * 
 * @param {String} contactGroupResourceName - Resursnamn för en kontaktgrupp
 * @param {String[]} resourceNamesToAdd - Lista av resursnamn för kontakter att lägga till i kontaktgruppen
 * @param {String[]} resourceNamesToRemove - Lista av resursnamn för kontakter att ta bort från kontaktgruppen
 * 
 * @returns {Objekt} - Lista av resursnamn för kontakter som inte gick att hitta eller ta bort
 */
function modifyContactGroupMembers(contactGroupResourceName, resourceNamesToAdd, resourceNamesToRemove)  {

  try {
    let contactGroupModifyResource = People.ContactGroups.Members.modify({
      "resourceNamesToAdd": resourceNamesToAdd,
      "resourceNamesToRemove": resourceNamesToRemove
    }, contactGroupResourceName);

    Logger.log(contactGroupModifyResource);
    return contactGroupModifyResource;
  }
  catch (e) {
      Logger.log("Problem med att anropa Members.modify i People.ContactGroups");
  }  
}


/**
 * Ger tillbaka en kontakt för ett angivet medlemsnummer
 * 
 * @param {Objekt[]} nyaKontakter - Lista av listor med information över de kontaktgrupper som ska finnas
 * @param {String} memberNumber - Ett medlemsnummer
 * 
 * @returns {Objekt} - Objekt för en medlem
 */
function getMemberdataFromMemberNumber(nyaKontakter, memberNumber)  {

  let allMembers = nyaKontakter[0];

  for (let i = 0; i < allMembers.length; i++) {

    if (allMembers[i].member_no == memberNumber)  {
      //Logger.log("medlemsdata");
      //Logger.log(allMembers[i]);
      return allMembers[i];
    }
  }
}


/**
 * Ger tillbaka en kontakt för ett angivet medlemsnummer
 * 
 * @param {Objekt[]} connections - Lista med objekt för kontakter
 * @param {String} memberNumber - Ett medlemsnummer
 * 
 * @returns {Objekt} - Objekt för en kontakt
 */
function getConnectionByMemberNumber(connections, memberNumber)  {

  for (let i = 0; i < connections.length; i++) {
    if (connections[i].memberNumber == memberNumber)
      return connections[i];
  }
}


/**
 * Ger lista med alla användarens kontakter som ska synkas
 * De kontakter som uppfyller att de är användarens egna samt
 * att kontakterna har medlemsnummer ifyllt på korrekt sätt
 * 
 * @returns {Objekt[]} - Lista med objekt för kontakter
 */
function updateListOfConnections(contactResourceKeys) {

  let contactResourceKeysString = contactResourceKeys.toString();

  let listOfConnections = [];

  let pageToken, page;
  do {
    page =  People.People.Connections.list('people/me', {
      pageToken: pageToken,
      pageSize: 25,
      personFields: contactResourceKeysString
    });
    let connections = page.connections;
    if (connections) {   
      for (let i = 0; i < connections.length; i++) {

        let externalIds = connections[i].externalIds;

        if (externalIds)  {

          for (let k = 0; k < externalIds.length; k++) {
            let externalId = externalIds[k];
            
            if ("Medlemsnummer" == externalIds[k].type) {

              if ("CONTACT" == externalId.metadata.source.type) {

                let connection = {
                  resourceName: connections[i].resourceName,
                  memberNumber: externalId.value,
                  memberInfo: connections[i]
                };          
                listOfConnections.push(connection);                
              }              
            }
          }          
        }
      }      
    }
    else {
      Logger.log('Inga kontakter hittades.');      
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  Logger.log("listOfConnections");
  Logger.log(listOfConnections);
  return listOfConnections;
}


/**
 * Ger medlemsnummer för de som ska vara med i en kontaktgrupp
 * 
 * @param {Object[]} kontaktGruppInfo - Lista med info och medlemsnummer för aktuell kommande kontaktgrupp
 * 
 * @returns {String[]} - Lista med medlemsnummer för aktuell kommande kontaktgrupp
 */
function getContactGroupMemberNumbers(kontaktGruppInfo)  {

  let memberNumbers = [];

  for (let i = 1; i < kontaktGruppInfo.length; i++) {
    memberNumbers.push(kontaktGruppInfo[i]);
  }
  return memberNumbers;
}


/**
 * Ger lista med medlemsnummer givet en lista med resursnamn och medlemsnummer
 * 
 * @param {Objekt[]} - Lista av Objekt med resursnamn och medlemsnummmer
 * 
 * @returns {String[]} - Lista med medlemsnummer för angivna kontakter
 */
function getMemberNumbersFromMembersInfo(membersInfoList) {

  let memberNumbers = [];

  for (let i = 0; i < membersInfoList.length; i++) {
    memberNumbers.push(membersInfoList[i].memberNumber);
  }
  return memberNumbers;

}


/**
 * Ger lista med objekt med viss medlemsinfo för de som redan är med i en kontaktgrupp
 * 
 * @param {Objekt[]} - Lista av Objekt av typen PersonRespone för angivna kontakter
 * 
 * @returns {Objekt[]} - Lista med objekt för angivna kontakter
 */
function getMembersInfoFromPersonResponses(personResponses) {

  Logger.log("getMembersInfoFromPersonResponses");
  let membersInfoList = [];

  for (let i = 0; i < personResponses.length; i++) {

    let externalIds = personResponses[i].person.externalIds;

    let foundMatch = false;

    if (externalIds !== undefined) {
      for (let k = 0; k < externalIds.length; k++) {
        if (externalIds[k].type == "Medlemsnummer") {
          
          let memberInfo = {
            memberNumber: externalIds[k].value,
            resourceName	: personResponses[i].requestedResourceName
          };
          foundMatch = true;
          membersInfoList.push(memberInfo);
        }
      }
    }

    if (!foundMatch)  {
      Logger.log("Denna kontakt är manuellt tillagd eller något");
      let memberInfo = {
        memberNumber: "",
        resourceName	: personResponses[i].requestedResourceName
      };
      membersInfoList.push(memberInfo);
    }
  }
  return membersInfoList;
}


/**
 * Ger lista av objekt av kontakter givet resursnamn för kontakterna
 * 
 * @param {String[]} memberResourceNames - Lista av resursnamn för kontakter
 * 
 * @returns {Objekt[]} - Lista av Objekt av typen PersonRespone för angivna kontakter
 */
function getContactsByMemberResourceNames(resourceNames)  {

  if (!resourceNames) {
    return [];
  }

  let group = People.People.getBatchGet({
      resourceNames: resourceNames,
      personFields: "emailAddresses,externalIds"
    });

  return group.responses;
}


function updateContacts(nyaKontakter, connections, contactResourceKeys, memberNumbersUsedInSomeGroup,resourceNamesAlreadyProcessed) {

  //Updatera connections så att alla kommer med
  connections = updateListOfConnections(contactResourceKeys);

  Logger.log("Connections");
  Logger.log(connections);

  Logger.log("Medlemsnummer som ska finnas totalt");
  Logger.log(memberNumbersUsedInSomeGroup);

  Logger.log("nyaKontakter");
  Logger.log(nyaKontakter);

  Logger.log("Alla nycklar som finns");
  Logger.log(contactResourceKeys);

  

  for (let i = 0; i < connections.length; i++) {
    Logger.log("--------------------------------------");
    let connection = connections[i].memberInfo;
    Logger.log("Medlemsinfo som är inlagt nu på kontakten");
    Logger.log(connection);

    let memberData = getMemberdataFromMemberNumber(nyaKontakter, connections[i].memberNumber);
    //Logger.log("memberData");
    //Logger.log(memberData);
    if (!memberData)  {
      Logger.log("Denna medlem är ej kvar på listan " + connections[i].memberNumber);
      continue;
    }
    let memberDataContactResource = makeContactResource(memberData);
    Logger.log("Medlemsinfo som ska vara inlagd på kontakten");
    Logger.log(memberDataContactResource);


    if (checkDifferenceAdresses(connection, memberDataContactResource))  {
      Logger.log("Skillnad på adresser");
    }
    if (checkDifferenceBiographies(connection, memberDataContactResource))  {
      Logger.log("Skillnad på anteckningar");
    }
    if (checkDifferenceBirthdays(connection, memberDataContactResource))  {
      Logger.log("Skillnad på födelsedag");
    }
    if (checkDifferenceNames(connection, memberDataContactResource))  {
      Logger.log("Skillnad på namn");
    }
    if (checkDifferenceNicknames(connection, memberDataContactResource))  {
      Logger.log("Skillnad på smeknamn");
    }
    if (checkDifferenceEmailAdresses(connection, memberDataContactResource))  {
      Logger.log("Skillnad på e-postadresser");
    }
    //Events
    //Ska tas bort sen då de syns som födelsedagar i Google kalender vilket stör

    //Vi kollar ej upp medlemsnummer då det ju är det som säger att kontakten ska synkas

    if (checkDifferenceGenders(connection, memberDataContactResource))  {
      Logger.log("Skillnad på kön");
    }
    if (checkDifferenceOrganizations(connection, memberDataContactResource))  {
      Logger.log("Skillnad på organisation");
    }
    if (checkDifferencePhoneNumbers(connection, memberDataContactResource))  {
      Logger.log("Skillnad på telefonnummer");
    }
    if (checkDifferenceRelations(connection, memberDataContactResource))  {
      Logger.log("Skillnad på relationer");
    }
  }
}


function checkDifferenceAdresses(connection, memberDataContactResource) {

  let nameOfPersonField = "addresses";

  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction(connectionObject, memberDataContactResource, nameOfPersonField, false);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    return tmpObject.status;
  }

  let memberData = tmpObject.memberData;
  
  let keys = ["type", "streetAddress", "extendedAddress", "city", "postalCode", "country"];
  let tmpArray = makeArrayOfFilteredConnectionObject(connectionObject, keys); 

  return checkDifferenceMemberInfo(tmpArray, memberData, nameOfPersonField);
}


function checkDifferenceBiographies(connection, memberDataContactResource) {

  let nameOfPersonField = "biographies";
  
  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction(connectionObject, memberDataContactResource, nameOfPersonField, true);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    return tmpObject.status;
  }

  let memberData = tmpObject.memberData;
  
  let keys = ["value", "contentType"];
  let tmpArray = makeArrayOfFilteredConnectionObject(connectionObject, keys);
  
  return checkDifferenceMemberInfo(tmpArray, memberData, nameOfPersonField);
}


function checkDifferenceBirthdays(connection, memberDataContactResource) {

  let nameOfPersonField = "birthdays";
  
  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction(connectionObject, memberDataContactResource, nameOfPersonField, false);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    return tmpObject.status;
  }

  let memberData = tmpObject.memberData;

  let tmpArray = [];
  
  for (let i = 0; i < connectionObject.length; i++) {
    let tmpObject = {
      "year": connectionObject[i].date.year,
      "month": connectionObject[i].date.month,
      "day": connectionObject[i].date.day
    };
    tmpArray.push(tmpObject);
  }

  tmpMemberData = [];
  for (let i = 0; i < memberData.length; i++) {
    let tmpObject = {
      "year": memberData[i].date.year,
      "month": memberData[i].date.month,
      "day": memberData[i].date.day
    };
    tmpMemberData.push(tmpObject);
  }

  Logger.log("tmpArray");
  Logger.log(tmpArray);

  Logger.log("tmpMemberData födelsedag");
  Logger.log(tmpMemberData);
  
  return checkDifferenceMemberInfo(tmpArray, tmpMemberData, nameOfPersonField);
}


function checkDifferenceNames(connection, memberDataContactResource) {

  let nameOfPersonField = "names";
  
  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction(connectionObject, memberDataContactResource, nameOfPersonField, false);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    return tmpObject.status;
  }
  
  let memberData = tmpObject.memberData;
  
  let keys = ["givenName", "familyName"];
  let tmpArray = makeArrayOfFilteredConnectionObject(connectionObject, keys);
  
  return checkDifferenceMemberInfo(tmpArray, memberData, nameOfPersonField);
}


function checkDifferenceNicknames(connection, memberDataContactResource) {

  let nameOfPersonField = "nicknames";
  
  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction(connectionObject, memberDataContactResource, nameOfPersonField, true);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    return tmpObject.status;
  }
  
  let memberData = tmpObject.memberData;
  
  let keys = ["value"];
  let tmpArray = makeArrayOfFilteredConnectionObject(connectionObject, keys);
  
  return checkDifferenceMemberInfo(tmpArray, memberData, nameOfPersonField);
}


//Gör denna enklare som andra funktioner FIXME
function checkDifferenceEmailAdresses(connection, memberDataContactResource) {

  let nameOfPersonField = "emailAddresses";
  
  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction(connectionObject, memberDataContactResource, nameOfPersonField, true);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    return tmpObject.status;
  }
  
  let memberData = tmpObject.memberData;

  let tmpArray = [];
  
  for (let i = 0; i < connectionObject.length; i++) {
    let tmpObject = {
      "value": connectionObject[i].value,
      "type": connectionObject[i].type
    };
    tmpArray.push(tmpObject);
  }  
  
  return checkDifferenceMemberInfo(tmpArray, memberData, nameOfPersonField);
}


function checkDifferenceGenders(connection, memberDataContactResource) {

  let nameOfPersonField = "genders";
  
  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction(connectionObject, memberDataContactResource, nameOfPersonField, true);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    return tmpObject.status;
  }
  
  let memberData = tmpObject.memberData;
  
  let keys = ["value"];
  let tmpArray = makeArrayOfFilteredConnectionObject(connectionObject, keys);
  
  return checkDifferenceMemberInfo(tmpArray, memberData, nameOfPersonField);
}


function checkDifferenceOrganizations(connection, memberDataContactResource) {

  let nameOfPersonField = "organizations";
  
  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction(connectionObject, memberDataContactResource, nameOfPersonField, false);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    return tmpObject.status;
  }

  let memberData = tmpObject.memberData;

  let tmpArray = [];
  
  for (let i = 0; i < connectionObject.length; i++) {
    let tmpObject = {
      "type": connectionObject[i].type,
      "startDate_year": connectionObject[i].startDate.year,
      "startDate_month": connectionObject[i].startDate.month,
      "startDate_day": connectionObject[i].startDate.day,
      "current": connectionObject[i].current,
      "name": connectionObject[i].name,
      "department": connectionObject[i].department,
      "title": connectionObject[i].title
    };
    tmpArray.push(tmpObject);
  }

  tmpMemberData = [];
  for (let i = 0; i < memberData.length; i++) {
    let tmpObject = {
      "type": memberData[i].type,
      "startDate_year": memberData[i].startDate.year,
      "startDate_month": memberData[i].startDate.month,
      "startDate_day": memberData[i].startDate.day,
      "current": memberData[i].current,
      "name": memberData[i].name,
      "department": memberData[i].department,
      "title": memberData[i].title
    };
    tmpMemberData.push(tmpObject);
  }

  Logger.log("tmpArray");
  Logger.log(tmpArray);

  Logger.log("memberData Företag");
  Logger.log(memberData);

  Logger.log("tmpMemberData Företag");
  Logger.log(tmpMemberData);
  
  return checkDifferenceMemberInfo(tmpArray, tmpMemberData, nameOfPersonField);
}


function checkDifferencePhoneNumbers(connection, memberDataContactResource) {

  let nameOfPersonField = "phoneNumbers";
  
  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction(connectionObject, memberDataContactResource, nameOfPersonField, true);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    return tmpObject.status;
  }

  let memberData = tmpObject.memberData;
  
  let keys = ["value", "type"];
  let tmpArray = makeArrayOfFilteredConnectionObject(connectionObject, keys);
  
  return checkDifferenceMemberInfo(tmpArray, memberData, nameOfPersonField);
}


function checkDifferenceRelations(connection, memberDataContactResource) {

  let nameOfPersonField = "relations";
  
  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction(connectionObject, memberDataContactResource, nameOfPersonField, true);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    return tmpObject.status;
  }

  let memberData = tmpObject.memberData;
  
  let keys = ["person", "type"];
  let tmpArray = makeArrayOfFilteredConnectionObject(connectionObject, keys);
  
  return checkDifferenceMemberInfo(tmpArray, memberData, nameOfPersonField);
}


//Lista med vilka nycklar/element som ska användas
function makeArrayOfFilteredConnectionObject(connectionObject, keys) {

  let tmpArray = [];
  Logger.log("MakeArray Nycklar " + keys);
  for (let i = 0; i < connectionObject.length; i++) {
    let tmpObject = {};

    for (let k = 0; k < keys.length; k++) {
      tmpObject[keys[k]] = connectionObject[i][keys[k]];
    }    
    tmpArray.push(tmpObject);
  }
  return tmpArray;
}


function checkDifferenceHelpfunction(connectionObject, memberDataContactResource, nameOfPersonField, removeValueEmpty)  {
  
  let memberData = memberDataContactResource[nameOfPersonField];
  if (removeValueEmpty) {
    memberData = removeElementsWithValueOrPersonEmpty(memberData);
  }

  Logger.log("Funktion för jämförelse av " + nameOfPersonField);
  Logger.log(connectionObject);
  Logger.log(memberData);

  if (null == connectionObject) {
    if (0 == memberData.length) {
      Logger.log("Ingen data nu heller för detta kontaktfält");
      return {"status": false};
    }
    Logger.log("Det finns nu ett till kontaktfält");
    return {"status": true};
  }
  return {
    "memberData": memberData
  };
}


//Tar bort element från en lista om elementet är tomt för att det ju inte kommer komma i anropet från Google och går därmed ej att jämföra
function removeElementsWithValueOrPersonEmpty(memberData) {

  let newMemberData = [];
  for (let i = 0; i < memberData.length; i++) {
    if (memberData[i].value || memberData[i].person)  {
      newMemberData.push(memberData[i]);
    }
  }
  return newMemberData;
}


//true == skillnad
//false == ingen skillnad
function checkDifferenceMemberInfo(tmpArray, memberData, nameOfPersonField)  {

  Logger.log(nameOfPersonField);

  Logger.log("checkDifferenceMemberInfo");
  Logger.log(tmpArray);
  Logger.log(memberData);

  if (tmpArray.length != memberData.length) {
    Logger.log("Olika många fält för detta kontaktattribut. Någon ändring har skett");
    return true;
  }

  for (let i = 0; i < tmpArray.length; i++) {
    let tmpObject = tmpArray[i];
    let tmpMemberData = memberData[i];

    Logger.log("Datan som finns");
    Logger.log(tmpObject);

    Logger.log("Datan som ska finnas");
    Logger.log(tmpMemberData);

    let tmpKeys = Object.keys(tmpObject);
    Logger.log("Nycklar som ska kollas");
    Logger.log(tmpKeys);

    for (let n = 0; n < tmpKeys.length; n++) {
      //Logger.log("A " + tmpKeys[n]);
      //Logger.log("B " + tmpObject[tmpKeys[n]]);
      //Logger.log("C " + tmpMemberData[tmpKeys[n]]);

      if (tmpObject[tmpKeys[n]] == tmpMemberData[tmpKeys[n]]) {
        Logger.log("Samma data " + tmpKeys[n] + " = " + tmpObject[tmpKeys[n]]);
      }
      else  {
        Logger.log("Data är ej lika");
        Logger.log("Gammal data " + tmpKeys[n] + " = " + tmpObject[tmpKeys[n]]);
        Logger.log("Ny data " + tmpKeys[n] + " = " + tmpMemberData[tmpKeys[n]]);
        return true; 
      }
    }
  }
  Logger.log("INGEN förändring alls för detta attrbut");
  return false;
}


//gör om memberData till rätt format för en kontaktresurs
function makeContactResource(memberData)  {
  
  //let avatar_updated = "avatar_updated";
  //let avatar_url = "avatar_url";

  let contactResource = {
    "addresses": [{
      "type": "Hem",
      "streetAddress": memberData.streetAddress,
      "extendedAddress": memberData.extendedAddress,
      "city": memberData.town,
      "postalCode": memberData.postcode,
      "country": memberData.country
    }],
    "biographies": [{
      "value": memberData.biographies,
      "contentType": "TEXT_PLAIN"
    }],    
    "birthdays": [{
      "date": {
        "year": memberData.date_of_birth_year,
        "month": memberData.date_of_birth_month,
        "day": memberData.date_of_birth_day
      }    
    }],
    "names": [{
      "givenName" : memberData.first_name,
      "familyName": memberData.last_name      
    }],
    "nicknames": [{
      "value": memberData.nickname
    }],
    "emailAddresses": [{
        "value": memberData.google_contact_group,
        "type" : customEmailField
      }, {
        "value": memberData.email,
        "type" : "Primär e-postadress"
      }, {
        "value": memberData.contact_alt_email,
        "type" : "Alternativ e-post"
      }, {
        "value": memberData.contact_email_mum,
        "type" : "Anhörig 1 e-post"
      }, {
        "value": memberData.contact_email_dad,
        "type" : "Anhörig 2 e-post"
    }],
    "events": [{
      "date": {
        "year": memberData.confirmed_at_year,
        "month": memberData.confirmed_at_month,
        "day": memberData.confirmed_at_day        
      },
      "type": "Medlem sedan"
    }],
    "externalIds": [{
        "value": memberData.member_no,
        "type": "Medlemsnummer"
    }],
    "genders": [{
        "value" : memberData.sex
    }],
    "organizations": [{
      "type": "Scoutkår",
      "startDate": {
        "year": memberData.confirmed_at_year,
        "month": memberData.confirmed_at_month,
        "day": memberData.confirmed_at_day        
      },
      "current": true,
      "name": memberData.group,
      "department": memberData.department,
      "title": memberData.title
    }],
    "phoneNumbers": [{
      "value": memberData.contact_mobile_phone,
      "type": "Mobil"
    },{
      "value": memberData.contact_home_phone,
      "type": "Hem"
    },{
      "value": memberData.contact_mobile_mum,
      "type": "Anhörig 1 mobil"
    },{
      "value": memberData.contact_telephone_mum,
      "type": "Anhörig 1 hem"
    },{
      "value": memberData.contact_mobile_dad,
      "type": "Anhörig 2 mobil"
    },{
      "value": memberData.contact_telephone_dad,
      "type": "Anhörig 2 hem"
    }],
    "relations": [{
      "person": memberData.contact_mothers_name,
      "type": "Anhörig 1",
    },{
      "person": memberData.contact_fathers_name,
      "type": "Anhörig 2",
    }]
  };

  return contactResource;
}


function createContact(memberData)  {

  let contactResource = makeContactResource(memberData);
  Logger.log("contactResource");
  Logger.log(contactResource); 

  let peopleResource = People.People.createContact(contactResource);

  Logger.log(peopleResource);
  return peopleResource;
}


/*
 * Radera en kontakt
 * 
 * @param {String} kontakt - Objekt av typen Contact att radera 
 */
function deleteContact(kontakt)  {

  for (let n=0; n<6; n++) {
    Logger.log("Funktionen deleteContact körs " + n);
    
    try {
      ContactsApp.deleteContact(kontakt);
      Logger.log("Radera kontakten");
      return;
    }
    catch (e) {
      Logger.log("Problem med att anropa ContactsApp med funktionen deleteContact");
      if (n == 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/*
 * Testa om kontakt med angivet e-postfält för Scoutnet finns
 * 
 * @param {String} email - E-postadress
 * 
 * @returns {Object | Boolean} - Objekt för en kontakt eller boolean false om ej finnns
 */
function checkIfContactWithScoutnetEmailExists(email) {

  let contacts = ContactsApp.getContactsByEmailAddress(email, customEmailField);
  for (let i = 0; i < contacts.length; i++) {
    //Logger.log("email " + email);
    let scoutnetEmail = contacts[i].getEmails(customEmailField)[0];
    if (scoutnetEmail.isPrimary()) {
      return contacts[i];
    }
  }
  return false;
}


/*
 * Ger lista med e-postadresser för en lista med kontaktGruppInfo
 * 
 * @param {Object[]} - Lista med info och e-postadresser för aktuell kommande kontaktgrupp
 * 
 * @returns {String[]} - Lista med e-postadresser som ska vara med i kontaktgruppen
 */
function getContactGroupEmails(kontaktGruppInfo)  {

  kontaktGruppInfo.shift();
  return kontaktGruppInfo;
}


/**
 * Ger info om en specifik kontaktgrupp och dess kommande kontakter
 * 
 * @param {Objekt[]} nyaKontakter - Lista med info och e-postadresser för kommande kontaktgrupper
 * @param {String} namn - Namn för den kontaktgrupp att söka efter
 * 
 * @returns {Objekt[]} - Lista med info och medlemsnummer för aktuell kommande kontaktgrupp
 */
function getNewContactGroupInfo(nyaKontakter, namn)  {

  for (let i = 0; i < nyaKontakter.length; i++) {

    let tmpNamn = prefixContactgroups + nyaKontakter[i][0].name;
    if (tmpNamn == namn)  {
      return nyaKontakter[i];
    }
  }
}


/**
 * Skapar nya kontaktgrupper och tar bort inaktuella kontaktgrupper
 * 
 * @param {Objekt[]} gamlaKontaktGrupper - Lista av Objekt med kontaktgruppsinformation
 * @param {Object[]} nyaKontaktGrupper - Lista av listor med information över de kontaktgrupper som ska finnas
 * 
 * @returns {Objekt[]} - Lista av Objekt med kontaktgruppsinformation
 */
function createAndDeleteContactGroups(gamlaKontaktGrupper, nyaKontaktGrupper) {

  Logger.log("Skapar nya kontaktgrupper och tar bort gamla");

  let nameOfOldContactGroups = getNameOfContactGroups(gamlaKontaktGrupper);

  let nameOfToBeContactGroups = [];

  Logger.log(nyaKontaktGrupper);
  for (let i = 1; i < nyaKontaktGrupper.length; i++) {
    nameOfToBeContactGroups.push(prefixContactgroups + nyaKontaktGrupper[i][0].name);
  }
  Logger.log("Namn på de kontaktgrupper som redan finns");
  Logger.log(nameOfOldContactGroups);

  Logger.log("Namn på kontaktgrupper som ska finnas");
  Logger.log(nameOfToBeContactGroups);

  //Ta bort de kontaktgrupper som ej ska finnas
  for (let i = 0; i < nameOfOldContactGroups.length; i++) {
    if (!contains(nameOfToBeContactGroups, nameOfOldContactGroups[i])) {
      Logger.log("Ta bort denna grupp " + gamlaKontaktGrupper[i].name);
      deleteContactGroup(gamlaKontaktGrupper[i]);
    }
  }

  //Skapa nya kontaktgrupper som ska finnas
  for (let i = 0; i < nameOfToBeContactGroups.length; i++) {
    if (!contains(nameOfOldContactGroups, nameOfToBeContactGroups[i])) {
      let group = createContactGroup(nameOfToBeContactGroups[i]);
    }
  }
  return getContactGroups();
}


/**
 * Ger lista med namn över de kontaktgrupper som skickas in
 * 
 * @param {Objekt[]} gamlaKontaktGrupper - Lista av Objekt med kontaktgruppsinformation
 * 
 * @returns {String[]} nameOfContactGroups - Lista med namnen på angivna kontaktgrupper
 */
function getNameOfContactGroups(kontaktgrupper) {

  Logger.log("Skapar lista med namn över kontaktgrupper");
  let nameOfContactGroups = [];

  for (let i = 0; i < kontaktgrupper.length; i++) {
    nameOfContactGroups.push(kontaktgrupper[i].name);
    //Logger.log(nameOfContactGroups[i]);
  }
  return nameOfContactGroups;
}


/**
 * Ta bort en kontaktgrupp
 * 
 * @param {Objekt} contactGroup - Objekt med kontaktgruppsinformation
 */
function deleteContactGroup(contactGroup) {

  for (let n=0; n<6; n++) {
    Logger.log("Funktionen deleteContactGroup körs " + n);
    
    try {
      People.ContactGroups.remove(contactGroup.resourceName);
      Logger.log("Tagit bort bort kontaktgruppen " + contactGroup.name);
      return;
    }
    catch (e) {
      Logger.log("Problem med att anropa People.ContactGroups med:" + contactGroup.name);
      if (n == 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Skapa en kontaktgrupp
 * 
 * @param {String} namn - namn för en kontaktgrupp att skapa
 * 
 * @returns {Object} - Objekt av typen ContactGroup för skapad kontaktgrupp
 */
function createContactGroup(namn) {

  for (let n=0; n<6; n++) {
    Logger.log("Funktionen createContactGroup körs " + n);
    
    try {
      let contactGroupResource = {
        "contactGroup": {
          "name": namn
        }
      };

      let group = People.ContactGroups.create(contactGroupResource);
      Logger.log("Skapat kontaktgruppen " + namn);
      return group;
    }
    catch (e) {
      Logger.log("Problem med att anropa People.ContactGroups med:" + namn);
      if (n == 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Hämta en kontaktgrupp
 * 
 * @param {Objekt} contactGroup - Objekt med kontaktgruppsinformation
 * 
 * @returns {Objekt} - Objekt med mer detaljerad kontaktgruppsinformation
 */
function getContactGroup(contactGroup) {

  for (let n=0; n<6; n++) {
    Logger.log("Funktionen getContactGroup körs " + n);
    
    try {
      let group = People.ContactGroups.get(contactGroup.resourceName,
        {maxMembers: 999}
        );
      
      Logger.log("Hämtat kontaktgruppen " + contactGroup.name);
      return group;
    }
    catch (e) {
      Logger.log("Problem med att anropa People.ContactGroups med:" + contactGroup.name);
      if (n == 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Ger lista över de kontaktgrupper som redan finns och som ska uppdateras
 * 
 * @returns {Objekt[]} - Lista av Objekt med kontaktgruppsinformation
 */
function getContactGroups() {

  Logger.log("Hämtar lista över alla kontaktgrupper som finns just nu");

  let listOfContactGroups = [];

  let pageToken, page;
  do {
    page = People.ContactGroups.list({
      pageToken: pageToken,
      pageSize: 25
    });
    let contactGroups = page.contactGroups;
    if (contactGroups) {   
      for (let i = 0; i < contactGroups.length; i++) {
        
        let contactGroup = {
          resourceName: contactGroups[i].resourceName,
          groupType	: contactGroups[i].groupType,
          name: contactGroups[i].name,
          memberCount: contactGroups[i].memberCount
        };
        
        if (contactGroup.groupType == "USER_CONTACT_GROUP") {
          if (contactGroup.name.startsWith(prefixContactgroups)) {
            Logger.log(contactGroups[i]);
            Logger.log(contactGroup);
            listOfContactGroups.push(contactGroup);
          }          
        }        
      }      
    }
    else {
      Logger.log('Inga kontaktgrupper hittades.');      
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  Logger.log(listOfContactGroups);
  Logger.log(listOfContactGroups.length);
  return listOfContactGroups;
}


/*
 * Kolla om ett objekt är inkluderat i en lista
 * 
 * @param {String[] | Number[] | Object[]} a - Lista
 * @param {String | Number | Object} obj - Ett objekt
 * 
 * @returns {Boolean} - True eller false gällande om objektet finns i listan
 */
function contains(a, obj) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] === obj) {
      return true;
    }
  }
  return false;
}
