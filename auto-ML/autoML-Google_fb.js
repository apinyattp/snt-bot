
  async function fb_predict(content) {
    var axios = require('axios');
    var FormData = require('form-data');
    var data = new FormData();
    data.append('query', content);
  
    var config = {
      method: 'post',
      url: 'https://smt-ai-rnt3pp7csq-de.a.run.app/predict',
      headers: { 
        ...data.getHeaders()
      },
      data : data
    };
  
   let type =  await axios(config)
    .then(function (response) {
      // let a_response = JSON.parse(response.data);
      let type = typeof response.data.intent[0] == 'undefined' ? 'fallback' : response.data.intent[0]
      return type;
    })
    .catch(function (error) {
      console.log(error);
    });
    return type
  }

  async function fb_predict_owner(content) {
    var axios = require('axios');
    var FormData = require('form-data');
    var data = new FormData();
    data.append('query', content);
  
    var config = {
      method: 'post',
      url: 'https://smt-ai-rnt3pp7csq-de.a.run.app/predict_owner',
      headers: { 
        ...data.getHeaders()
      },
      data : data
    };
  
   let type =  await axios(config)
    .then(function (response) {
      // let a_response = JSON.parse(response.data);
      let type = ''
      if(typeof response.data.owner_score != 'undefined') {
        if(response.data.owner_score < 0.4) {
          type = 'agent';
        }else{
          type = 'owner'
        }
      }

      return {type: type, score: response.data.owner_score};
    })
    .catch(function (error) {
      console.log(error);
    });
    return type
  }

  module.exports = {
    fb_predict,
    fb_predict_owner
  }
