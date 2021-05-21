/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/*
 * Huvudfunktion för att hantera synkronisering av användarkonton med Scoutnet
 */
function Anvandare() {
  
  var defaultOrgUnitPath = "/Scoutnet";
  var suspendedOrgUnitPath = defaultOrgUnitPath + "/" + "Avstängda";
  
  if ("group" == organisationType) {
    var allMembers = fetchScoutnetMembers(); //Alla medlemmar med alla attribut som finns i APIt för konton
    Logger.log("AllMembers.length by fetchScoutnetMembers = " + allMembers.length);
    Logger.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    Logger.log("Antal medlemmar i scoutnet = % " , allMembers.length);
  }
  
  var useraccounts = getGoogleAccounts(defaultOrgUnitPath);

  var defaultUserAvatar = getByteArrayOfDefaultImage();
  
  var MembersProcessed = [];
  
  for (var p = 0; p < userAccountConfig.length; p++) { //Gå igenom Listorna som är definierade i Konfiguration.gs, avsnitt "userAccountConfig"
    
    var scoutnetListId = userAccountConfig[p].scoutnetListId;
    var orgUnitPath = defaultOrgUnitPath;
    var membersincluded = [];
    var membersexcluded = [];
    
    if (userAccountConfig[p].orgUnitPath) {
      //Bara om man anger någon suborg så anger vi den, annars blir det knas med
      //sista snedstrecket      
      orgUnitPath = orgUnitPath + "/" + userAccountConfig[p].orgUnitPath;
    }
      
    Logger.log("----------------------------------");
    Logger.log("orgUnitPath = %s", orgUnitPath);
    Logger.log("Beskrivning: %s",userAccountConfig[p].description);
    
    createSuborganisationIfNeeded(orgUnitPath);
    
    var membersInAList;
    if (scoutnetListId) {
      membersInAList = fetchScoutnetMembersMultipleMailinglists(scoutnetListId, "", "");
    }
    else if ("group" == organisationType) { //Om man ej anger listId för en e-postlista; endast för kårer, ej distrikt
      membersInAList = getScoutleaders(allMembers);
    }
    Logger.log("MembersInAlist antal personer= " + membersInAList.length);

    for (var i = 0; i < membersInAList.length; i++) {  //Här Processas alla medlemmar
      Logger.log("**************");
      if(MembersProcessed.find(o => o == membersInAList[i].member_no)) {// Leta efter kontot i listan över redan processade konton
        Logger.log("Användaren är redan processad: " + membersInAList[i].first_name + " " + membersInAList[i].last_name);
      }
      else
      {
        Logger.log("Användaren ska processas: " + membersInAList[i].first_name + " " + membersInAList[i].last_name);
        MembersProcessed.push(membersInAList[i].member_no); //Lägg till kontot i listan över processade konton
        if ("group" == organisationType) { //Alla attribut endast för kårer, ej distrikt
          var obj = allMembers.find(obj => obj.member_no == membersInAList[i].member_no); //Leta upp kontot i listan övar alla konton
          //anledningen till att inte använda objektet från epostlistan är att det finns bara begränsad information i det objektet
        }
        else { //För distrikt
          var obj = membersInAList[i];
        }
        var GoUser = useraccounts.find(u => u.externalIds !== undefined && u.externalIds.some(extid => extid.type === "organization" && extid.value === obj.member_no)); // leta upp befintligt Googlekonto som representerar rätt objekt
        if(GoUser) {
        // Användaren fanns i listan
          const ia = useraccounts.length
          const indx = useraccounts.findIndex(v => v.id === GoUser.id);
          useraccounts.splice(indx, indx >= 0 ? 1 : 0); // radera kontot ut listan med alla googlekonto, när updtateringen av alla konto är klar skall resterande konto i denna lista avaktiveras.
          const ib = useraccounts.length
          Logger.log("Hittade Googleanvändaren %s, id=%s ",GoUser.name.fullName,GoUser.id);
          //Logger.log("Antal innan: %s, efter: %s",ia,ib );
          updateAccount(obj, GoUser, orgUnitPath, defaultUserAvatar) //uppdatera alla uppgifter på googlekontot med uppgifter från Scoutnet
        }
        else {
          Logger.log("Skapar Ny Googleanvändare");
          createAccount(obj, orgUnitPath); //Skapa Googlekonto för denna användare
        }
      }
    }
  }
  Logger.log("Googlekonton som är kvar: %s",  useraccounts.length);

  for (var goacc in  useraccounts) {
    Logger.log("Stänger av konto, id: %s, %s",useraccounts[goacc].id, useraccounts[goacc].name.fullName);
    suspendAccount(useraccounts[goacc], suspendedOrgUnitPath)
  }
}



