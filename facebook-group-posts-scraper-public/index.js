var fs  = require('fs');
const path = require('path');
const request = require('request-promise')
var hash = require('hash.js')
const ES_SOURCE = 'fb_g';
var autoML = require('./../auto-ML/autoML-Google_fb');
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: process.env.ES_HOST,
});
var start_all = 0;
var count_text = 0
var es_hash = []

// const ES_TYPE = {
//   buy: 'unknown',
//   sell: 'sell',
//   rent: 'unknown',
//   rentout: 'rentout',
//   unknown: 'unknown'
// }

async function getDataListFromFile(filename) {
  var result_arr = []
  const content = fs.readFileSync(filename, 'utf-8');
  const items = await JSON.parse(content);
  // count_text += items.length;
  for(var item of items) {

    const id = item.link;
    let description = item.content;
    const datetime = item.datetime;
    const from = {"display_image":"","email":"","id":"","name":item.author};
    const jsonContent = item;

    const hash_content = await get_sha256_hash(description);
    // if(description.indexOf('… More') >= 0 || description.indexOf('… เพิ่มเติม') >= 0) {
    //   sleep(((Math.floor(Math.random() * 2)) + 2) * 50)
    //   description = await getMoreDetail(id)
    // }

    if(typeof(es_hash[hash_content]) == 'undefined' && id && id != 'undefined' 
      && description != 'undefined' && description 
      && datetime != 'undefined' && datetime)
    {
      count_text += 1;
      let price = 0;
      let price_predict = {}
      try {
        // price_predict = await autoML.predictPrice(item.content);
        // price = price_predict.price
      } catch (err) {
        price = 0
      }
  
      let type = '';
      try {
        type = await autoML.fb_predict(item.content)
      } catch (err) {
        type = 'unknown'
      }

      let is_checked = '';
      try{
        is_checked = await autoML.fb_predict_owner(item.content);
      }catch (err) {
        is_checked = ''
      }

      let replace_price = 0;
      try {
        if(price != 0) {
          price = price.split(' ');
          let a_price = []
          for(item_price of price) {
           replace_price = item_price.replace('.-', '')
           replace_price = item_price.replace(/[^0-9-\.]/g,"")
           a_price.push(replace_price)
          }
         
          replace_price = Math.max.apply(Math, a_price);
          
          if(replace_price.indexOf('-') > 0) {
            let split = replace_price.split("-");
            replace_price = Math.max.apply(Math, split);
            // replace_price = split[1]
          }

          if (replace_price[replace_price.length-1] == ".") {
            replace_price = replace_price.slice(0, -1);
        }
    
        if (replace_price[0] == ".") {
            replace_price = replace_price.slice(1, replace_price.length-1);
        }

          let lower_price = price.toLowerCase()
          if(replace_price.length <= 4) {

            let detect_bl_th = lower_price.indexOf("พันล้านบาท");
            let detect_bl_th1 = lower_price.indexOf("พันลบ.");
            let detect_bl_en = lower_price.indexOf("billion");
            let detect_bl_en1 = lower_price.indexOf("bn");

            if(detect_bl_th > 0 || detect_bl_th1 > 0 || detect_bl_en > 0 || detect_bl_en1 > 0) {
                lower_price = parseFloat(replace_price) * 1000;
            }
            let detect_ml_th_minimal = lower_price.indexOf("ลบ.");
            let detect_ml_th = lower_price.indexOf("ล้าน");
            let detect_ml_th1 = lower_price.indexOf("ล.");
            let detect_ml_en_minimal = lower_price.indexOf("mb");
            let detect_ml_en = lower_price.indexOf("millon");

            if(detect_ml_th_minimal > 0 || detect_ml_th > 0 || detect_ml_en_minimal > 0 || detect_ml_en > 0 || detect_ml_th1 > 0) {
              replace_price = parseFloat(replace_price) * 1000000
            }

            let detect_ml_en_thousand = lower_price.indexOf("k");
            if(detect_ml_en_thousand > 0) {
                replace_price = parseFloat(replace_price) * 1000
            }

            // let detect_ml_th_ten_thousand = lower_price.indexOf("k");
            // if(detect_ml_th_ten_thousand > 0) {
            //     replace_price = parseFloat(replace_price) * 1000
            // }
          }
        }
      } catch (err) {
        replace_price = 0
      }

      if (replace_price[replace_price.length-1] == ".") {
        replace_price = replace_price.slice(0, -1);
      }

      if (replace_price[0] == ".") {
          replace_price = replace_price.slice(1, replace_price.length-1);
      }

      if(replace_price.length <=3) {
        replace_price = 0
      }

      if(isNaN(replace_price)) replace_price = 0

      result_arr.push({
        u: item.link ,
        s: ES_SOURCE,
        c : description,
        dt: new Date(),
        f : JSON.stringify(from),
        d : JSON.stringify(jsonContent),
        t : typeof type == 'undefined' ? '' : type,
        p: replace_price,
        p_scored: typeof price_predict.score == 'undefined' ? 1 : price_predict.score,
        hash_c: hash_content,
        type_agent: typeof is_checked.type == 'undefined' ? '' : is_checked.type,
        type_agent_scored: typeof is_checked.score == 'undefined' ? '' : is_checked.score,
      });

      es_hash[hash_content] = 1
    }
  }

  return result_arr;
}

