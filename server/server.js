const axios = require('axios');
const express = require('express');
const tmi = require('tmi.js');

const Slobs = require('./slobs');

const app = express();
const port = 42069;

const espUrl = 'http://192.168.1.72';

const wateringQueue = [];
const lightQueue = [];
const minMoisture = 0;
const maxMoisture = 4095;
var moisture = 0;

var currentWatering = null;
var currentLight = null;

const slobs = new Slobs();

function SetPumpStatus(status)
{
  return axios.post(espUrl + '/water/' + (status ? 'on' : 'off'));
}

function ToggleLight()
{
  return axios.post(espUrl + '/light');
}

function BeginWatering()
{
  currentWatering = wateringQueue.shift();
  
  slobs.setWateringAlertVisibility(true);
  
  // Water for 1 second
  setTimeout(() => {
    SetPumpStatus(true)
      .then(() => {
        setTimeout(() => { SetPumpStatus(false); }, 850);
        setTimeout(() => { OnWateringComplete(); }, 5000);
      }); 
  }, 1000);
}

function OnWateringComplete()
{
  slobs.setWateringAlertVisibility(false);
  currentWatering = null;

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

function BeginLight()
{
  currentLight = lightQueue.shift();

  // slobs

  setTimeout(() => {
    ToggleLight()
      .then(() => {
        setTimeout(() => { ToggleLight(); }, 30000);
        setTimeout(() => { OnLightComplete(); }, 31000);
      })
  }, 0);
}

function OnLightComplete()
{
  //slobs

  currentLight = null;

  if (lightQueue.length > 0)
  {
    BeginLight();
  }
}

function EnqueueLight(username)
{
  lightQueue.push(username);
  if (currentLight == null)
  {
    BeginLight();
  }
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
});

client.connect()
  .then(data => {
    console.log(data);
  });