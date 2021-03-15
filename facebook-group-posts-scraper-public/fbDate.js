async function get_fb_date(fb_str_date){
    fb_str_date = fb_str_date.toLowerCase()
    let now = new Date();
    fb_str_date  = await clean_fb_text(fb_str_date);
    const min_hour_num = await get_min_hour_fb_time(fb_str_date);
    if(min_hour_num){
        return now.setMinutes( now.getMinutes() - min_hour_num );
    }
    
    const week_date_result = await get_week_date_and_yesterday(fb_str_date)
    if(week_date_result){
        return week_date_result;
    }else{
        return fb_str_date;
    }
}
//sunday =0 monday =1  ... saturday =6
async function get_week_date_and_yesterday(fb_str_date){
    let now = new Date();
    let now_day_of_week = now.getDay();
    let week_day_dict = {
        "sunday" : 0,
        "monday" : 1,
        "tuesday" : 2,
        "wednesday" : 3,
        "thursday" : 4,
        "friday" : 5,
        "saturday" : 6,
    };
    for(let week_day in week_day_dict){
        if(fb_str_date.includes(week_day)){
            let subtract_date = 7 + now_day_of_week - week_day_dict[week_day];
            if(now_day_of_week > week_day_dict[week_day]){
                subtract_date = now_day_of_week - week_day_dict[week_day];
            }
            now.setDate(now.getDate() - subtract_date);
            fb_str_date = fb_str_date.replace(week_day, now.toLocaleDateString());
            // console.log(week_day, fb_str_date, now);
            return new Date(fb_str_date);
        }
        else if(fb_str_date.includes("yesterday")){
            now.setDate(now.getDate() - 1);
            fb_str_date = fb_str_date.replace("yesterday", now.toLocaleDateString());
            // console.log("yesterday", fb_str_date, now);
            return new Date(fb_str_date);
        }
    }
    return null;
}

async function clean_fb_text(fb_str_date){
    let clear_text_arr = ["ago", "at"];
    
    for(let clear_text of clear_text_arr){
        fb_str_date = fb_str_date.replace(clear_text, "");
    }
    return fb_str_date.trim();
}

async function get_min_hour_fb_time(fb_str_date)
{
    let date_text = fb_str_date.trim();
    let min_hour_text_arr = ["mins", "min","hrs", "hr"];
    for(let min_hour_text of min_hour_text_arr){
        if(date_text.includes(min_hour_text)){
            date_text = date_text.replace(min_hour_text).trim();
            const parsed = parseInt(date_text);
            if (!isNaN(parsed)) { 
                if(fb_str_date.includes(min_hour_text)){
                    return parsed;
                }else{
                    return parsed * 60;
                }
                
            }
            
        }
    }
    return null;
}

// function test(){
//     let test_case  =['1 min',
//     '1 hr',
//     '10 mins',
//     '10 hrs',
//     '1 hr ago',
//     '2 hrs ago',
//     '1 min ago',
//     '10 mins ago',
//     'Yesterday at 12:46 PM',
//     'Monday at 12:46 PM',
//     'December 28, 2020 at 8:44 PM']
//     for(let test_date of test_case){
//         let result = get_fb_date(test_date);
//         if(result){
//             console.log(test_date , '-------->>>> ', (new Date(result)).toString());
//         }else{
//             console.log(test_date , '-------->>>> ', Date.parse(result));
//         }
        
//     }
    
// }

module.exports = {
    get_fb_date
}