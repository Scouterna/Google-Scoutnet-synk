/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Huvudfunktion för att hantera synkronisering av användarkonton med Scoutnet
 *
 * @param {Object} inputKonfig - Objekt med kårens konfiguration
 * @param {string} deafultOrgUnitPath - Sökväg för underorganisation där alla användarekonton ska synkas
 * @param {string} suspendedOrgUnitPath - Sökväg för underorganisationen för avstängda användarkonton
 */
function synkroniseraAnvandare(inputKonfig, defaultOrgUnitPath, suspendedOrgUnitPath) {
  
  konfig = inputKonfig;

  let allMembers;
  if ("group" === konfig.organisationType) {
    allMembers = fetchScoutnetMembers_(true); //Hämta lista över alla medlemmar
    console.info("Antal medlemmar i kåren " + allMembers.length);
  }
  
  let useraccounts = getGoogleAccounts_(defaultOrgUnitPath);

  const defaultUserAvatar = getByteArrayOfDefaultImage_();
  const defaultUserAvatarId = getAvatarId_(defaultUserAvatar);
  
  const membersProcessed = [];
  
  for (let p = 0; p < konfig.userAccountConfig.length; p++) { //Gå igenom Listorna som är definierade i Konfiguration.gs, avsnitt "userAccountConfig"
    
    let scoutnetListId = konfig.userAccountConfig[p].scoutnetListId;
    let orgUnitPath = defaultOrgUnitPath;
    
    if (konfig.userAccountConfig[p].orgUnitPath) {
      //Bara om man anger någon suborg så anger vi den, annars blir det knas med
      //sista snedstrecket
      orgUnitPath = orgUnitPath + "/" + konfig.userAccountConfig[p].orgUnitPath;
    }
    
    console.info("----------------------------------");
    console.info("orgUnitPath = %s", orgUnitPath);
    console.info("Beskrivning: %s", konfig.userAccountConfig[p].description);
    
    createSuborganisationIfNeeded_(orgUnitPath);
    
    let membersInAList;
    if (scoutnetListId) {
      membersInAList = fetchScoutnetMembersMultipleMailinglists_(scoutnetListId, "", "", true);
    }
    else if ("group" === konfig.organisationType) { //Om man ej anger listId för en e-postlista; endast för kårer, ej distrikt
      membersInAList = getScoutleaders_(allMembers);
    }
    console.info("Antal personer för denna typ av användarkonto = " + membersInAList.length);
    console.info("----------------------------------");

    for (let i = 0; i < membersInAList.length; i++) { //Här processas alla medlemmar
      
      if (membersProcessed.find(o => o === membersInAList[i].member_no)) { // Leta efter kontot i listan över redan processade konton
        //console.log("Användaren är redan processad: " + membersInAList[i].first_name + " " + membersInAList[i].last_name);
      }
      else {
        console.log("**************");
        console.log("Användaren ska processas: " + membersInAList[i].first_name + " " + membersInAList[i].last_name);
        membersProcessed.push(membersInAList[i].member_no); //Lägg till kontot i listan över processade konton
        let obj = null;
        if ("group" === konfig.organisationType) { //Alla attribut endast för kårer, ej distrikt
          obj = allMembers.find(obj => obj.member_no === membersInAList[i].member_no); //Leta upp kontot i listan övar alla konton
          //anledningen till att inte använda objektet från epostlistan är att det finns bara begränsad information i det objektet
        }
        else { //För distrikt
          obj = membersInAList[i];
        }

        if (!obj) {
          console.error("Användaren " + membersInAList[i].first_name + " " + membersInAList[i].last_name + " finns inte i Scoutnet eller så saknas det behörighet för att se användare. Kontrollera medlemslistan.");
          console.error("Hoppar över användaren.");
          // membersInAList-loop
          continue;
        }

        const googleUserAccount = useraccounts.find(u => u.externalIds !== undefined && u.externalIds.some(extid => extid.type === "organization" && extid.value === obj.member_no)); // leta upp befintligt Googlekonto som representerar rätt objekt
        if (googleUserAccount) {
          // Användaren fanns i listan
          const ia = useraccounts.length
          const indexOfList = useraccounts.findIndex(v => v.id === googleUserAccount.id);
          useraccounts.splice(indexOfList, indexOfList >= 0 ? 1 : 0);
          // radera kontot ut listan med alla googlekonto, när updateringen av alla konto är klar skall resterande konto i denna lista avaktiveras.
          const ib = useraccounts.length
          console.log("Hittade Googleanvändaren %s, id=%s ", googleUserAccount.name.fullName, googleUserAccount.id);
          console.log("Antal Google-konton innan: %d, efter: %d", ia, ib );
          updateAccount_(obj, googleUserAccount, orgUnitPath, defaultUserAvatar, defaultUserAvatarId) //uppdatera alla uppgifter på googlekontot med uppgifter från Scoutnet
        }
        else {
          createAccount_(obj, orgUnitPath); //Skapa Googlekonto för denna användare
        }
      }
    }
  }
  console.info("********************");
  console.info("Googlekonton som är eller ska vara avstänga: %s", useraccounts.length);

  for (let googleUserAccount in useraccounts) {    
    suspendAccount_(useraccounts[googleUserAccount], suspendedOrgUnitPath)
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
function createSuborganisationIfNeeded_(orgUnitPath) { 
  
  const index = orgUnitPath.lastIndexOf("/");
  const parentOrgUnitPath = orgUnitPath.substring(0, index);
  const name = orgUnitPath.substring(index+1, orgUnitPath.length);
  
  if (!checkIfOrgUnitExists_(parentOrgUnitPath)) {
    //Vi kollar rekursivt om föräldraorganisationen finns, om ej så skapar vi den
    createSuborganisationIfNeeded_(parentOrgUnitPath);
  }
  
  const boolOrgUnitExists = checkIfOrgUnitExists_(orgUnitPath);
  if (!boolOrgUnitExists) {
    
    const orgUnit = {
      name: name,
      parentOrgUnitPath: parentOrgUnitPath
    };
  
    try {
      AdminDirectory.Orgunits.insert(orgUnit, 'my_customer');
      console.info("Skapade orgUnit " + orgUnitPath);
    }
    catch (e) {
      console.error("Misslyckades att skapa orgUnit " + orgUnitPath);
      console.error("Fel " + e);
    }
  }
}


/**
 * Kontrollera om en organisationsenhet med denna fulla sökväg existerar
 *
 * @param {string} orgUnitPath - Sökväg för en underorganisation
 *
 * @returns {boolean} - True eller false om underorganisationen existerar
 */
function checkIfOrgUnitExists_(orgUnitPath) { 
  
  try {
    const page = AdminDirectory.Orgunits.list('my_customer', {
      orgUnitPath: orgUnitPath,
    });
    //console.log("OrgUnit " + orgUnitPath + " finns");
    return true;
  }
  catch (e) {
    console.log("OrgUnit " + orgUnitPath + " finns ej, men borde skapas");
    return false;
  }
}


/**
 * Gör namn redo för att vara en del i en användares e-postadress
 * genom att ta bort eller ersätta olika tecken vid behov
 *
 * @param {string} name - Namn på en person
 *
 * @returns {string} - Namn på personen så det fungerar att ha i en e-postadress
 */
function makeNameReadyForEmailAdress_(name) {
  
  let nameEmail = name.toLowerCase().trim(); //Ta bort tomma mellanrum vid start och slut och konvertera till gemener
  nameEmail = nameEmail.replace(/([\s])+/g, '.'); //Ersätt alla tommas mellanrum med en punkt (.)
  nameEmail = nameEmail.replace(/[.][\-]/g, '-').replace(/[\-][.]/g, '-'); //Om punkt följd av bindestreck eller tvärt om. Bara bindestreck i så fall.
  nameEmail = removeDiacritics_(nameEmail);
  nameEmail = nameEmail.replace(/[^0-9a-z.\-]/gi, ''); //Ta bort om det inte är en engelsk bokstav eller nummer
  return nameEmail;
}


/**
 * Skapa ett Google användarkonto för en medlem
 * givet ett medlemsobjekt och sökväg till underorganisation för användarkontot
 *
 * @param {Object} member - Ett medlemsobjekt
 * @param {string} orgUnitPath - Sökväg till en underorganisation
 */
function createAccount_(member, orgUnitPath) {
  
  const first_name = member.first_name;
  const first_name_email = makeNameReadyForEmailAdress_(first_name);
  
  const last_name = member.last_name;
  const last_name_email = makeNameReadyForEmailAdress_(last_name);
  
  let email = first_name_email + "." + last_name_email + "@" + konfig.domain; 
 
  if (checkIfEmailExists_(email)) {
     for (let t = 1; t < 5; t++) { //Ska inte vara fler personer med samma namn. Programmet kraschar då med mening då något antagligen gått fel
        email = first_name_email + "." + last_name_email + t + "@" + konfig.domain;

        if (!checkIfEmailExists_(email)) { //Skapa denna e-postadress
          break;
        }
     }
  }
   
  let user = {
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
  
  console.info('Användare %s skapad.', user.primaryEmail);
}


/**
 * Kontrollera om ett konto med denna e-postadress existerar
 * 
 * @param {string} email - En e-postadress inom kårens Google Workspace
 *
 * @returns {boolean} - True eller false om e-postadressen finns
 */
function checkIfEmailExists_(email) {

  const page = AdminDirectory.Users.list({
    domain: konfig.domain,
    query: email=email,
    orderBy: 'givenName',
    maxResults: 1
  });

  if (page.users) {
    console.warn("Denna adress finns redan " + email);
    return true;
  } else {
    console.info('Ingen användare hittades med ' + email);
    return false;
  }
}


/**
 * Ger en UTF-8 byte array för standardprofilbild om det finns
 * 
 * @returns {byte[] | string} - Byte array för standardprofilbild eller tom sträng
 */
function getByteArrayOfDefaultImage_() {
  return getByteArrayOfAnImage_(konfig.defaultUserAvatarUrl);
}


/**
 * Ger egenskapat id för en bild
 * 
 * @prams {byte[]} avatar - Byte array för en bild
 * 
 * @returns {string} - Ett id som en sträng
 */
function getAvatarId_(avatar) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, avatar);
  return digest.toString();
}


/**
 * Ger en UTF-8 byte array för en bild givet en url alternativt
 * en tom sträng om bild ej finns
 * 
 * @param {string} url - Url för en bild
 * 
 * @returns {byte[] | string} - Byte array för bild eller tom sträng
 */
function getByteArrayOfAnImage_(url) {
  try {
    const blob = UrlFetchApp.fetch(url).getBlob();
    const data = Utilities.base64EncodeWebSafe(blob.getBytes());
    return data;
  }
  catch(err) {
    console.error("--------------------------");
    console.error("Error: %s",err.message);
    console.error("--------------------------");
  }
  return "";
}


/**
 * Ger en UTF-8 byte array för en bild givet en url alternativt
 * om den ej finns så ges byte array för standardbild
 * 
 * @param {string} avatar_url - Url för en medlems bild i Scoutnet
 * @param {byte[]} defaultAvatar - Byte array för standardbilden
 * 
 * @returns {byte[]} - Byte array för den bild som ska användas
 */
function getByteArrayImageToUse_(avatar_url, defaultAvatar) {

  if (avatar_url) {
    return getByteArrayOfAnImage_(avatar_url);
  }
  return defaultAvatar;
}


/**
 * Ger en ett id för en medlems profilbild i Scoutnet alternativt
 * om den ej finns så ett id för standardbild
 * 
 * @param {string} avatar_updated - Id bild i Scoutnet
 * @param {string} defaultAvatarId - Id för standardbilden
 * 
 * @returns {string} - Id för den bild som ska användas
 */
function getAvatarIdImageToUse_(avatar_updated, defaultAvatarId) {

  if (avatar_updated) {
    return avatar_updated;
  }
  return defaultAvatarId;
}


/**
 * Uppdatera konto vid behov
 * Uppdatera namn, organisationssökväg och avbryt avstängning vid behov
 * 
 * @param {Object} member - Ett medlemsobjekt
 * @param {Object} useraccount - Ett Googlekontoobjekt
 * @param {string} orgUnitPath - Sökväg för en underorganisation
 * @param {byte[]} defaultUserAvatar - Byte array för en standardbild
 * @param {string} defaultUserAvatarId - Id för standardbilden
 */
function updateAccount_(member, useraccount, orgUnitPath, defaultUserAvatar, defaultUserAvatarId) {
  
  if ("district" === konfig.organisationType) { //För distrikt som hämtar attribut via e-postlist-api:et då det är annat namn där
    member.contact_mobile_phone = member.mobile_phone;
  }
 
  const phnum = intPhoneNumber_(member.contact_mobile_phone); // gör mobilnummret till internationellt nummer om möjligt
  
  let phnum_recovery = "";
  if (validatePhonenumberForE164_(phnum)) {
    phnum_recovery = phnum;
  }
  else {
    phnum_recovery = "";
  }
  
  let accountPrimaryPhoneNumber = "";
  if (typeof useraccount.phones !== 'undefined' && useraccount.phones) {
    if (-1 !== useraccount.phones.findIndex(phoneNumber => phoneNumber.type === "mobile" && phoneNumber.primary === true)) {
      accountPrimaryPhoneNumber = useraccount.phones.find(phoneNumber => phoneNumber.type === "mobile" && phoneNumber.primary === true).value;
    }
  }
  
  let accountKeywordAvatarUpdated = "";
  //user.keywords=innehåller bla i användarens konto keywordAvatarUpdatedToUpdate
  if (typeof useraccount.keywords !== 'undefined' && useraccount.keywords) {
    //Om det finns lagrad data på användarens konto
    if (-1 !== useraccount.keywords.findIndex(keyword => keyword.type === "custom" && keyword.customType === "avatar_updated")) {
      //Sätta det värde till accountKeywordAvatarUpdated
      accountKeywordAvatarUpdated = useraccount.keywords.find(keyword => keyword.type === "custom" && keyword.customType === "avatar_updated").value;
    }
  }
  
  //Om inställningen är att inte synkronisera profilbilder
  if (typeof konfig.syncUserAvatar === 'undefined' || !konfig.syncUserAvatar) {
    console.log("Ska ej synkronisera profilbild");
    member.avatar_updated = "";
    member.avatar_url = "";
  }
  
  let shouldBeKeywordAvatarUpdated = member.avatar_updated;
  // Om ingen bild finns i Scoutnet eller att bild ej ska synkas
  if (!shouldBeKeywordAvatarUpdated) {

    //Ett genererat id för standardbilden
    if (typeof defaultUserAvatar !== 'undefined' && defaultUserAvatar) {
      shouldBeKeywordAvatarUpdated = defaultUserAvatarId;
      console.log("Ska sätta standardbild på denna person");
    }
  }
  else {
    console.log("Personen har en egen profilbild i Scoutnet som ska användas");
  }

  //Om finns profilbild på kontot sedan innan
  //Om standardbild => defaultUserAvatarId + useraccount.thumbnailPhotoEtag
  //Om egen profilbild => member.avatar_updated + useraccount.thumbnailPhotoEtag
  if (typeof useraccount.thumbnailPhotoEtag !== 'undefined') {
    shouldBeKeywordAvatarUpdated += useraccount.thumbnailPhotoEtag;
  }
  
  console.log("accountKeywordAvatarUpdated " + accountKeywordAvatarUpdated);
  console.log("shouldBeKeywordAvatarUpdated " + shouldBeKeywordAvatarUpdated);
  console.log("Avatar updated " + member.avatar_updated);
  console.log("Avatar url " + member.avatar_url);

  
  if ( useraccount.name.givenName !== member.first_name 
    || useraccount.name.familyName !== member.last_name 
    || useraccount.suspended 
    || useraccount.orgUnitPath !== orgUnitPath
    || ((useraccount.recoveryEmail !== member.email) && (!(!useraccount.recoveryEmail && member.email === "")))
    || ((useraccount.recoveryPhone !== phnum_recovery) && (!(!useraccount.recoveryPhone && phnum_recovery === ""))) 
    || (accountPrimaryPhoneNumber !== phnum)
    || (accountKeywordAvatarUpdated !== shouldBeKeywordAvatarUpdated)) {
    // Något behöver uppdateras 

    let user = {} // skapa kontoobjekt med det som skall ändras
    
    if (useraccount.name.givenName !== member.first_name) {
      if (!user.name)
      {user.name = {}}
      console.log("Nytt förnamn: %s", member.first_name);
      user.name.givenName = member.first_name;
    }
    if (useraccount.name.familyName !== member.last_name) {
      if (!user.name)
      {user.name = {}}
      console.log("Nytt efternamn: %s", member.last_name);
      user.name.familyName = member.last_name;
    }
    if (useraccount.orgUnitPath !== orgUnitPath) {
      console.log("Ny organisationsenhet: %s", orgUnitPath);
      user.orgUnitPath = orgUnitPath;
    }

    // Lägg till återställningsinformation på Googlekontot
    //Om de inte är lika && de inte är tomma båda två
    if ((useraccount.recoveryEmail !== member.email) && (!(!useraccount.recoveryEmail && member.email === ""))) {
      console.log("Ny återställningse-post: %s", member.email);
      user.recoveryEmail = member.email;
    };
    
    if ((useraccount.recoveryPhone !== phnum_recovery) && (!(!useraccount.recoveryPhone && phnum_recovery === ""))) {
      console.log("Nytt återställningsnummer: %s", phnum_recovery);
      user.recoveryPhone = phnum_recovery;
    }
    
    if (typeof konfig.syncUserContactInfo !== 'undefined' && konfig.syncUserContactInfo) {
      if (accountPrimaryPhoneNumber !== phnum) {
        console.log("Nytt mobilnummer: %s", phnum);
        user.phones = findPhoneNumbersToBeForUser_(useraccount, phnum);
      }
    } 

    if (accountKeywordAvatarUpdated !== shouldBeKeywordAvatarUpdated) {
      console.log("Profilbilden ska uppdateras");
      console.log("accountKeywordAvatarUpdated " + accountKeywordAvatarUpdated);
      console.log("shouldBeKeywordAvatarUpdated " + shouldBeKeywordAvatarUpdated);
      user.keywords = updateUserPhoto_(member, useraccount, defaultUserAvatar, defaultUserAvatarId, shouldBeKeywordAvatarUpdated);
    }

    if (useraccount.suspended) {
      console.info("Aktiverat kontot igen.");
      user.suspended = false;
    }

    try {
      console.info('Användare %s %s uppdateras', useraccount.name.givenName, useraccount.name.familyName); 
      user = AdminDirectory.Users.update(user, useraccount.primaryEmail);
    }
    catch(err) {
      console.error("--------------------------");
      console.error("Error: %s", err.message);
      console.error(user);
      console.error("--------------------------");
    }
  }
}


/**
 * Ger vilka telefonnummer som ska sättas för ett användarkonto
 * 
 * @param {Object} useraccount - Ett Googlekontoobjekt
 * @param {string} phnum - Telefonnumret skrivet på internationellt sett
 */
function findPhoneNumbersToBeForUser_(useraccount, phnum) {

  let accountPhoneNumbersNotPrimaryOrTheSame = [];
  if (typeof useraccount.phones !== 'undefined' && useraccount.phones) {
    if (-1 !== useraccount.phones.findIndex(phoneNumber => phoneNumber.primary !== true)) {
      accountPhoneNumbersNotPrimaryOrTheSame = useraccount.phones.filter(phoneNumber => phoneNumber.primary !== true && phoneNumber.value !== phnum);
    }
  }
  
  if (phnum) {
    const newPrimaryPhoneNumber = {
      "value": phnum,
      "primary": true,
      "type": "mobile"
    };
    accountPhoneNumbersNotPrimaryOrTheSame.push(newPrimaryPhoneNumber);
  }
  console.log("Dessa ska de nya telefonnumren för denna person vara");
  console.log(accountPhoneNumbersNotPrimaryOrTheSame);
  return accountPhoneNumbersNotPrimaryOrTheSame;
}


/**
 * Uppdatera profilbild för ett användarkonto
 * samt uppdatera data som sparas på användarkontot för profilbilden
 * 
 * @param {Object} member - Ett medlemsobjekt
 * @param {Object} useraccount - Ett Googlekontoobjekt
 * @param {byte[]} defaultUserAvatar - Byte array för en standardbild
 * @param {string} defaultUserAvatarId - Id för standardbilden
 * @param {string} shouldBeKeywordAvatarUpdated - Data som sparas på användarkonto för profilbild
 */
function updateUserPhoto_(member, useraccount, defaultUserAvatar, defaultUserAvatarId, shouldBeKeywordAvatarUpdated) {

  let keywordAvatarUpdatedToUpdate = "";
  
  //Om tillgänglig Scoutnet- eller standardbild; uppdatera bild i Google Workspace
  if (shouldBeKeywordAvatarUpdated) {
    console.log("Finns ny profilbild. Antingen i Scoutnet eller ny standardbild");
    
    let userPhoto;

    try {
      const data = getByteArrayImageToUse_(member.avatar_url, defaultUserAvatar);
      userPhoto = AdminDirectory.Users.Photos.update({photoData: data}, useraccount.primaryEmail);
    }
    catch(err) {
      console.error("--------------------------");
      console.error("Error: %s",err.message);
      console.error("--------------------------");
    }
    
    try {
      userPhoto = AdminDirectory.Users.get(useraccount.primaryEmail);
      const avatarId = getAvatarIdImageToUse_(member.avatar_updated, defaultUserAvatarId);
      keywordAvatarUpdatedToUpdate = avatarId + userPhoto.thumbnailPhotoEtag;
    }
    catch(err) {
      console.error("--------------------------");
      console.error("Error: %s",err.message);
      console.error("--------------------------");
    }
  }
  //Uppdatera sen Userfältet med avatar_updated och bildens etag
  console.log("Den nya avatarUpdated " + keywordAvatarUpdatedToUpdate);
  const keywordArray = [];
  const avatarUpdated = {
    "value": keywordAvatarUpdatedToUpdate,
    "type": "custom",
    "customType": "avatar_updated"
  };
  keywordArray.push(avatarUpdated);
  
  return keywordArray;
}


/**
 * Stäng av användarkonto om det inte redan är avstängt
 *
 * @param {Object} userAccount - Ett objekt av ett Googlekonto
 * @param {string} suspendedOrgUnitPath - Sökväg för underorganisationen för avstängda konton
 */
function suspendAccount_(userAccount, suspendedOrgUnitPath) {
  
  const email = userAccount.primaryEmail;
  const suspended = userAccount.suspended;
  const orgUnitPath = userAccount.orgUnitPath;

  createSuborganisationIfNeeded_(suspendedOrgUnitPath);  
  
  if (!suspended || (orgUnitPath !== suspendedOrgUnitPath)) {
  
    let user = {
      suspended: true,
      "orgUnitPath": suspendedOrgUnitPath
    };
  
    user = AdminDirectory.Users.update(user, email);
    console.info('Användare %s är nu avstängd', email);
  }
  else {
    console.info('Användare %s är redan avstängd. Senast inloggad %s', email, userAccount.lastLoginTime);
  }
}


/**
 * Returnerar en lista över alla Googlekonton för underorganisationen som synkroniserar med Scoutnet
 *
 * @param {string} defaultOrgUnitPath - Sökväg för en underorganisation
 *
 * @returns {Object[]} - Lista med objekt av Googlekonton i denna underorganisation
 */
function getGoogleAccounts_(defaultOrgUnitPath) {

  let users;

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.warn("Funktionen getGoogleAcounts körs " + n);
    }
    try {
      let pageToken, page;
      do {
        page = AdminDirectory.Users.list({
          domain: konfig.domain,
          query: "orgUnitPath='" + defaultOrgUnitPath + "'",
          orderBy: 'givenName',
          maxResults: 150,
          pageToken: pageToken
        });
        users = page.users;
        if (users) {
          //for (let i = 0; i < users.length; i++) {
            //const user = users[i];
            //console.log('%s (%s)', user.name.fullName, user.primaryEmail);
          //}
        } else {
          console.warn('Ingen användare hittades i denna underoganisation.');
          const empty = [];
          return empty;
        }
        pageToken = page.nextPageToken;
      } while (pageToken);

      return users;
    
    } catch(e) {
      console.error("Problem med att anropa GoogleTjänst Users.list i funktionen getGoogleAccounts");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
  
}


/**
 * Hämta en lista över alla aktiva scoutledare och andra funktionärer
 * genom att kontrollera om de har en avdelningsroll (unit_role) eller kårroll (group_role)
 *
 * @param {Object[]} allMembers - Lista med medlemsobjekt
 *
 * @returns {Object[]} leaders - Lista med medlemsobjekt för kårfunktionärer
 */
function getScoutleaders_(allMembers) {

  const leaders = [];
  
  for (let i = 0; i < allMembers.length; i++) {
    
    const group_role = allMembers[i].group_role;
    const unit_role = allMembers[i].unit_role;
    
    if (group_role.length !== 0 || unit_role.length !== 0) {
     leaders.push(allMembers[i]);
    }
  }
  return leaders;
}


/**
 * Testfunktion för att lista alla Googlekonton som finns i underorganisationen "Scoutnet"
 * 
 * @param {Object} inputKonfig - Objekt med kårens konfiguration
 */
function listaAllaGooglekonton(inputKonfig) {

  konfig = inputKonfig;

  let pageToken, page;
  do {
    page = AdminDirectory.Users.list({
      domain: konfig.domain,
      query: "orgUnitPath='/Scoutnet'",
      orderBy: 'givenName',
      maxResults: 150,
      pageToken: pageToken
    });
    const users = page.users;
    if (users) {
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (user.suspended) {
          console.info('%s (%s) %s - Avstängd', user.name.fullName, user.primaryEmail, user.externalIds[0].value);
        }
        else  {
          console.info('%s (%s) %s', user.name.fullName, user.primaryEmail, user.externalIds[0].value);
        }
      }
    } else {
      console.warn('Inga användare hittades.');
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}
