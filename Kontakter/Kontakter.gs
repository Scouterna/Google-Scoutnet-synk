/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */

//Sen borde det kanske egentligen vara implementeringsid som står här
var url = 'https://script.google.com/macros/s/1213235654/exec';



function synkroniseraKontakterVanlig()  {
  Kontakter(false);
}

function synkroniseraKontakterTvingad() {
  Kontakter(true);
}

/*
 * Huvudfunktion för att hantera synkronisering av kontaktgrupper med Scoutnet
 */
function Kontakter(forceUpdate) {
  
  Logger.log("Läser data från kalkylbladet");
  let sdk = getSheetDataKontakter_();
  let username = sdk["username"];
  let password = sdk["password"];
  let version = sdk["version"];
  
  let prefixContactgroups = sdk["prefixContactgroups"];
  let customEmailField = sdk["customEmailField"];
  let groupName = sdk["groupName"];
  Logger.log("E-postfält för alla e-postadresser för en kontakt " + customEmailField);
  Logger.log("Kår " + groupName);

  Logger.log("Gör anrop till API");

  let userParam = "?username=" + username + "&password=" + password + "&version=" + version + "&forceupdate=" + forceUpdate;
  let response = UrlFetchApp.fetch(url+userParam);
  let nyaKontaktGrupper = JSON.parse(response);

  Logger.log(nyaKontaktGrupper);

  let kontaktgrupper = getContactGroups_(prefixContactgroups);
  kontaktgrupper = createAndDeleteContactGroups_(kontaktgrupper, nyaKontaktGrupper, prefixContactgroups);
  Logger.log("kontaktgrupper");
  Logger.log(kontaktgrupper);

  let emptyContactResource = makeContactResource_({}, customEmailField);
  let contactResourceKeys = Object.keys(emptyContactResource);
  Logger.log("Nycklar som används");
  Logger.log(contactResourceKeys);

  let contactsRemovedFromContactGroups = createAndUpdateContacts_(kontaktgrupper, nyaKontaktGrupper, prefixContactgroups, customEmailField, contactResourceKeys);
  Logger.log("Kontakter som är borttagna från kontaktgrupp");
  Logger.log(contactsRemovedFromContactGroups);
  deleteContacts(contactsRemovedFromContactGroups, contactResourceKeys);
  return;


  //Hämta lista med alla kontakter
  //hämta lista med alla kontaktgrupper som finns
  //Loopa igenom, om medlemsgruppsId matchar något som ej är systemgrupp, ta bort den
  deleteOldContacts(contactsRemovedFromContactGroups, customEmailField);
}


/**
 * Ger datan som användaren har angett i kalkylbladet
 *
 * @returns {Objekt} - Ger datan som användaren har angett i kalkylbladet
 */
function getSheetDataKontakter_()  {

  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kontakter");
  if (sheet == null) {
    Logger.log("Bladet Kontakter finns ej i kalkylarket");
  }
  let selection = sheet.getDataRange();
  let data = selection.getValues();
  
  let grd = getKontakterUserInputData_();

  //Logger.log(data);
  //Logger.log(grd);

  let userInputData = {};
  userInputData["username"] = data[grd["username"][0]][grd["username"][1]];
  userInputData["password"] = data[grd["password"][0]][grd["password"][1]];

  userInputData["prefixContactgroups"] = data[grd["prefixContactgroups"][0]][grd["prefixContactgroups"][1]];
  userInputData["customEmailField"] = data[grd["customEmailField"][0]][grd["customEmailField"][1]];
  userInputData["groupName"] = data[grd["groupName"][0]][grd["groupName"][1]];
  userInputData["version"] = data[grd["version"][0]][grd["version"][1]];

  Logger.log(userInputData);
  return userInputData;
}


/**
 * Returnerar lista med vilket index som olika användarfält har i kalkylarket
 *
 * @returns {Number[][]} - Lista med index för rad och kolumn för olika användarfält
 */
function getKontakterUserInputData_() {
  
  //Kolumn och rad i kalkylarket
  let column = 2;

  let kuid = {};
  kuid["username"] = [4, column];
  kuid["password"] = [5, column];

  kuid["prefixContactgroups"] = [9, column];
  kuid["customEmailField"] = [10, column];
  kuid["groupName"] = [11, column];
  kuid["version"] = [12, column];

  return kuid;
}


