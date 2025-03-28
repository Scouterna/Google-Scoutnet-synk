/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 * @version 2025-03-26
 */


/**
 * Kontrollerar om inställningarna i Konfiguration.gs verkar korrekta
 */
function checkKonfigIsOk() {
  ScoutnetSynkLib.checkDataFromKonfig(KONFIG_OBJECT);
}

const KONFIG_OBJECT = {};

KONFIG_OBJECT.DOMAIN = "hasselbyscout.se"; //Domänen/Webbsideadressen utan till kåren utan www och som används i Google Workspace

KONFIG_OBJECT.SCOUTNET_GROUP_ID = "12"; //Kår-ID för webbtjänster som kan hittas i Scoutnet om du har tillräcklig behörighet


//Get a detailed csv/xls/json list of all members
//Används bland annat för att synkronisera användarkonton med Scoutnet
//Används vid synkronisering för kårer, ej distrikt
KONFIG_OBJECT.API_KEY_LIST_ALL = "999888777315979a2a864664695671c7dfe7"; //Kan hittas i Scoutnet om du har tillräcklig behörighet

//Get a csv/xls/json list of members, based on mailing lists you have set up
//Används bland annat för att synkronisera Google grupper med Scoutnet
KONFIG_OBJECT.API_KEY_MAILINGLISTS = "11122233356454d0dce624"; //Kan hittas i Scoutnet om du har tillräcklig behörighet

//E-post eller scoutnetListId för vart mejl om misstänkt spam till grupper ska skickas till
//För e-postlistor som anges skickas endast till primär e-postadress listad i Scoutnet
//T.ex "webmaster@minscoutkår.se, 1234"
KONFIG_OBJECT.MODERATE_CONTENT_EMAIL = "";

//Lista med e-postadresser som ska exkluderas från kårens grupper/e-postlistor om de finns
KONFIG_OBJECT.EXCLUDE_EMAILS = ["test.testsson@scouterna.se"];

//Inställning om viss kontaktinformation ska synkroniseras till användares Google Workspace-konto
KONFIG_OBJECT.SYNC_USER_CONTACT_INFO = true;

//Inställning om medlems profilbild ska synkroniseras till användares Google Workspace-konto
KONFIG_OBJECT.SYNC_USER_AVATAR = true;

//Inställning om statistik över funktioner som körs och kontaktinformation till kåren ska delas med utvecklaren
KONFIG_OBJECT.SHARE_STATISTICS_OF_RUNNING_SCRIPTS_AND_GROUP_INFORMATION = false; //Ändra till true om du vill dela statistik

//Adress till profilbild att använda för Googlekonton om ingen finns i Scoutnet
KONFIG_OBJECT.DEFAULT_USER_AVATAR_URL = "https://web.cdn.scouterna.net/uploads/sites/57/2021/05/avatar.png";

//Sökväg för underorganisation där alla användarekonton ska synkas
KONFIG_OBJECT.DEFAULT_ORG_UNIT_PATH = "/Scoutnet";

//Sökväg för underorganisationen för avstängda användarkonton
KONFIG_OBJECT.SUSPENDED_ORG_UNIT_PATH = KONFIG_OBJECT.DEFAULT_ORG_UNIT_PATH + "/" + "Avstängda";

//Typ av organisationsenhet
KONFIG_OBJECT.ORGANISATION_TYPE = "group"; //Ska enbart ändras om du kör programmet för ett distrikt. Ska då bytas till district