/**
 * Skapar en underorganisation om den inte finns
 * En sökväg till en underorganisation som parameter
 * Om den ej finns så skapas den
 * Fungerar på flera nivåer om de ovan inte redan är skapade
 *
 * @param {string} orgUnitPath - Sökväg för en underorganisation
 */
function createSuborganisationIfNeeded(orgUnitPath) { 
  
  var index = orgUnitPath.lastIndexOf("/");
  var parentOrgUnitPath = orgUnitPath.substring(0, index);
  var name = orgUnitPath.substring(index+1, orgUnitPath.length);
  
  Logger.log("parentOrgUnitPath " + parentOrgUnitPath);
  Logger.log("Orgname " + name);
  
  if (!checkIfOrgUnitExists(parentOrgUnitPath)) {
    //Vi kollar om föräldra organisationen finns rekursivt, om ej så skapar vi den
    createSuborganisationIfNeeded(parentOrgUnitPath);
  }
  
  var boolOrgUnitExists = checkIfOrgUnitExists(orgUnitPath);
  if (!boolOrgUnitExists) {
    
    var orgUnit = {      
      name: name,
      parentOrgUnitPath: parentOrgUnitPath
    };
  
    try {
      AdminDirectory.Orgunits.insert(orgUnit, 'my_customer');
      Logger.log("Skapade orgUnit " + orgUnitPath);
    }
    catch (e) {
      Logger.log("Misslyckades att skapa orgUnit " + orgUnitPath);
      Logger.log("Fel " + e);
    }    
  }
}


/*
 * Kontrollera om en organisationsenhet med denna fulla sökväg existerar
 *
 * @param {string} orgUnitPath - Sökväg för en underorganisation
 *
 * @returns {boolean} - True eller false om underorganisationen existerar
 */
function checkIfOrgUnitExists(orgUnitPath) { 
  
  try {
    var page = AdminDirectory.Orgunits.list('my_customer', {
      orgUnitPath: orgUnitPath,
    });
    Logger.log("OrgUnit " + orgUnitPath + " finns");
    return true;
  }
  catch (e) {
    Logger.log("OrgUnit " + orgUnitPath + " finns ej, men borde skapas");
    return false;
  }  
}



/*
 * Gör namn redo för att vara en del i en användares e-postadress
 *
 * @param {string} name - Namn på en person
 *
 * @returns {string} - Namn på personen så det fungerar att ha i en e-postadress
 */
function makeNameReadyForEmailAdress(name) {
  
  var nameEmail = name.toLowerCase().trim(); //Ta bort tomma mellanrum vid start och slut och konvertera till gemener
  nameEmail = nameEmail.replace(/([\s])+/g, '.'); //Ersätt alla tommas mellanrum med en punkt (.)
  nameEmail = nameEmail.replace(/[.][\-]/g, '-').replace(/[\-][.]/g, '-'); //Om punkt följd av bindestreck eller tvärt om. Bara bindestreck i så fall.
  nameEmail = removeDiacritics (nameEmail);
  nameEmail = nameEmail.replace(/[^0-9a-z.\-]/gi, ''); //Ta bort om det inte är en engelsk bokstav eller nummer
  return nameEmail;
}


/*
 * Skapa ett Google användarkonto för en medlem
 *
 * @param {Object} member - Ett medlemsobjekt
 * @param {string} orgUnitPath - Sökväg till en underorganisation
 */