/*
contactsRemovedFromContactGroups - kontakter som har tagits bort från någon lista
*/
function deleteContacts(resourceNamesRemovedFromContactGroups, contactResourceKeys) {
//contactsRemovedFromContactGroups - denna kollar för att ta bort kontakter som manuellt har lagts till på något sätt eller typ tagit bort medlemsnummer från en medlem och att kontakten sen ska tas bort

  /***De som har tagits bort från någon kontaktgrupp***/
  Logger.log("Resurser som tagits bort från någon kontaktgrupp");
  //Rensar bort dubletter bland de som tagits bort från flera kontaktgrupper
  resourceNamesRemovedFromContactGroups = removeDublicates_(resourceNamesRemovedFromContactGroups);
  Logger.log(resourceNamesRemovedFromContactGroups);
  /***SLUT - De som har tagits bort från någon kontaktgrupp***/

  /***Hitta alla kontakter som är synkbara***/
  let connections = updateListOfConnections_([...contactResourceKeys, 'memberships']);
  Logger.log("Alla kontakter som är synkbara");
  Logger.log(connections);

  let connectionsResourceNames = [];
  for (let i = 0; i < connections.length; i++) {
    connectionsResourceNames.push(connections[i].resourceName);
  }
  Logger.log("connectionsResourceNames");
  Logger.log(connectionsResourceNames);
  /***SLUT - Hitta alla kontakter som är synkbara***/


  /***Hämta lista över vilka kontaktgruppers resursnamn som inte är systemgrupper***/
  let kontaktgrupperResourceNames = getContactGroupsResourceNames_();
  /***SLUT - Hämta lista över vilka kontaktgrupper som inte är systemgrupper***/


  /***Hitta vilka kontakter som tagits bort som inte är synkbara***/
  let resourceNamesToCheck = [];

  for (let i = 0; i < resourceNamesRemovedFromContactGroups.length; i++) {

    if (!connectionsResourceNames.includes(resourceNamesRemovedFromContactGroups[i])) {
      Logger.log("Denna kontakt var konstig");
      resourceNamesToCheck.push(resourceNamesRemovedFromContactGroups[i]);
    }
  }

  Logger.log("Dessa kontakter är icke synkbara kontakter som tagits bort från en kontaktgrupp");
  Logger.log(resourceNamesToCheck);


  let personResponses = getContactsByMemberResourceNames_(resourceNamesToCheck);
  let resourceNamesToDeleteNonSyncable = getResourceNamesToDeleteFromPersonResponses_(personResponses, kontaktgrupperResourceNames);
  /***SLUT - Hitta vilka kontakter som tagits bort som inte är synkbara***/


  /***Hitta vilka synkbara kontakter som inte är med i en kontaktgrupp***/
  let resourceNamesToDeleteSyncable = getResourceNamesToDeleteFromConnections_(connections, kontaktgrupperResourceNames);
  

  /***SLUT - Hitta vilka synkbara kontakter som inte är med i en kontaktgrupp***/

  //Ta bort alla kontakter som ska tas bort
}


/**
 * Ger en lista med resursnamn för alla användarskapade kontaktgrupper som finns
 * 
 * @returns {String[]} - Lista med resursnamn för alla användarskapade kontaktgrupper
 */
function getContactGroupsResourceNames_()  {

  let kontaktgrupper = getContactGroups_("");

  let resourceNames = [];

  for (let i = 0; i < kontaktgrupper.length; i++) {
    resourceNames.push(kontaktgrupper[i].resourceName);
  }
  Logger.log("Resursnamn för alla användarskapade kontaktgrupper");
  Logger.log(resourceNames);
  return resourceNames;
}


/**
 * Ger lista över resursnamn för de kontakter som har tagits bort från en kontaktgrupp och som inte
 * är synkbara och inte heller är med i någon annan kontaktgrupp som inte är en systemgrupp.
 * 
 * @param {Objekt[]} personResponses - Lista av Objekt av typen PersonResponse för kontaker som tagits bort
 * från en kontaktgrupp och som inte är synkbara.
 * @param {String[]} kontaktgrupperResourceNames - Lista av resursnamn för kontaktgrupper som inte är systemgrupper
 * 
 * @returns {String[]} - Lista över resursnamn för kontakter som inte är synkbara som ska tas bort
 */
function getResourceNamesToDeleteFromPersonResponses_(personResponses, kontaktgrupperResourceNames)  {

  //Logger.log("personResponses");
  //Logger.log(personResponses);

  let resourceNamesToDelete = [];

  for (let i = 0; i < personResponses.length; i++) {
    let person = personResponses[i].person;
    let memberships = person.memberships;
    //Logger.log("memberships");
    //Logger.log(memberships);
    
    if (!checkIfContactInAnyNonSystemContactGroup_(kontaktgrupperResourceNames, memberships)) {
      resourceNamesToDelete.push(person.resourceName);
    }
  }
  Logger.log("Dessa kontakter som inte är synkbara ska raderas");
  Logger.log(resourceNamesToDelete);
  return resourceNamesToDelete;
}


