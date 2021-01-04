const ws = new ReconnectingWebSocket('ws://localhost:42070/');
ws.onmessage = event => {
  if (event.data.startsWith('waterer:'))
  {
    const name = event.data.substring(8);
    document.querySelector('#name').innerText = name.toUpperCase();
    if (name == '')
    {
      document.querySelector('#main').style.visibility = 'hidden';
    }
    else
    {
      document.querySelector('#main').style.visibility = 'visible';
      generate();
    }
  }

  ws.send('pong');
}