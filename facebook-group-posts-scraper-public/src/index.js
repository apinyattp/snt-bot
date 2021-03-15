#!/usr/bin/env node
const request = require('request')
const puppeteer = require('puppeteer');
const selectors = require('./selectors/facebook');
const fs = require('fs');
const inquirer = require('inquirer');
const minimist = require('minimist');
const chalk = require('chalk');
const Configstore = require('configstore');
const package = require('../package.json');
// const cookies = require('../cookies.json');
const fbDate = require('../fbDate.js')
const config = new Configstore(
    package.name,
    {},
);
var isAnyNewPosts = false
const arguments = minimist(
    process.argv.slice(2),
    {
      string: ['group-ids', 'output'],
      boolean: ['version', 'help', 'debug', 'headful'],
      _: ['init'],
      default: {'output': './'},
      alias: {h: 'help', v: 'version'},
      stopEarly: true, /* populate _ with first non-option */
    },
);

/**
* Function handles the validation of a string.
* @namespace validator
* @param {string} input the input parameter to validate
* @return {bool} returns true if the given input is valid
**/
function validator(input) {
  return input.length !== 0;
}

/**
  * This callback type is called `validatorCallback` and
  * is displayed as a global symbol.
  * @callback validatorCallback
  * @param {string} input
  * @return {boolean} returns true if the input is valid
 */

/**
  * Function gets the user configuration information by asking
  *  related questions to user.
  * @namespace askConfigQuestions
  * @param {validatorCallback} validator function to validate the user input
  * @return {Object} returns answer object got from the user
**/
async function askConfigQuestions(validator) {
  const answers = await inquirer.prompt([
    {
      name: 'facebook-username',
      type: 'input',
      message: 'facebook username:',
      validate: validator,
    },
    {
      name: 'facebook-password',
      type: 'password',
      message: 'password:',
      validate: validator,
    },
  ]);
  return answers;
}

/**
 * This callback type is called askQuestionsFunction callback and
 * is displayed as a global symbol
 * @callback askQuestionsFunction
 * @param {validatorCallback} validator
 * @return {Object} returns answer object got from the user
 */

/**
* Function handles the user configuration in CLI
* @namespace userConfig
* @param {askQuestionsFunction} askQuestionsFunction
* @param {validatorCallback} validator
* @return {void} reutrns nothing but handles the user configuration acton
**/
async function userConfig(askQuestionsFunction, validator) {
  const answers = await askConfigQuestions(validator);
  config.set({
    username: answers['facebook-username'],
    password: answers['facebook-password'],
  });
}

/**
* Function show a help page line on the console.
* @namespace helpPageLine
* @param {string} command command name to show
* @param {string} description command description to show
* @return {void} returns nothing but shows the help page line on the console
**/
function helpPageLine(command, description) {
  const magenta = chalk.magenta;
  console.info('  ' + magenta(command) + ':  ' + description);
}

/**
 * This callback type is called 'helpPageLineCallback and
 * is displayeed as global symbol
 * @callback helpPageLineCallback
 * @param {string} command command name to show
 * @param {string} description command description to show
 * @return {void} returns nothing but shows the help line on the console
 */

/**
* Function shows help page.
* @namespace help
* @param {helpPageLineCallback} helpPageLine Function that logs a help
 page line with given parameters
* @return {void} returns nothing but shows help page on the console.
**/
function help(helpPageLine) {
  console.info('Available options:');
  helpPageLine(
      '--group-ids',
      '  Indicates which groups ids that we want to' +
      ' scrape (seperated by commas)',
  );
  helpPageLine('-h, --help', '   Shows the help page');
  helpPageLine('-v, --version', 'Shows the CLI version');
  helpPageLine('--output', '     Specify the output folder destination');
  helpPageLine('--headful', '    Disable headless mode');
  console.info('Available commands:');
  helpPageLine('init', '         Initialize user configuration');
}

/**
* Function shows error message.
* @namespace error
* @param {string} message message to display.
$ @return {void} returns nothing but shows an error message on the console
**/
function error(message) {
  console.error(
      chalk.bold.red('ERROR:') +
        ' ' +
        message,
  );
}

/**
* function shows the version of CLI.
* @namespace version
* @return {void} returns nothing but shows CLI version on console
**/
function version() {
  console.log(package.version);
}

