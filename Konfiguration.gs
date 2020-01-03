/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/scouternasetjanster 
 */

var domain = 'hasselbyscout.se'; //Domänen/Webbsideadressen utan till kåren utan www och som används i GSuite

var groupId = '12'; //Kårens id som kan hittas i Scoutnet om du har tillräcklig behörighet


//Get a detailed csv/xls/json list of all members
//Används bland annat för att synkronisera användarkonton med Scoutnet
var api_key_list_all = '7315979a2a864664695671c7dfe7'; //Kan hittas i Scoutnet om du har tillräcklig behörighet

//Get a csv/xls/json list of members, based on mailing lists you have set up
//Används bland annat för att synkronisera Google grupper med Scoutnet
var api_key_mailinglists = '75f4995656454d0dce624'; //Kan hittas i Scoutnet om du har tillräcklig behörighet

//Länk till Google kalkylarket för att synkronisera google grupper
var spreadsheetUrl_Grupper = 'https://docs.google.com/spreadsheets/d/1ru524kj9645454jydk0/edit#gid=0';

//E-post eller scoutnetListId för vart mejl om misstänkt spam till grupper ska skickas till
//För e-postlistor som anges skickas endast till primär e-postadress listad i Scoutnet
//T.ex 'webmaster@minscoutkår.se, 1234'
var moderateContentEmail = '';

//Typ av organisationsenhet
var organisationType = 'group'; //Ska enbart ändras om du kör programmet för ett distrikt. Ska då bytas till district

//Adressen till Scoutnet. Ska ej ändras
var scoutnet_url = 'www.scoutnet.se'; //Scoutnets webbadress


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
var userAccountConfig = [
  {
    scoutnetListId: "1234",  //
    orgUnitPath: "Styrelsen" //om du skriver Ledare så är det egentligen underorganisationen /Scoutnet/Ledare
  },
  {
    scoutnetListId: "8&rule_id=9874 (Roverscouter), 1122 (Kassör)", //Rover
    orgUnitPath: "Kårfunk/Rover"
  },
  {
    scoutnetListId: "8 (Lurk)", //Ledare, Utmanare, Rover, Kårfunktionärer. Då alla roverscouter och kårkassören redan är med i en lista kommer de ej med här
    orgUnitPath: "Kårfunk/LURK"
  }
];