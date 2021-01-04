var waters = 0;
var lightTime = 0;

var isLightOn = false;

const ws = new ReconnectingWebSocket('ws://localhost:42070/');
ws.onmessage = event => {
  if (event.data.startsWith('waterer:') && event.data.length > 8 )
  {
    waters++;
    document.querySelector('#waters').innerText = waters;
  }
  else if (event.data.startsWith('lighter:'))
  {
    if (event.data.length > 8)
    {
      isLightOn = true;
    }
    else
    {
      isLightOn = false;
    }
  }

  ws.send('pong');
}

setInterval(() => {
  if (isLightOn)
  {
    lightTime += 0.1;

    const seconds = Math.floor(lightTime % 60).toString();
    const minutes = Math.floor((lightTime / 60) % 60).toString();
    const hours = Math.floor(lightTime / 3600).toString();

    document.querySelector('#lightTime').innerText =
      hours + ':' +
      (minutes.length == 1 ? '0' + minutes : minutes) + ':' +
      (seconds.length == 1 ? '0' + seconds : seconds)
  }
}, 100);