async function start_index_detail(dirname) {
  const filenames = fs.readdirSync(dirname);
  var result_arr = [];
  for(let filename of filenames){
    const file_detail_arr = await getDataListFromFile(dirname + filename);
    result_arr = result_arr.concat(file_detail_arr);
  }
  return result_arr;
}

async function getElasticSearch() {

  let data = await request({
    method: 'GET',
    uri: 'https://realestate.bdata.asia/api/connectEs/getElasticSearch'
  })
  return data
}

async function add_index_es(item){

  var data = await request({
    method: 'POST',
    uri: 'https://realestate.bdata.asia/api/connectEs/connectEs',
    header: {
      'Content-Type': 'application/json',
    },
    json: {
      items: item,
    },
  })
  return data;
}

async function main(){
  // await es_service.init_es();
  const result_rows = await start_index_detail('./data/');
  for(item of result_rows){
    var id = await add_index_es(item);
    if(item.t == 'buy' || item.t == 'rent') {
      var message = 'https://realestate.bdata.asia/detail?id=' + id
      await sendNotify(message, '9ucrSlKS0VPTYam8IowqX27sdSecWhnG87HeOgFR38p')
    }
    if(item.t == 'rentout') {
      var message = 'https://realestate.bdata.asia/detail?id=' + id
      await sendNotify(message , 'N1zeKEkOOckbFL7CZroqM1IwNyu1mWOIAUX1P5Pzajq')
    }
  }
  var end_all = new Date() - start_all
  console.log('end_all',end_all)
  console.info('Execution time ALL : %dms', end_all)
  return true;
}

async function sendNotify(message, key) {
  var data = await request({
      method: 'POST',
      uri: 'https://notify-api.line.me/api/notify',
      header: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      auth: {
          bearer : key
      },
      form: {
        message: message,
      },
    })
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

async function clear_old_file_data(){
  await fs.readdir('./data/', (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join('./data/', file), err => {
        if (err) throw err;
      });
    }

  });
}

// async function getMoreDetail(url) {
//   const puppeteer = require('puppeteer');
//   const browserOptions = {
//     headless: true,
//     args: [
//       '--no-sandbox',
//       '--disable-setuid-sendbox',
//       '--disable-dev-shm-usage',
//       '--disable-accelerated-2d-canvas',
//       '--disable-gpu',
//       '--lang=en-GB'
//     ],
//   };

//   if (process.arch === 'arm' || process.arch === 'arm64') {
//     // If processor architecture is arm or arm64 we need to use chromium browser
//     browserOptions.executablePath = 'chromium-browser';
//   }

//   const browser = await puppeteer.launch(browserOptions);
//   let page = await browser.newPage();
//   await page.setUserAgent("User agent Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.0 Safari/537.36");

//   await page.goto(
//     url,
//     {timeout: 600000},
//   );

//   sleep(((Math.floor(Math.random() * 2)) + 2) * 1000)

//   let resultsData = await page.evaluate(() =>  {
//     let content = document.querySelectorAll('p');
//     let newContent = ''
//     for(itemcontent of content) {
//       if(itemcontent != null && typeof itemcontent != 'undefined') {
//         newContent+= typeof itemcontent.innerText == 'undefined' || itemcontent.innerText == null ? '' : itemcontent.innerText
//       }
//     }
//     return newContent
//   })
//   sleep(((Math.floor(Math.random() * 2)) + 2) * 1000)

//   await browser.close();
//   return resultsData
// }

async function sleep(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
}

async function init(){
  let a_search_es = await getElasticSearch();
  a_search_es = JSON.parse(a_search_es)
  if(a_search_es.length > 0) {
    for(item_es of a_search_es) {
      let item_source = item_es._source
      const hash_content = await get_sha256_hash(item_source.c);
      es_hash[hash_content] = 1
    }
  }

  await main();
  await clear_old_file_data();
  var message = 'FB Scraper Public Group is: ' + count_text
  await sendNotifyAdmin(message);
}

function get_sha256_hash(key){
  return hash.sha256().update(key).digest('hex');
}

init();
