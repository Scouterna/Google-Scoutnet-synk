/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Anropa denna funktion om du vill få fram en lista över vilka
 * e-postadresser som äger en fil eller undermapp till angiven mapp
 */
function ListOwnerships() {

  //Mappen vi ska leta filer i
  //T.ex https://drive.google.com/drive/u/0/folders/qwer-asdfghjklzxcvbnmqwertyuio
  var folderId = "qwer-asdfghjklzxcvbnmqwertyuio";

  
  //Din e-postadress för att veta vilka filer/mappar vi kan ändra ägare på
  var yourEmail = Session.getActiveUser().getEmail();
  Logger.log("Din e-post " + yourEmail);  

  //Lista med de ägare för filer och mappar som hittats
  var listOfOwners = [];

  //Anropar functionen som ska byta ägare på alla filer
  listFileAndFolderOwnership(folderId, listOfOwners);

  var uniqueListOfOwners = listOfOwners.filter(onlyUnique);
  Logger.log("**************");
  Logger.log("Nedan är de olika ägare för tillhörande undermappar filer som finns");
  Logger.log(uniqueListOfOwners);
}


/**
 * Rekursiv funktion för att söka igenom filer i aktuell mapp
 * och sen ta en titt i nästa mapp osv.
 * 
 * @param {string} folderId - Id för en Google-mapp
 * @param {string[]} listOfOwners - Lista över fil och mappägare
 */
function listFileAndFolderOwnership(folderId, listOfOwners) {

  //Hämta mappen vi ska leta filer i
  var folder = DriveApp.getFolderById(folderId);

  if (!folder) {
    Logger.log("Du kör fel funktion!!");
    return;
  }

  //Hämta alla filer som finns i denna mapp
  var files = folder.getFiles();

  while (files.hasNext()) {
    try {
      //Kollar nästa fil
      var file = files.next();

      //Vad filen heter
      var fileName = file.getName();
      Logger.log(fileName);

      //Vem som äger filen
      var oldFileOwner = file.getOwner().getEmail();
      listOfOwners.push(oldFileOwner);
    }
    catch (e) {
      Logger.log("Problem med fil: " + e);
    }
  }


  //Hämta alla undermappar som finns i denna mapp
  var childFolders = folder.getFolders();

  while (childFolders.hasNext()) {
    try {
      //Kollar nästa mapp
      var childFolder = childFolders.next();

      //Vad mappen heter
      var childName = childFolder.getName();
      Logger.log(childName);

      //Vilket id som mappen har
      var childId = childFolder.getId();

      //Vem som äger mappen innan
      var oldChildFolderOwner = childFolder.getOwner().getEmail();
      listOfOwners.push(oldChildFolderOwner);

      listFileAndFolderOwnership(childId, listOfOwners);
    }
    catch (e) {
      Logger.log("Problem med mapp: " + e);
    }
  }
}


/**
 * Funktion för att returnera en ny lista med unika element
 * 
 * Anropas genom {string[]}.filter(onlyUnique);
 */
function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}
