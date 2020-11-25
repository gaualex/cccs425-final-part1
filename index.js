const express = require("express");
const app = express();

const cors = require('cors');
app.use(cors());

//===================== from Glitch ==========================
// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));
//===================== from Glitch ==========================

//===================== from Professor ==========================
app.get('/sourcecode', (req, res) => {
  res.send(require('fs').readFileSync(__filename).toString());
});
//===================== from Professor ==========================

// The only libraries you are allowed to use are express, body-parser, cors and morgan.

let bodyParser = require('body-parser');
app.use(bodyParser.raw({ type: "*/*" }));

let passwords = new Map(); // user-passwords pairs
let sessions = new Map(); // user-token pairs
let channels = new Map(); // channel-token[] pairs
let bans = new Map(); // userName-channel[] pairs
let messages = new Map(); // channel-messages[] pairs

// generates random tokens for sessions
let genToken = () => {
  let baseStr = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let min = 0;
  let max = baseStr.length;
  let tokenLength = 64;
  
  let token = "";
  
  for (let i = 0; i < tokenLength; i++) {
    token += baseStr.charAt(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  
  return token;
};

// to check if channel containes user
let hasUser = (channelName, userToken) => {
  
  for (let i = 0; i < channels.get(channelName).users.length; i++) {
    if (channels.get(channelName).users[i] === userToken) {
      return true;
    } 
  } 
  
  return false;
  
};

// to check if channel containes user
let hasChannel = (channels, channelName) => {
  
  for (let i = 0; i < channels.length; i++) {
    if (channels[i] === channelName) {
      return true;
    } 
  } 
  
  return false;
  
};

// to remove a user from a chanel
let removeUser = (channelName, userToken) => {
  
  let tmpUsers = [];
  
  for (let i = 0; i < channels.get(channelName).users.length; i++) {
    
    console.log("UserName: " + sessions.get(channels.get(channelName).users[i])); 
    
    if (channels.get(channelName).users[i] !== userToken) {
      tmpUsers.push(channels.get(channelName).users[i]);
    } 
  } 
  
  channels.get(channelName).users = tmpUsers;
  
};

// get user list array from channelUsers array
let getUserList = (channelName) => {
  
  let userList = []
  
  for (let i = 0; i< channels.get(channelName).users.length; i++) {
    userList.push(sessions.get(channels.get(channelName).users[i]));
  }
  
  return userList;

};

// get the token from the username
let getTokeFromUsername = (channelName, userName) => {
  
  for (let i = 0; i< channels.get(channelName).users.length; i++) {
      
    if (sessions.get(channels.get(channelName).users[i]) === userName) {
      return channels.get(channelName).users[i]; // return the token of the user with userName
    }
  
  }
  
  return "";
  
};


app.post('/signup', (req, res) => {
  
  let parsed = JSON.parse(req.body);
  let password = parsed.password;
  let username = parsed.username;
  
  if ((password === undefined) || (password === "")){
    res.send(JSON.stringify({success:false,reason:"password field missing"}));
  } else if ((username === undefined) || (username === "")) {
    res.send(JSON.stringify({success:false,reason:"username field missing"}));
  } else if (passwords.has(username)) {
    res.send(JSON.stringify({success:false,reason:"Username exists"}));
  } else {
    passwords.set(username, password);
    res.send(JSON.stringify({success: true}));
  }
  
  return;
  
});


app.post('/login', (req, res) => {
    
  let parsed = JSON.parse(req.body);
  let password = parsed.password;
  let username = parsed.username;
  
  if (password === undefined){
    res.send(JSON.stringify({success:false,reason:"password field missing"}));
    return;
  } else if ((username === undefined) || (username === "")) {
    res.send(JSON.stringify({success:false,reason:"username field missing"}));
    return;
  } else if (!passwords.has(username)) {
    res.send(JSON.stringify({success:false,reason:"User does not exist"}));
    return;
  } else if (passwords.get(username) !== password) {
    res.send(JSON.stringify({"success":false,"reason":"Invalid password"}));
    return;
  } 
  
  let token = genToken();
  res.send(JSON.stringify({success:true,token:token}));
  sessions.set(token, username);
  return;
  
});


app.post('/create-channel', (req, res) => {
  let token = req.headers.token;
  
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  
  if ((token === undefined) || (token === "")) {
    res.send(JSON.stringify({success:false,reason:"token field missing"}));
    return;
  } else if ((channelName === undefined) || (channelName === "")) {
    res.send(JSON.stringify({success:false,reason:"channelName field missing"}));
    return;
  } else if (!sessions.has(token)) {
    res.send(JSON.stringify({success:false,reason:"Invalid token"}));
    return;
  } else if (channels.has(channelName)) {
    res.send(JSON.stringify({success:false,reason:"Channel already exists"}));
    return;
  }
  
  // find a way to be able to remove easely users from channel --> maybe a map but How
  // i've seen that we can use object as key in a map.  Maybe it could be useful (https://javascript.info/map-set -- https://www.javascripture.com/Map)
  // map info -- https://www.javascripttutorial.net/es6/javascript-map/
  // channels.set(channelName, {creator: token, users: [token]});
  channels.set(channelName, {creator: token, users: []});
  //channels.set(channelName, {creator: token, users: new Map()});
  res.send(JSON.stringify({success:true}));

});


app.post('/join-channel', (req, res) => {
  let token = req.headers.token;
  
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  
  if ((token === undefined) || (token === "")) {
    res.send(JSON.stringify({success:false,reason:"token field missing"}));
    return;
  } else if ((channelName === undefined) || (channelName === "")) {
    res.send(JSON.stringify({success:false,reason:"channelName field missing"}));
    return;
  } else if (!sessions.has(token)) {
    res.send(JSON.stringify({success:false,reason:"Invalid token"}));
    return;
  } else if (!channels.has(channelName)) {
    res.send(JSON.stringify({success:false,reason:"Channel does not exist"}));
    return;
  } else if (hasUser(channelName, token)) {
    res.send(JSON.stringify({success:false,reason:"User has already joined"}));
    return;
  } else if ((bans.has(sessions.get(token))) && (hasChannel(bans.get(sessions.get(token)).channels, channelName))) {
    res.send(JSON.stringify({success:false,reason:"User is banned"}));
    return;
  }
  
  channels.get(channelName).users.push(token);
  res.send(JSON.stringify({success:true}));

});


app.post('/leave-channel', (req, res) => {
  let token = req.headers.token;
  
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  
  if ((token === undefined) || (token === "")) {
    res.send(JSON.stringify({success:false,reason:"token field missing"}));
    return;
  } else if ((channelName === undefined) || (channelName === "")) {
    res.send(JSON.stringify({success:false,reason:"channelName field missing"}));
    return;
  } else if (!sessions.has(token)) {
    res.send(JSON.stringify({success:false,reason:"Invalid token"}));
    return;
  } else if (!channels.has(channelName)) {
    res.send(JSON.stringify({success:false,reason:"Channel does not exist"}));
    return;
  } else if (!hasUser(channelName, token)) {
    res.send(JSON.stringify({success:false,reason:"User is not part of this channel"}));
    return;
  }
  
  // need to remove user from users[]
  removeUser(channelName, token);
  res.send(JSON.stringify({success:true}));
  
});


app.get('/joined', (req, res) => {
  let token = req.headers.token;
  
  let channelName = req.query.channelName;
  
  if ((token === undefined) || (token === "")) {
    res.send(JSON.stringify({success:false,reason:"token field missing"}));
    return;
  } else if ((channelName === undefined) || (channelName === "")) {
    res.send(JSON.stringify({success:false,reason:"channelName field missing"}));
    return;
  } else if (!sessions.has(token)) {
    res.send(JSON.stringify({success:false,reason:"Invalid token"}));
    return;
  } else if (!channels.has(channelName)) {
    res.send(JSON.stringify({success:false,reason:"Channel does not exist"}));
    return;
  } else if (!hasUser(channelName, token)) {
    res.send(JSON.stringify({success:false,reason:"User is not part of this channel"}));
    return;
  }
  
  // need to get the list of users and send it as http respons body
  res.send(JSON.stringify({"success":true,"joined":getUserList(channelName)}));
  
});


app.post('/delete', (req, res) => {
  let token = req.headers.token;
  
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  
  if ((token === undefined) || (token === "")) {
    res.send(JSON.stringify({success:false,reason:"token field missing"}));
    return;
  } else if ((channelName === undefined) || (channelName === "")) {
    res.send(JSON.stringify({success:false,reason:"channelName field missing"}));
    return;
  } /*else if (!sessions.has(token) || channels.get(channelName).creator !== token) {
    res.send(JSON.stringify({success:false,reason:"Invalid token"}));
    return;
  }*/ else if (!sessions.has(token)) {
    res.send(JSON.stringify({success:false,reason:"Invalid token"}));
    return;
  }else if (!channels.has(channelName)) {
    res.send(JSON.stringify({success:false,reason:"Channel does not exist"}));
    return;
  }
  
  channels.delete(channelName);
  res.send(JSON.stringify({success:true}));
  
});


app.post('/kick', (req, res) => {
  let token = req.headers.token;
  
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  let target = parsed.target;
  
  if ((token === undefined) || (token === "")) {
    res.send(JSON.stringify({success:false,reason:"token field missing"}));
    return;
  } else if ((channelName === undefined) || (channelName === "")) {
    res.send(JSON.stringify({success:false,reason:"channelName field missing"}));
    return;
  } else if (!sessions.has(token)) {
    res.send(JSON.stringify({success:false,reason:"Invalid token"}));
    return;
  } else if ((target === undefined) || (target === "")) {
    res.send(JSON.stringify({success:false,reason:"target field missing"}));
    return;
  } else if (!channels.has(channelName)) {
    res.send(JSON.stringify({success:false,reason:"Channel does not exist"}));
    return;
  } else if (channels.get(channelName).creator !== token) {
    res.send(JSON.stringify({success:false,reason:"Channel not owned by user"}))
    return;
  }
  
  let tokenToKick = getTokeFromUsername(channelName, target);
  
  console.log("tokenToKick: " + tokenToKick);
  
  if (tokenToKick === "") {
    res.send(JSON.stringify({success:false,reason:"User not found"}));
    return;
  }
  
  removeUser(channelName, tokenToKick);
  res.send(JSON.stringify({success:true}));
  
});


app.post('/ban', (req, res) => {
  let token = req.headers.token;
  
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  let target = parsed.target;
  
  if ((token === undefined) || (token === "")) {
    res.send(JSON.stringify({success:false,reason:"token field missing"}));
    return;
  } else if ((channelName === undefined) || (channelName === "")) {
    res.send(JSON.stringify({success:false,reason:"channelName field missing"}));
    return;
  } else if (!sessions.has(token)) {
    res.send(JSON.stringify({success:false,reason:"Invalid token"}));
    return;
  } else if ((target === undefined) || (target === "")) {
    res.send(JSON.stringify({success:false,reason:"target field missing"}));
    return;
  } else if (!channels.has(channelName)) {
    res.send(JSON.stringify({success:false,reason:"Channel does not exist"}));
    return;
  } else if (channels.get(channelName).creator !== token) {
    res.send(JSON.stringify({success:false,reason:"Channel not owned by user"}))
    return;
  }
  
  if (!bans.has(target)) {
    bans.set(target, {channels: [channelName]});
  } else {
    // maybe check if channelName is already present in array
    bans.get(target).channels.push(channelName);
  }
  
  res.send(JSON.stringify({success:true}));
  
});


app.post('/message', (req, res) => {
  
  let token = req.headers.token;
  
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  let contents = parsed.contents;
  
  if ((token === undefined) || (token === "")) {
    res.send(JSON.stringify({success:false,reason:"token field missing"}));
    return;
  } else if (contents === undefined) {
    res.send(JSON.stringify({success:false,reason:"contents field missing"}));
    return;
  } else if ((channelName === undefined) || (channelName === "")) {
    res.send(JSON.stringify({success:false,reason:"channelName field missing"}));
    return;
  } else if (!sessions.has(token)) {
    res.send(JSON.stringify({success:false,reason:"Invalid token"}));
    return;
  } else if ((!channels.has(channelName)) || (!hasUser(channelName, token))) {
    res.send(JSON.stringify({success:false,reason:"User is not part of this channel"}));
    return;
  }
  
  let messageObj = {from:sessions.get(token), contents:contents};
  
  if (messages.has(channelName)) { // if messages map already has the channel defined just append the new message pair
    messages.get(channelName).messagePairs.push(messageObj);
  } else {
    messages.set(channelName, {messagePairs:[messageObj]});
  }
    
  res.send(JSON.stringify({success:true}));
  
});


app.get('/messages', (req, res) => {
  
  let token = req.headers.token;
  let channelName = req.query.channelName;
  
  if ((token === undefined) || (token === "")) {
    res.send(JSON.stringify({success:false,reason:"token field missing"}));
    return;
  } else if ((channelName === undefined) || (channelName === "")) {
    res.send(JSON.stringify({success:false,reason:"channelName field missing"}));
    return;
  } else if (!sessions.has(token)) {
    res.send(JSON.stringify({success:false,reason:"Invalid token"}));
    return;
  } else if (!channels.has(channelName)) {
    res.send(JSON.stringify({success:false,reason:"Channel does not exist"}));
    return;
  } else if (!hasUser(channelName, token)) {
    res.send(JSON.stringify({success:false,reason:"User is not part of this channel"}));
    return;
  }
  
  if (messages.get(channelName) !== undefined) {
    res.send(JSON.stringify({success:true,messages:messages.get(channelName).messagePairs}));  
  } else {
    res.send(JSON.stringify({success:true,messages:[]}));
  }
  
});


app.listen(process.env.PORT);