function createAccount(member, orgUnitPath) {
  
  var first_name = member.first_name;
  var first_name_email = makeNameReadyForEmailAdress(first_name);
  
  var last_name = member.last_name;
  var last_name_email = makeNameReadyForEmailAdress(last_name);
  
  var email = first_name_email + "." + last_name_email + "@" + domain; 
 
  if (checkIfEmailExists(email)) {
    
     for (var t = 1; t < 5; t++) { //Ska inte vara fler personer med samma namn. Programmet kraschar då med mening då något antagligen gått fel
       
        email = first_name_email + "." + last_name_email + t + "@" + domain;
       
        if (!checkIfEmailExists(email)) { //Skapa denna e-postadress
          break;          
        }       
     }    
  }  
   
  var user = {
    primaryEmail: email,
    name: {
      givenName: first_name,
      familyName: last_name
    },
    "externalIds": [
      {
        "value": member.member_no,
        "type": "organization"      
      }
    ],
    "orgUnitPath": orgUnitPath,    
    password: Math.random().toString(36) // Generera ett slumpat lösenord
  };
  user = AdminDirectory.Users.insert(user);
  
  Logger.log('Användare %s skapad.', user.primaryEmail);  
}


/*
 * Kontrollera om ett konto med denna e-postadress existerar
 * @param {string} email - En e-postadress inom kårens Google Workspace
 *
 * @returns {boolean} - True eller false om e-postadressen finns
 */
function checkIfEmailExists(email) {  
  
  var pageToken, page;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      query: email=email,
      orderBy: 'givenName',
      maxResults: 150,
      pageToken: pageToken
    });
    users = page.users;
    if (users) {
      Logger.log("Denna adress finns redan " + email);
      return true;      
    } else {
      Logger.log('Ingen användare hittades med ' + email);
      return false;
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  
}


/**
 * Ger en UTF-8 byte array för standardprofilbild om det finns
 * 
 * @returns {Byte[] | String} - Byte array för standardprofilbild eller tom sträng
 */
function getByteArrayOfDefaultImage() {
  return getByteArrayOfAnImage(defaultUserAvatarUrl);
}


/**
 * Ger en UTF-8 byte array för en bild givet en url alternativt
 * en tom sträng om bild ej finns
 * 
 * @param {String} url - Url för en bild
 * 
 * @returns {Byte[] | String} - Byte array för bild eller tom sträng
 */
function getByteArrayOfAnImage(url) {
  try {
    var blob = UrlFetchApp.fetch(url).getBlob();
    var data = Utilities.base64EncodeWebSafe(blob.getBytes());
    return data;
  }
  catch(err)  {
    Logger.log("--------------------------");
    Logger.log("Error: %s",err.message);
    Logger.log("--------------------------");
  }
  return "";
}


/**
 * Ger en UTF-8 byte array för en bild givet en url alternativt
 * om den ej finns så ges byte array för standardbild
 * 
 * @param {String} avatar_url - Url för en medlems bild i Scoutnet
 * @param {Byte[]} defaultAvatar - Byte array för standardbilden
 * 
 * @returns {Byte[]} - Byte array för den bild som ska användas
 */
function getByteArrayImageToUse(avatar_url, defaultAvatar) {

  if (avatar_url) {
    return getByteArrayOfAnImage(avatar_url);
  }
  return defaultAvatar;
}


/**
 * Ger en ett id för en medlems profilbild i Scoutnet alternativt
 * om den ej finns så ett id för standardbild
 * 
 * @param {String} avatar_updated - Id bild i Scoutnet
 * @param {Byte[]} defaultAvatar - Byte array för standardbilden
 * 
 * @returns {String} - Id för den bild som ska användas
 */
function getAvatarIdImageToUse(avatar_updated, defaultAvatar) {

  if (avatar_updated) {
    return avatar_updated;
  }
  return defaultAvatar.toString().substring(0,14);
}


/*
 * Uppdatera konto vid behov
 * Uppdatera namn, organisationssökväg och avbryt avstängning vid behov
 * 
 * @param {Object} member - Ett medlemsobjekt
 * @param {Object} useraccount - Ett Googlekontoobjekt
 * @param {string} orgUnitPath - Sökväg för en underorganisation
 * @param {Byte[]} defaultUserAvatar - Byte array för en standardbild
 */