/**
 * Ger lista över resursnamn för de kontakter som har tagits bort från en kontaktgrupp och som
 * är synkbara och inte heller är med i någon annan kontaktgrupp som inte är en systemgrupp.
 * 
 *  @param {Objekt[]} connections - Lista med objekt för kontakter
 * från en kontaktgrupp och som inte är synkbara.
 * @param {String[]} kontaktgrupperResourceNames - Lista av resursnamn för kontaktgrupper som inte är systemgrupper
 * 
 * @returns {String[]} - Lista över resursnamn för kontakter som är synkbara som ska tas bort
 */
function getResourceNamesToDeleteFromConnections_(connections, kontaktgrupperResourceNames)  {

  let resourceNamesToDelete = [];

  for (let i = 0; i < connections.length; i++) {
    let connection = connections[i];
    let memberships = connection.memberInfo.memberships;
    let resourceName = connection.resourceName;

    //Logger.log(resourceName);
    //Logger.log(memberships);

    if (!checkIfContactInAnyNonSystemContactGroup_(kontaktgrupperResourceNames, memberships)) {
      resourceNamesToDelete.push(resourceName);
    }
  }
  Logger.log("Dessa kontakter som är synkbara ska raderas");
  Logger.log(resourceNamesToDelete);
  return resourceNamesToDelete;
}


/**
 * Kollar om en kontakt är med i en kontaktgrupp som inte är en systemgrupp
 * 
 * @param {String[]} kontaktgrupperResourceNames - Lista av resursnamn för kontaktgrupper som inte är systemgrupper
 * @param {Objekt[]} memberships - Lista av objeket med kontaktgruppsmedlemskap för en kontakt
 * 
 * @returns {Boolean} - Sant eller falskt om denna kontakt är med i en kontaktgrupp som inte är en systemgrupp
 */
function checkIfContactInAnyNonSystemContactGroup_(kontaktgrupperResourceNames, memberships)  {

  for (let i = 0; i < memberships.length; i++) {
    let resourceName = memberships[i].contactGroupMembership.contactGroupResourceName;
    
    if (kontaktgrupperResourceNames.includes(resourceName)) {
      //Logger.log("Denna kontakt är fortfarande med i en kontaktgrupp " + resourceName);
      return true;
    }
  }
  //Logger.log("Denna kontakt är inte längre med i en kontaktgrupp");
  return false;
}


/**
 * Uppdaterar kontakter och skapar nya vid behov.
 * Returnerar resursnamn för de kontakter som tagits bort från någon kontaktgrupp
 * 
 * @param {Objekt[]} kontaktGrupper - Lista av Objekt med kontaktgruppsinformation
 * @param {Objekt[]} nyaKontakter - Lista av listor med information över de kontaktgrupper som ska finnas
 * @param {String} prefixContactgroups - Prefix för kontaktgrupper som synkroniseras
 * @param {String} customEmailField - Namn på eget kontaktfält för e-post att använda
 * @param {String[]} contactResourceKeys - Attribut för en kontakt
 * 
 * @returns {String[]} - Lista med resursnamn för de kontakter som har tagits bort från någon kontaktgrupp
 */