//Adressen till Scoutnet. Ska ej ändras
KONFIG_OBJECT.SCOUTNET_URL = "www.scoutnet.se"; //Scoutnets webbadress


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
KONFIG_OBJECT.USER_ACCOUNT_CONFIG = [
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
KONFIG_OBJECT.GROUP_NAME = "Testmall Scoutkår";

//Max antal tvingade uppdatering per användare tills det nollställs
KONFIG_OBJECT.MAX_NUMBER_OF_CONTACTS_FORCE_UPDATE = 10;

//Om information om vuxnas anhöriga ska synkroniseras eller ej. Om de synkroniseras hamnar de i noteringsfältet
KONFIG_OBJECT.STORE_CONTACTS_RELATIVES_FOR_ADULTS = false;

//Ämne på e-post som skickar användaruppgifter för kontaktsynkronisering
KONFIG_OBJECT.CONTACT_GROUPS_EMAIL_CREDENTIALS_SUBJECT = "Användaruppgifter - Google kontaktgrupper synkning";

//Avsändarnamn på e-post som skickar användaruppgifter för kontaktsynkronisering
//Om inget sätts används namnet på användarkontot som kör skriptet
KONFIG_OBJECT.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_NAME = "";

//Avsändare-post på e-post som skickar användaruppgifter för kontaktsynkronisering
//Avsändaradressen måste finnas upplagd som alias i din Gmail
KONFIG_OBJECT.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_FROM = "";

//Skapa din egen med hjälp av funktionen testGetHtmlEmailBody
/***Brödtext enkel***/
KONFIG_OBJECT.CONTACT_GROUPS_EMAIL_CREDENTIALS_PLAINBODY = "Hej, Du har nyss försökt autentisera dig med en felaktig kombination av e-postadress och lösenord för att synkronisera kontaktgrupper. Vänligen använd följande uppgifter i stället: E-postadress: {{userEmail}} Lösenord: {{password}} Mvh " + KONFIG_OBJECT.GROUP_NAME;
/***Brödtext enkel - Slut***/

/***Brödtext Html***/
KONFIG_OBJECT.CONTACT_GROUPS_EMAIL_CREDENTIALS_HTMLBODY = '<div dir="ltr">Hej,<div><br></div><div>Du har nyss försökt autentisera dig med en felaktig kombination av e-postadress och lösenord för att synkronisera kontaktgrupper.</div><div><br></div><div>Vänligen använd följande uppgifter i stället:</div><div><br></div><div>E-postadress: {{userEmail}}</div><div>Lösenord: {{password}}</div><div><br></div><div>Mvh</div><div>' + KONFIG_OBJECT.GROUP_NAME + '</div></div>';
/***Brödtext Html - Slut***/


/**
 * Inställningar för Kontaktgrupper - skicka e-brev vid inkomplett medlemsmatchning
 */
//Ämne på e-post som upplyser om inkomplett matchning mellan två medlemmar (ett barn och en vuxen)
KONFIG_OBJECT.CONTACT_GROUPS_EMAIL_PARTIAL_MEMBER_MATCH_SUBJECT = "Inkomplett medlemsprofil i Scoutnet funnen - {{memberFullname}}";

//Mottagaradress för vart e-brev som upplyser om inkomplett matchning mellan två medlemmar (ett barn och en vuxen) ska skickas
//Vanligtvis e-postadressen till kårens medlemsansvarig
//Om inget sätt kommer inte några e-brev skickas som upplyser om inkomplett matchning
KONFIG_OBJECT.CONTACT_GROUPS_EMAIL_PARTIAL_MEMBER_MATCH_TO = "";

//Avsändarnamn på e-post som upplyser om inkomplett matchning mellan två medlemmar (ett barn och en vuxen)
//Om inget sätts används namnet på användarkontot som kör skriptet
KONFIG_OBJECT.CONTACT_GROUPS_EMAIL_PARTIAL_MEMBER_MATCH_SENDER_NAME = "";

//Avsändare-post som upplyser om inkomplett matchning mellan två medlemmar (ett barn och en vuxen)
//Avsändaradressen måste finnas upplagd som alias i din Gmail
KONFIG_OBJECT.CONTACT_GROUPS_EMAIL_PARTIAL_MEMBER_MATCH_SENDER_FROM = "";

//Skapa din egen med hjälp av funktionen testGetHtmlEmailBody
/***Brödtext enkel***/
KONFIG_OBJECT.CONTACT_GROUPS_EMAIL_PARTIAL_MEMBER_MATCH_PLAINBODY = "Hej, En inkomplett matchning har hittats mellan två medlemmar (ett barn och en vuxen) i Scoutnet. Vänligen komplettera uppgifterna med e-post/telefonnummer för medlem {{memberFullname}} i fältet Anhörig {{relativeNumber}} hos denna medlem. Direktlänk för denna medlem är https://" + KONFIG_OBJECT.SCOUTNET_URL + "/organisation/user/{{member_no}} Mvh " + KONFIG_OBJECT.GROUP_NAME;
/***Brödtext enkel - Slut***/

/***Brödtext Html***/
KONFIG_OBJECT.CONTACT_GROUPS_EMAIL_PARTIAL_MEMBER_MATCH_HTMLBODY = '<div dir="ltr">Hej,<div><br></div><div>En inkomplett matchning har hittats mellan två medlemmar (ett barn och en vuxen) i Scoutnet. </div><div><br></div><div>Vänligen komplettera uppgifterna med e-post/telefonnummer för medlem {{memberFullname}} i fältet Anhörig {{relativeNumber}} hos denna medlem.</div><div><br></div><div>Direktlänk för denna medlem är https://' + KONFIG_OBJECT.SCOUTNET_URL + '/organisation/user/{{member_no}}</div><div><br></div><div>Mvh</div><div>' + KONFIG_OBJECT.GROUP_NAME + '</div></div>';
/***Brödtext Html - Slut***/

//Ord som står i en medlems anteckningar som ska med i synkning men bytas ut mot något annat
KONFIG_OBJECT.NOTE_KEYS_TO_REPLACE = [
  ["lEdare", "Förälder har ledarintresse"],
  ["Rabatt", "Rabatter i butiker av intresse"]
];