function updateAccount(member, useraccount, orgUnitPath, defaultUserAvatar) {
    
  if ("district" == organisationType) {  //För distrikt som hämtar attribut via e-postlist-api:et då det är annat namn där
    member.contact_mobile_phone = member.mobile_phone;
  }
 
  var phnum = intphonenumber(member.contact_mobile_phone); // gör mobilnummret till internationellt nummer om möjligt
  var update = false;
  
  var phnum_recovery = "";
  if (validatePhonenumberForE164(phnum)) {
    phnum_recovery = phnum;
  }
  else {
    phnum_recovery = "";
  }
  
  var accountPrimaryPhoneNumber = "";
  if (typeof useraccount.phones !=='undefined' && useraccount.phones) {
    if (-1 != useraccount.phones.findIndex(phoneNumber => phoneNumber.type === "mobile" && phoneNumber.primary === true)) {
      accountPrimaryPhoneNumber = useraccount.phones.find(phoneNumber => phoneNumber.type === "mobile" && phoneNumber.primary === true).value;
    }
  }
  
  var accountKeywordAvatarUpdated = "";
  if (typeof useraccount.keywords !== 'undefined' && useraccount.keywords) {
    if (-1 != useraccount.keywords.findIndex(keyword => keyword.type === "custom" && keyword.customType === "avatar_updated")) {
      accountKeywordAvatarUpdated = useraccount.keywords.find(keyword => keyword.type === "custom" && keyword.customType === "avatar_updated").value;
    }
  }
  
  if (typeof syncUserAvatar === 'undefined' || !syncUserAvatar) {
    Logger.log("Ska ej synkronisera profilbild");
    member.avatar_updated = "";
  }
  
  var shouldBeKeywordAvatarUpdated = member.avatar_updated;
  if (!shouldBeKeywordAvatarUpdated)  {

    //Finns en länk till en standardbild att använda
    if (typeof defaultUserAvatar !=='undefined' && defaultUserAvatar) {
      shouldBeKeywordAvatarUpdated = defaultUserAvatar.toString().substring(0,14);
    }
  }

  if (typeof useraccount.thumbnailPhotoEtag !=='undefined') {
    shouldBeKeywordAvatarUpdated += useraccount.thumbnailPhotoEtag;
  }
  
  Logger.log("shouldBeKeywordAvatarUpdated " + shouldBeKeywordAvatarUpdated);
  Logger.log("accountKeywordAvatarUpdated  " + accountKeywordAvatarUpdated);
  //Logger.log("Avatar updated " + member.avatar_updated);
  Logger.log("Avatar url " + member.avatar_url);
  
  if ( useraccount.name.givenName != member.first_name 
      || useraccount.name.familyName != member.last_name 
      || useraccount.suspended 
      || useraccount.orgUnitPath != orgUnitPath  
      || ((useraccount.recoveryEmail != member.email) && (!(!useraccount.recoveryEmail && member.email==="")))
      || ((useraccount.recoveryPhone != phnum_recovery) && (member.contact_mobile_phone) && (typeof useraccount.recoveryPhone !=='undefined')) 
      || ((accountPrimaryPhoneNumber != phnum) && (member.contact_mobile_phone))
      || (accountKeywordAvatarUpdated != shouldBeKeywordAvatarUpdated))  {
    // Något behöver uppdateras
    
    Logger.log('Användare %s %s uppdateras', useraccount.name.givenName, useraccount.name.familyName);  

    var user = {} // skapa kontoobjekt med det som skall ändras
    
    if(useraccount.name.givenName!=member.first_name) {
      if (!user.name)
      {user.name = {}}
      Logger.log("Nytt förnamn: %s", member.first_name);
      user.name.givenName = member.first_name;
      update = true;
    }
    if(useraccount.name.familyName!=member.last_name) {
      if (!user.name)
      {user.name = {}}
      Logger.log("Nytt efternamn: %s", member.last_name);
      user.name.givenName = member.last_name;
      update = true;
    }
    if(useraccount.orgUnitPath!=orgUnitPath)  {
      Logger.log("Ny OrganizationUnit: %s", orgUnitPath);
      user.orgUnitPath = orgUnitPath;
      update = true;
    }
        
    //Logger.log("useraccount.recoveryEmail " + useraccount.recoveryEmail);
    //Logger.log("useraccount.recoveryEmail typeof " + typeof useraccount.recoveryEmail);
    //Logger.log("member.email " + member.email);
    //Logger.log("member.email typeof " + typeof member.email);
    if((useraccount.recoveryEmail != member.email) && (!(!useraccount.recoveryEmail && member.email==="")))  {
     
      Logger.log("Ny återställningse-post: %s",member.email);
      user.recoveryEmail = member.email;
      update = true;
    };
    // Lägg till återställningsinformation på Googlekontot
    //Logger.log("useraccount.recoveryPhone " + useraccount.recoveryPhone);
    //Logger.log("phnum_recovery " + phnum_recovery);
    //Logger.log("phnum " + phnum);
    //Logger.log("member.contact_mobile_phone " + member.contact_mobile_phone);
    if((useraccount.recoveryPhone != phnum_recovery) && (member.contact_mobile_phone)) {
        Logger.log("Nytt återställningsnummer: %s", phnum_recovery);
        user.recoveryPhone = phnum_recovery;
        update = true;
    }
    
    if (typeof syncUserContactInfo !=='undefined' && syncUserContactInfo) {
      if((accountPrimaryPhoneNumber != phnum) && (member.contact_mobile_phone)) {  
        if(phnum) {
          Logger.log("Nytt mobilnummer: %s", phnum);        
          
          var accountPhoneNumbersNotPrimaryOrTheSame = [];
          if (typeof useraccount.phones !=='undefined' && useraccount.phones) {
            if (-1 != useraccount.phones.findIndex(phoneNumber => phoneNumber.primary !== true)) {
              accountPhoneNumbersNotPrimaryOrTheSame = useraccount.phones.filter(phoneNumber => phoneNumber.primary !== true && phoneNumber.value !== phnum);
            }
          }
          
          var newPrimaryPhoneNumber = {
            "value": phnum,
            "primary": true,
            "type": "mobile"
          };
          
          accountPhoneNumbersNotPrimaryOrTheSame.push(newPrimaryPhoneNumber);
          Logger.log("Dessa ska de nya numren för denna person vara");
          Logger.log(accountPhoneNumbersNotPrimaryOrTheSame);
          user.phones = accountPhoneNumbersNotPrimaryOrTheSame;
          update = true;
        }
      }
    }
    
    if (accountKeywordAvatarUpdated != shouldBeKeywordAvatarUpdated) {
      Logger.log("Profilbilden ska uppdateras");

      Logger.log("accountKeywordAvatarUpdated " + accountKeywordAvatarUpdated);
      Logger.log("shouldBeKeywordAvatarUpdated " + shouldBeKeywordAvatarUpdated);
      
      var userPhoto;
      var keywordAvatarUpdatedToUpdate = "";
      
      if (!shouldBeKeywordAvatarUpdated) {  //Ingen tillgänglig bild samt har ej någon bild i Google Workspace
        Logger.log("Ingen profilbild från Scoutnet eller standardbild är tillgänglig" + shouldBeKeywordAvatarUpdated);

        try {
          userPhoto = AdminDirectory.Users.Photos.remove(useraccount.primaryEmail);
          Logger.log("Tagit bort profilbild");
        }
        catch(err)  {
          Logger.log("--------------------------");
          Logger.log("Error: %s",err.message);
          Logger.log("--------------------------");
        }
      }
      else { //Om tillgänglig bild, uppdatera bild i Google Workspace
        Logger.log("Finns ny profilbild. Antingen i Scoutnet eller ny standardbild");        
        
        try {
          var data = getByteArrayImageToUse(member.avatar_url, defaultUserAvatar);
          userPhoto = AdminDirectory.Users.Photos.update({photoData: data}, useraccount.primaryEmail);
        }
        catch(err)  {
          Logger.log("--------------------------");
          Logger.log("Error: %s",err.message);
          Logger.log("--------------------------");
        }
        
        try {
          userPhoto = AdminDirectory.Users.get(useraccount.primaryEmail);          
          var avatarId = getAvatarIdImageToUse(member.avatar_updated, defaultUserAvatar);

          keywordAvatarUpdatedToUpdate = avatarId + userPhoto.thumbnailPhotoEtag;
          Logger.log("Uppdaterat profilbild");
        }
        catch(err)  {
          Logger.log("--------------------------");
          Logger.log("Error: %s",err.message);
          Logger.log("--------------------------");
        }
      }
      //Uppdatera sen Userfältet med avatar_updated och bildens etag
      Logger.log("Den nya avatarUpdated " + keywordAvatarUpdatedToUpdate);
      var keywordArray = [];
      var tmp_avatarUpdated = {
        "value": keywordAvatarUpdatedToUpdate,
        "type": "custom",
        "customType": "avatar_updated"
      };
      keywordArray.push(tmp_avatarUpdated);
      user.keywords = keywordArray;
      update = true;
    }
    if (useraccount.suspended) {
      Logger.log("Aktiverad.");
      user.suspended = false;
    }

    try {
      user = AdminDirectory.Users.update(user, useraccount.primaryEmail);
      //Logger.log("Användaren är nu i org " + orgUnitPath);
    }
    catch(err)  {
      Logger.log("--------------------------")
      Logger.log("Error: %s",err.message);
      Logger.log(user);
      Logger.log("--------------------------")
    }
  }
}