/**
* function shows if user configured or not.
* @namespace isUserConfigured
* @return {bool} returns if user configured or not.
**/
function isUserConfigured() {
  return (
    config.get('username') !== undefined &&
    config.get('username') !== null &&
    config.get('password') !== undefined &&
    config.get('password') !== null
  );
}


/**
* Function sleeps the current process for given number of milliseconds
* @namespace sleep
* @param {int} time parameter description
* @return {void} returns nothing but sleeps for time ms
**/
async function sleep(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
}

/**
 * This callback type is called 'sleepFunctionCallback' and
 * displayed as a global type
 * @callback sleepFunctionCallback
 * @param {int} time The number of ms that we want to sleep for
 * @return {void} returns nothing but sleeps the current process for
 * given number of milliseconds
 */

/**
* function scrolls the page.
* @namespace autoScroll
* @param {Page} page the current page opened on browser
* @param {sleepFunctionCallback} sleep The function used for
sleeping the current process
* @return {void} returns nothing but scrolls the page.
**/
async function autoScroll(page, sleep) {
  await page.evaluate(async () => {
    /**
    * Function sleeps the current process for given number of milliseconds
    * @namespace sleep
    * @param {int} time parameter description
    * @return {void} returns nothing but sleeps for time ms
    **/
    async function sleep(time) {
      return new Promise(function(resolve) {
        setTimeout(resolve, time);
      });
    }

    for (let i = 0; i < Math.round((Math.random() * 10) + 10); i++) {
      window.scrollBy(0, document.body.scrollHeight);
      await sleep(
          Math.round(
            ((Math.random() * 4000) + 1000),
          ),
      );
    }
    Promise.resolve();
  });
}

/**
* Funciton generates the Facebook group URL from the given group id.
* @namespace generateFacebookGroupUrlFromId
* @param {string} groupId facebook group id
* @return {string} returns the Facebook group url
* related to the given Facebook group id
**/
function generateFacebookGroupUrlFromId(groupId) {
  return 'https://m.facebook.com/groups/' + groupId + '/';
}

/**
* function creates a browser instance.
* @namespace createBrowser
* @param {Object} arguments Comamnd line arguments parsed from user input
* @return {Browser} returns the Browser object
**/
async function createBrowser(arguments) {
  const browserOptions = {
    headless: arguments['headful'] === false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sendbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--lang=en-GB'
    ],
  };

  if (process.arch === 'arm' || process.arch === 'arm64') {
    // If processor architecture is arm or arm64 we need to use chromium browser
    browserOptions.executablePath = 'chromium-browser';
  }

  const browser = await puppeteer.launch(browserOptions);
  return browser;
}

/**
* Function creates an incognito page from the given browser instance.
* @namespace incognitoMode
* @param {Browser} browser The browser object that we want to create
 the incognito page
* @return {Page} returns the page in the incognito mode
**/
async function incognitoMode(browser) {
  /**
   * We need an incognito browser to avoid notification
   *  and location permissions of Facebook
   **/
  const incognitoContext = await browser.createIncognitoBrowserContext();
  // Creates a new borwser tab
  const page = await incognitoContext.newPage();
  return page;
}

/**
* Funciton sets the listeners to avoid to load unnecessary content.
* @namespace setPageListeners
* @param {Page} page The current page of the browser
* @return {void} returns nothing but configures listeners on the given
 page to avoid to load
* unnecessart content
**/
async function setPageListeners(page) {
  await page.setRequestInterception(true);
  const blockResources = [
    'image', 'media', 'font', 'textrack', 'object',
    'beacon', 'csp_report', 'imageset',
  ];
  page.on('request', (request) => {
    const rt = request.resourceType();
    if (
      blockResources.indexOf(rt) > 0 ||
            request.url().match(/\.((jpe?g)|png|gif)/) != null
    ) {
      request.abort();
    } else {
      request.continue();
    }
  });
}

/**
 * The callback function called 'setPageListenersCallback and
 * displayed as a global type
 * @callback setPageListenersCallback
 * @param {Page} page The page that we set our listeners on
 * @return {void} Returns nothing but sets the listeners on the given page
 */

