/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Kontrollerar om inställningarna i Konfiguration.gs verkar korrekta
 */
function checkKonfigIsOk() {
  ScoutnetSynkLib.checkDataFromKonfig(KONFIG_OBJECT);
}

const KONFIG_OBJECT = {};

KONFIG_OBJECT.domain = 'hasselbyscout.se'; //Domänen/Webbsideadressen utan till kåren utan www och som används i Google Workspace

KONFIG_OBJECT.scoutnetGroupId = '12'; //Kårens id som kan hittas i Scoutnet om du har tillräcklig behörighet


//Get a detailed csv/xls/json list of all members
//Används bland annat för att synkronisera användarkonton med Scoutnet
//Används vid synkronisering för kårer, ej distrikt
KONFIG_OBJECT.api_key_list_all = '999888777315979a2a864664695671c7dfe7'; //Kan hittas i Scoutnet om du har tillräcklig behörighet

//Get a csv/xls/json list of members, based on mailing lists you have set up
//Används bland annat för att synkronisera Google grupper med Scoutnet
KONFIG_OBJECT.api_key_mailinglists = '11122233356454d0dce624'; //Kan hittas i Scoutnet om du har tillräcklig behörighet

//E-post eller scoutnetListId för vart mejl om misstänkt spam till grupper ska skickas till
//För e-postlistor som anges skickas endast till primär e-postadress listad i Scoutnet
//T.ex 'webmaster@minscoutkår.se, 1234'
KONFIG_OBJECT.moderateContentEmail = '';

//Inställning om viss kontaktinformation ska synkroniseras till användares Google Workspace-konto
KONFIG_OBJECT.syncUserContactInfo = true;

//Inställning om medlems profilbild ska synkroniseras till användares Google Workspace-konto
KONFIG_OBJECT.syncUserAvatar = true;

//Adress till profilbild att använda för Googlekonton om ingen finns i Scoutnet
KONFIG_OBJECT.defaultUserAvatarUrl = "https://web.cdn.scouterna.net/uploads/sites/57/2021/05/avatar.png";

//Typ av organisationsenhet
KONFIG_OBJECT.organisationType = 'group'; //Ska enbart ändras om du kör programmet för ett distrikt. Ska då bytas till district

//Adressen till Scoutnet. Ska ej ändras
KONFIG_OBJECT.scoutnet_url = 'www.scoutnet.se'; //Scoutnets webbadress


/**
 * scoutnetId = id för e-postlistan i Scoutnet
 * orgUnitPath = sökvägen till underorganisationen relativt sökvägen där alla synkroniserade konton hamnar ( /Scoutnet )
 * Om en person finns i flera e-postlistor hamnar personen i den listas först här nedan.
 * T.ex om man vill har en underorganisation för alla medlemmar och en för endast ledare ska den för ledare skrivas först,
 * för annars hamnar alla ledare i den underorganisationen
 * Underorganisationerna skapas automatiskt om de inte finns sedan innan, men inga kommar tas bort om man byter namn här
 * Det går att ha flera nivår på underorgansiationer. T.ex /Scoutnet/Kårfunktionärer/Ledare/Spårarledare vilket då skrivs
 * som Kårfunktionärer/Ledare/Spårarledare nedan
 */
KONFIG_OBJECT.userAccountConfig = [
  {
    scoutnetListId: "1234",  //
    orgUnitPath: "Styrelsen",  //om du skriver Ledare så är det egentligen underorganisationen /Scoutnet/Ledare
    description: "gruppen med personer i Styrelsen" // valfritt,  beskrivning för att kunna följa loggen lättare
  },
  {
    scoutnetListId: "8&rule_id=9874 (Roverscouter), 1122 (Kassör)", //Rover
    orgUnitPath: "Kårfunk/Rover",
    description: "Rover och kassörer"
  },
  {
    scoutnetListId: "8 (Lurk)", //Ledare, Utmanare, Rover, Kårfunktionärer. Då alla roverscouter och kårkassören redan är med i en lista kommer de ej med här
    orgUnitPath: "Kårfunk/LURK",
    description: "Ledare, Utmanare, Rover, Kårfunktionärer"
  }
];


/**
 * Inställningar för Kontaktgrupper
 */
//Scoutkårens namn
KONFIG_OBJECT.groupName = "Testmall Scoutkår";

//Max antal tvingade uppdatering per användare tills det nollställs
KONFIG_OBJECT.MAX_NUMBER_OF_CONTACTS_FORCE_UPDATE = 10;

//Om information om vuxnas anhöriga ska synkroniseras eller ej. Om de synkroniseras hamnar de i noteringsfältet
KONFIG_OBJECT.STORE_CONTACTS_RELATIVES_FOR_ADULTS = false;

KONFIG_OBJECT.contact_groups_email_subject = "Användaruppgifter - Google kontaktgrupper synkning";

KONFIG_OBJECT.contact_groups_email_sender_name = "";

KONFIG_OBJECT.contact_groups_email_sender_from = "";

//Skapa din egen med hjälp av funktionen testGetHtmlEmailBody
/***Brödtext enkel***/
KONFIG_OBJECT.contact_groups_email_plainBody = "Hej, Du har nyss försökt autentisera dig med en felaktig kombination av e-postadress och lösenord för att synkronisera kontaktgrupper. Vänligen använd följande uppgifter i stället: E-postadress: {{userEmail}} Lösenord: {{password}} Mvh " + KONFIG_OBJECT.groupName;
/***Brödtext enkel - Slut***/

/***Brödtext Html***/
KONFIG_OBJECT.contact_groups_email_htmlBody = '<div dir="ltr">Hej,<div><br></div><div>Du har nyss försökt autentisera dig med en felaktig kombination av e-postadress och lösenord för att synkronisera kontaktgrupper.</div><div><br></div><div>Vänligen använd följande uppgifter i stället:</div><div><br></div><div>E-postadress: {{userEmail}}</div><div>Lösenord: {{password}}</div><div><br></div><div>Mvh</div><div>' + KONFIG_OBJECT.groupName + '</div></div>';
/***Brödtext Html - Slut***/

//Du på kåren kan ändra denna om du vill tvinga dina egna användare att uppdatera sina skript
KONFIG_OBJECT.version_oldest_ok = "2.0.0";

//Ord som står i en medlems anteckningar som ska med i synkning men bytas ut mot något annat
KONFIG_OBJECT.noteKeysToReplace = [
    ["lEdare", "Förälder har ledarintresse"],
    ["Rabatt", "Rabatter i butiker av intresse"]
  ];
