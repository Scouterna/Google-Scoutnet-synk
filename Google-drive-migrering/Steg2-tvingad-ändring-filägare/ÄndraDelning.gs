/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Funktion för ta bort att filer delas via länk och ta bort redigerare så att
 * bara du själv och den som äger filen har tillgång till den
 */
function removeShareSettings() {
  
  var emailOfAdmin = "webmaster@dinegnascoutkår.se";
  
  var domain = "dinegnascoutkår.se";
  
  //Mappen vi ska leta filer i
  //T.ex https://drive.google.com/drive/u/0/folders/qwer-asdfghjklzxcvbnmqwertyuio
  var folderId = "qwer-asdfghjklzxcvbnmqwertyuio";


  if (!emailOfAdmin.endsWith(domain)) {
    Logger.log("Felaktig domän på e-postadress!!");
    return;
  }
  
  //Din e-postadress för att veta vilka filer/mappar vi kan ändra ägare på
  var yourEmail = Session.getActiveUser().getEmail();
  Logger.log("Din e-post " + yourEmail);

  var emailOfNewEditors = [];
  emailOfNewEditors.push(emailOfAdmin);
  emailOfNewEditors.push(yourEmail);  
  
  var listErrorAccess = [];

  //Anropar functionen som ska byta ägare på alla filer
  changeFileAndFolderShareSettings(folderId, emailOfNewEditors, listErrorAccess);

  var uniqueListErrorAccess = listErrorAccess.filter(onlyUnique);
  Logger.log("**************");
  Logger.log("Mappar/filer där det inte riktigt gick att ta bort länkdelning är listade nedan om det finns några");
  Logger.log("Detta kan vara för att mappen har annan behörighet för de inom kåren t.ex");
  Logger.log("Testa gå in i den mappen via drive i webbläsaren och ändra för den som är listad först och kör sen prgrammet igen");
  Logger.log(uniqueListErrorAccess);
}


/**
 * Rekursiv funktion för att ändra delnings- och redigerarbehörighet
 * givet en mapp och dess filer och undermappar
 * 
 * @param {string} folderId - Id för en Google-mapp
 * @param {string[]} emailOfNewEditors - Lista över de som fortsatt ska ha behörighet förutom ägaren
 * @param {string[]} listErrorAccess - Lista över de mappar och filer som ej går att ändra all behörighet på
 */
function changeFileAndFolderShareSettings(folderId, emailOfNewEditors, listErrorAccess) {

  //Hämta mappen vi ska leta filer i
  var folder = DriveApp.getFolderById(folderId);
  
  if (!folder) {
    Logger.log("Du kör fel funktion!!");
    return;
  }
  
  //Hämta alla filer som finns i denna mapp
  var files = folder.getFiles();  
  
  while(files.hasNext()) {
    try {
      //Kollar nästa fil
      var file = files.next();
      
      //Vad filen heter
      var fileName = file.getName();

      try {
        var oldSharingAccess = file.getSharingAccess();
        Logger.log(fileName + " " + oldSharingAccess);
        if ("PRIVATE"!=oldSharingAccess)  {
          file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.EDIT);
          Logger.log(fileName + " delas nu ENDAST till de som är specificerade");
        }        
      }
      catch (e) {
        listErrorAccess.push("Fil - " + file);
        Logger.log(e.message);
      }
      removeEditors(file, emailOfNewEditors);          
    }    
    catch(e) {
      Logger.log("Problem med fil: " + e);
    }    
  }

  //Hämta alla undermappar som finns i denna mapp
  var childFolders = folder.getFolders();  
  
  while(childFolders.hasNext()) {
    try {
      //Kollar nästa mapp
      var childFolder = childFolders.next();
      
      //Vad mappen heter
      var childName = childFolder.getName();
      
      //Vilket id som mappen har
      var childId = childFolder.getId();
           
      try {
        var oldSharingAccess = childFolder.getSharingAccess();
        Logger.log(childName + " " + oldSharingAccess);
        if ("PRIVATE"!=oldSharingAccess)  {
          childFolder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.EDIT);
          Logger.log(childName + " delas nu ENDAST till de som är specificerade");
        }        
      }
      catch (e) {
        listErrorAccess.push("Mapp - " + childName);
        Logger.log(e.message);
      }

      removeEditors(childFolder, emailOfNewEditors);
      
      changeFileAndFolderShareSettings(childId, emailOfNewEditors, listErrorAccess);
    }    
    catch(e) {
      Logger.log("Problem med mapp: " + e);
    }    
  }  
}


/**
 * Funktion för att ta bort redigerare till en mapp eller fil
 * 
 * @param {string} driveEntry - Ett fil- eller mapp-objekt
 * @param {string[]} emailsToSave - Lista över e-postadresser som ej ska tas bort som redigerare
 */
function removeEditors(driveEntry, emailsToSave) {
  
  try {
    var owner = driveEntry.getOwner().getEmail();
    var name = driveEntry.getName();
    Logger.log(name + "  " + owner);

    var listOfEditors = driveEntry.getEditors();
    
    for (var i = 0; i < listOfEditors.length; i++) {
      
      if (!emailsToSave.includes(listOfEditors[i].getEmail())) {

        driveEntry.removeEditor(listOfEditors[i].getEmail());
        Logger.log("-  " + listOfEditors[i].getEmail() + " borttagen");
      }
      else {
        Logger.log("-  " + listOfEditors[i].getEmail() + " ska lämnas kvar som editor");
      }      
    }  
  }  
  catch (e) {        
    Logger.log(e.message);
  }
}
