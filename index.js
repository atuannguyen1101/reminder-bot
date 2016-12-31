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
            //let reminder_event = 
            parseResponse(sender, text)
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

function createReminder(sender, rem_event){

    if (rem_event.err)
        sendTextMessage(sender, rem_event.err)
    else{
        rem_event.sender = sender
        reminders.push(rem_event)
        sendTextMessage(sender, "Reminder created!")
    }    
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

function calcInterval(reminder_event, sender, timestr){

    var hours = Number(timestr.match(/^(\d+)/)[1])
    var minutes = Number(timestr.match(/:(\d+)/)[1])
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
            var interval = (hours * 3600 + minutes * 60) - ((curr_hr + timezone) * 3600 + curr_min * 60 + curr_sec)
            console.log("ehrs: %d, emin: %d, curr_hr: %d, curr_min: %d", hours, minutes, curr_hr, curr_min)
            

            reminder_event.sender = sender
            reminder_event.etime = interval

            if(interval <= 0){
                reminder_event.err = "Invalid time, must be after the current time."
                createReminder(sender, reminder_event)
                return
            }

            createReminder(sender, reminder_event)
        }
    })

    //console.log("Timezone: GMT+%d", timezone)

    //var interval = (hours * 3600 + minutes * 60) - ((curr_hr + timezone) * 3600 + curr_min * 60 + curr_sec)
    //console.log("ehrs: %d, emin: %d, curr_hr: %d, curr_min: %d", hours, minutes, curr_hr, curr_min)
    //return interval * 1000
}

function parseResponse(sender, text){

    var words = text.split(" ")
    var num_words = words.length
    var reminder_event = {sender: null, evnt: "", etime: 0, err: ""}

    if(num_words < 3){
        reminder_event.err = "Invalid format, please use format <event> at <time in 24-h>."
        createReminder(sender, reminder_event)
        return
    }

    var at_pos = -1;
    for(var i = num_words - 1; i >= 0; i--){
        if(words[i] == "at"){
            at_pos = i;
            break;
        }
    }

    if(at_pos == -1){
        reminder_event.err = "Invalid format, please use format <event> at <time in 24-h>."
        createReminder(sender, reminder_event)
        return
    }

    reminder_event.evnt = words.slice(0, at_pos).join(" ")
    var time_str = words[at_pos+1]

    //var interval = 
    calcInterval(reminder_event, sender, time_str)
    // if (interval <= 0){
    //     reminder_event.err = "Invalid time, must be after the current time."
    //     return reminder_event
    // }

    // reminder_event.etime = interval
    // return reminder_event
}

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