var waterers = [];
var lighters = [];

function CompareCounts(a, b) {
  return (b.count - a.count);
}

function UpdateLeaderboardDisplay()
{
  waterers.sort(CompareCounts);
  lighters.sort(CompareCounts);

  for (var i = 0; i < 3; i++)
  {
    if (waterers.length > i)
    {
      document.querySelector(`#waterer${i}name`).innerText = waterers[i].name;
      document.querySelector(`#waterer${i}score`).innerText = waterers[i].count;
    }
    else
    {
      document.querySelector(`#waterer${i}name`).innerText = '';
      document.querySelector(`#waterer${i}score`).innerText = '';
    }

    if (lighters.length > i)
    {
      document.querySelector(`#lighter${i}name`).innerText = lighters[i].name;
      document.querySelector(`#lighter${i}score`).innerText = lighters[i].count;
    }
    else
    {
      document.querySelector(`#lighter${i}name`).innerText = '';
      document.querySelector(`#lighter${i}score`).innerText = '';
    }
  }
}

const ws = new ReconnectingWebSocket('ws://localhost:42070/');
ws.onmessage = event => {
  if (event.data.startsWith('waterer:') && event.data.length > 8)
  {
    const name = event.data.substring(8);
    const index = waterers.findIndex(el => {
      return el.name == name;
    });

    if (index == -1)
    {
      waterers.push({
        name: name,
        count: 1,
      });
    }
    else
    {
      waterers[index].count++;
    }
    
    UpdateLeaderboardDisplay();
  }
  else if (event.data.startsWith('lighter:')  && event.data.length > 8)
  {
    const name = event.data.substring(8);
    const index = lighters.findIndex(el => {
      return el.name == name;
    });

    if (index == -1)
    {
      lighters.push({
        name: name,
        count: 1,
      });
    }
    else
    {
      lighters[index].count++;
    }
    
    UpdateLeaderboardDisplay();
  }

  ws.send('pong');
}