const axios = require('axios');
const express = require('express');
const tmi = require('tmi.js');
const WebSocket = require('ws');

const Slobs = require('./slobs');

const port = 42069;

const app = express();
const wss = new WebSocket.Server({ port: port + 1 });

const espUrl = 'http://192.168.1.72';

var wateringQueue = [];
var lightQueue = [];
const minMoisture = 0;
const maxMoisture = 4095;
var moisture = 0;
var commandsEnabled = true;

var currentWatering = null;
var currentLight = null;

const slobs = new Slobs();

// WebSocket Heartbeat
wss.on('connection', ws => {
  ws.deadCount = 0;
  ws.on('message', () => { ws.deadCount = 0; });
})

setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.deadCount > 3)
    {
      console.log('closing connection');
      return ws.terminate();
    }
    else
    {
      ws.deadCount++;
      ws.send('ping');
    }
  })
}, 30000);

function WebSocketBroadcast(data)
{
  console.log(`WebSocket broadcast: ${data}`);
  wss.clients.forEach(ws => {
    if (ws.readyState == WebSocket.OPEN)
    {
      ws.send(data);
    }
  })
}

function SetPumpStatus(status)
{
  return axios.post(espUrl + '/water/' + (status ? 'on' : 'off'));
}

function ToggleLight()
{
  return axios.post(espUrl + '/light');
}

function SetCurrentWaterer(waterer)
{
  currentWatering = waterer;
  WebSocketBroadcast(`waterer:${(waterer == null ? '' : waterer)}`);
}

function BeginWatering()
{
  SetCurrentWaterer(wateringQueue.shift());

  setTimeout(() => {
    SetPumpStatus(true)
      .then(() => {
        setTimeout(() => { SetPumpStatus(false); }, 1200);
        setTimeout(() => { OnWateringComplete(); }, 5000);
      }); 
  }, 1000);
}

function OnWateringComplete()
{
  SetCurrentWaterer(null);

  // If there is something else in the queue, keep going.
  if (wateringQueue.length > 0)
  {
    BeginWatering();
  }
}

function EnqueueWatering(username)
{
  wateringQueue.push(username);
  if(currentWatering == null)
  {
    BeginWatering();
  }
}

function SetCurrentLighter(lighter)
{
  currentLight = lighter;
  WebSocketBroadcast(`lighter:${(lighter == null ? '' : lighter)}`);
}

function BeginLight()
{
  SetCurrentLighter(lightQueue.shift());
  setTimeout(() => { OnLightComplete(); }, 60000);
}

function OnLightComplete()
{
  if (lightQueue.length > 0)
  {
    BeginLight();
  }
  else
  {
    SetCurrentLighter(null);
    ToggleLight();
  }
}

function EnqueueLight(username)
{
  lightQueue.push(username);
  if (currentLight == null)
  {
    ToggleLight();
    BeginLight();
  }
}

function OnMidnight()
{
  // Reload the stats page to reset the counters.
  slobs.setStatsVisibility(false)
    .then(() => {
      slobs.setStatsVisibility(true);
    });

  setTimeout(OnMidnight, 86400000);
}

function OnNight()
{
  slobs.setSleepVisibility(true);
  commandsEnabled = false;
  wateringQueue = [];
  lightQueue = [];
  setTimeout(OnNight, 86400000);
}

function OnMorning()
{
  slobs.setSleepVisibility(false);
  commandsEnabled = true;
  setTimeout(OnMorning, 86400000);
}

app.get('/api/currentWaterer', (req, res) => {
  res.send(currentWatering ? currentWatering : '');
});

// Poll moisture from ESP every second
setInterval(() => {
  axios.get(espUrl + '/moisture')
    .then(response => {
      moisture = response.data;
    });
}, 1000);

app.get('/api/moisture', (req, res) => {
  const range = maxMoisture - minMoisture;
  const percentage = Math.round((moisture - minMoisture) / range * 100);
  res.send(percentage + ' %');
})

app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Listening on port ${port}`);

  setTimeout(() => {
    slobs.reloadSources();
    
    const now = new Date();
    if (now.getHours() >= 22 || now.getHours() < 9)
    {
      OnNight();
    }

    var midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()) - now;
    
    if (midnight < 0)
    {
      midnight += 86400000;
    }

    setTimeout(OnMidnight, midnight);

    var night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      22) - now;

    if (night < 0)
    {
      night += 86400000;
    }

    setTimeout(OnNight, night);

    var morning = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      9) - now;

    if (morning < 0)
    {
      morning += 86400000;
    }

    setTimeout(OnMorning, morning);

  }, 2000);
});

const client = new tmi.client({
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.OAUTH_TOKEN
  },
  channels: [
    process.env.CHANNEL_NAME
  ]
});

client.on('connected', (address, port) => {
  console.log(`Connected on ${address}:${port}`);
})

client.on('message', (target, context, message, self) => {
  // Ignore messages from the bot
  if (self) { return; }

  message = message.trim();

  if (message == '!forcelight' && target == '#chineseelectricpanda')
  {
    ToggleLight();
  }
  else if (commandsEnabled)
  {
     if (message == '!water')
    {
      console.log('watering');
      EnqueueWatering(target);
    }
    else if (message == '!light')
    {
      console.log('light');
      EnqueueLight(target);
    }
  }
});

client.connect()
  .then(data => {
    console.log(data);
  });