/*
 * Stäng av användarkonto om det inte redan är avstängt
 *
 * @param {Object} userAccount - Ett objekt av ett Googlekonto
 * @param {string} suspendedOrgUnitPath - Sökväg för underorganisationen för avstängda konton
 */
function suspendAccount(userAccount, suspendedOrgUnitPath) {
  
  var email = userAccount.primaryEmail;
  var suspended = userAccount.suspended;
  var orgUnitPath = userAccount.orgUnitPath;
  
  createSuborganisationIfNeeded(suspendedOrgUnitPath);
  
  if (!suspended || (orgUnitPath!=suspendedOrgUnitPath)) {
  
    var user = {
      suspended: true,
      "orgUnitPath": suspendedOrgUnitPath
    };
  
    user = AdminDirectory.Users.update(user, email);
    Logger.log('Användare %s är nu avstängd', email);  
  }
  else {
    Logger.log('Användare %s är redan avstängd', email);  
  }
}


/*
 * Returnerar en lista över alla Googlekonton för underorganisationen som synkroniserar med Scoutnet
 *
 * @param {string} defaultOrgUnitPath - Sökväg för en underorganisation
 *
 * @returns {Object[]} users - Lista med objekt av Googlekonton i denna underorganisation
 */
function getGoogleAccounts(defaultOrgUnitPath) {
  
  var users;
  var pageToken, page;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      query: "orgUnitPath='" + defaultOrgUnitPath + "'",
      orderBy: 'givenName',
      maxResults: 500,
      pageToken: pageToken
    });
    users = page.users;
    if (users) {
      for (var i = 0; i < users.length; i++) {
        var user = users[i];
        //Logger.log('%s (%s)', user.name.fullName, user.primaryEmail);                
      }
    } else {
      Logger.log('Ingen användare hittades.');
      var empty = [];
      return empty;
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  
  return users;  
}