function createAndUpdateContacts_(kontaktGrupper, nyaKontakter, prefixContactgroups, customEmailField, contactResourceKeys)  {

  //Alla kontakter som tidigare har synkats
  let connections = updateListOfConnections_(contactResourceKeys);

  let contactsRemovedFromContactGroups = [];
  let resourceNamesAlreadyProcessed = [];
  
  //Loop och gå igenom varje kontaktgrupp
  for (let i = 0; i < kontaktGrupper.length; i++) {
    
    //Logger.log(kontaktGrupper[i]);

    let kontaktGruppNamn = kontaktGrupper[i].name;
    Logger.log("Namn på aktuell kontaktgrupp " + kontaktGruppNamn);

    let kontaktGruppResourceName = kontaktGrupper[i].resourceName;
    Logger.log("Resursnamn för aktuell kontaktgrupp " + kontaktGruppResourceName);

    //Hämta vilka som är med i kontaktgruppen just nu
    /***Är med i kontaktgruppen just nu***/
    let kontaktGrupp = getContactGroup_(kontaktGrupper[i]);
    let memberResourceNames = kontaktGrupp.memberResourceNames;
    let kontaktLista = getContactsByMemberResourceNames_(memberResourceNames);
    let membersInfo = getMembersInfoFromPersonResponses_(kontaktLista);
  
    //Logger.log("kontaktGrupp");
    //Logger.log(kontaktGrupp);

    //Logger.log("memberResourceNames");
    //Logger.log(memberResourceNames);

    //Logger.log("kontaktLista");
    //Logger.log(kontaktLista);

    Logger.log("Hämta lista över vilka som just nu är med i kontaktgruppen");
    Logger.log(membersInfo);
    /***Är med i kontaktgruppen just nu - Slut***/

    //Logger.log("nyaKontakter");
    //Logger.log(nyaKontakter);

    /***Ska var med i kontaktgruppen***/
    let memberNumbersShouldBeInContactGroup = getMemberNumbersShouldBeInContactGroup_(nyaKontakter, kontaktGruppNamn, prefixContactgroups);
    /***Ska var med i kontaktgruppen - Slut***/

    let membersInfoStayingInGroup = [];

    let resourceNamesToAdd = [];
    let resourceNamesToRemove = [];
  
    Logger.log("Loopa igenom vilka som ska tas bort från kontaktgruppen");
    //Loop och gå igenom varje kontakt som är med i gruppen just nu
    for (let n = 0; n < membersInfo.length; n++) {
      
      //Detta medlemsnummer finns ej med i den nya listan
      if (!memberNumbersShouldBeInContactGroup.includes(membersInfo[n].memberNumber)) {
        Logger.log("Ska ta bort kontakten från kontaktgruppen " + membersInfo[n].memberNumber);
        resourceNamesToRemove.push(membersInfo[n].resourceName);
        contactsRemovedFromContactGroups.push(membersInfo[n].resourceName);
      }
      else  {
        membersInfoStayingInGroup.push(membersInfo[n]);
      }
    }

    Logger.log("Ska fortsätta stanna i gruppen");
    Logger.log(membersInfoStayingInGroup);

    let memberNumbersStayingInGroup = getMemberNumbersFromMembersInfo_(membersInfoStayingInGroup);
    //Logger.log("memberNumbersStayingInGroup");
    //Logger.log(memberNumbersStayingInGroup);

    
    //Loop - de som inte är med i kontaktgruppen ska läggas till. Om konto saknas ska det skapas
    Logger.log("Loopa igenom vilka som ska läggas till i kontaktgruppen och eventuellt skapas");
    for (let n = 0; n < memberNumbersShouldBeInContactGroup.length; n++) {

      //Ej med i kontaktgruppen sedan innan
      if (!memberNumbersStayingInGroup.includes(memberNumbersShouldBeInContactGroup[n])) {

        //Hämta kontakten med ett givet medlemsnummer
        let connection = getConnectionByMemberNumber_(connections, memberNumbersShouldBeInContactGroup[n]);

        if (connection)  {
          //Kontakten finns sedan innan
          Logger.log("Lägg till kontakten " + connection.memberNumber + " i gruppen");
          resourceNamesToAdd.push(connection.resourceName);
        }
        else {          
          Logger.log("Skapa kontakten " + memberNumbersShouldBeInContactGroup[n] + " och lägg till i gruppen");
          let memberData = getMemberdataFromMemberNumber_(nyaKontakter, memberNumbersShouldBeInContactGroup[n]);

          connection = createContact_(memberData, customEmailField);
          resourceNamesToAdd.push(connection.resourceName);
          resourceNamesAlreadyProcessed.push(connection.resourceName);

          //Sparar anrop i stället för att uppdatera hela tiden.
          connections.push({
            resourceName: connection.resourceName,
            memberNumber: memberNumbersShouldBeInContactGroup[n]
          });
        }
      }
    }
    modifyContactGroupMembers_(kontaktGruppResourceName, resourceNamesToAdd, resourceNamesToRemove);
  }

  Logger.log("Följande resursnamn är redan processade och behöver ej uppdateras senare");
  Logger.log(resourceNamesAlreadyProcessed);
  updateContacts_(nyaKontakter, connections, contactResourceKeys, resourceNamesAlreadyProcessed, customEmailField);

  return contactsRemovedFromContactGroups; 
}


/**
 * Ger medlemsnummer för de medlemmar som ska vara med i en kontaktgrupp
 * 
 * @param {Objekt[]} nyaKontakter - Lista med info och e-postadresser för kommande kontaktgrupper
 * @param {String} namn - Namn för den kontaktgrupp att söka efter
 * @param {String} prefixContactgroups - Prefix för kontaktgrupper som synkroniseras
 * 
 * @returns {String[]} - Lista med medlemsnummer för aktuell kommande kontaktgrupp
 */