/**
* Function handles the Frabook login of the user.
* @namespace facebookLogin
* @param {Object} arguments command line arguments parsed with minimist
* @param {Page} page the incognito page that we are using for login
* @param {setPageListenersCallback} setPageListeners the function that
 sets the page listeners to speed up
* @return {Page} returns the page when the user logged in
**/
async function facebookLogIn(arguments, page, setPageListeners) {
  // await page.goto('https://facebook.com', { waitUntil: "networkidle2" });
  // console.log(await page.evaluate(() => document.title));
  // console.log(await page.evaluate(() => document.cookie));
  await setPageListeners(page);
  return page;
  // if (!Object.keys(cookies).length) {
  //     // Goes to base facebook url
  //   await page.goto('https://facebook.com', { waitUntil: "networkidle2" });
  //   // await page.waitForXPath('//button[@data\-cookiebanner="accept_button"]');
  //   // var acceptCookiesButton = (await page.$x('//button[@data\-cookiebanner="accept_button"]'))[0];
  //   // await page.evaluate(el => {
  //   //   el.focus();
  //   //   el.click();
  //   // }, acceptCookiesButton)
  //   /**
  //    * Waiting for login form JQuery selector to avoid
  //    * that forms elements to be not found
  //   **/
  //   await page.waitForSelector(selectors.login_form.parent);
  //   // Focusing to the email input
  //   await page.focus(selectors.login_form.email);
  //   // Clicking on the email form input to be able to type on input
  //   await page.focus(selectors.login_form.email);
  //   // Typing on the email input the email address
  //   await page.keyboard.type(config.get('username'), { delay: 30 });
  //   // Focusing on the password input
  //   await page.focus(selectors.login_form.password);
  //   // Typing the facebook password on password input
  //   await page.keyboard.type(config.get('password'), { delay: 30 });
  //   // Clicking on the submit button
  //   // await page.waitForXPath("//button[contains(., 'Log In')]")
  //   // const [loginButton] = await page.$x("//button[contains(., 'Log In')]");
  //   // await page.evaluate((el) => {
  //   //   el.click();
  //   // }, loginButton);
  //   await sleep(500);

  //   await page.click("#u_0_b")
  //   await page.waitForNavigation({ waitUntil: "networkidle0" });
  //   let currentCookies = await page.cookies();
  //   fs.writeFileSync('./cookies.json', JSON.stringify(currentCookies));
  //   await page.waitForXPath('//div[@data\-pagelet="Stories"]');
  //   await setPageListeners(page);
  //   return page;
  // }else{
  //   // console.log('login already')
  //   await setPageListeners(page);
  //   return page;
  // }
}

/**
* function gets old publications.
* @namespace getOldPublications
* @param {type} fileName name of the file
* @return {Object[]} returns the list of all publications.
**/
function getOldPublications(fileName) {
  let allPublicationsList;
  if (fs.existsSync(fileName) === true) {
    // If file exists
    allPublicationsList = JSON.parse(
        fs.readFileSync(fileName, {encoding: 'utf8'}),
    );
  } else {
    // If file does not exists
    allPublicationsList = [];
  }
  return allPublicationsList;
}

/**
 * The callback function called getOldPublicationsCallback and
 * displayed as a global type
 * @callback getAllPublicationsCallback
 * @param {string} fileName The file name that we want to load
 * old publications from
 * @return {Object[]} The list of old publications loaded from
 *  the given fileName
 */

/**
  * The callback function called autoScrollFunction and
  * displayed as a global type
  * @callback getAutoScrollFunction
  * @param {Page} page The page that we want to scroll
  * @param {sleepFunctionCallback} sleep The sleep function that
  * we are using for waiting before scroll
  * @return {Page} The scrolled page
  */

