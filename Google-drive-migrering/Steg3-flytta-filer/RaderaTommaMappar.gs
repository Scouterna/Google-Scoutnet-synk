/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Funktion för att radera tomma undermappar till en mapp
 */
function removeEmptyFolders() {

  //Mappen vi ska leta filer i
  //T.ex https://drive.google.com/drive/u/0/folders/qwer-asdfghjklzxcvbnmqwertyuio
  var folderId = "qwer-asdfghjklzxcvbnmqwertyuio";
  
  //Din e-postadress för att veta vilka filer/mappar vi kan ändra ägare på
  var yourEmail = Session.getActiveUser().getEmail();
  Logger.log("Din e-post " + yourEmail);

  //Anropar functionen som ska byta ägare på alla filer
  searchForEmptyFoldersToRemove(folderId, yourEmail);
}


/**
 * Rekursiv funktion för att söka igenom filer i aktuell mapp
 * och sen ta en titt i nästa mapp osv.
 * 
 * @param {string} folderId - Id för en Google-mapp
 * @param {string} yourEmail - Din e-postadress som kör skriptet
 */
function searchForEmptyFoldersToRemove(folderId, yourEmail) {

  //Hämta mappen vi ska leta filer i
  var folder = DriveApp.getFolderById(folderId);

  if (!folder) {
    Logger.log("Du kör fel funktion!!");
    return;
  }

  //Hämta alla filer som finns i denna mapp
  var files = folder.getFiles();

  //Hämta alla undermappar som finns i denna mapp
  var childFolders = folder.getFolders();

  var hasChildFolder = false;
  while (childFolders.hasNext()) {
    try {
      hasChildFolder = true;
      //Kollar nästa mapp
      var childFolder = childFolders.next();

      //Vilket id som mappen har
      var childId = childFolder.getId();

      searchForEmptyFoldersToRemove(childId, yourEmail);
    }
    catch (e) {
      Logger.log("Problem med mapp: " + e);
    }
  } 
 
  if (!hasChildFolder && !files.hasNext()) {

    var owner = folder.getOwner().getEmail();

    if (owner == yourEmail) {
      Logger.log("Tom mapp som du äger " + folder.getName());
      try {
        Logger.log("Försöker radera mappen");
        folder.setTrashed(true);
        Logger.log("Lyckades radera mappen");        
      }
      catch (e) {
        Logger.log("Problem med mapp: " + e);
      }
    }
    else {
      Logger.log("Tom mapp som du inte äger " + folder.getName());
      try {
        Logger.log("Försöker ta bort mappen från din drive");
        folder.revokePermissions(yourEmail);
        Logger.log("Lyckades ta bort mappen från din drive");
      }
      catch (e) {
        Logger.log("Problem med mapp: " + e);
      }
    }
  }
}
