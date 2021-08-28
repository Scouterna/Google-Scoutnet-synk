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


  let contactsRemovedFromContactGroups = createAndUpdateContactsPeopleAPI(kontaktgrupper, nyaKontaktGrupper);
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
  for (var i = 0; i < contactsRemovedFromContactGroups.length; i++) {
    var contact = contactsRemovedFromContactGroups[i];
    Logger.log("Kollar kontakten " + contact.getPrimaryEmail());

    var contactGroups = contact.getContactGroups();

    if (checkIfContactInAnyNonSystemGroup(contactGroups)) {
      Logger.log("Denna kontakt är fortfarande med i en kontaktgrupp " + contactGroups[0].getName());
    }
    else  {
      var scoutnetEmail = contact.getEmails(customEmailField)[0];
      
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

  for (var i = 0; i < kontaktGrupper.length; i++) {

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


function createAndUpdateContactsPeopleAPI(kontaktGrupper, nyaKontakter)  {

  let contactsRemovedFromContactGroups = [];

  let connections;

  let resourceNamesAlreadyProcessed = [];

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
    var kontaktGruppInfo = getNewContactGroupInfo(nyaKontakter, kontaktGruppNamn);
    Logger.log("Hämta lista över vilka som ska vara med i kontaktgruppen");
    Logger.log(kontaktGruppInfo);

    var kontaktGruppMemberNumbersList = getContactGroupMemberNumbers(kontaktGruppInfo);
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

        connections = updateListOfConnections();  //Ej anropa hela tiden. FIXME
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
    var contactGroupModifyResource = People.ContactGroups.Members.modify({
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
      Logger.log("medlemsdata");
      Logger.log(allMembers[i]);
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
function updateListOfConnections() {
  
  let listOfConnections = [];

  let pageToken, page;
  do {
    page =  People.People.Connections.list('people/me', {
      pageToken: pageToken,
      pageSize: 25,
      personFields: 'names,emailAddresses,externalIds'
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
                  memberNumber: externalId.value
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


function checkIfContactWithMemberNumberExistsOld(memberNumber) {
  //Kom ihåg att förtag är kårnamn/medlemsnummer
  
  var memberNumber = "12345";

  for (var n=0; n<6; n++) {
    Logger.log("Funktionen checkIfContactWithMemberNumberExists körs " + n);
    
    try {
      //Bör rensa cachen enligt dokumentationen
      let people = People.People.searchContacts({
        query: "",
        readMask: "emailAddresses,externalIds"
      });

      //Lägg in en vila här enligt dok
      Logger.log(people);
      let query = groupName + "/" + memberNumber;

      people = People.People.searchContacts({
        query: query,
        readMask: "emailAddresses,externalIds"
      });

      let results = people.results;
      Logger.log(results);

      //Kolla igenom alla sökresultat och se om det finns en kontakt redan
      for (let i = 0; i < results.length; i++) {

        let externalIds = results[i].person.externalIds;

        if (externalIds !== undefined) {
          for (let k = 0; k < externalIds.length; k++) {
            if (externalIds[k].value == memberNumber && externalIds[k].type == "Medlemsnummer") {
              Logger.log("Membernumber to check " + memberNumber);
              let resourceName = results[i].person.resourceName;
              
              Logger.log("ResourceName");
              Logger.log(resourceName);
              return resourceName;
            }
          }
        }
      }
      Logger.log("Finns ingen kontakt sedan innan med detta medlemsnummer");
      return false;
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
  
  var group = People.People.getBatchGet({
      resourceNames: resourceNames,
      personFields: "emailAddresses,externalIds"
    });

  return group.responses;
}


/*
 * Skapar nya kontakter och lägger till gamla i rätt kontaktgrupper
 * 
 * @param {Object[]} - Lista av Objekt av typen ContactGroup med nuvarande kontaktgrupper
 * @param {Object[]} - Lista av listor med information över de kontakt som ska finnas
 * 
 * @returns {Object[]} - Lista av Objekt av typen Contact med de kontakter som tagits bort
 * från någon kontaktgrupp
 */
function createAndUpdateContacts(kontaktGrupper, nyaKontakter)  {

  var contactsRemovedFromContactGroups = [];

  //Loop och gå igenom varje kontaktgrupp
  for (var i = 0; i < kontaktGrupper.length; i++) {
    
    //Namn på aktuell kontaktgrupp
    var kontaktGruppNamn = kontaktGrupper[i].getName();
    Logger.log("Namn på aktuell kontaktgrupp " + kontaktGruppNamn);

    //Hämta vilka som är med i kontaktgruppen just nu
    var kontaktLista = kontaktGrupper[i].getContacts();

    Logger.log(nyaKontakter);
    //Hämta lista vilka som ska vara med i kontaktgruppen
    var kontaktGruppInfo = getNewContactGroupInfo(nyaKontakter, kontaktGruppNamn);
    Logger.log("Hämta lista över vilka som ska vara med i kontaktgruppen");
    Logger.log(kontaktGruppInfo);
    var kontaktGruppEmailList = getContactGroupEmails(kontaktGruppInfo);
    Logger.log(kontaktGruppEmailList);

    var kontaktListaEmailList = [];

    //Loop - de som är med i kontaktgruppen nu men inte ska. Ska tas bort från gruppen
    Logger.log("Loopa igenom vilka som ska tas bort från kontaktgruppens");
    //Loop och gå igenom varje kontaktlista
    for (var n = 0; n < kontaktLista.length; n++) {
      var primaryEmail = kontaktLista[n].getPrimaryEmail();
      Logger.log("Primär e-postadress " + primaryEmail);

      if (null == primaryEmail || !contains(kontaktGruppEmailList, primaryEmail)) {
        Logger.log("Ska tas bort från kontaktgruppen");
        removeContactFromContactGroup(kontaktGrupper[i], kontaktLista[n]);
        contactsRemovedFromContactGroups.push(kontaktLista[n]);
      }
      else  {
        kontaktListaEmailList.push(primaryEmail);
      }
    }

    //Loop - de som inte är med i kontaktgruppen ska läggas till. Om konto saknas ska det skapas
    Logger.log("Loopa igenom vilka som ska läggas till i kontaktgruppen");
    for (var n = 0; n < kontaktGruppEmailList.length; n++) {

      if (!contains(kontaktListaEmailList, kontaktGruppEmailList[n])) {

        var contact = checkIfContactWithScoutnetEmailExists(kontaktGruppEmailList[n]);
        Logger.log("Contact " + contact);
        if (contact)  {
          Logger.log("Lägg till kontakten " + kontaktGruppEmailList[n] + " i gruppen");
        }
        else {          
          Logger.log("Skapa kontakten " + kontaktGruppEmailList[n] + " och lägg till i gruppen");
          contact = createContact(kontaktGruppEmailList[n]);
        }
        addContactToContactGroup(kontaktGrupper[i], contact);
      }
    }
  }
  return contactsRemovedFromContactGroups;
}


function createContact(memberData)  {
  
  //let avatar_updated = "avatar_updated";
  //let avatar_url = "avatar_url";

  var contactResource = {
    "addresses": [{
      "type": "home",
      "streetAddress": memberData.streetAddress,
      "extendedAddress": memberData.extendedAddress,
      "city": memberData.town,
      "postalCode": memberData.postcode,
      "country": memberData.county
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
      "type": "mobile"
    },{
      "value": memberData.contact_home_phone,
      "type": "home"
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

  var peopleResource = People.People.createContact(contactResource);

  Logger.log(peopleResource);

  return peopleResource;
}


/*
 * Radera en kontakt
 * 
 * @param {String} kontakt - Objekt av typen Contact att radera 
 */
function deleteContact(kontakt)  {

  for (var n=0; n<6; n++) {
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
 * Lägg till en kontakt till en kontaktgrupp
 * 
 * @param {Object} kontaktGrupp - Aktuell kontaktgrupp
 * @param {Object} kontakt - Kontakt att lägga till i kontaktgruppen
 * 
 * @returns {Object} - Objekt av typen ContactGroup för uppdaterad kontaktgrupp
 */
function addContactToContactGroup(kontaktGrupp, kontakt)  {

  for (var n=0; n<6; n++) {
    Logger.log("Funktionen addContactToContactGroup körs " + n);
    
    try {
      var contactGroup = kontaktGrupp.addContact(kontakt);
      Logger.log("Lägga till kontakten i kontaktgruppen");
      return contactGroup;
    }
    catch (e) {
      Logger.log("Problem med att anropa ContactsApp med funktionen addContact");
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

  var contacts = ContactsApp.getContactsByEmailAddress(email, customEmailField);
  for (var i = 0; i < contacts.length; i++) {
    //Logger.log("email " + email);
    var scoutnetEmail = contacts[i].getEmails(customEmailField)[0];
    if (scoutnetEmail.isPrimary()) {
      return contacts[i];
    }
  }
  return false;
}


/*
 * Ta bort en kontakt från en kontaktgrupp
 * 
 * @param {Object} kontaktGrupp - Aktuell kontaktgrupp
 * @param {Object} kontakt - Kontakt att ta bort från kontaktgruppen
 * 
 * @returns {Object} - Objekt av typen ContactGroup för uppdaterad kontaktgrupp
 */
function removeContactFromContactGroup(kontaktGrupp, kontakt)  {

  for (var n=0; n<6; n++) {
    Logger.log("Funktionen removeContactFromContactGroup körs " + n);
    
    try {
      var contactGroup = kontaktGrupp.removeContact(kontakt);
      Logger.log("Ta bort kontakten från kontaktgruppen");
      return contactGroup;
    }
    catch (e) {
      Logger.log("Problem med att anropa ContactsApp med funktionen removeContact");
      if (n == 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
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
  var nameOfContactGroups = [];

  for (var i = 0; i < kontaktgrupper.length; i++) {
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

  for (var n=0; n<6; n++) {
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

  for (var n=0; n<6; n++) {
    Logger.log("Funktionen createContactGroup körs " + n);
    
    try {
      var contactGroupResource = {
        "contactGroup": {
          "name": namn
        }
      };

      var group = People.ContactGroups.create(contactGroupResource);
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

  for (var n=0; n<6; n++) {
    Logger.log("Funktionen getContactGroup körs " + n);
    
    try {
      var group = People.ContactGroups.get(contactGroup.resourceName,
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
  for (var i = 0; i < a.length; i++) {
    if (a[i] === obj) {
      return true;
    }
  }
  return false;
}