function getMemberNumbersShouldBeInContactGroup_(nyaKontakter, namn, prefixContactgroups) {

  //Hämta lista vilka som ska vara med i kontaktgruppen
  let kontaktGruppInfo = getNewContactGroupInfo_(nyaKontakter, namn, prefixContactgroups);
  Logger.log("Hämta lista över vilka som ska vara med i kontaktgruppen");
  Logger.log(kontaktGruppInfo);

  let kontaktGruppMemberNumbersList = getContactGroupMemberNumbers_(kontaktGruppInfo);
  //Logger.log("kontaktGruppMemberNumbersList");
  //Logger.log(kontaktGruppMemberNumbersList);

  return kontaktGruppMemberNumbersList;
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
function modifyContactGroupMembers_(contactGroupResourceName, resourceNamesToAdd, resourceNamesToRemove)  {

  Logger.log("Följande ska läggas till i gruppen");
  Logger.log(resourceNamesToAdd);

  Logger.log("Följande ska tas bort från gruppen");
  Logger.log(resourceNamesToRemove);

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
function getMemberdataFromMemberNumber_(nyaKontakter, memberNumber)  {

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
function getConnectionByMemberNumber_(connections, memberNumber)  {

  for (let i = 0; i < connections.length; i++) {
    if (connections[i].memberNumber == memberNumber)
      return connections[i];
  }
}


/**
 * Ger lista med alla användarens kontakter som ska synkas
 * De kontakter som uppfyller att de är användarens egna samt
 * att kontakterna har medlemsnummer ifyllt på korrekt sätt returneras
 * 
 * @param {String[]} contactResourceKeys - Attribut för en kontakt
 * 
 * @returns {Objekt[]} - Lista med objekt för kontakter
 */
function updateListOfConnections_(contactResourceKeys) {

  let contactResourceKeysString = contactResourceKeys.toString();

  let listOfConnections = [];

  let pageToken, page;
  do {
    page =  People.People.Connections.list('people/me', {
      pageToken: pageToken,
      pageSize: 25,
      personFields: contactResourceKeysString,
      sources: ["READ_SOURCE_TYPE_CONTACT"]
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
                  etag: connections[i].etag,
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

  //Logger.log("listOfConnections");
  //Logger.log(listOfConnections);
  return listOfConnections;
}


/**
 * Ger medlemsnummer för de som ska vara med i en kontaktgrupp
 * 
 * @param {Object[]} kontaktGruppInfo - Lista med info och medlemsnummer för aktuell kommande kontaktgrupp
 * 
 * @returns {String[]} - Lista med medlemsnummer för aktuell kommande kontaktgrupp
 */
function getContactGroupMemberNumbers_(kontaktGruppInfo)  {

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
function getMemberNumbersFromMembersInfo_(membersInfoList) {

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
function getMembersInfoFromPersonResponses_(personResponses) {

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
function getContactsByMemberResourceNames_(resourceNames)  {

  if (!resourceNames || 0 == resourceNames.length) {
    return [];
  }

  let group = People.People.getBatchGet({
      resourceNames: resourceNames,
      personFields: "emailAddresses,externalIds,memberships"
    });

  return group.responses;
}


/**
 * Kollar igenom alla kontakter som synkroniseras med Scoutnet vilka kontakter
 * som ska uppdateras och uppdaterar sen dem vid behov.
 * 
 * @param {Objekt[]} nyaKontakter - Lista av listor med information över de kontaktgrupper som ska finnas
 * @param {Objekt[]} connections - Lista med objekt för kontakter
 * @param {String[]} contactResourceKeys - Attribut för en kontakt
 * @param {String[]} resourceNamesAlreadyProcessed - Resursnamn för kontakter som ej behöver uppdateras
 * @param {String} customEmailField - Namn på eget kontaktfält för e-post att använda
 */
function updateContacts_(nyaKontakter, connections, contactResourceKeys, resourceNamesAlreadyProcessed, customEmailField) {

  //Den hinner inte uppdatera alla nya kontakter, så de nya kommer sen kollas för uppdateringar också
  connections = updateListOfConnections_(contactResourceKeys);

  Logger.log("Connections");
  Logger.log(connections);

  Logger.log("nyaKontakter");
  Logger.log(nyaKontakter);

  Logger.log("Alla nycklar som finns");
  Logger.log(contactResourceKeys);

  let personFields = getSimplePersonFields_();
  
  let personFieldsToUpdate = [];
  let contactsToUpdate = {};
  let numbersOfContactsToUpdate = 0;

  for (let i = 0; i < connections.length; i++) {
    Logger.log("--------------------------------------");
    let connection = connections[i].memberInfo;
    Logger.log("Medlemsinfo som är inlagt nu på kontakten");
    Logger.log(connection);

    Logger.log("Resursnamn för kontakten");
    Logger.log(connections[i].resourceName);

    Logger.log("Etag för kontakten");
    Logger.log(connections[i].etag);

    if (resourceNamesAlreadyProcessed.includes(connections[i].resourceName)) {
      Logger.log("Denna kontakt är redan processad och ska ej uppdateras");
      continue;
    }

    let memberData = getMemberdataFromMemberNumber_(nyaKontakter, connections[i].memberNumber);
    //Logger.log("memberData");
    //Logger.log(memberData);
    if (!memberData)  {
      Logger.log("Denna kontakt ska ej vara kvar längre " + connections[i].memberNumber);
      continue;
    }
    let memberDataContactResource = makeContactResource_(memberData, customEmailField);
    Logger.log("Medlemsinfo som ska vara inlagd på kontakten");
    Logger.log(memberDataContactResource);

    let contactShouldBeUpdated = false;

    for (let k = 0; k < personFields.length; k++) {
      if (checkDifference_(connection, memberDataContactResource, personFields[k]))  {
        Logger.log("Skillnad på " + personFields[k].svName);
        personFieldsToUpdate.push(personFields[k].apiName);
        contactShouldBeUpdated = true;
      }
    }

    //Födelsedag är lite special vid jämförelse mellan objekt
    if (checkDifferenceBirthdays_(connection, memberDataContactResource))  {
      Logger.log("Skillnad på födelsedag");
      personFieldsToUpdate.push("birthdays");
      contactShouldBeUpdated = true;
    }
    //Vi kollar ej upp medlemsnummer då det ju är det som säger att kontakten ska synkas

    //Denna kontakt ska uppdateras
    if (contactShouldBeUpdated)  {
      numbersOfContactsToUpdate++;
      Logger.log("Antal kontakter att uppdatera " + numbersOfContactsToUpdate);
      if (numbersOfContactsToUpdate>200)  { //Max uppdatera 200 stycken i taget
        Logger.log("För många kontakter att uppdatera på en gång. Tar resten vid nästa körning");
        continue;
      }

      //Lägger till attributet etag
      memberDataContactResource.etag = connections[i].etag;
      contactsToUpdate[connections[i].resourceName] = memberDataContactResource;
    }
  }

  personFieldsToUpdate = removeDublicates_(personFieldsToUpdate).toString();
  Logger.log("personFieldsToUpdate");
  Logger.log(personFieldsToUpdate);

  Logger.log("contactsToUpdate");
  Logger.log(contactsToUpdate);

  Logger.log("Antal kontakter att uppdatera " + numbersOfContactsToUpdate);
  if (0 != numbersOfContactsToUpdate) {
    batchUpdateContacts_(contactsToUpdate, personFieldsToUpdate);
  }
}


/**
 * Uppdaterar flera kontakters specificerade kontaktfält samtidigt
 * 
 * @param {Objekt} contactsToUpdate - Objekt med vilka kontakter som ska uppdateras och med ny data
 * @param {String} personFieldsToUpdate - Vilka kontaktfält som ska uppdateras
 */
function batchUpdateContacts_(contactsToUpdate, personFieldsToUpdate)  {

  for (let n=0; n<6; n++) {
    Logger.log("Funktionen batchUpdateContacts körs " + n);
    
    try {
      People.People.batchUpdateContacts({
        "contacts": contactsToUpdate,
        "updateMask": personFieldsToUpdate,
        "sources": ["READ_SOURCE_TYPE_CONTACT"]
      });
      Logger.log("Uppdaterat kontakterna " + Object.keys(contactsToUpdate));
      return;
    }
    catch (e) {
      Logger.log("Problem med att anropa People.People");
      if (n == 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Ger lista med objekt med information om personkontaktfält
 * 
 * @returns {Objekt[]} - Lista med objekt med information om personkontaktfält
 */
function getSimplePersonFields_()  {

  let personFields = [];
  
  let keys_addresses = ["type", "streetAddress", "extendedAddress", "city", "postalCode", "country"];
  personFields.push({"apiName": "addresses", "svName": "adresser", "keys": keys_addresses, "removeValueEmpty": false});

  let keys_biographies = ["value", "contentType"];
  personFields.push({"apiName": "biographies", "svName": "anteckningar", "keys": keys_biographies, "removeValueEmpty": true});

  let keys_names = ["givenName", "familyName"];
  personFields.push({"apiName": "names", "svName": "namn", "keys": keys_names, "removeValueEmpty": false});

  let keys_nicknames = ["value"];
  personFields.push({"apiName": "nicknames", "svName": "smeknamn", "keys": keys_nicknames, "removeValueEmpty": true});

  let keys_emailAddresses = ["value", "type"];
  personFields.push({"apiName": "emailAddresses", "svName": "e-postadresser", "keys": keys_emailAddresses, "removeValueEmpty": true});

  let keys_genders = ["value"];
  personFields.push({"apiName": "genders", "svName": "kön", "keys": keys_genders, "removeValueEmpty": true});

  let keys_organizations = ["type", "current", "name", "department", "title"];
  personFields.push({"apiName": "organizations", "svName": "organisation", "keys": keys_organizations, "removeValueEmpty": false});

  let keys_phoneNumbers = ["value", "type"];
  personFields.push({"apiName": "phoneNumbers", "svName": "telefonnummer", "keys": keys_phoneNumbers, "removeValueEmpty": true});

  let keys_relations = ["person", "type"];
  personFields.push({"apiName": "relations", "svName": "relationer", "keys": keys_relations, "removeValueEmpty": true});

  return personFields;
}


/**
 * Kollar om ett visst kontaktfält skiljer sig mellan nuvarande kontakt och ett kontaktobjekt
 * 
 * @param {Objekt} connection - Persondata för en kontakt som redan finns
 * @param {Objekt} memberDataContactResource - Ett objekt av typen Person med kontaktinfo för en person
 * @param {Objekt} personField - Objekt med information om ett specifikt kontaktfält
 * 
 * @returns {Boolean} - Sant eller falskt om kontaktfältet skiljer sig åt
 */
function checkDifference_(connection, memberDataContactResource, personField) {

  let nameOfPersonField = personField.apiName;

  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction_(connectionObject, memberDataContactResource, nameOfPersonField, personField.removeValueEmpty);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    //En första koll om det är någon förändring true eller false. T.ex nytt attribut
    return tmpObject.status;
  }

  let memberData = tmpObject.memberData;
  
  let keys = personField.keys;
  let tmpArray = makeArrayOfFilteredConnectionObject_(connectionObject, keys); 

  return checkDifferenceMemberInfo_(tmpArray, memberData, nameOfPersonField);
}


/**
 * Kollar om kontaktfältet för födelsedag skiljer sig mellan nuvarande kontakt och ett kontaktobjekt
 * 
 * @param {Objekt} connection - Persondata för en kontakt som redan finns
 * @param {Objekt} memberDataContactResource - Ett objekt av typen Person med kontaktinfo för en person
 * 
 * @returns {Boolean} - Sant eller falskt om födelsedagarna skiljer sig åt
 */
function checkDifferenceBirthdays_(connection, memberDataContactResource) {

  let nameOfPersonField = "birthdays";
  
  let connectionObject = connection[nameOfPersonField];
  let tmpObject = checkDifferenceHelpfunction_(connectionObject, memberDataContactResource, nameOfPersonField, false);
  if ('status' in tmpObject) {
    Logger.log("status är definerad i objektet som " + tmpObject.status);
    //En första koll om det är någon förändring true eller false. T.ex nytt attribut
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
  
  return checkDifferenceMemberInfo_(tmpArray, tmpMemberData, nameOfPersonField);
}


/**
 * Skapar lista av objekt för en typ av kontaktfält för en kontakt
 *
 * @param {Objekt[]} connectionObject - Data för ett kontaktfält för en kontakt som redan finns
 * @param {String[]} keys - Namn på attribut för ett visst kontaktfält
 * 
 * @returns {Objekt[]} - Lista av objekt för en typ av kontaktfält för en kontakt
 */
function makeArrayOfFilteredConnectionObject_(connectionObject, keys) {
  
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


/**
 * @param {Objekt[]} connectionObject - Data för ett kontaktfält för en kontakt som redan finns
 * @param {Objekt} memberDataContactResource - Ett objekt av typen Person med kontaktinfo för en person
 * @param {String} nameOfPersonField - Namn på ett kontaktfält
 * @param {Boolean} removeValueEmpty - Om fältet ska tas bort om det är tomt
 * 
 * @returns {Objekt} - Ett objekt med attributet memberData med kontaktinfo för det angivna kontaktfältet
 */
function checkDifferenceHelpfunction_(connectionObject, memberDataContactResource, nameOfPersonField, removeValueEmpty)  {
  
  let memberData = memberDataContactResource[nameOfPersonField];
  if (removeValueEmpty) {
    memberData = removeElementsWithValueOrPersonEmpty_(memberData);
  }

  Logger.log("Funktion för jämförelse av " + nameOfPersonField);
  Logger.log(connectionObject);
  Logger.log(memberData);

  if (null == connectionObject) { //Inget inlagt på kontakten i Google
    if (0 == memberData.length) { //Tomt med data för kontaktfältet från Scoutnet
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


/**
 * Tar bort objekt från en lista av objekt för de objekt som inte har
 * något attribut med värde för antingen attributen value eller person.
 * Detta görs för att ta bort tomma kontaktfält från svaret som ges vid
 * anrop mot Google för att kunna jämföra med ny data.
 * 
 * @param {Objekt[]} memberData - Lista av objekt för en kontaktfältstyp för en kontakt
 * 
 * @returns {Objekt[]} - Lista av objekt för ett kontaktfältstyp för en kontakt
 */
function removeElementsWithValueOrPersonEmpty_(memberData) {

  let newMemberData = [];
  for (let i = 0; i < memberData.length; i++) {
    if (memberData[i].value || memberData[i].person)  {
      newMemberData.push(memberData[i]);
    }
  }
  return newMemberData;
}


/**
 * Jämför listor av objekt bestående av kontaktfältsattribut och deras värden och
 * kollar om de är olika.
 * 
 * @param {Objekt[]} tmpArray - Lista av objekt för en typ av kontaktfält för en kontakt
 * @param {Objekt[]} memberData - Lista av objekt med medlemsdata för en typ av kontaktfält för en medlem
 * @param {String} nameOfPersonField - Namn på ett specifikt kontaktfält
 * 
 * @returns {Boolean} - Sant eller falskt om det är skillnad på nuvarande kontaktdata och den som ska vara
 */
function checkDifferenceMemberInfo_(tmpArray, memberData, nameOfPersonField)  {

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


/**
 * Ger ett objekt för en kontaktresurs givet medlemsdata
 * 
 * @param {Objekt} memberData - Persondata för en medlem
 * @param {String} customEmailField - Namn på eget kontaktfält för e-post att använda
 * 
 * @returns {Objekt} - Ett objekt av typen Person med kontaktinfo för en person
 */
function makeContactResource_(memberData, customEmailField)  {
  
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
    "externalIds": [{
        "value": memberData.member_no,
        "type": "Medlemsnummer"
    }],
    "genders": [{
        "value" : memberData.sex
    }],
    "organizations": [{
      "type": "Scoutkår",
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


/**
 * Skapar en kontakt givet medlemsdata
 * 
 * @param {Objekt} memberData - Persondata för en medlem
 * @param {String} customEmailField - Namn på eget kontaktfält för e-post att använda
 * 
 * @returns {Objekt} - Ett objekt av typen Person med kontaktinfo för en person
 */
function createContact_(memberData, customEmailField)  {

  let contactResource = makeContactResource_(memberData, customEmailField);
  //Logger.log("contactResource");
  //Logger.log(contactResource);

  for (let n=0; n<6; n++) {
    Logger.log("Funktionen createContact körs " + n);
    
    try {
      let peopleResource = People.People.createContact(contactResource);
      Logger.log(peopleResource);
      return peopleResource;
    }
    catch (e) {
      Logger.log("Problem med att anropa People.People med:" + contactResource);
      if (n == 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/*
 * Radera en kontakt
 * 
 * @param {String} kontakt - Objekt av typen Contact att radera 
 */
function deleteContactOld(kontakt)  {

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


/**
 * Ger info om en specifik kontaktgrupp och dess kommande kontakter
 * 
 * @param {Objekt[]} nyaKontakter - Lista med info och e-postadresser för kommande kontaktgrupper
 * @param {String} namn - Namn för den kontaktgrupp att söka efter
 * @param {String} prefixContactgroups - Prefix för kontaktgrupper som synkroniseras
 * 
 * @returns {Objekt[]} - Lista med info och medlemsnummer för aktuell kommande kontaktgrupp
 */
function getNewContactGroupInfo_(nyaKontakter, namn, prefixContactgroups)  {

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
 * @param {String} prefixContactgroups - Prefix för kontaktgrupper som synkroniseras
 * 
 * @returns {Objekt[]} - Lista av Objekt med kontaktgruppsinformation
 */
function createAndDeleteContactGroups_(gamlaKontaktGrupper, nyaKontaktGrupper, prefixContactgroups) {

  Logger.log("Skapar nya kontaktgrupper och tar bort gamla");

  let nameOfOldContactGroups = getNameOfContactGroups_(gamlaKontaktGrupper);

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
    if (!nameOfToBeContactGroups.includes(nameOfOldContactGroups[i])) {
      Logger.log("Ta bort denna grupp " + gamlaKontaktGrupper[i].name);
      deleteContactGroup_(gamlaKontaktGrupper[i]);
    }
  }

  //Skapa nya kontaktgrupper som ska finnas
  for (let i = 0; i < nameOfToBeContactGroups.length; i++) {
    if (!nameOfOldContactGroups.includes(nameOfToBeContactGroups[i])) {
      let group = createContactGroup_(nameOfToBeContactGroups[i]);
    }
  }
  return getContactGroups_(prefixContactgroups);
}


/**
 * Ger lista med namn över de kontaktgrupper som anges
 * 
 * @param {Objekt[]} gamlaKontaktGrupper - Lista av Objekt med kontaktgruppsinformation
 * 
 * @returns {String[]} nameOfContactGroups - Lista med namnen på angivna kontaktgrupper
 */
function getNameOfContactGroups_(kontaktgrupper) {

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
function deleteContactGroup_(contactGroup) {

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
function createContactGroup_(namn) {

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
function getContactGroup_(contactGroup) {

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
 * @param {String} prefixContactgroups - Prefix för kontaktgrupper som synkroniseras
 * 
 * @returns {Objekt[]} - Lista av Objekt med kontaktgruppsinformation
 */
function getContactGroups_(prefixContactgroups) {

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

/**
 * Ta bort dubletter från en lista
 * @param {string[] | number[] | Object[]} - lista
 * @returns {string[] | number[] | Object[]} - lista
 */
function removeDublicates_(list) {
  let tmp_array = []
  Logger.log("Försöker radera dubletter");
    for(let i = 0;i < list.length; i++){
      if(tmp_array.indexOf(list[i]) == -1){
        tmp_array.push(list[i])
        //Logger.log("Denna är ny " + list[i]);
      }
      else {
        //Logger.log("Hittade dublett av " + list[i]);
      }
    }
  return tmp_array;
}