/**
* Function handles the main execution of the Facebook bot.
* @namespace facebookMain
* @param {Object} arguments Command line arguments parsed with minimist
* @param {string} groupUrl The url of the Facebook group
* @param {Page} page The actual page of browser
* @param {string} id The id of the facebook group
* @param {getOldPublicationsCallback} getOldPublications The function used for
loading the older publications
* @param {autoScrollFunction} autoScroll The function used for
scrolling automatically
* @param {sleepFunctionCallback} sleep The sleep function that
 we use in autoScroll
* @return {void} returns nothing but scrape all questions from specific groups
**/
async function facebookMain(
    arguments,
    groupUrl,
    page,
    id,
    getOldPublications,
    autoScroll,
    sleep,
) {
  // Navigates to the first facebook group Türk Ögrenciler - Paris
  await page.goto(
      groupUrl,
      {timeout: 600000},
  );

  /**
   * Waiting for the group stories container to continue
   * and to avoid the selector not found error
  **/
  // Getting all Facebook group posts

  const groupNameHtmlElement = (await page.$x('/html/head/title'))[0];
  let groupName = await page.evaluate(
      (el)=> {
        return el.textContent;
      },
      groupNameHtmlElement,
  );

  if (arguments['debug'] === true) {
    console.log('Group title ' + groupName);
  }
  
  groupName = groupName.replace(/\//g, '_');
  // const fileName = arguments['output'] + groupName + '.json';
  const fileName = 'data/logs_'+groupName+'.json';
  const allPublicationsList = getOldPublications(fileName);

  // List contains all publications
  // Variable indicates if any new posts found on the page
  do {
    if (arguments['debug'] === true) {
      console.log(`Total posts before scraping ${allPublicationsList.length}`);
    }

    sleep(((Math.floor(Math.random() * 2)) + 2) * 50)
    var resultsData = await page.evaluate(() =>  {
      var content = []

      let elements = Array.from(document.querySelectorAll('.story_body_container'));
      for(ele of elements) {
        // let focus_child = ele.querySelectorAll('div')
        let all_nodes = []
        ele.childNodes.forEach(node => { all_nodes.push(node.querySelector(':not([data-sigil="m-feed-voice-subtitle"])').innerText)});
        
        let last_data = ''
        for(index_node in all_nodes) {
          if(index_node != 0) {
            last_data += ' ' + all_nodes[index_node]
          }
        }
        let postcode = ele.lastChild.querySelector(':not([data-sigil="m-feed-voice-subtitle"])').querySelector('div._s35');
        if(postcode != null) postcode = postcode.innerText
        // let last_data = ele.lastChild.querySelector(':not([data-sigil="m-feed-voice-subtitle"])').innerText;
        if(typeof postcode != 'undefined' && postcode != null && postcode.length > 0) {
          last_data = last_data.replace(postcode,'')
        }
       
        var text_more_expose = ''
        let more_expose = typeof ele.querySelectorAll('.text_exposed_show') == 'undefined' || ele.querySelectorAll('.text_exposed_show').length <= 0 ? "" : ele.querySelectorAll('.text_exposed_show');
        if(more_expose.length> 0 && more_expose != '' && typeof more_expose != 'undefined') {
          for(itemMore of more_expose) {
            if(itemMore != null && typeof itemMore != 'undefined') {
              text_more_expose+= typeof itemMore.innerText == 'undefined' || itemMore.innerText == null ? '' : itemMore.innerText
            }
          }
          // let moreExData = more_expose.querySelector('.text_exposed_show');
          
        }
        // var text_more_expose = typeof ele.querySelector('.text_exposed_show') == 'undefined' || ele.querySelector('.text_exposed_show') == null ? "" : ele.querySelector('.text_exposed_show').innerText;
        var text_exposed_hide = typeof ele.querySelector('.text_exposed_hide') == 'undefined' || ele.querySelector('.text_exposed_hide')== null ? "" : ele.querySelector('.text_exposed_hide').innerText;
        let text_exposed_replace = ''
        if(text_exposed_hide != '') {
          text_exposed_replace = last_data.replace(text_exposed_hide)
        }
        var text_main = text_more_expose == '' ? last_data : text_exposed_replace + text_more_expose;

        text_main = text_main.replace('undefined', '')
        content.push(
          {
            'content': text_main ,
            'authorName': ele.querySelector('h3 strong:first-child').textContent,
            'datetime' : ele.querySelector('[data-sigil="m-feed-voice-subtitle"] a').textContent,
            'link' : ele.querySelector('[data-sigil="m-feed-voice-subtitle"] a').href
          }
        )
      }
      return content
    });

    var count = 0
    // Looping oneach group post html elemen to get text and author
    for (let i = 0; i < resultsData.length; i++) {
      var datetime = resultsData[i].datetime;
      
      if (arguments['debug'] === true) {
        console.log(`i=${i}`);
      }

    if(datetime.indexOf('at') > 0 || datetime.indexOf('hrs') > 0){
      if(count < 5) {
        count++;
        continue;
      }else{
        fs.writeFileSync(
          fileName,
          JSON.stringify(allPublicationsList, undefined, 4),
          {encoding: 'utf8'},
        );
        return;
      }
     }

    // var datetimeConvert = ''
    // datetimeConvert = datetime.replace("นาที", "min");
    // datetimeConvert = datetime.replace("ชม.", "hr");

    var dateNew = ''
    var dateNewResult = await fbDate.get_fb_date(datetime);
    if(dateNewResult){
      dateNew = (new Date(dateNewResult)).toString();
    }else{
      dateNew = Date.parse(dateNewResult);
    }
    if (dateNew == 'Invalid Date') {
      dateNew = new Date();
    }

    if(diff_hours(new Date(), new Date(dateNew)) > 1) {
      if(count > 5) { 
        fs.writeFileSync(
          fileName,
          JSON.stringify(allPublicationsList, undefined, 4),
          {encoding: 'utf8'},
        );
        return;
      }else{
        count++;
        continue;
      }
    }


    const publication = {
      author: resultsData[i].authorName,
      content: resultsData[i].content,
      link: resultsData[i].link,
      datetime: dateNew
    };

      // variable indicates if publication exists in allPublicationsList
      let isPublicationExists = false;

      // Check if publication exists in allPublicationsList
      for (let a = 0; a<allPublicationsList.length; a++) {
        const otherPublication = allPublicationsList[a];
        if (
          (publication.content === otherPublication.content) &&
                    (publication.author === otherPublication.author)
        ) {
          // If publication exists in allPublictationList
          isPublicationExists = true;
          break;
        } else {
          // if publication does not exists in allPublictationList
          isPublicationExists = false;
        }
      }

      /**
       * Once we got the response from the check
       * publication in allPublicationsList
      **/
      if (isPublicationExists === false) {
        allPublicationsList.push(publication);
        isAnyNewPosts = true;
      }else{
        isAnyNewPosts = false;
      }
    }

    /**
     * All html group post elements are added on
     * global publictions list (allPublictionList)
     **/
    if (arguments['debug'] === true) {
      console.log('Total posts before scrolling' + allPublicationsList.length);
    }
    /**
     *  console.log(`Total posts before
     * scrolling ${allPublicationsList.length}`);
    **/
    // Both console.log statement above are same


    await autoScroll(page, sleep);
  } while (isAnyNewPosts === true);
  console.info(
      groupName +
      ' Facebook group\'s posts scraped: ' +
      allPublicationsList.length +
      ' posts found',
  );
  await fs.writeFileSync(
      fileName,
      JSON.stringify(allPublicationsList, undefined, 4),
      {encoding: 'utf8'},
  );
  return
// await browser.close();
}

/**
* Function handles the main process of the scraper
* @namespace main
* @param {Object} arguments arguments parsed from command line with minimist
* @param {askQuestionsFunctionCallback} askQuestionsFunction
The function used for asking questions to user configuration
* @param {validatorFunctionCallback} validator The function used for
validate user answsers
* @param {createBrowserCallback} createBrowser function that creates the browser
* @param {incognitoModeCallback} incognitoMode function creates an
incognito mode from the given browser
* @param {setPageListenersCallback} setPageListeners function sets the page
* listeners on the given page
* @param {generateFacebookGroupUrlFromIdCallback} generateFacebookGroupUrlFromId
function sets the page
* listeners on the given page
* @param {facebookMainCallback} facebookMain The main function used for
 scraping data from facebook
* @param {getOldPublicationsCallback} getOldPublications The function
 used for loading old publications
* @param {autoScrollCallback} autoScroll The function used for auto scrolling
* @param {sleepFunctionCallback} sleep The function used for
sleeping the current process
* @return {void} returns nothing but calls the FacebookMain
* function for each groupId once logged in
**/
async function main(
    arguments,
    askQuestionsFunction,
    validator,
    createBrowser,
    incognitoMode,
    setPageListeners,
    generateFacebookGroupUrlFromId,
    facebookMain,
    getOldPublications,
    autoScroll,
    sleep,
) {
  if (isUserConfigured() === false) {
    await userConfig(askQuestionsFunction, validator);
  }

//groups
//  arguments['group-ids'] = '458098031664389,828001787348618,taradcondo,493801904328548,1604160379797295,1809918985887417,1965252317136254,275678356775719,prakard,728861290645180,770357389784713,landtoyou,211520586207563,299716057099018,201506827113877,1986622261663799,1166087117123565,inbangkokcondo,381475698884152,628600341344108,1922484551318356,461842327683291,774629652726107,condomarket,1900188416901425,918513708275659,property.exchange.center,328124851099063,235671627109277,698348860535511,210390739740584,694989714212908,hongdee,1687576608230772,895232507614250,1614893802095229,971888629619654,127202081207160,condobyamd,700053357211566,570276373309601,995615727143180,1508927629253734,anycondo,1974106929343755,doomyhome,702937023617112,656862761634217,630201357077874,1636126916415833,W3Living,325798948482396,plumrangsit,221945005610638,691539337669985,2648272705199689,2531929623686542,2490966460936700,2378803682335145,charoentran,2295227217356985,2159284734347274,2106929172957702,2064854547122015,2046245172358040,1909551669287104,1882723421791849,1788386674734122,1680661472170569,1672821179658958,1633478036765811,1627273357578168,1626040321016300,1582222215422425,1559048204330851,1512942549024788,1428708247230870,1424363091005180'
///
  const facebookGroupIdList = arguments['group-ids'].split(',');
  const browser = await createBrowser(arguments);
  let page = await browser.newPage();
  // let page = await incognitoMode(browser);
  await page.setUserAgent("User agent Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.0 Safari/537.36");
  page = await facebookLogIn(arguments, page, setPageListeners);
  // for (var i = 0; i < facebookGroupIdList.length; i++) {
  for (let i = 0; i < facebookGroupIdList.length; i++) {
    const id = facebookGroupIdList[i];
    const groupUrl = generateFacebookGroupUrlFromId(id);

    await facebookMain(
        arguments,
        groupUrl,
        page,
        id,
        getOldPublications,
        autoScroll,
        sleep,
    );
  }
  await browser.close();
  // await sendNotifyAdmin('public donne')
}

if (
  fs.existsSync(arguments['output']) === false ||
    fs.lstatSync(arguments['output']).isDirectory() === false
) {
  // output is not exists or not a directory
  error(
      arguments['output'] +
      'does not exists or is not a directory. '+
      'Please retry with an existing directory path',
  );
  process.exit(1);
}

if (arguments['help'] === true) {
  help(helpPageLine);
  process.exit(0);
}

if (arguments['version'] === true) {
  version();
  process.exit(0);
}

// if (arguments['_'].includes('init')) {
if (arguments['_'].indexOf('init') !== -1) {
  userConfig(askConfigQuestions, validator).then(() => {
    process.exit(0);
  });
} else {
  if (arguments['group-ids'] !== undefined && arguments['group-ids'] !== null) {
    main(
        arguments,
        askConfigQuestions,
        validator,
        createBrowser,
        incognitoMode,
        setPageListeners,
        generateFacebookGroupUrlFromId,
        facebookMain,
        getOldPublications,
        autoScroll,
        sleep,
    ).then(() => {
      if (arguments['debug'] === true) {
        console.log('Facebook group scraping done');
      }
    });
  } else {
    error('No argument specified. Please check help page for valid arguments');
    help(helpPageLine);
    process.exit(1);
  }
}

function diff_hours(dt2, dt1){
  var diff =(dt2.getTime() - dt1.getTime()) / 1000;
  diff /= (60 * 60);
  return Math.abs(Math.round(diff));
  
 }

 async function sendNotifyAdmin(message) {
  var data = await request({
      method: 'POST',
      uri: 'https://notify-api.line.me/api/notify',
      header: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      auth: {
          bearer : 'jmw673xmGeVeWs3kIqUVvi1UplB6jMn0YtCJclVdDaH'
      },
      form: {
        message: message,
      },
    })
}

 async function isValidHttpUrl(string) {
  let url;
  
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }

  return url.protocol === "http:" || url.protocol === "https:";
}
