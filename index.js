'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

// var fs = require('fs')
// var readline = require('readline')
// var google = require('googleapis')
// var googleAuth = require('google-auth-library')

// var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
//     process.env.USERPROFILE) + '/.credentials/';
// var TOKEN_PATH = TOKEN_DIR + 'calendar.googleapis.com-nodejs-reminderbot.json';

// var google = require('googleapis')
// var OAuth2 = google.auth.OAuth2
// var calendar = google.calendar('v3')

// var oauth2Client = new OAuth2(
//     "1046330876699-612bmgjkh9utabu5icbg8nqdbqujr0d8.apps.googleusercontent.com",
//     "FYwz_Rl12aqWQgSj11tz4MDP",
//     "https://pure-castle-98425.herokuapp.com/gcalhook"
// );

// var scopes = [
//     'https://www.googleapis.com/auth/calendar'
// ];

// var url = oauth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: scopes
// });

var reminders = []
let Wit = null
let log = null

try {
  // if running from repo
  Wit = require('../').Wit;
  log = require('../').log;
} catch (e) {
  Wit = require('node-wit').Wit;
  log = require('node-wit').log;
}
var moment = require('moment')


const WIT_TOKEN = process.env.WIT_TOKEN;

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})



//////////////////////////////////////////////////

const sessions = {};

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

function init_authorize(){

    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }
    // Authorize a client with the loaded credentials, then call the
    // Google Sheets API.
    authorize(JSON.parse(content), handle);
    });
}

app.post('/webhook/', function (req, res) {


    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
            const sessionId = findOrCreateSession(sender)
            //let reminder_event = 
            //parseResponse(sender, text)
            wit.runActions(
                sessionId,
                text,
                sessions[sessionId].context
            ).then((context) => {
                sessions[sessionId].context = context
            })
            .catch((err) => {
                console.error('Oops! Got an error from Wit: ', err.stack || err);
            })
            // if (reminder_event.err)
            //     sendTextMessage(sender, reminder_event.err)
            // else{
            //     reminder_event.sender = sender
            //     reminders.push(reminder_event)
            //     sendTextMessage(sender, "Reminder created!")
            // }
        }
    }
    res.sendStatus(200)
})

