#ReminderBot: Set reminders on Messenger!

Inspired by the increasing amounts of time we spend on Facebook, the bot allows users to set reminders and see them using natural language conversations.

Visit https://www.facebook.com/ReminderBot-1212986935459515/ (as of now, only developers and testers can interact with the bot).

###Features

The bot is written using Node.js and uses wit.ai for the Natural Language support. Users can do the following:

- Start a conversation by greeting the bot (e.g.: "Hello there!")
- Set a reminder (e.g.: "remind me to take out the trash in 30 mins" or "soccer match with friends at 10am tomorrow")
- View reminders that have not been completed (e.g.: "Show me my reminders")
- (In progress) Delete an existing reminder

Upon initial conversation, the bot retrieves the user's timezone from his facebook profile, and uses this as reference for all subsequent time entities.

As of now, the bot only supports events within 24 hours of the user issuing the reminder. This is, in part, because of the restriction that users must subscribe to the page before it can send them messages after a 24 hours since the user's last message to the page. More details coming as I try to find a clean workaround.