/*
 * Hämta en lista över alla aktiva scoutledare och andra funktionärer
 * genom att kontrollera om de har en avdelningsroll (unit_role) eller kårroll (group_role)
 *
 * @param {Object[]} allMembers - Lista med medlemsobjekt
 *
 * @returns {Object[]} leaders - Lista med medlemsobjekt för kårfunktionärer
 */
function getScoutleaders(allMembers) {
  
  var leaders = [];
  
  for (var i = 0; i < allMembers.length; i++) {
    
    var group_role = allMembers[i].group_role;
    var unit_role = allMembers[i].unit_role;
    
    if (group_role.length!=0 || unit_role.length!=0) {
     leaders.push(allMembers[i]);
    }    
  }
  return leaders;  
}


/*
 * Testfunktion för att lista alla Googlekonton som finns i underorganisationen "Scoutnet"
 * Max 200 stycken
 */
function listAllUsers() {
  var pageToken, page;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      query: "orgUnitPath='/Scoutnet'",
      orderBy: 'givenName',
      maxResults: 200,
      pageToken: pageToken
    });
    var users = page.users;
    if (users) {
      for (var i = 0; i < users.length; i++) {
        var user = users[i];
        Logger.log('%s (%s)', user.name.fullName, user.primaryEmail);
        //Logger.log('%s (%s) %s', user.name.fullName, user.primaryEmail, externalIds[0].value);
      }
    } else {
      Logger.log('Inga användare hittades.');
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}
