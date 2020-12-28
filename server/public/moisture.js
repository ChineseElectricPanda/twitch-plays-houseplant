setInterval(() => {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = () => { 
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
    {
      document.querySelector('#moisture').innerText = xmlHttp.responseText;
    }
  }
  xmlHttp.open('GET', '/api/moisture', true);
  xmlHttp.send(null);
}, 1000);