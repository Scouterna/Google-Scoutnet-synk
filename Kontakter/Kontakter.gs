/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


var url = 'https://script.google.com/macros/s/lsdkldksjpjfdspjdsf/exec';
  
var username = "info@scoutkar.se";

var password = "12345";



var prefixContactgroups = "Scoutnet - ";

var customEmailField = "Scoutnet";


/**
 * Huvudfunktion för att hantera synkronisering av kontaktgrupper med Scoutnet
 */
function Kontakter() {
  
  let userParam = "?username=" + username + "&password=" + password;
  let response = UrlFetchApp.fetch(url+userParam);
  let nyaKontaktGrupper = JSON.parse(response);

  Logger.log(nyaKontaktGrupper);

  let kontaktgrupper = getContactGroups();
  kontaktgrupper = createAndDeleteContactGroups(kontaktgrupper, nyaKontaktGrupper);

  let contactsRemovedFromContactGroups = createAndUpdateContacts(kontaktgrupper, nyaKontaktGrupper);

  deleteOldContacts(contactsRemovedFromContactGroups);
}


/**
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


/**
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


/**
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
    var kontaktGruppInfo = getContactGroupInfo(nyaKontakter, kontaktGruppNamn);
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


/**
 * Skapa en kontakt och lägg till i en kontaktgrupp
 * 
 * @param {String} email - E-postadress
 * 
 * @returns {Object} - Objekt av typen Contact för skapad kontakt
 */
function createContact(email)  {

  for (var n=0; n<6; n++) {
    Logger.log("Funktionen createContact körs " + n);
    
    try {
      var contact = ContactsApp.createContact('', '', '');
      var emailField = contact.addEmail(customEmailField, email);
      emailField.setAsPrimary();
      Logger.log("Skapa kontakten");
      return contact;
    }
    catch (e) {
      Logger.log("Problem med att anropa ContactsApp");
      if (n == 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
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


/**
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


/**
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


/**
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


/**
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
 * @param {Object[]} nyaKontakter - Lista med info och e-postadresser för kommande kontaktgrupper
 * @param {String} namn - Namn för den kontakgrupp att söka efter
 * 
 * @returns {Object[]} - Lista med info och e-postadresser för aktuell kommande kontaktgrupp
 */
function getContactGroupInfo(nyaKontakter, namn)  {

  for (var i = 0; i < nyaKontakter.length; i++) {

    var tmpNamn = prefixContactgroups + nyaKontakter[i][0].name;
    if (tmpNamn == namn)  {
      return nyaKontakter[i];
    }
  }
}


/**
 * Skapar nya kontaktgrupper och tar bort inaktuella kontaktgrupper
 * 
 * @param {Object[]} - Lista av Objekt av typen ContactGroup med nuvarande kontaktgrupper
 * @param {Object[]} - Lista av listor med information över de kontaktgrupper som ska finnas
 * 
 * @returns {Object[]} - Lista av Objekt av typen ContactGroup
 */
function createAndDeleteContactGroups(gamlaKontaktGrupper, nyaKontaktGrupper) {

  Logger.log("Skapar nya kontaktgrupper och tar bort gamla");
  
  var nameOfOldContactGroups = getNameOfContactGroups(gamlaKontaktGrupper);

  var nameOfToBeContactGroups = [];

  for (var i = 0; i < nyaKontaktGrupper.length; i++) {
    nameOfToBeContactGroups.push(prefixContactgroups + nyaKontaktGrupper[i][0].name);
  }
  Logger.log("Namn på de kontaktgrupper som redan finns");
  Logger.log(nameOfOldContactGroups);

  Logger.log("Namn på kontaktgrupper som ska finnas");
  Logger.log(nameOfToBeContactGroups);

  //Ta bort de kontaktgrupper som ej ska finnas
  for (var i = 0; i < nameOfOldContactGroups.length; i++) {
    if (!contains(nameOfToBeContactGroups, nameOfOldContactGroups[i])) {
      deleteContactGroup(nameOfOldContactGroups[i]);
    }
  }

  //Skapa nya kontaktgrupper som ska finnas
  for (var i = 0; i < nameOfToBeContactGroups.length; i++) {
    if (!contains(nameOfOldContactGroups, nameOfToBeContactGroups[i])) {
      var group = createContactGroup(nameOfToBeContactGroups[i]);
    }
  }
  return getContactGroups();
}


/**
 * Ger lista med namn över de kontaktgrupper som skickas in
 * 
 * @param {Object[]} kontaktgrupper - Lista av Objekt av typen ContactGroup
 * 
 * @returns {String[]} nameOfContactGroups - Lista med namnen på angivna kontaktgrupper
 */
function getNameOfContactGroups(kontaktgrupper) {

  Logger.log("Skapar lista med namn över kontaktgrupper");
  var nameOfContactGroups = [];

  for (var i = 0; i < kontaktgrupper.length; i++) {
    nameOfContactGroups.push(kontaktgrupper[i].getName());
    //Logger.log(nameOfContactGroups[i]);
  }
  return nameOfContactGroups;
}


/**
 * Ta bort en kontaktgrupp
 * 
 * @param {String} namn - namn för en kontaktgrupp att ta bort
 */
function deleteContactGroup(namn) {

  for (var n=0; n<6; n++) {
    Logger.log("Funktionen deleteContactGroup körs " + n);
    
    try {
      var group = ContactsApp.getContactGroup(namn);
      ContactsApp.deleteContactGroup(group);
      Logger.log("Tagit bort bort kontaktgruppen " + namn);
      return;
    }
    catch (e) {
      Logger.log("Problem med att anropa ContactsApp med:" + namn);
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

  //Kollar om  kontaktgruppen redan finns
  if (null != getContactGroup(namn))  {
    Logger.log("Kontaktgruppen finns redan och skapas därmed ej");
    return;
  }
  for (var n=0; n<6; n++) {
    Logger.log("Funktionen createContactGroup körs " + n);
    
    try {
      var group = ContactsApp.createContactGroup(namn);
      Logger.log("Skapat kontaktgruppen " + namn);
      return group;
    }
    catch (e) {
      Logger.log("Problem med att anropa ContactsApp med:" + namn);
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
 * @param {String} namn - namn för en kontaktgrupp att hämta
 * 
 * @returns {Object} - Objekt av typen ContactGroup för hämtad kontaktgrupp
 */
function getContactGroup(namn) {

  for (var n=0; n<6; n++) {
    Logger.log("Funktionen getContactGroup körs " + n);
    
    try {
      var group = ContactsApp.getContactGroup(namn);
      Logger.log("Hämtat kontaktgruppen " + namn);
      return group;
    }
    catch (e) {
      Logger.log("Problem med att anropa ContactsApp med:" + namn);
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
 * @returns {Object[]} - Lista av Objekt av typen ContactGroup
 */
function getContactGroups() {

  Logger.log("Hämtar lista över alla kontaktgrupper som finns just nu");

  var groups  = ContactsApp.getContactGroups();
  var groupsToSync = [];

  for (var i = 0; i < groups.length; i++) {
    if (groups[i].getName().startsWith(prefixContactgroups)) {
      Logger.log(groups[i].getName());
      groupsToSync.push(groups[i])
    }
  } 
  return groupsToSync;
}


/**
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
