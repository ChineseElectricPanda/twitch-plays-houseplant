var xmlHttp = new XMLHttpRequest();
xmlHttp.onreadystatechange = () => { 
  if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
  {
    document.querySelector('#name').innerText = xmlHttp.responseText.toUpperCase();
  }
}
xmlHttp.open('GET', '/api/currentWaterer', true);
xmlHttp.send(null);