function sendReminder(rem_event){

    let messageData = { text:"REMINDER: " + rem_event.evnt + " at " + rem_event.actualtime}
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:rem_event.sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function createReminder(sender, rem_event){

    
    rem_event.sender = sender
    reminders.push(rem_event)
    setTimeout(sendReminder, rem_event.etime, rem_event)

    return
}


const token = "EAARVNLWrpj8BAALWZAgBYrbTZAMC3XZCt3LiSYZA17kaDPCZCS5fyw9A40gZB5UOu8eMYjNUbwonDngxbsamwUrPOndo2Mnx5KppNltSq64ighG4lbKiSzzy9aBGVDkCUONFN9RZABWRYLSReVrZBx5FiqDzUUeHT9z0zHQmhcOJ1AZDZD"

function getTimeZone(sender){

    request({
        url: 'https://graph.facebook.com/v2.6/' + sender,
        qs: {access_token:token, fields: "timezone"},
        method: 'GET',
        json: true,
    }, function(error, response, body) {
        if (error) {
            console.log('Error fetching timezone: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }else{
            console.log(body)
            return body.timezone
        }
    })
}

function calcInterval(reminder_event, sender, etime, context, entities, resolve, reject){

    var hours = etime.getHours()
    var minutes = etime.getMinutes()
    var seconds = etime.getSeconds()
    var curr_date = new Date()
    var curr_hr = curr_date.getHours()
    var curr_min = curr_date.getMinutes()
    var curr_sec = curr_date.getSeconds()
    //var timezone = getTimeZone(sender)

    request({
        url: 'https://graph.facebook.com/v2.6/' + sender,
        qs: {access_token:token, fields: "timezone"},
        method: 'GET',
        json: true,
    }, function(error, response, body) {
        if (error) {
            console.log('Error fetching timezone: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }else{
            console.log(body)
            var timezone = body.timezone
            var interval = (hours * 3600 + minutes * 60 + seconds) - (((curr_hr + timezone)%24) * 3600 + curr_min * 60 + curr_sec)
            console.log("ehrs: %d, emin: %d, curr_hr: %d, curr_min: %d", hours, minutes, curr_hr, curr_min)
            
            interval = etime - moment.utc().utcOffset(timezone * 60)
            reminder_event.sender = sender
            reminder_event.etime = interval
            // needs new context
            if(interval <= 0){
                reminder_event.err = "Invalid time, must be after the current time."
                context.before_ctime = true
                delete context.event_time
                return resolve(context)
            }
            reminder_event.sender = sender
            createReminder(sender, reminder_event)
            //delete context.event
            //delete context.event_time
            delete context.before_ctime

            return resolve(context)
            //return createReminder(sender, reminder_event)
        }
    })

    //console.log("Timezone: GMT+%d", timezone)

    //var interval = (hours * 3600 + minutes * 60) - ((curr_hr + timezone) * 3600 + curr_min * 60 + curr_sec)
    //console.log("ehrs: %d, emin: %d, curr_hr: %d, curr_min: %d", hours, minutes, curr_hr, curr_min)
    //return interval * 1000
}

function fetchTimezone(context, entities, resolve, reject){

    var sender = context.sender
    request({
        url: 'https://graph.facebook.com/v2.6/' + sender,
        qs: {access_token:token, fields: "timezone"},
        method: 'GET',
        json: true,
    }, function(error, response, body) {
        if (error) {
            console.log('Error fetching timezone: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }else{
            console.log(body)
            var timezone = body.timezone
            var usrTime = moment.utc().utcOffset(timezone * 60).format()
            //var utc = date.getTime() + (date.getTimezoneOffset() * 60000)

            //var localDate = new Date(utc + 3600000 * timezone)
            context.reference_time = usrTime
            console.log(usrTime)

            return resolve(context)
            //return createReminder(sender, reminder_event)
        }
    })    
}

function parseResponse(context, entities, resolve, reject){

    var sender = context.sender
    var evnt
    // if (!('event' in context)){
    //     evnt = firstEntityValue(entities, "reminder")
    // }else{
    //     evnt = context.event
    // }
    if (!('reference_time' in context)){
        delete context.event
        delete context.event_time
        delete context.missing_time
        delete context.before_ctime
        delete context.is_error
        context.intro = true

        return fetchTimezone(context, entities, resolve, reject)
    }else{

        delete context.intro
    }
    evnt = firstEntityValue(entities, "reminder")
    if (!evnt && ('event' in context))
        evnt = context.event

    var time = firstEntityValue(entities, "datetime")

    if(!evnt){
        context.is_error = true
        delete context.event
        delete context.event_time
        delete context.missing_time
        delete context.before_ctime
    }else if(!time){
        context.missing_time = true
        context.event = evnt
        delete context.event_time
        delete context.is_error
        delete context.before_ctime
    }else{
        context.event = evnt
        context.event_time = time

        var strtime = String(time)
        var etime = new Date(strtime)

        var reminder_event = {sender: null, evnt: "", etime: 0, actualtime: 0, err: ""}
        reminder_event.sender = sender
        reminder_event.evnt = evnt
        reminder_event.actualtime = moment(strtime).format("HH:mm")

        delete context.missing_time
        delete context.is_error
        delete context.before_ctime

        return calcInterval(reminder_event, sender, etime, context, entities, resolve, reject)
    }

    return resolve(context)
}

// function parseResponse(sender, text){

//     var words = text.split(" ")
//     var num_words = words.length
//     var reminder_event = {sender: null, evnt: "", etime: 0, actualtime: 0, err: ""}

//     if(num_words < 3){
//         reminder_event.err = "Invalid format, please use format <event> at <time in 24-h>."
//         //createReminder(sender, reminder_event)
//         return reminder_event
//     }

//     var at_pos = -1;
//     for(var i = num_words - 1; i >= 0; i--){
//         if(words[i] == "at"){
//             at_pos = i;
//             break;
//         }
//     }

//     if(at_pos == -1){
//         reminder_event.err = "Invalid format, please use format <event> at <time in 24-h>."
//         //createReminder(sender, reminder_event)
//         return reminder_event
//     }

//     reminder_event.evnt = words.slice(0, at_pos).join(" ")
//     var time_str = words[at_pos+1]
//     reminder_event.actualtime = time_str

//     //var interval = 
//     return calcInterval(reminder_event, sender, time_str)
//     // if (interval <= 0){
//     //     reminder_event.err = "Invalid time, must be after the current time."
//     //     return reminder_event
//     // }

//     // reminder_event.etime = interval
//     // return reminder_event
// }

function sendTextMessage(sender, text){
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

///////////////////////////////////////////////

const findOrCreateSession = (fbid) => {

    let sessionId;

    Object.keys(sessions).forEach(k => {
        if (sessions[k].fbid === fbid){
            sessionId = k;
        }
    });
    if (!sessionId){
        sessionId = new Date().toISOString();
        sessions[sessionId] = {fbid: fbid, context: {sender: fbid}};
    }
    return sessionId;
};

const actions = {
    send({sessionId}, {text}){
        const recipientId = sessions[sessionId].fbid;
        if (recipientId) {
            // Yay, we found our recipient!
            // Let's forward our bot response to her.
            // We return a promise to let our bot know when we're done sending
            return sendTextMessage(recipientId, text)
            // .then(() => null)
            // .catch((err) => {
            //     console.error(
            //         'Oops! An error occurred while forwarding the response to',
            //         recipientId,
            //         ':',
            //         err.stack || err
            //     );
            // });
        } else {
            console.error('Oops! Couldn\'t find user for session:', sessionId);
            // Giving the wheel back to our bot
            return Promise.resolve()
        }
    },
    processReminder({context, entities}){

        return new Promise(function(resolve, reject){
            // code
            // becuase async call, pass all of this info (context, entities, resolve, reject)
            // to parseResponse
            return parseResponse(context, entities, resolve, reject)
            //return resolve(context)
        })

    },
};

const wit = new Wit({
  accessToken: WIT_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
});